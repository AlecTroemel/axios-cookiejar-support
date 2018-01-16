"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _toughCookie = _interopRequireDefault(require("tough-cookie"));

var _pify = _interopRequireDefault(require("pify"));

var _isAbsoluteURL = _interopRequireDefault(require("axios/lib/helpers/isAbsoluteURL"));

var _combineURLs = _interopRequireDefault(require("axios/lib/helpers/combineURLs"));

var _symbol = _interopRequireDefault(require("../symbol"));

Function.prototype.$asyncspawn = function $asyncspawn(promiseProvider, self) {
  if (!Function.prototype.$asyncspawn) {
    Object.defineProperty(Function.prototype, "$asyncspawn", {
      value: $asyncspawn,
      enumerable: false,
      configurable: true,
      writable: true
    });
  }

  if (!(this instanceof Function)) return;
  var genF = this;
  return new promiseProvider(function enough(resolve, reject) {
    var gen = genF.call(self, resolve, reject);

    function step(fn, arg) {
      var next;

      try {
        next = fn.call(gen, arg);

        if (next.done) {
          if (next.value !== resolve) {
            if (next.value && next.value === next.value.then) return next.value(resolve, reject);
            resolve && resolve(next.value);
            resolve = null;
          }

          return;
        }

        if (next.value.then) {
          next.value.then(function (v) {
            step(gen.next, v);
          }, function (e) {
            step(gen.throw, e);
          });
        } else {
          step(gen.next, next.value);
        }
      } catch (e) {
        reject && reject(e);
        reject = null;
        return;
      }
    }

    step(gen.next);
  });
};

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function requestInterceptor(config, instance) {
  return function* ($return, $error) {
    const local = config[_symbol.default] || {};
    config[_symbol.default] = local;
    local.backupOptions = local.backupOptions || {};

    if (instance.defaults.jar === true) {
      instance.defaults.jar = new _toughCookie.default.CookieJar();
    }

    if (!local.jar) {
      if (config.jar === true) {
        local.jar = instance.defaults.jar || new _toughCookie.default.CookieJar();
      } else if (config.jar === false) {
        local.jar = false;
      } else {
        local.jar = config.jar || instance.defaults.jar;
      }
    } // Redirect Setup


    Object.assign(local, {
      redirectCount: isFinite(config.maxRedirects) ? config.maxRedirects : 5
    });
    Object.assign(local.backupOptions, config, local.backupOptions);
    Object.assign(config, {
      maxRedirects: 0
    });
    delete config.validateStatus; // Cookies Setup

    if (local.jar && config.withCredentials) {
      const getCookieString = (0, _pify.default)(local.jar.getCookieString.bind(local.jar));
      const requestUrl = config.baseURL && !(0, _isAbsoluteURL.default)(config.url) ? (0, _combineURLs.default)(config.baseURL, config.url) : config.url;
      const cookieString = yield getCookieString(requestUrl);

      if (cookieString) {
        const currentCookie = config.headers['Cookie'];
        config.headers['Cookie'] = [currentCookie, cookieString].filter(c => !!c).join(';\x20');
      }
    }

    return config;
  }.$asyncspawn(Promise, this);
}

var _default = requestInterceptor;
exports.default = _default;