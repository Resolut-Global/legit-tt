/* LEGIT-TT  |  layout.js
   Shared header and footer, DOM helpers and the search-box rules.
   Page content is always built with textContent (never innerHTML), so no value from the server
   can ever be interpreted as HTML. */
(function () {
  var C = window.LT_CONFIG;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on:') === 0) el.addEventListener(k.slice(3), v);
      else if (k === 'style' || /^on/i.test(k)) return;               // no inline styles or handlers, ever
      else el.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (kid) {
      if (kid === null || kid === undefined || kid === false) return;
      el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return el;
  }

  var ICONS = {
    check: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'm8 12 3 3 5-6' }]],
    clock: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 6v6l4 2' }]],
    x: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'm15 9-6 6M9 9l6 6' }]],
    help: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4' }], ['path', { d: 'M12 17.5h.01' }]],
    search: [['circle', { cx: 11, cy: 11, r: 8 }], ['path', { d: 'm21 21-4.3-4.3' }]],
    out: [['path', { d: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }]],
    copy: [['rect', { x: 9, y: 9, width: 13, height: 13, rx: 2 }], ['path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }]],
    flag: [['path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' }]]
  };

  function icon(name) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    (ICONS[name] || []).forEach(function (part) {
      var node = document.createElementNS(SVG_NS, part[0]);
      Object.keys(part[1]).forEach(function (k) { node.setAttribute(k, part[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  /* ---------- formatting ---------- */
  function fmtDate(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
    if (!m) return '';
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Port_of_Spain' });
  }

  /* ---------- search box rules (mirrors the server) ---------- */
  function searchTarget(raw) {
    var v = String(raw || '').trim();
    if (!v) return { error: 'Enter a certificate number or a business name.' };
    var compact = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    var m = /^LTT(\d{4})(\d{5})$/.exec(compact);
    if (m) return { href: 'verify.html?c=' + encodeURIComponent('LTT-' + m[1] + '-' + m[2]) };
    if (v.replace(/[^A-Za-z0-9]/g, '').length < 3) return { error: 'Type at least 3 letters of the business name, or a full certificate number such as LTT-2026-00001.' };
    return { href: 'verify.html?q=' + encodeURIComponent(v.slice(0, 60)) };
  }

  function publicBase() {
    var b = C.PUBLIC_BASE_URL;
    if (b) return b.replace(/\/+$/, '') + '/';
    return location.origin + location.pathname.replace(/[^\/]*$/, '');
  }

  function reportHref(certOrName) {
    if (C.FEATURES && C.FEATURES.report) return 'report.html' + (certOrName ? '?c=' + encodeURIComponent(certOrName) : '');
    var subject = encodeURIComponent('Report a fake badge or seller');
    var body = encodeURIComponent('What I am reporting' + (certOrName ? ' (' + certOrName + ')' : '') + ':\n\n');
    return 'mailto:' + C.CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;
  }

  /* ---------- header and footer ---------- */
  function renderHeader() {
    var host = document.getElementById('site-header');
    if (!host) return;
    var nav = h('nav', { class: 'nav', 'aria-label': 'Main' });
    if (C.FEATURES && C.FEATURES.directory) nav.appendChild(h('a', { class: 'nav__link', href: 'directory.html', text: 'Directory' }));
    if (C.FEATURES && C.FEATURES.apply) nav.appendChild(h('a', { class: 'nav__link', href: 'apply.html', text: 'Get certified' }));
    nav.appendChild(h('a', { class: 'btn btn--gold btn--sm', href: 'verify.html' }, [icon('search'), 'Verify a seller']));
    host.appendChild(h('div', { class: 'container site-header__in' }, [
      h('a', { class: 'brand', href: 'index.html', 'aria-label': 'LEGIT-TT home' }, [
        h('img', { src: 'assets/img/shield.png', alt: '', width: 36, height: 45 }),
        h('span', { text: 'LEGIT-TT' })
      ]),
      nav
    ]));
  }

  function renderFooter() {
    var host = document.getElementById('site-footer');
    if (!host) return;
    host.className = 'site-footer';
    var links = h('ul', {}, [
      h('li', {}, [h('a', { href: 'terms.html', text: 'Terms and Conditions' })]),
      h('li', {}, [h('a', { href: 'privacy.html', text: 'Privacy Policy' })]),
      h('li', {}, [h('a', { href: 'mailto:' + C.CONTACT_EMAIL, text: C.CONTACT_EMAIL })])
    ]);
    host.appendChild(h('div', { class: 'container site-footer__grid' }, [
      h('div', {}, [
        h('div', { class: 'site-footer__brand', text: C.OWNER_LINE }),
        h('div', { text: C.TAGLINE + '. Look for the shield.' }),
        h('img', { src: 'assets/img/resolut-white.png', alt: 'Resolut Global', width: 150, height: 66 })
      ]),
      h('div', {}, [links, h('p', {}, [h('small', { text: '© ' + new Date().getFullYear() + ' Resolut Global. Trinidad and Tobago.' })])])
    ]));
  }

  function registerWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* the site works without it */ });
    });
  }

  window.LT = { h: h, icon: icon, fmtDate: fmtDate, fmtDateTime: fmtDateTime, searchTarget: searchTarget, publicBase: publicBase, reportHref: reportHref, cfg: C };
  renderHeader();
  renderFooter();
  registerWorker();
})();

/* Fills the "our contact address" link on the legal pages. */
(function () {
  var a = document.getElementById('contact-link');
  if (a && window.LT) { a.setAttribute('href', 'mailto:' + LT.cfg.CONTACT_EMAIL); a.textContent = LT.cfg.CONTACT_EMAIL; }
})();
