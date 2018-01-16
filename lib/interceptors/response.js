"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _url = _interopRequireDefault(require("url"));

var _settle = _interopRequireDefault(require("axios/lib/core/settle"));

var _pify = _interopRequireDefault(require("pify"));

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

function responseInterceptor(response, instance) {
  return function* ($return, $error) {
    // Set Cookies
    const config = response.config;
    const headers = response.headers;
    const local = config[_symbol.default];

    if (local.jar && headers['set-cookie']) {
      const setCookie = (0, _pify.default)(local.jar.setCookie.bind(local.jar));
      const setCookiePromiseList = [];

      if (Array.isArray(headers['set-cookie'])) {
        const cookies = headers['set-cookie'];
        cookies.forEach(function (cookie) {
          setCookiePromiseList.push(setCookie(cookie, config.url, config.setCookieOptions));
        });
      } else {
        const cookie = headers['set-cookie'];
        setCookiePromiseList.push(setCookie(cookie, config.url, config.setCookieOptions));
      }

      yield Promise.all(setCookiePromiseList);
    } // Redirect


    Object.assign(local.backupOptions, config, local.backupOptions);
    delete config.baseURL;
    config.url = _url.default.resolve(config.url, headers['location'] || '');
    local.redirectCount--;

    if (local.redirectCount >= 0 && !!headers['location']) {
      if (response.status !== 307) {
        config.method = 'get';
      }

      config.maxRedirects = local.redirectCount;
      return instance.request(config);
    } // Restore


    if (local) {
      Object.assign(config, local.backupOptions);
    }

    if (local && local.jar) {
      if (instance.defaults.jar && (!config.jar || config.jar === true)) {
        instance.defaults.jar = local.jar;
      }

      config.jar = local.jar;
    }

    delete config[_symbol.default]; // Validate

    yield new Promise(function (resolve, reject) {
      (0, _settle.default)(resolve, reject, response);
    });
    return response;
  }.$asyncspawn(Promise, this);
}

var _default = responseInterceptor;
exports.default = _default;