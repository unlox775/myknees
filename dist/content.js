/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/css-loader/dist/cjs.js!./src/content.css":
/*!***************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/content.css ***!
  \***************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `/* AI Data Scraper Content Script Styles */

#ai-scraper-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999999;
}

.ai-scraper-overlay {
  position: absolute;
  pointer-events: none;
  z-index: 1000000;
  transition: all 0.2s ease;
}

.ai-scraper-selected {
  border: 2px solid #4CAF50 !important;
  background-color: rgba(76, 175, 80, 0.2) !important;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.5) !important;
}

.ai-scraper-excluded {
  border: 2px solid #f44336 !important;
  background-color: rgba(244, 67, 54, 0.2) !important;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.5) !important;
}

#ai-scraper-training-ui {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000001;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-width: 300px;
}

.training-panel {
  padding: 20px;
}

.training-panel h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.training-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
}

.training-stats span {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.training-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.training-controls button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.training-controls button:first-child {
  background: #4CAF50;
  color: white;
}

.training-controls button:first-child:hover {
  background: #45a049;
}

.training-controls button:last-child {
  background: #f44336;
  color: white;
}

.training-controls button:last-child:hover {
  background: #da190b;
}

.training-help {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.training-help p {
  margin: 5px 0;
}

/* Element preview styles */
.element-preview {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  max-width: 200px;
  z-index: 1000002;
  pointer-events: none;
}

/* Cursor styles during training */
body.ai-scraper-training {
  cursor: crosshair !important;
}

body.ai-scraper-training * {
  cursor: crosshair !important;
}

/* Animation for selected elements */
@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.ai-scraper-selected {
  animation: pulse 2s infinite;
}

/* Responsive design */
@media (max-width: 768px) {
  #ai-scraper-training-ui {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
  }
  
  .training-panel {
    padding: 15px;
  }
  
  .training-controls {
    flex-direction: column;
  }
}`, "",{"version":3,"sources":["webpack://./src/content.css"],"names":[],"mappings":"AAAA,0CAA0C;;AAE1C;EACE,eAAe;EACf,MAAM;EACN,OAAO;EACP,WAAW;EACX,YAAY;EACZ,oBAAoB;EACpB,eAAe;AACjB;;AAEA;EACE,kBAAkB;EAClB,oBAAoB;EACpB,gBAAgB;EAChB,yBAAyB;AAC3B;;AAEA;EACE,oCAAoC;EACpC,mDAAmD;EACnD,sDAAsD;AACxD;;AAEA;EACE,oCAAoC;EACpC,mDAAmD;EACnD,sDAAsD;AACxD;;AAEA;EACE,eAAe;EACf,SAAS;EACT,WAAW;EACX,gBAAgB;EAChB,iBAAiB;EACjB,sBAAsB;EACtB,kBAAkB;EAClB,0CAA0C;EAC1C,8EAA8E;EAC9E,gBAAgB;AAClB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,kBAAkB;EAClB,WAAW;EACX,eAAe;EACf,gBAAgB;AAClB;;AAEA;EACE,aAAa;EACb,8BAA8B;EAC9B,mBAAmB;EACnB,eAAe;EACf,WAAW;AACb;;AAEA;EACE,mBAAmB;EACnB,gBAAgB;EAChB,kBAAkB;AACpB;;AAEA;EACE,aAAa;EACb,SAAS;EACT,mBAAmB;AACrB;;AAEA;EACE,OAAO;EACP,iBAAiB;EACjB,YAAY;EACZ,kBAAkB;EAClB,eAAe;EACf,eAAe;EACf,iCAAiC;AACnC;;AAEA;EACE,mBAAmB;EACnB,YAAY;AACd;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,mBAAmB;EACnB,YAAY;AACd;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,eAAe;EACf,WAAW;EACX,gBAAgB;AAClB;;AAEA;EACE,aAAa;AACf;;AAEA,2BAA2B;AAC3B;EACE,eAAe;EACf,8BAA8B;EAC9B,YAAY;EACZ,iBAAiB;EACjB,kBAAkB;EAClB,eAAe;EACf,gBAAgB;EAChB,gBAAgB;EAChB,oBAAoB;AACtB;;AAEA,kCAAkC;AAClC;EACE,4BAA4B;AAC9B;;AAEA;EACE,4BAA4B;AAC9B;;AAEA,oCAAoC;AACpC;EACE,KAAK,YAAY,EAAE;EACnB,MAAM,UAAU,EAAE;EAClB,OAAO,YAAY,EAAE;AACvB;;AAEA;EACE,4BAA4B;AAC9B;;AAEA,sBAAsB;AACtB;EACE;IACE,SAAS;IACT,WAAW;IACX,UAAU;IACV,eAAe;EACjB;;EAEA;IACE,aAAa;EACf;;EAEA;IACE,sBAAsB;EACxB;AACF","sourcesContent":["/* AI Data Scraper Content Script Styles */\n\n#ai-scraper-overlay {\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  z-index: 999999;\n}\n\n.ai-scraper-overlay {\n  position: absolute;\n  pointer-events: none;\n  z-index: 1000000;\n  transition: all 0.2s ease;\n}\n\n.ai-scraper-selected {\n  border: 2px solid #4CAF50 !important;\n  background-color: rgba(76, 175, 80, 0.2) !important;\n  box-shadow: 0 0 10px rgba(76, 175, 80, 0.5) !important;\n}\n\n.ai-scraper-excluded {\n  border: 2px solid #f44336 !important;\n  background-color: rgba(244, 67, 54, 0.2) !important;\n  box-shadow: 0 0 10px rgba(244, 67, 54, 0.5) !important;\n}\n\n#ai-scraper-training-ui {\n  position: fixed;\n  top: 20px;\n  right: 20px;\n  z-index: 1000001;\n  background: white;\n  border: 1px solid #ddd;\n  border-radius: 8px;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  min-width: 300px;\n}\n\n.training-panel {\n  padding: 20px;\n}\n\n.training-panel h3 {\n  margin: 0 0 15px 0;\n  color: #333;\n  font-size: 16px;\n  font-weight: 600;\n}\n\n.training-stats {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 15px;\n  font-size: 14px;\n  color: #666;\n}\n\n.training-stats span {\n  background: #f5f5f5;\n  padding: 4px 8px;\n  border-radius: 4px;\n}\n\n.training-controls {\n  display: flex;\n  gap: 10px;\n  margin-bottom: 15px;\n}\n\n.training-controls button {\n  flex: 1;\n  padding: 8px 12px;\n  border: none;\n  border-radius: 4px;\n  font-size: 14px;\n  cursor: pointer;\n  transition: background-color 0.2s;\n}\n\n.training-controls button:first-child {\n  background: #4CAF50;\n  color: white;\n}\n\n.training-controls button:first-child:hover {\n  background: #45a049;\n}\n\n.training-controls button:last-child {\n  background: #f44336;\n  color: white;\n}\n\n.training-controls button:last-child:hover {\n  background: #da190b;\n}\n\n.training-help {\n  font-size: 12px;\n  color: #666;\n  line-height: 1.4;\n}\n\n.training-help p {\n  margin: 5px 0;\n}\n\n/* Element preview styles */\n.element-preview {\n  position: fixed;\n  background: rgba(0, 0, 0, 0.8);\n  color: white;\n  padding: 8px 12px;\n  border-radius: 4px;\n  font-size: 12px;\n  max-width: 200px;\n  z-index: 1000002;\n  pointer-events: none;\n}\n\n/* Cursor styles during training */\nbody.ai-scraper-training {\n  cursor: crosshair !important;\n}\n\nbody.ai-scraper-training * {\n  cursor: crosshair !important;\n}\n\n/* Animation for selected elements */\n@keyframes pulse {\n  0% { opacity: 0.6; }\n  50% { opacity: 1; }\n  100% { opacity: 0.6; }\n}\n\n.ai-scraper-selected {\n  animation: pulse 2s infinite;\n}\n\n/* Responsive design */\n@media (max-width: 768px) {\n  #ai-scraper-training-ui {\n    top: 10px;\n    right: 10px;\n    left: 10px;\n    min-width: auto;\n  }\n  \n  .training-panel {\n    padding: 15px;\n  }\n  \n  .training-controls {\n    flex-direction: column;\n  }\n}"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/api.js":
/*!*****************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/api.js ***!
  \*****************************************************/
/***/ ((module) => {



/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
module.exports = function (cssWithMappingToString) {
  var list = [];

  // return the list of modules as css string
  list.toString = function toString() {
    return this.map(function (item) {
      var content = "";
      var needLayer = typeof item[5] !== "undefined";
      if (item[4]) {
        content += "@supports (".concat(item[4], ") {");
      }
      if (item[2]) {
        content += "@media ".concat(item[2], " {");
      }
      if (needLayer) {
        content += "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {");
      }
      content += cssWithMappingToString(item);
      if (needLayer) {
        content += "}";
      }
      if (item[2]) {
        content += "}";
      }
      if (item[4]) {
        content += "}";
      }
      return content;
    }).join("");
  };

  // import a list of modules into the list
  list.i = function i(modules, media, dedupe, supports, layer) {
    if (typeof modules === "string") {
      modules = [[null, modules, undefined]];
    }
    var alreadyImportedModules = {};
    if (dedupe) {
      for (var k = 0; k < this.length; k++) {
        var id = this[k][0];
        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }
    for (var _k = 0; _k < modules.length; _k++) {
      var item = [].concat(modules[_k]);
      if (dedupe && alreadyImportedModules[item[0]]) {
        continue;
      }
      if (typeof layer !== "undefined") {
        if (typeof item[5] === "undefined") {
          item[5] = layer;
        } else {
          item[1] = "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {").concat(item[1], "}");
          item[5] = layer;
        }
      }
      if (media) {
        if (!item[2]) {
          item[2] = media;
        } else {
          item[1] = "@media ".concat(item[2], " {").concat(item[1], "}");
          item[2] = media;
        }
      }
      if (supports) {
        if (!item[4]) {
          item[4] = "".concat(supports);
        } else {
          item[1] = "@supports (".concat(item[4], ") {").concat(item[1], "}");
          item[4] = supports;
        }
      }
      list.push(item);
    }
  };
  return list;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/sourceMaps.js":
/*!************************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/sourceMaps.js ***!
  \************************************************************/
/***/ ((module) => {



module.exports = function (item) {
  var content = item[1];
  var cssMapping = item[3];
  if (!cssMapping) {
    return content;
  }
  if (typeof btoa === "function") {
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    return [content].concat([sourceMapping]).join("\n");
  }
  return [content].join("\n");
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!****************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \****************************************************************************/
/***/ ((module) => {



var stylesInDOM = [];
function getIndexByIdentifier(identifier) {
  var result = -1;
  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }
  return result;
}
function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };
    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }
    identifiers.push(identifier);
  }
  return identifiers;
}
function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);
  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }
      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };
  return updater;
}
module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];
    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }
    var newLastIdentifiers = modulesToDom(newList, options);
    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];
      var _index = getIndexByIdentifier(_identifier);
      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();
        stylesInDOM.splice(_index, 1);
      }
    }
    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertBySelector.js":
/*!********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertBySelector.js ***!
  \********************************************************************/
/***/ ((module) => {



var memo = {};

/* istanbul ignore next  */
function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target);

    // Special case to return head of iframe instead of iframe itself
    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }
    memo[target] = styleTarget;
  }
  return memo[target];
}

/* istanbul ignore next  */
function insertBySelector(insert, style) {
  var target = getTarget(insert);
  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }
  target.appendChild(style);
}
module.exports = insertBySelector;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertStyleElement.js":
/*!**********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertStyleElement.js ***!
  \**********************************************************************/
/***/ ((module) => {



/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}
module.exports = insertStyleElement;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js ***!
  \**********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;
  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}
module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleDomAPI.js":
/*!***************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleDomAPI.js ***!
  \***************************************************************/
/***/ ((module) => {



/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";
  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }
  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }
  var needLayer = typeof obj.layer !== "undefined";
  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }
  css += obj.css;
  if (needLayer) {
    css += "}";
  }
  if (obj.media) {
    css += "}";
  }
  if (obj.supports) {
    css += "}";
  }
  var sourceMap = obj.sourceMap;
  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  }

  // For old IE
  /* istanbul ignore if  */
  options.styleTagTransform(css, styleElement, options.options);
}
function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }
  styleElement.parentNode.removeChild(styleElement);
}

/* istanbul ignore next  */
function domAPI(options) {
  if (typeof document === "undefined") {
    return {
      update: function update() {},
      remove: function remove() {}
    };
  }
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}
module.exports = domAPI;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleTagTransform.js":
/*!*********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleTagTransform.js ***!
  \*********************************************************************/
/***/ ((module) => {



/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }
    styleElement.appendChild(document.createTextNode(css));
  }
}
module.exports = styleTagTransform;

/***/ }),

/***/ "./src/content.css":
/*!*************************!*\
  !*** ./src/content.css ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_content_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!./content.css */ "./node_modules/css-loader/dist/cjs.js!./src/content.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_content_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_content_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_content_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_content_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!************************!*\
  !*** ./src/content.js ***!
  \************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _content_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./content.css */ "./src/content.css");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Content script for AI Data Scraper extension


var ContentScript = /*#__PURE__*/function () {
  function ContentScript() {
    _classCallCheck(this, ContentScript);
    this.isTrainingMode = false;
    this.selectedElements = [];
    this.excludedElements = [];
    this.overlayContainer = null;
    this.trainingConfig = null;
    this.initialize();
  }
  return _createClass(ContentScript, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        _this.handleMessage(message, sender, sendResponse);
        return true;
      });

      // Create overlay container
      this.createOverlayContainer();

      // Add keyboard shortcuts
      this.addKeyboardShortcuts();
      console.log('AI Data Scraper content script initialized');
    }
  }, {
    key: "createOverlayContainer",
    value: function createOverlayContainer() {
      this.overlayContainer = document.createElement('div');
      this.overlayContainer.id = 'ai-scraper-overlay';
      this.overlayContainer.style.cssText = "\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n      pointer-events: none;\n      z-index: 999999;\n      display: none;\n    ";
      document.body.appendChild(this.overlayContainer);
    }
  }, {
    key: "addKeyboardShortcuts",
    value: function addKeyboardShortcuts() {
      var _this2 = this;
      document.addEventListener('keydown', function (event) {
        // Ctrl+Shift+S to start/stop training
        if (event.ctrlKey && event.shiftKey && event.key === 'S') {
          event.preventDefault();
          _this2.toggleTrainingMode();
        }

        // Escape to stop training
        if (event.key === 'Escape' && _this2.isTrainingMode) {
          _this2.stopTrainingMode();
        }
      });
    }
  }, {
    key: "handleMessage",
    value: function () {
      var _handleMessage = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(message, sender, sendResponse) {
        var _t, _t2;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              _context.p = 0;
              _t = message.type;
              _context.n = _t === 'START_TRAINING_MODE' ? 1 : _t === 'STOP_TRAINING_MODE' ? 3 : _t === 'EXECUTE_SCRAPING' ? 5 : 7;
              break;
            case 1:
              _context.n = 2;
              return this.startTrainingMode(message.data);
            case 2:
              sendResponse({
                success: true
              });
              return _context.a(3, 8);
            case 3:
              _context.n = 4;
              return this.stopTrainingMode();
            case 4:
              sendResponse({
                success: true
              });
              return _context.a(3, 8);
            case 5:
              _context.n = 6;
              return this.executeScraping(message.data);
            case 6:
              sendResponse({
                success: true
              });
              return _context.a(3, 8);
            case 7:
              console.warn('Unknown message type in content script:', message.type);
              sendResponse({
                success: false,
                error: 'Unknown message type'
              });
            case 8:
              _context.n = 10;
              break;
            case 9:
              _context.p = 9;
              _t2 = _context.v;
              console.error('Error handling message in content script:', _t2);
              sendResponse({
                success: false,
                error: _t2.message
              });
            case 10:
              return _context.a(2);
          }
        }, _callee, this, [[0, 9]]);
      }));
      function handleMessage(_x, _x2, _x3) {
        return _handleMessage.apply(this, arguments);
      }
      return handleMessage;
    }()
  }, {
    key: "startTrainingMode",
    value: function () {
      var _startTrainingMode = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(config) {
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.n) {
            case 0:
              this.isTrainingMode = true;
              this.trainingConfig = config;
              this.selectedElements = [];
              this.excludedElements = [];
              this.showOverlay();
              this.addElementSelectionHandlers();
              this.showTrainingUI();
              console.log('Training mode started');
            case 1:
              return _context2.a(2);
          }
        }, _callee2, this);
      }));
      function startTrainingMode(_x4) {
        return _startTrainingMode.apply(this, arguments);
      }
      return startTrainingMode;
    }()
  }, {
    key: "stopTrainingMode",
    value: function () {
      var _stopTrainingMode = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.n) {
            case 0:
              this.isTrainingMode = false;
              this.hideOverlay();
              this.removeElementSelectionHandlers();
              this.hideTrainingUI();

              // Save training data
              if (!(this.selectedElements.length > 0)) {
                _context3.n = 1;
                break;
              }
              _context3.n = 1;
              return this.saveTrainingData();
            case 1:
              console.log('Training mode stopped');
            case 2:
              return _context3.a(2);
          }
        }, _callee3, this);
      }));
      function stopTrainingMode() {
        return _stopTrainingMode.apply(this, arguments);
      }
      return stopTrainingMode;
    }()
  }, {
    key: "showOverlay",
    value: function showOverlay() {
      this.overlayContainer.style.display = 'block';
      this.overlayContainer.style.pointerEvents = 'auto';
    }
  }, {
    key: "hideOverlay",
    value: function hideOverlay() {
      this.overlayContainer.style.display = 'none';
      this.overlayContainer.style.pointerEvents = 'none';
      this.clearOverlays();
    }
  }, {
    key: "addElementSelectionHandlers",
    value: function addElementSelectionHandlers() {
      document.addEventListener('click', this.handleElementClick.bind(this), true);
      document.addEventListener('mouseover', this.handleElementHover.bind(this), true);
      document.addEventListener('mouseout', this.handleElementMouseOut.bind(this), true);
    }
  }, {
    key: "removeElementSelectionHandlers",
    value: function removeElementSelectionHandlers() {
      document.removeEventListener('click', this.handleElementClick.bind(this), true);
      document.removeEventListener('mouseover', this.handleElementHover.bind(this), true);
      document.removeEventListener('mouseout', this.handleElementMouseOut.bind(this), true);
    }
  }, {
    key: "handleElementClick",
    value: function handleElementClick(event) {
      if (!this.isTrainingMode) return;
      event.preventDefault();
      event.stopPropagation();
      var element = event.target;
      var elementInfo = this.getElementInfo(element);
      if (event.ctrlKey) {
        // Ctrl+click to exclude element
        this.excludeElement(element, elementInfo);
      } else {
        // Regular click to select element
        this.selectElement(element, elementInfo);
      }
    }
  }, {
    key: "handleElementHover",
    value: function handleElementHover(event) {
      if (!this.isTrainingMode) return;
      var element = event.target;
      this.showElementPreview(element);
    }
  }, {
    key: "handleElementMouseOut",
    value: function handleElementMouseOut(event) {
      if (!this.isTrainingMode) return;
      this.hideElementPreview();
    }
  }, {
    key: "selectElement",
    value: function selectElement(element, elementInfo) {
      if (this.selectedElements.some(function (el) {
        return el.element === element;
      })) {
        // Remove if already selected
        this.selectedElements = this.selectedElements.filter(function (el) {
          return el.element !== element;
        });
        this.removeElementOverlay(element);
      } else {
        // Add to selection
        this.selectedElements.push({
          element: element,
          info: elementInfo
        });
        this.addElementOverlay(element, 'selected');
      }
      this.updateTrainingUI();
    }
  }, {
    key: "excludeElement",
    value: function excludeElement(element, elementInfo) {
      if (this.excludedElements.some(function (el) {
        return el.element === element;
      })) {
        // Remove if already excluded
        this.excludedElements = this.excludedElements.filter(function (el) {
          return el.element !== element;
        });
        this.removeElementOverlay(element);
      } else {
        // Add to exclusions
        this.excludedElements.push({
          element: element,
          info: elementInfo
        });
        this.addElementOverlay(element, 'excluded');
      }
      this.updateTrainingUI();
    }
  }, {
    key: "getElementInfo",
    value: function getElementInfo(element) {
      var _element$textContent;
      return {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        textContent: (_element$textContent = element.textContent) === null || _element$textContent === void 0 ? void 0 : _element$textContent.trim().substring(0, 100),
        attributes: this.getElementAttributes(element),
        xpath: this.getElementXPath(element),
        cssSelector: this.getElementCSSSelector(element)
      };
    }
  }, {
    key: "getElementAttributes",
    value: function getElementAttributes(element) {
      var attributes = {};
      var _iterator = _createForOfIteratorHelper(element.attributes),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var attr = _step.value;
          attributes[attr.name] = attr.value;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      return attributes;
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
    key: "getElementCSSSelector",
    value: function getElementCSSSelector(element) {
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
    key: "addElementOverlay",
    value: function addElementOverlay(element, type) {
      var rect = element.getBoundingClientRect();
      var overlay = document.createElement('div');
      overlay.className = "ai-scraper-overlay ai-scraper-".concat(type);
      overlay.style.cssText = "\n      position: absolute;\n      top: ".concat(rect.top + window.scrollY, "px;\n      left: ").concat(rect.left + window.scrollX, "px;\n      width: ").concat(rect.width, "px;\n      height: ").concat(rect.height, "px;\n      border: 2px solid ").concat(type === 'selected' ? '#4CAF50' : '#f44336', ";\n      background-color: ").concat(type === 'selected' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)', ";\n      pointer-events: none;\n      z-index: 1000000;\n    ");
      this.overlayContainer.appendChild(overlay);
    }
  }, {
    key: "removeElementOverlay",
    value: function removeElementOverlay(element) {
      var overlays = this.overlayContainer.querySelectorAll('.ai-scraper-overlay');
      overlays.forEach(function (overlay) {
        var rect = element.getBoundingClientRect();
        var overlayRect = overlay.getBoundingClientRect();
        if (rect.top === overlayRect.top && rect.left === overlayRect.left) {
          overlay.remove();
        }
      });
    }
  }, {
    key: "clearOverlays",
    value: function clearOverlays() {
      var overlays = this.overlayContainer.querySelectorAll('.ai-scraper-overlay');
      overlays.forEach(function (overlay) {
        return overlay.remove();
      });
    }
  }, {
    key: "showElementPreview",
    value: function showElementPreview(element) {
      // Implementation for showing element preview on hover
    }
  }, {
    key: "hideElementPreview",
    value: function hideElementPreview() {
      // Implementation for hiding element preview
    }
  }, {
    key: "showTrainingUI",
    value: function showTrainingUI() {
      // Create training UI overlay
      var trainingUI = document.createElement('div');
      trainingUI.id = 'ai-scraper-training-ui';
      trainingUI.innerHTML = "\n      <div class=\"training-panel\">\n        <h3>AI Data Scraper Training</h3>\n        <div class=\"training-stats\">\n          <span>Selected: <span id=\"selected-count\">0</span></span>\n          <span>Excluded: <span id=\"excluded-count\">0</span></span>\n        </div>\n        <div class=\"training-controls\">\n          <button id=\"save-training\">Save Training</button>\n          <button id=\"stop-training\">Stop Training</button>\n        </div>\n        <div class=\"training-help\">\n          <p>Click elements to select them for data extraction</p>\n          <p>Ctrl+Click to exclude elements (ads, etc.)</p>\n          <p>Press Escape to stop training</p>\n        </div>\n      </div>\n    ";
      document.body.appendChild(trainingUI);
      this.bindTrainingUIEvents();
    }
  }, {
    key: "hideTrainingUI",
    value: function hideTrainingUI() {
      var trainingUI = document.getElementById('ai-scraper-training-ui');
      if (trainingUI) {
        trainingUI.remove();
      }
    }
  }, {
    key: "bindTrainingUIEvents",
    value: function bindTrainingUIEvents() {
      var _document$getElementB,
        _this3 = this,
        _document$getElementB2;
      (_document$getElementB = document.getElementById('save-training')) === null || _document$getElementB === void 0 || _document$getElementB.addEventListener('click', function () {
        _this3.saveTrainingData();
      });
      (_document$getElementB2 = document.getElementById('stop-training')) === null || _document$getElementB2 === void 0 || _document$getElementB2.addEventListener('click', function () {
        _this3.stopTrainingMode();
      });
    }
  }, {
    key: "updateTrainingUI",
    value: function updateTrainingUI() {
      var selectedCount = document.getElementById('selected-count');
      var excludedCount = document.getElementById('excluded-count');
      if (selectedCount) {
        selectedCount.textContent = this.selectedElements.length;
      }
      if (excludedCount) {
        excludedCount.textContent = this.excludedElements.length;
      }
    }
  }, {
    key: "saveTrainingData",
    value: function () {
      var _saveTrainingData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
        var trainingData;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.n) {
            case 0:
              trainingData = {
                url: window.location.href,
                timestamp: new Date().toISOString(),
                selectedElements: this.selectedElements.map(function (item) {
                  return item.info;
                }),
                excludedElements: this.excludedElements.map(function (item) {
                  return item.info;
                }),
                config: this.trainingConfig
              };
              _context4.n = 1;
              return chrome.runtime.sendMessage({
                type: 'SAVE_TRAINING_DATA',
                data: trainingData
              });
            case 1:
              console.log('Training data saved:', trainingData);
            case 2:
              return _context4.a(2);
          }
        }, _callee4, this);
      }));
      function saveTrainingData() {
        return _saveTrainingData.apply(this, arguments);
      }
      return saveTrainingData;
    }()
  }, {
    key: "executeScraping",
    value: function () {
      var _executeScraping = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(config) {
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.n) {
            case 0:
              // Implementation for executing scraping based on training data
              console.log('Executing scraping with config:', config);
            case 1:
              return _context5.a(2);
          }
        }, _callee5);
      }));
      function executeScraping(_x5) {
        return _executeScraping.apply(this, arguments);
      }
      return executeScraping;
    }()
  }, {
    key: "toggleTrainingMode",
    value: function toggleTrainingMode() {
      if (this.isTrainingMode) {
        this.stopTrainingMode();
      } else {
        this.startTrainingMode({});
      }
    }
  }]);
}(); // Initialize content script
new ContentScript();
})();

/******/ })()
;
//# sourceMappingURL=content.js.map