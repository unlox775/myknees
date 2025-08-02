/******/ (() => { // webpackBootstrap
/*!**********************!*\
  !*** ./src/popup.js ***!
  \**********************/
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Popup script for AI Data Scraper extension
var PopupController = /*#__PURE__*/function () {
  function PopupController() {
    _classCallCheck(this, PopupController);
    this.currentTab = null;
    this.isTrainingActive = false;
    this.initialize();
  }
  return _createClass(PopupController, [{
    key: "initialize",
    value: function () {
      var _initialize = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var _this$currentTab;
        var _yield$chrome$tabs$qu, _yield$chrome$tabs$qu2, tab;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              _context.n = 1;
              return chrome.tabs.query({
                active: true,
                currentWindow: true
              });
            case 1:
              _yield$chrome$tabs$qu = _context.v;
              _yield$chrome$tabs$qu2 = _slicedToArray(_yield$chrome$tabs$qu, 1);
              tab = _yield$chrome$tabs$qu2[0];
              this.currentTab = tab;

              // Bind event listeners
              this.bindEventListeners();

              // Load initial data
              _context.n = 2;
              return this.loadTrainingSessions();
            case 2:
              _context.n = 3;
              return this.checkTrainingStatus();
            case 3:
              console.log('Popup initialized for tab:', (_this$currentTab = this.currentTab) === null || _this$currentTab === void 0 ? void 0 : _this$currentTab.url);
            case 4:
              return _context.a(2);
          }
        }, _callee, this);
      }));
      function initialize() {
        return _initialize.apply(this, arguments);
      }
      return initialize;
    }()
  }, {
    key: "bindEventListeners",
    value: function bindEventListeners() {
      var _this = this;
      // Training controls
      document.getElementById('start-training').addEventListener('click', function () {
        _this.startTraining();
      });
      document.getElementById('stop-training').addEventListener('click', function () {
        _this.stopTraining();
      });

      // Data extraction controls
      document.getElementById('extract-data').addEventListener('click', function () {
        _this.extractData();
      });
      document.getElementById('export-data').addEventListener('click', function () {
        _this.exportData();
      });

      // Session list clicks
      document.getElementById('sessions-list').addEventListener('click', function (event) {
        var sessionItem = event.target.closest('.session-item');
        if (sessionItem) {
          var sessionId = sessionItem.dataset.sessionId;
          _this.loadSession(sessionId);
        }
      });
    }
  }, {
    key: "startTraining",
    value: function () {
      var _startTraining = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
        var _t;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              _context2.p = 0;
              if (this.currentTab) {
                _context2.n = 1;
                break;
              }
              throw new Error('No active tab found');
            case 1:
              if (!(!this.currentTab.url || this.currentTab.url.startsWith('chrome://'))) {
                _context2.n = 2;
                break;
              }
              throw new Error('Cannot train on this page. Please navigate to a regular website.');
            case 2:
              _context2.n = 3;
              return chrome.runtime.sendMessage({
                type: 'START_TRAINING',
                data: {
                  url: this.currentTab.url,
                  timestamp: new Date().toISOString()
                }
              });
            case 3:
              this.isTrainingActive = true;
              this.updateTrainingUI();
              this.showStatus('Training mode started! Use Ctrl+Shift+S to toggle on the page.', 'success');
              _context2.n = 5;
              break;
            case 4:
              _context2.p = 4;
              _t = _context2.v;
              console.error('Error starting training:', _t);
              this.showStatus("Error: ".concat(_t.message), 'error');
            case 5:
              return _context2.a(2);
          }
        }, _callee2, this, [[0, 4]]);
      }));
      function startTraining() {
        return _startTraining.apply(this, arguments);
      }
      return startTraining;
    }()
  }, {
    key: "stopTraining",
    value: function () {
      var _stopTraining = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
        var _t2;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              _context3.p = 0;
              if (this.currentTab) {
                _context3.n = 1;
                break;
              }
              throw new Error('No active tab found');
            case 1:
              _context3.n = 2;
              return chrome.runtime.sendMessage({
                type: 'STOP_TRAINING'
              });
            case 2:
              this.isTrainingActive = false;
              this.updateTrainingUI();
              this.showStatus('Training mode stopped.', 'info');

              // Reload sessions to show new data
              _context3.n = 3;
              return this.loadTrainingSessions();
            case 3:
              _context3.n = 5;
              break;
            case 4:
              _context3.p = 4;
              _t2 = _context3.v;
              console.error('Error stopping training:', _t2);
              this.showStatus("Error: ".concat(_t2.message), 'error');
            case 5:
              return _context3.a(2);
          }
        }, _callee3, this, [[0, 4]]);
      }));
      function stopTraining() {
        return _stopTraining.apply(this, arguments);
      }
      return stopTraining;
    }()
  }, {
    key: "extractData",
    value: function () {
      var _extractData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
        var _this2 = this;
        var sessions, relevantSessions, latestSession, _t3;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.p = _context4.n) {
            case 0:
              _context4.p = 0;
              if (this.currentTab) {
                _context4.n = 1;
                break;
              }
              throw new Error('No active tab found');
            case 1:
              _context4.n = 2;
              return this.getTrainingSessions();
            case 2:
              sessions = _context4.v;
              relevantSessions = sessions.filter(function (session) {
                return session.url === _this2.currentTab.url;
              });
              if (!(relevantSessions.length === 0)) {
                _context4.n = 3;
                break;
              }
              throw new Error('No training data found for this page. Please train the scraper first.');
            case 3:
              // Use the most recent session
              latestSession = relevantSessions[relevantSessions.length - 1]; // Send message to execute scraping
              _context4.n = 4;
              return chrome.runtime.sendMessage({
                type: 'EXECUTE_SCRAPING',
                data: {
                  sessionId: latestSession.id,
                  config: latestSession.config
                }
              });
            case 4:
              this.showStatus('Data extraction started!', 'success');
              _context4.n = 6;
              break;
            case 5:
              _context4.p = 5;
              _t3 = _context4.v;
              console.error('Error extracting data:', _t3);
              this.showStatus("Error: ".concat(_t3.message), 'error');
            case 6:
              return _context4.a(2);
          }
        }, _callee4, this, [[0, 5]]);
      }));
      function extractData() {
        return _extractData.apply(this, arguments);
      }
      return extractData;
    }()
  }, {
    key: "exportData",
    value: function () {
      var _exportData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
        var scrapedData, csvContent, blob, url, a, _t4;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.p = _context5.n) {
            case 0:
              _context5.p = 0;
              _context5.n = 1;
              return this.getScrapedData();
            case 1:
              scrapedData = _context5.v;
              if (!(scrapedData.length === 0)) {
                _context5.n = 2;
                break;
              }
              throw new Error('No data to export. Please extract data first.');
            case 2:
              // Create CSV content
              csvContent = this.convertToCSV(scrapedData); // Create and download file
              blob = new Blob([csvContent], {
                type: 'text/csv'
              });
              url = URL.createObjectURL(blob);
              a = document.createElement('a');
              a.href = url;
              a.download = "scraped-data-".concat(new Date().toISOString().split('T')[0], ".csv");
              a.click();
              URL.revokeObjectURL(url);
              this.showStatus('Data exported successfully!', 'success');
              _context5.n = 4;
              break;
            case 3:
              _context5.p = 3;
              _t4 = _context5.v;
              console.error('Error exporting data:', _t4);
              this.showStatus("Error: ".concat(_t4.message), 'error');
            case 4:
              return _context5.a(2);
          }
        }, _callee5, this, [[0, 3]]);
      }));
      function exportData() {
        return _exportData.apply(this, arguments);
      }
      return exportData;
    }()
  }, {
    key: "convertToCSV",
    value: function convertToCSV(data) {
      if (data.length === 0) return '';

      // Get all unique keys from all objects
      var keys = _toConsumableArray(new Set(data.flatMap(function (obj) {
        return Object.keys(obj);
      })));

      // Create header row
      var header = keys.join(',');

      // Create data rows
      var rows = data.map(function (obj) {
        return keys.map(function (key) {
          var value = obj[key] || '';
          // Escape commas and quotes
          return "\"".concat(String(value).replace(/"/g, '""'), "\"");
        }).join(',');
      });
      return [header].concat(_toConsumableArray(rows)).join('\n');
    }
  }, {
    key: "loadTrainingSessions",
    value: function () {
      var _loadTrainingSessions = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
        var sessions, _t5;
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.p = _context6.n) {
            case 0:
              _context6.p = 0;
              this.showLoading(true);
              _context6.n = 1;
              return this.getTrainingSessions();
            case 1:
              sessions = _context6.v;
              this.renderTrainingSessions(sessions);
              _context6.n = 3;
              break;
            case 2:
              _context6.p = 2;
              _t5 = _context6.v;
              console.error('Error loading training sessions:', _t5);
              this.showStatus('Error loading training sessions', 'error');
            case 3:
              _context6.p = 3;
              this.showLoading(false);
              return _context6.f(3);
            case 4:
              return _context6.a(2);
          }
        }, _callee6, this, [[0, 2, 3, 4]]);
      }));
      function loadTrainingSessions() {
        return _loadTrainingSessions.apply(this, arguments);
      }
      return loadTrainingSessions;
    }()
  }, {
    key: "getTrainingSessions",
    value: function () {
      var _getTrainingSessions = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.n) {
            case 0:
              return _context7.a(2, new Promise(function (resolve, reject) {
                chrome.runtime.sendMessage({
                  type: 'GET_TRAINING_SESSIONS'
                }, function (response) {
                  if (response && response.success) {
                    resolve(response.data);
                  } else {
                    reject(new Error((response === null || response === void 0 ? void 0 : response.error) || 'Failed to get training sessions'));
                  }
                });
              }));
          }
        }, _callee7);
      }));
      function getTrainingSessions() {
        return _getTrainingSessions.apply(this, arguments);
      }
      return getTrainingSessions;
    }()
  }, {
    key: "getScrapedData",
    value: function () {
      var _getScrapedData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
        return _regenerator().w(function (_context8) {
          while (1) switch (_context8.n) {
            case 0:
              return _context8.a(2, new Promise(function (resolve, reject) {
                chrome.runtime.sendMessage({
                  type: 'GET_SCRAPED_DATA'
                }, function (response) {
                  if (response && response.success) {
                    resolve(response.data);
                  } else {
                    reject(new Error((response === null || response === void 0 ? void 0 : response.error) || 'Failed to get scraped data'));
                  }
                });
              }));
          }
        }, _callee8);
      }));
      function getScrapedData() {
        return _getScrapedData.apply(this, arguments);
      }
      return getScrapedData;
    }()
  }, {
    key: "renderTrainingSessions",
    value: function renderTrainingSessions(sessions) {
      var _this3 = this;
      var sessionsList = document.getElementById('sessions-list');
      var emptySessions = document.getElementById('empty-sessions');
      if (sessions.length === 0) {
        sessionsList.style.display = 'none';
        emptySessions.style.display = 'block';
        return;
      }
      sessionsList.style.display = 'block';
      emptySessions.style.display = 'none';

      // Sort sessions by date (newest first)
      var sortedSessions = sessions.sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      sessionsList.innerHTML = sortedSessions.map(function (session) {
        var _session$selectedElem;
        return "\n      <div class=\"session-item\" data-session-id=\"".concat(session.id, "\">\n        <div class=\"session-title\">").concat(_this3.getDomainFromUrl(session.url), "</div>\n        <div class=\"session-meta\">\n          ").concat(((_session$selectedElem = session.selectedElements) === null || _session$selectedElem === void 0 ? void 0 : _session$selectedElem.length) || 0, " elements selected \u2022 \n          ").concat(new Date(session.createdAt).toLocaleDateString(), "\n        </div>\n      </div>\n    ");
      }).join('');
    }
  }, {
    key: "getDomainFromUrl",
    value: function getDomainFromUrl(url) {
      try {
        var domain = new URL(url).hostname;
        return domain.replace('www.', '');
      } catch (_unused) {
        return 'Unknown site';
      }
    }
  }, {
    key: "checkTrainingStatus",
    value: function () {
      var _checkTrainingStatus = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
        var isValidPage, startButton, stopButton;
        return _regenerator().w(function (_context9) {
          while (1) switch (_context9.n) {
            case 0:
              // This would check if training is currently active on the current tab
              // For now, we'll just check if we're on a valid page
              isValidPage = this.currentTab && this.currentTab.url && !this.currentTab.url.startsWith('chrome://');
              startButton = document.getElementById('start-training');
              stopButton = document.getElementById('stop-training');
              if (isValidPage) {
                startButton.disabled = false;
                stopButton.disabled = !this.isTrainingActive;
              } else {
                startButton.disabled = true;
                stopButton.disabled = true;
              }
            case 1:
              return _context9.a(2);
          }
        }, _callee9, this);
      }));
      function checkTrainingStatus() {
        return _checkTrainingStatus.apply(this, arguments);
      }
      return checkTrainingStatus;
    }()
  }, {
    key: "updateTrainingUI",
    value: function updateTrainingUI() {
      var startButton = document.getElementById('start-training');
      var stopButton = document.getElementById('stop-training');
      var statusDiv = document.getElementById('training-status');
      if (this.isTrainingActive) {
        startButton.disabled = true;
        stopButton.disabled = false;
        statusDiv.style.display = 'block';
        statusDiv.className = 'status success';
        statusDiv.textContent = 'Training mode is active!';
      } else {
        startButton.disabled = false;
        stopButton.disabled = true;
        statusDiv.style.display = 'none';
      }
    }
  }, {
    key: "showStatus",
    value: function showStatus(message) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
      var statusDiv = document.getElementById('training-status');
      statusDiv.textContent = message;
      statusDiv.className = "status ".concat(type);
      statusDiv.style.display = 'block';

      // Auto-hide after 5 seconds
      setTimeout(function () {
        if (statusDiv.textContent === message) {
          statusDiv.style.display = 'none';
        }
      }, 5000);
    }
  }, {
    key: "showLoading",
    value: function showLoading(show) {
      var loading = document.querySelector('.loading');
      var sessionsList = document.getElementById('sessions-list');
      var emptySessions = document.getElementById('empty-sessions');
      if (show) {
        loading.style.display = 'block';
        sessionsList.style.display = 'none';
        emptySessions.style.display = 'none';
      } else {
        loading.style.display = 'none';
      }
    }
  }, {
    key: "loadSession",
    value: function () {
      var _loadSession = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(sessionId) {
        var sessions, session, _t6;
        return _regenerator().w(function (_context0) {
          while (1) switch (_context0.p = _context0.n) {
            case 0:
              _context0.p = 0;
              _context0.n = 1;
              return this.getTrainingSessions();
            case 1:
              sessions = _context0.v;
              session = sessions.find(function (s) {
                return s.id === sessionId;
              });
              if (!session) {
                _context0.n = 3;
                break;
              }
              if (!(session.url !== this.currentTab.url)) {
                _context0.n = 2;
                break;
              }
              _context0.n = 2;
              return chrome.tabs.update(this.currentTab.id, {
                url: session.url
              });
            case 2:
              this.showStatus("Loaded training session for ".concat(this.getDomainFromUrl(session.url)), 'success');
            case 3:
              _context0.n = 5;
              break;
            case 4:
              _context0.p = 4;
              _t6 = _context0.v;
              console.error('Error loading session:', _t6);
              this.showStatus('Error loading session', 'error');
            case 5:
              return _context0.a(2);
          }
        }, _callee0, this, [[0, 4]]);
      }));
      function loadSession(_x) {
        return _loadSession.apply(this, arguments);
      }
      return loadSession;
    }()
  }]);
}(); // Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  new PopupController();
});
/******/ })()
;
//# sourceMappingURL=popup.js.map