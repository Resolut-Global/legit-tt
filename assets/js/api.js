/* LEGIT-TT  |  api.js
   Talks to the Apps Script web app. Every call returns {ok, data, error}; it never throws. */
(function () {
  var C = window.LT_CONFIG;
  var TIMEOUT_MS = 25000;

  function configured() { return !!C.API_URL && C.API_URL.indexOf('REPLACE_WITH') < 0; }
  function netError(msg) { return { ok: false, data: null, error: { code: 'network', message: msg } }; }

  function send(url, init) {
    if (!configured()) {
      return Promise.resolve({ ok: false, data: null, error: { code: 'not_configured', message: 'The verification service is not set up yet.' } });
    }
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    if (ctl) init.signal = ctl.signal;
    init.redirect = 'follow';
    init.cache = 'no-store';
    init.credentials = 'omit';
    return fetch(url, init).then(function (res) {
      return res.json();
    }).then(function (json) {
      if (timer) clearTimeout(timer);
      if (json && typeof json.ok === 'boolean') return json;
      return netError('Unexpected response from the verification service.');
    }).catch(function () {
      if (timer) clearTimeout(timer);
      return netError('We could not reach the verification service. Check your connection and try again.');
    });
  }

  /** Public, read-only calls. */
  function get(action, params) {
    var q = new URLSearchParams();
    q.set('action', action);
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') q.set(k, params[k]);
    });
    return send(C.API_URL + '?' + q.toString(), { method: 'GET' });
  }

  /** Calls that carry credentials or form data. Sent as text/plain so the browser needs no CORS preflight. */
  function post(action, params, token) {
    return send(C.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, params: params || {}, token: token || '' })
    });
  }

  window.LT_API = { get: get, post: post, configured: configured };
})();
