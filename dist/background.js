/******/ (() => { // webpackBootstrap
/*!***************************!*\
  !*** ./src/background.js ***!
  \***************************/
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Background service worker for AI Data Scraper extension
var BackgroundService = /*#__PURE__*/function () {
  function BackgroundService() {
    _classCallCheck(this, BackgroundService);
    this.initialize();
  }
  return _createClass(BackgroundService, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;
      // Listen for extension installation
      chrome.runtime.onInstalled.addListener(function (details) {
        console.log('AI Data Scraper extension installed:', details.reason);
        _this.setupDefaultStorage();
      });

      // Listen for messages from content scripts and popup
      chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        _this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      });

      // Handle tab updates
      chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
          _this.handleTabUpdate(tabId, tab);
        }
      });
    }
  }, {
    key: "setupDefaultStorage",
    value: function () {
      var _setupDefaultStorage = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var defaultData;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              defaultData = {
                trainingSessions: [],
                scrapedData: [],
                settings: {
                  autoStart: false,
                  debugMode: false,
                  overlayOpacity: 0.3
                }
              };
              _context.n = 1;
              return chrome.storage.local.set(defaultData);
            case 1:
              console.log('Default storage initialized');
            case 2:
              return _context.a(2);
          }
        }, _callee);
      }));
      function setupDefaultStorage() {
        return _setupDefaultStorage.apply(this, arguments);
      }
      return setupDefaultStorage;
    }()
  }, {
    key: "handleMessage",
    value: function () {
      var _handleMessage = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(message, sender, sendResponse) {
        var _sender$tab, _sender$tab2, _sender$tab3;
        var sessions, data, _t, _t2;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              _context2.p = 0;
              _t = message.type;
              _context2.n = _t === 'START_TRAINING' ? 1 : _t === 'STOP_TRAINING' ? 3 : _t === 'SAVE_TRAINING_DATA' ? 5 : _t === 'GET_TRAINING_SESSIONS' ? 7 : _t === 'EXECUTE_SCRAPING' ? 9 : _t === 'GET_SCRAPED_DATA' ? 11 : 13;
              break;
            case 1:
              _context2.n = 2;
              return this.startTraining(message.data, (_sender$tab = sender.tab) === null || _sender$tab === void 0 ? void 0 : _sender$tab.id);
            case 2:
              sendResponse({
                success: true
              });
              return _context2.a(3, 14);
            case 3:
              _context2.n = 4;
              return this.stopTraining((_sender$tab2 = sender.tab) === null || _sender$tab2 === void 0 ? void 0 : _sender$tab2.id);
            case 4:
              sendResponse({
                success: true
              });
              return _context2.a(3, 14);
            case 5:
              _context2.n = 6;
              return this.saveTrainingData(message.data);
            case 6:
              sendResponse({
                success: true
              });
              return _context2.a(3, 14);
            case 7:
              _context2.n = 8;
              return this.getTrainingSessions();
            case 8:
              sessions = _context2.v;
              sendResponse({
                success: true,
                data: sessions
              });
              return _context2.a(3, 14);
            case 9:
              _context2.n = 10;
              return this.executeScraping(message.data, (_sender$tab3 = sender.tab) === null || _sender$tab3 === void 0 ? void 0 : _sender$tab3.id);
            case 10:
              sendResponse({
                success: true
              });
              return _context2.a(3, 14);
            case 11:
              _context2.n = 12;
              return this.getScrapedData();
            case 12:
              data = _context2.v;
              sendResponse({
                success: true,
                data: data
              });
              return _context2.a(3, 14);
            case 13:
              console.warn('Unknown message type:', message.type);
              sendResponse({
                success: false,
                error: 'Unknown message type'
              });
            case 14:
              _context2.n = 16;
              break;
            case 15:
              _context2.p = 15;
              _t2 = _context2.v;
              console.error('Error handling message:', _t2);
              sendResponse({
                success: false,
                error: _t2.message
              });
            case 16:
              return _context2.a(2);
          }
        }, _callee2, this, [[0, 15]]);
      }));
      function handleMessage(_x, _x2, _x3) {
        return _handleMessage.apply(this, arguments);
      }
      return handleMessage;
    }()
  }, {
    key: "startTraining",
    value: function () {
      var _startTraining = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(trainingConfig, tabId) {
        var message;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.n) {
            case 0:
              if (tabId) {
                _context3.n = 1;
                break;
              }
              throw new Error('No tab ID provided for training');
            case 1:
              message = {
                type: 'START_TRAINING_MODE',
                data: trainingConfig
              };
              _context3.n = 2;
              return chrome.tabs.sendMessage(tabId, message);
            case 2:
              console.log('Training mode started for tab:', tabId);
            case 3:
              return _context3.a(2);
          }
        }, _callee3);
      }));
      function startTraining(_x4, _x5) {
        return _startTraining.apply(this, arguments);
      }
      return startTraining;
    }()
  }, {
    key: "stopTraining",
    value: function () {
      var _stopTraining = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(tabId) {
        var message;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.n) {
            case 0:
              if (tabId) {
                _context4.n = 1;
                break;
              }
              return _context4.a(2);
            case 1:
              message = {
                type: 'STOP_TRAINING_MODE'
              };
              _context4.n = 2;
              return chrome.tabs.sendMessage(tabId, message);
            case 2:
              console.log('Training mode stopped for tab:', tabId);
            case 3:
              return _context4.a(2);
          }
        }, _callee4);
      }));
      function stopTraining(_x6) {
        return _stopTraining.apply(this, arguments);
      }
      return stopTraining;
    }()
  }, {
    key: "saveTrainingData",
    value: function () {
      var _saveTrainingData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(trainingData) {
        var _yield$chrome$storage, trainingSessions;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.n) {
            case 0:
              _context5.n = 1;
              return chrome.storage.local.get(['trainingSessions']);
            case 1:
              _yield$chrome$storage = _context5.v;
              trainingSessions = _yield$chrome$storage.trainingSessions;
              trainingSessions.push(_objectSpread(_objectSpread({}, trainingData), {}, {
                id: Date.now().toString(),
                createdAt: new Date().toISOString()
              }));
              _context5.n = 2;
              return chrome.storage.local.set({
                trainingSessions: trainingSessions
              });
            case 2:
              console.log('Training data saved:', trainingData);
            case 3:
              return _context5.a(2);
          }
        }, _callee5);
      }));
      function saveTrainingData(_x7) {
        return _saveTrainingData.apply(this, arguments);
      }
      return saveTrainingData;
    }()
  }, {
    key: "getTrainingSessions",
    value: function () {
      var _getTrainingSessions = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
        var _yield$chrome$storage2, trainingSessions;
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.n) {
            case 0:
              _context6.n = 1;
              return chrome.storage.local.get(['trainingSessions']);
            case 1:
              _yield$chrome$storage2 = _context6.v;
              trainingSessions = _yield$chrome$storage2.trainingSessions;
              return _context6.a(2, trainingSessions || []);
          }
        }, _callee6);
      }));
      function getTrainingSessions() {
        return _getTrainingSessions.apply(this, arguments);
      }
      return getTrainingSessions;
    }()
  }, {
    key: "executeScraping",
    value: function () {
      var _executeScraping = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(scrapingConfig, tabId) {
        var message;
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.n) {
            case 0:
              if (tabId) {
                _context7.n = 1;
                break;
              }
              throw new Error('No tab ID provided for scraping');
            case 1:
              message = {
                type: 'EXECUTE_SCRAPING',
                data: scrapingConfig
              };
              _context7.n = 2;
              return chrome.tabs.sendMessage(tabId, message);
            case 2:
              console.log('Scraping executed for tab:', tabId);
            case 3:
              return _context7.a(2);
          }
        }, _callee7);
      }));
      function executeScraping(_x8, _x9) {
        return _executeScraping.apply(this, arguments);
      }
      return executeScraping;
    }()
  }, {
    key: "getScrapedData",
    value: function () {
      var _getScrapedData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
        var _yield$chrome$storage3, scrapedData;
        return _regenerator().w(function (_context8) {
          while (1) switch (_context8.n) {
            case 0:
              _context8.n = 1;
              return chrome.storage.local.get(['scrapedData']);
            case 1:
              _yield$chrome$storage3 = _context8.v;
              scrapedData = _yield$chrome$storage3.scrapedData;
              return _context8.a(2, scrapedData || []);
          }
        }, _callee8);
      }));
      function getScrapedData() {
        return _getScrapedData.apply(this, arguments);
      }
      return getScrapedData;
    }()
  }, {
    key: "handleTabUpdate",
    value: function handleTabUpdate(tabId, tab) {
      // Inject content script if needed
      if (tab.url && tab.url.startsWith('http')) {
        console.log('Tab updated:', tabId, tab.url);
      }
    }
  }]);
}(); // Initialize background service
new BackgroundService();
/******/ })()
;
//# sourceMappingURL=background.js.map