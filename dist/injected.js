/******/ (() => { // webpackBootstrap
/*!*************************!*\
  !*** ./src/injected.js ***!
  \*************************/
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Injected script for advanced DOM manipulation and data extraction
var DataExtractor = /*#__PURE__*/function () {
  function DataExtractor() {
    _classCallCheck(this, DataExtractor);
    this.extractedData = [];
    this.initialize();
  }
  return _createClass(DataExtractor, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;
      // Listen for messages from content script
      window.addEventListener('message', function (event) {
        if (event.source !== window) return;
        if (event.data.type && event.data.type.startsWith('AI_SCRAPER_')) {
          _this.handleMessage(event.data);
        }
      });
      console.log('AI Data Scraper injected script initialized');
    }
  }, {
    key: "handleMessage",
    value: function handleMessage(message) {
      switch (message.type) {
        case 'AI_SCRAPER_EXTRACT_DATA':
          this.extractDataFromPage(message.data);
          break;
        case 'AI_SCRAPER_ANALYZE_PAGINATION':
          this.analyzePagination();
          break;
        case 'AI_SCRAPER_NAVIGATE_PAGE':
          this.navigateToPage(message.data);
          break;
        default:
          console.warn('Unknown message type in injected script:', message.type);
      }
    }
  }, {
    key: "extractDataFromPage",
    value: function () {
      var _extractDataFromPage = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(config) {
        var selectors, exclusions, extractedItems, elements, filteredElements, _iterator, _step, element, itemData;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              try {
                selectors = config.selectors, exclusions = config.exclusions;
                extractedItems = []; // Find all matching elements
                elements = this.findElementsBySelectors(selectors); // Filter out excluded elements
                filteredElements = this.filterExcludedElements(elements, exclusions); // Extract data from each element
                _iterator = _createForOfIteratorHelper(filteredElements);
                try {
                  for (_iterator.s(); !(_step = _iterator.n()).done;) {
                    element = _step.value;
                    itemData = this.extractElementData(element, config);
                    if (itemData) {
                      extractedItems.push(itemData);
                    }
                  }

                  // Send results back to content script
                } catch (err) {
                  _iterator.e(err);
                } finally {
                  _iterator.f();
                }
                this.sendMessage({
                  type: 'AI_SCRAPER_EXTRACTION_COMPLETE',
                  data: {
                    items: extractedItems,
                    totalFound: elements.length,
                    totalExtracted: extractedItems.length,
                    timestamp: new Date().toISOString()
                  }
                });
              } catch (error) {
                console.error('Error extracting data:', error);
                this.sendMessage({
                  type: 'AI_SCRAPER_EXTRACTION_ERROR',
                  error: error.message
                });
              }
            case 1:
              return _context.a(2);
          }
        }, _callee, this);
      }));
      function extractDataFromPage(_x) {
        return _extractDataFromPage.apply(this, arguments);
      }
      return extractDataFromPage;
    }()
  }, {
    key: "findElementsBySelectors",
    value: function findElementsBySelectors(selectors) {
      var elements = [];
      var _iterator2 = _createForOfIteratorHelper(selectors),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var selector = _step2.value;
          try {
            var found = document.querySelectorAll(selector);
            elements.push.apply(elements, _toConsumableArray(Array.from(found)));
          } catch (error) {
            console.warn("Invalid selector: ".concat(selector), error);
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      return elements;
    }
  }, {
    key: "filterExcludedElements",
    value: function filterExcludedElements(elements, exclusions) {
      if (!exclusions || exclusions.length === 0) {
        return elements;
      }
      return elements.filter(function (element) {
        var _iterator3 = _createForOfIteratorHelper(exclusions),
          _step3;
        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var exclusion = _step3.value;
            try {
              if (element.matches(exclusion)) {
                return false;
              }
            } catch (error) {
              console.warn("Invalid exclusion selector: ".concat(exclusion), error);
            }
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
        return true;
      });
    }
  }, {
    key: "extractElementData",
    value: function extractElementData(element, config) {
      var _element$textContent;
      var data = {};

      // Extract basic text content
      data.text = ((_element$textContent = element.textContent) === null || _element$textContent === void 0 ? void 0 : _element$textContent.trim()) || '';

      // Extract attributes
      data.attributes = this.extractAttributes(element);

      // Extract links
      data.links = this.extractLinks(element);

      // Extract images
      data.images = this.extractImages(element);

      // Extract structured data (JSON-LD, microdata, etc.)
      data.structuredData = this.extractStructuredData(element);

      // Extract custom fields based on config
      if (config.fields) {
        for (var _i = 0, _Object$entries = Object.entries(config.fields); _i < _Object$entries.length; _i++) {
          var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
            fieldName = _Object$entries$_i[0],
            fieldConfig = _Object$entries$_i[1];
          data[fieldName] = this.extractCustomField(element, fieldConfig);
        }
      }

      // Add metadata
      data.extractedAt = new Date().toISOString();
      data.elementSelector = this.getElementSelector(element);
      data.elementXPath = this.getElementXPath(element);
      return data;
    }
  }, {
    key: "extractAttributes",
    value: function extractAttributes(element) {
      var attributes = {};
      var _iterator4 = _createForOfIteratorHelper(element.attributes),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var attr = _step4.value;
          attributes[attr.name] = attr.value;
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
      return attributes;
    }
  }, {
    key: "extractLinks",
    value: function extractLinks(element) {
      var links = [];
      var linkElements = element.querySelectorAll('a[href]');
      var _iterator5 = _createForOfIteratorHelper(linkElements),
        _step5;
      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var _link$textContent;
          var link = _step5.value;
          links.push({
            text: (_link$textContent = link.textContent) === null || _link$textContent === void 0 ? void 0 : _link$textContent.trim(),
            href: link.href,
            title: link.title
          });
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }
      return links;
    }
  }, {
    key: "extractImages",
    value: function extractImages(element) {
      var images = [];
      var imgElements = element.querySelectorAll('img');
      var _iterator6 = _createForOfIteratorHelper(imgElements),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var img = _step6.value;
          images.push({
            src: img.src,
            alt: img.alt,
            title: img.title,
            width: img.width,
            height: img.height
          });
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
      return images;
    }
  }, {
    key: "extractStructuredData",
    value: function extractStructuredData(element) {
      var structuredData = [];

      // Extract JSON-LD
      var jsonLdScripts = element.querySelectorAll('script[type="application/ld+json"]');
      var _iterator7 = _createForOfIteratorHelper(jsonLdScripts),
        _step7;
      try {
        for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
          var script = _step7.value;
          try {
            var data = JSON.parse(script.textContent);
            structuredData.push({
              type: 'json-ld',
              data: data
            });
          } catch (error) {
            console.warn('Invalid JSON-LD:', error);
          }
        }

        // Extract microdata
      } catch (err) {
        _iterator7.e(err);
      } finally {
        _iterator7.f();
      }
      var microdataElements = element.querySelectorAll('[itemtype]');
      var _iterator8 = _createForOfIteratorHelper(microdataElements),
        _step8;
      try {
        for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
          var item = _step8.value;
          var itemData = this.extractMicrodata(item);
          if (itemData) {
            structuredData.push({
              type: 'microdata',
              data: itemData
            });
          }
        }
      } catch (err) {
        _iterator8.e(err);
      } finally {
        _iterator8.f();
      }
      return structuredData;
    }
  }, {
    key: "extractMicrodata",
    value: function extractMicrodata(element) {
      var data = {
        type: element.getAttribute('itemtype'),
        properties: {}
      };
      var properties = element.querySelectorAll('[itemprop]');
      var _iterator9 = _createForOfIteratorHelper(properties),
        _step9;
      try {
        for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
          var _prop$textContent;
          var prop = _step9.value;
          var propName = prop.getAttribute('itemprop');
          var propValue = (_prop$textContent = prop.textContent) === null || _prop$textContent === void 0 ? void 0 : _prop$textContent.trim();

          // Handle different property types
          if (prop.hasAttribute('content')) {
            propValue = prop.getAttribute('content');
          } else if (prop.hasAttribute('src')) {
            propValue = prop.getAttribute('src');
          } else if (prop.hasAttribute('href')) {
            propValue = prop.getAttribute('href');
          }
          if (propValue) {
            data.properties[propName] = propValue;
          }
        }
      } catch (err) {
        _iterator9.e(err);
      } finally {
        _iterator9.f();
      }
      return data;
    }
  }, {
    key: "extractCustomField",
    value: function extractCustomField(element, fieldConfig) {
      var _targetElement$textCo, _targetElement$textCo2, _targetElement$textCo3, _targetElement$textCo4;
      var selector = fieldConfig.selector,
        attribute = fieldConfig.attribute,
        type = fieldConfig.type;
      try {
        var targetElement = element;
        if (selector) {
          targetElement = element.querySelector(selector);
          if (!targetElement) return null;
        }
        switch (type) {
          case 'text':
            return (_targetElement$textCo = targetElement.textContent) === null || _targetElement$textCo === void 0 ? void 0 : _targetElement$textCo.trim();
          case 'attribute':
            return targetElement.getAttribute(attribute);
          case 'html':
            return targetElement.innerHTML;
          case 'number':
            var text = (_targetElement$textCo2 = targetElement.textContent) === null || _targetElement$textCo2 === void 0 ? void 0 : _targetElement$textCo2.trim();
            return text ? parseFloat(text.replace(/[^\d.-]/g, '')) : null;
          case 'date':
            var dateText = (_targetElement$textCo3 = targetElement.textContent) === null || _targetElement$textCo3 === void 0 ? void 0 : _targetElement$textCo3.trim();
            return dateText ? new Date(dateText).toISOString() : null;
          default:
            return (_targetElement$textCo4 = targetElement.textContent) === null || _targetElement$textCo4 === void 0 ? void 0 : _targetElement$textCo4.trim();
        }
      } catch (error) {
        console.warn('Error extracting custom field:', error);
        return null;
      }
    }
  }, {
    key: "getElementSelector",
    value: function getElementSelector(element) {
      if (element.id) {
        return "#".concat(element.id);
      }
      if (element.className) {
        var classes = element.className.split(' ').filter(function (c) {
          return c.trim();
        });
        if (classes.length > 0) {
          return ".".concat(classes.join('.'));
        }
      }
      return element.tagName.toLowerCase();
    }
  }, {
    key: "getElementXPath",
    value: function getElementXPath(element) {
      if (element.id) {
        return "//*[@id=\"".concat(element.id, "\"]");
      }
      var path = '';
      while (element && element.nodeType === Node.ELEMENT_NODE) {
        var index = 1;
        var sibling = element.previousSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }
        var tagName = element.tagName.toLowerCase();
        var pathIndex = index > 1 ? "[".concat(index, "]") : '';
        path = "/".concat(tagName).concat(pathIndex).concat(path);
        element = element.parentNode;
      }
      return path;
    }
  }, {
    key: "analyzePagination",
    value: function analyzePagination() {
      var paginationData = {
        hasPagination: false,
        currentPage: null,
        totalPages: null,
        nextPageUrl: null,
        prevPageUrl: null,
        paginationElements: []
      };

      // Look for common pagination patterns
      var paginationSelectors = ['.pagination', '.pager', '.page-numbers', '[class*="pagination"]', '[class*="pager"]', 'nav[aria-label*="pagination"]', 'nav[aria-label*="pager"]'];
      for (var _i2 = 0, _paginationSelectors = paginationSelectors; _i2 < _paginationSelectors.length; _i2++) {
        var selector = _paginationSelectors[_i2];
        var elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          var _paginationData$pagin;
          paginationData.hasPagination = true;
          (_paginationData$pagin = paginationData.paginationElements).push.apply(_paginationData$pagin, _toConsumableArray(Array.from(elements)));
          break;
        }
      }

      // Analyze pagination structure
      if (paginationData.hasPagination) {
        this.analyzePaginationStructure(paginationData);
      }
      this.sendMessage({
        type: 'AI_SCRAPER_PAGINATION_ANALYSIS',
        data: paginationData
      });
    }
  }, {
    key: "analyzePaginationStructure",
    value: function analyzePaginationStructure(paginationData) {
      var paginationElement = paginationData.paginationElements[0];

      // Find current page
      var currentPageSelectors = ['.current', '.active', '[aria-current="page"]', '.page-numbers.current'];
      for (var _i3 = 0, _currentPageSelectors = currentPageSelectors; _i3 < _currentPageSelectors.length; _i3++) {
        var selector = _currentPageSelectors[_i3];
        var current = paginationElement.querySelector(selector);
        if (current) {
          var _current$textContent;
          var pageText = (_current$textContent = current.textContent) === null || _current$textContent === void 0 ? void 0 : _current$textContent.trim();
          paginationData.currentPage = parseInt(pageText) || 1;
          break;
        }
      }

      // Find next/previous links
      var nextLink = paginationElement.querySelector('a[rel="next"], .next, .next-page');
      if (nextLink) {
        paginationData.nextPageUrl = nextLink.href;
      }
      var prevLink = paginationElement.querySelector('a[rel="prev"], .prev, .prev-page');
      if (prevLink) {
        paginationData.prevPageUrl = prevLink.href;
      }

      // Estimate total pages
      var pageNumbers = paginationElement.querySelectorAll('a, .page-numbers');
      if (pageNumbers.length > 0) {
        var numbers = Array.from(pageNumbers).map(function (el) {
          var _el$textContent;
          return parseInt((_el$textContent = el.textContent) === null || _el$textContent === void 0 ? void 0 : _el$textContent.trim());
        }).filter(function (num) {
          return !isNaN(num);
        });
        if (numbers.length > 0) {
          paginationData.totalPages = Math.max.apply(Math, _toConsumableArray(numbers));
        }
      }
    }
  }, {
    key: "navigateToPage",
    value: function navigateToPage(navigationData) {
      var action = navigationData.action,
        url = navigationData.url;
      try {
        switch (action) {
          case 'next':
            if (url) {
              window.location.href = url;
            } else {
              this.clickNextPage();
            }
            break;
          case 'prev':
            if (url) {
              window.location.href = url;
            } else {
              this.clickPrevPage();
            }
            break;
          case 'specific':
            if (url) {
              window.location.href = url;
            }
            break;
          default:
            console.warn('Unknown navigation action:', action);
        }
      } catch (error) {
        console.error('Error navigating to page:', error);
        this.sendMessage({
          type: 'AI_SCRAPER_NAVIGATION_ERROR',
          error: error.message
        });
      }
    }
  }, {
    key: "clickNextPage",
    value: function clickNextPage() {
      var nextSelectors = ['a[rel="next"]', '.next', '.next-page', '.pagination .next', '.pager .next'];
      for (var _i4 = 0, _nextSelectors = nextSelectors; _i4 < _nextSelectors.length; _i4++) {
        var selector = _nextSelectors[_i4];
        var nextButton = document.querySelector(selector);
        if (nextButton) {
          nextButton.click();
          return;
        }
      }
    }
  }, {
    key: "clickPrevPage",
    value: function clickPrevPage() {
      var prevSelectors = ['a[rel="prev"]', '.prev', '.prev-page', '.pagination .prev', '.pager .prev'];
      for (var _i5 = 0, _prevSelectors = prevSelectors; _i5 < _prevSelectors.length; _i5++) {
        var selector = _prevSelectors[_i5];
        var prevButton = document.querySelector(selector);
        if (prevButton) {
          prevButton.click();
          return;
        }
      }
    }
  }, {
    key: "sendMessage",
    value: function sendMessage(message) {
      window.postMessage(message, '*');
    }
  }]);
}(); // Initialize data extractor
new DataExtractor();
/******/ })()
;
//# sourceMappingURL=injected.js.map