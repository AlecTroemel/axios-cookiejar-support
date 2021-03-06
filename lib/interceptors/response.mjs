import url from 'url';
import settle from 'axios/lib/core/settle';
import pify from 'pify';
import symbol from '../symbol';

async function responseInterceptor(response, instance) {
  // Set Cookies
  const config = response.config;
  const headers = response.headers;
  const local = config[symbol];

  if (local.jar && headers['set-cookie']) {
    const setCookie = pify(local.jar.setCookie.bind(local.jar));
    const setCookiePromiseList = [];
    if (Array.isArray(headers['set-cookie'])) {
      const cookies = headers['set-cookie'];
      cookies.forEach(function(cookie) {
        setCookiePromiseList.push(setCookie(cookie, config.url, config.setCookieOptions));
      });
    } else {
      const cookie = headers['set-cookie'];
      setCookiePromiseList.push(setCookie(cookie, config.url, config.setCookieOptions));
    }
    await Promise.all(setCookiePromiseList);
  }

  // Redirect
  Object.assign(local.backupOptions, config, local.backupOptions);
  delete config.baseURL;
  config.url = url.resolve(config.url, headers['location'] || '');
  local.redirectCount--;

  if (local.redirectCount >= 0 && !!headers['location']) {
    if (response.status !== 307) {
      config.method = 'get';
    }
    config.maxRedirects = local.redirectCount;
    return instance.request(config);
  }

  // Restore
  if (local) {
    Object.assign(config, local.backupOptions);
  }
  if (local && local.jar) {
    if (instance.defaults.jar && (!config.jar || config.jar === true)) {
      instance.defaults.jar = local.jar;
    }
    config.jar = local.jar;
  }
  delete config[symbol];

  // Validate
  await new Promise(function(resolve, reject) {
    settle(resolve, reject, response);
  });

  return response;
}

export default responseInterceptor;
