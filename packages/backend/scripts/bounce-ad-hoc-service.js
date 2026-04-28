#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFile, spawn } = require('child_process');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SERVER_SCRIPT = path.join(BACKEND_ROOT, 'scripts', 'ad-hoc-server.js');
const DEFAULT_HOST = process.env.AD_HOC_HOST || '127.0.0.1';
const DEFAULT_PORT = process.env.AD_HOC_PORT || '8791';
const DEFAULT_LOG = process.env.AD_HOC_LOG || path.join('data', 'ad-hoc-service.log');

function parseArgs(argv) {
  const args = {
    action: 'bounce',
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    log: DEFAULT_LOG,
  };

  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) continue;
    args[match[1]] = match[2];
  }

  args.port = parseInt(args.port, 10);
  if (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535) {
    throw new Error(`Invalid port: ${args.port}`);
  }

  return args;
}

function execFileText(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: BACKEND_ROOT }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function listenerPids(port) {
  try {
    const stdout = await execFileText('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN']);
    return stdout
      .split(/\s+/)
      .map((pid) => parseInt(pid, 10))
      .filter(Number.isInteger);
  } catch (error) {
    if (error.code === 1) return [];
    throw error;
  }
}

async function commandForPid(pid) {
  const stdout = await execFileText('ps', ['-p', String(pid), '-o', 'command=']);
  return stdout.trim();
}

async function environmentForPid(pid) {
  const stdout = await execFileText('ps', ['eww', '-p', String(pid), '-o', 'command=']);
  const env = {};

  for (const token of stdout.split(/\s+/)) {
    const match = token.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }

  return env;
}

async function serviceProcesses(port) {
  const pids = await listenerPids(port);
  const rows = [];

  for (const pid of pids) {
    const command = await commandForPid(pid);
    rows.push({
      pid,
      command,
      isAdHocServer: command.includes('scripts/ad-hoc-server.js'),
    });
  }

  return rows;
}

async function existingServiceEnvironment(port) {
  const processes = await serviceProcesses(port);
  const serviceProcess = processes.find((processInfo) => processInfo.isAdHocServer);
  if (!serviceProcess) return {};

  const env = await environmentForPid(serviceProcess.pid);
  const preservedEnv = {};
  const preserveNames = ['DATA_STORE_ROOT', 'NODE_ENV', 'ASDF_NODEJS_VERSION'];

  for (const name of preserveNames) {
    if (env[name]) preservedEnv[name] = env[name];
  }

  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith('MYKNEES_')) preservedEnv[name] = value;
  }

  return preservedEnv;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNoListeners(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await listenerPids(port)).length === 0) return true;
    await sleep(150);
  }
  return false;
}

async function stopService({ port }) {
  const processes = await serviceProcesses(port);
  if (!processes.length) {
    console.log(`No ad hoc service is listening on port ${port}.`);
    return;
  }

  const nonServiceProcesses = processes.filter((processInfo) => !processInfo.isAdHocServer);
  if (nonServiceProcesses.length) {
    for (const processInfo of nonServiceProcesses) {
      console.error(`Port ${port} is held by PID ${processInfo.pid}: ${processInfo.command}`);
    }
    throw new Error(`Refusing to stop non-MyKnees process on port ${port}.`);
  }

  for (const processInfo of processes) {
    console.log(`Stopping ad hoc service PID ${processInfo.pid} on port ${port}.`);
    process.kill(processInfo.pid, 'SIGTERM');
  }

  if (await waitForNoListeners(port, 5000)) {
    console.log(`Stopped ad hoc service on port ${port}.`);
    return;
  }

  for (const processInfo of processes) {
    console.log(`PID ${processInfo.pid} did not exit after SIGTERM; sending SIGKILL.`);
    try {
      process.kill(processInfo.pid, 'SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }

  if (!(await waitForNoListeners(port, 2000))) {
    throw new Error(`Unable to free port ${port}.`);
  }
}

function waitForHttpOk({ host, port, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get(
        {
          host,
          port,
          path: '/ad-hoc/month-buckets',
          timeout: 1000,
        },
        (res) => {
          res.resume();
          if (res.statusCode >= 200 && res.statusCode < 500) {
            resolve();
            return;
          }
          retry();
        }
      );

      req.on('timeout', () => req.destroy());
      req.on('error', retry);
    }

    function retry() {
      if (Date.now() >= deadline) {
        reject(new Error(`Service did not answer on http://${host}:${port} before timeout.`));
        return;
      }
      setTimeout(attempt, 200);
    }

    attempt();
  });
}

async function startService({ host, port, log }, preservedEnv = {}) {
  const processes = await serviceProcesses(port);
  if (processes.length) {
    const serviceProcess = processes.find((processInfo) => processInfo.isAdHocServer);
    if (serviceProcess) {
      console.log(`Ad hoc service is already running as PID ${serviceProcess.pid} on port ${port}.`);
      return;
    }
    throw new Error(`Port ${port} is already in use by another process.`);
  }

  const logPath = path.resolve(BACKEND_ROOT, log);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, 'a');
  fs.writeSync(logFd, `\n--- ${new Date().toISOString()} starting ad hoc service on ${host}:${port} ---\n`);

  const childEnv = { ...process.env };
  for (const [name, value] of Object.entries(preservedEnv)) {
    if (!childEnv[name]) childEnv[name] = value;
  }
  childEnv.AD_HOC_HOST = host;
  childEnv.AD_HOC_PORT = String(port);

  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    cwd: BACKEND_ROOT,
    detached: true,
    env: childEnv,
    stdio: ['ignore', logFd, logFd],
  });

  child.unref();
  await waitForHttpOk({ host, port, timeoutMs: 5000 });
  console.log(`Started ad hoc service on http://${host}:${port}`);
  console.log(`Log: ${logPath}`);
  if (childEnv.DATA_STORE_ROOT) {
    console.log(`DATA_STORE_ROOT=${childEnv.DATA_STORE_ROOT}`);
  }
}

async function status({ host, port }) {
  const processes = await serviceProcesses(port);
  if (!processes.length) {
    console.log(`Ad hoc service is not running on http://${host}:${port}`);
    return;
  }

  for (const processInfo of processes) {
    const kind = processInfo.isAdHocServer ? 'ad hoc service' : 'non-MyKnees process';
    console.log(`${kind} PID ${processInfo.pid} on http://${host}:${port}`);
    console.log(`  ${processInfo.command}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.action === 'status') {
    await status(args);
    return;
  }

  if (args.action === 'stop') {
    await stopService(args);
    return;
  }

  if (args.action === 'start') {
    await startService(args);
    return;
  }

  if (args.action === 'bounce') {
    const preservedEnv = await existingServiceEnvironment(args.port);
    await stopService(args);
    await startService(args, preservedEnv);
    return;
  }

  throw new Error(`Unknown action: ${args.action}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
