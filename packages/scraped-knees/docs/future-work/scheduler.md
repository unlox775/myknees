# Scheduler (Planned)

## Purpose
Coordinate when repositories should be crawled. Suggest and trigger runs based on recent activity and user-configured policies.

## Responsibilities
- Track latest entry dates per repository
- Compute next suggested run time per policy
- Notify the user when action is needed (e.g., login required)
- Trigger navigation+crawl workflows on demand

## Boundaries
- Does not perform navigation or extraction; delegates to Navigation Controller and Scraper Engine
- Reads repository metadata and latest-entry info from Repository Service
- Emits UI notifications/prompts

## Policies
```ts
interface SchedulePolicy {
  mode: 'manual' | 'interval' | 'weekly' | 'monthly';
  intervalMinutes?: number;      // for interval mode
  dayOfWeek?: number;            // 0-6 for weekly
  dayOfMonth?: number;           // 1-28 for monthly (safe)
  activeHours?: { start: number; end: number }; // 0-24 local hours
}
```

## Interfaces (Sketch)
```ts
interface Scheduler {
  setPolicy(repositoryId: string, policy: SchedulePolicy): Promise<void>;
  getPolicy(repositoryId: string): Promise<SchedulePolicy | null>;

  getNextRun(repositoryId: string): Promise<string | null>; // ISO datetime
  enqueueRun(repositoryId: string): Promise<void>;
  runDue(now?: string): Promise<{ runsStarted: number; errors: number }>;
}
```

## Notifications
- Soft prompts in the extension UI when runs are due
- Explicit prompts for login-required situations

## Milestones
- M1: Manual runs and next-run calculation for interval policy
- M2: Weekly/monthly support and quiet hours
- M3: Login-aware prompts and multi-repository queueing