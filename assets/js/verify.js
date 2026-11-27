/* LEGIT-TT  |  verify.js
   The page a buyer lands on after scanning a badge QR code, or after typing a certificate number or business name.
   Shows one of four results: ACTIVE, EXPIRED, NOT CERTIFIED, or NO RECORD FOUND.
   Everything from the server is placed with textContent. Private fields never reach this page: the server does not send them. */
(function () {
  var h = LT.h, icon = LT.icon;
  var out = document.getElementById('result');
  var form = document.getElementById('search-form');
  var input = document.getElementById('q');
  var errBox = document.getElementById('search-error');

  var params = new URLSearchParams(location.search);
  var cert = (params.get('c') || params.get('cert') || '').trim();
  var token = (params.get('t') || '').trim();
  var query = (params.get('q') || '').trim();

  // The QR token is only needed for this one check. Remove it from the address bar so it is not copied, bookmarked or shared.
  if (token && cert && window.history && history.replaceState) {
    history.replaceState(null, '', 'verify.html?c=' + encodeURIComponent(cert));
  }
  input.value = query || cert;
  var tagEl = document.getElementById('tagline');
  if (tagEl && LT.cfg.TAGLINE) tagEl.textContent = LT.cfg.TAGLINE;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = LT.searchTarget(input.value);
    if (t.error) { errBox.textContent = t.error; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    location.href = t.href;
  });
  input.addEventListener('input', function () { errBox.textContent = ''; input.removeAttribute('aria-invalid'); });

  /* ---------- building blocks ---------- */
  function clear() { while (out.firstChild) out.removeChild(out.firstChild); }

  function busy() {
    clear();
    out.setAttribute('aria-busy', 'true');
    out.appendChild(h('div', { class: 'skeleton', role: 'presentation' }));
    out.appendChild(h('div', { class: 'skeleton', role: 'presentation' }));
  }

  function show(nodes) {
    clear();
    out.removeAttribute('aria-busy');
    nodes.forEach(function (n) { out.appendChild(n); });
    try { out.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
  }

  function banner(kind, iconName, label, sub) {
    return h('section', { class: 'banner banner--' + kind }, [
      icon(iconName),
      h('div', {}, [h('div', { class: 'banner__label', text: label }), sub ? h('div', { class: 'banner__sub', text: sub }) : null])
    ]);
  }

  function fact(label, value, extra) {
    return h('div', {}, [h('dt', { text: label }), h('dd', {}, [h('span', { text: value }), extra])]);
  }

  function reportBlock(ref) {
    return h('div', { class: 'report-link' }, [
      h('a', { href: LT.reportHref(ref) }, [icon('flag'), 'Report a fake badge'])
    ]);
  }

  function checkedLine(view) {
    var when = view && view.checkedAt ? LT.fmtDateTime(view.checkedAt) : '';
    return h('p', { class: 'checked', text: when ? 'Checked live on ' + when + ' (Trinidad and Tobago time)' : 'Checked live just now' });
  }

  function copyButton(text) {
    var btn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', 'aria-label': 'Copy certificate number' }, [icon('copy'), 'Copy']);
    btn.addEventListener('click', function () {
      var done = function () { btn.lastChild.textContent = 'Copied'; setTimeout(function () { btn.lastChild.textContent = 'Copy'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    });
    return btn;
  }

  function linkButton(l) {
    if (!/^https?:\/\//i.test(String(l.url))) return null;   // second line of defence: the server already allows only http(s)
    var shown = String(l.url).replace(/^https?:\/\//i, '').replace(/\/$/, '');
    if (shown.length > 46) shown = shown.slice(0, 45) + '…';
    return h('a', { class: 'btn btn--ghost linkbtn', href: l.url, target: '_blank', rel: 'noopener noreferrer nofollow ugc' }, [
      icon('out'),
      h('span', {}, [h('strong', { text: l.label }), h('small', { text: shown })])
    ]);
  }

  /* ---------- result views ---------- */
  function viewActive(v) {
    document.title = v.businessName + ' — Certified seller | LEGIT-TT';
    var chips = [h('li', { class: 'chip', text: v.category })];
    if (v.registeredBusiness) chips.push(h('li', { class: 'chip chip--gold', text: 'Registered Business' }));
    if (v.tier === 'Premium' || v.tier === 'Standard') chips.push(h('li', { class: 'chip chip--gold', text: v.tier + ' certification' }));

    var card = h('article', { class: 'card' }, [
      h('span', { class: 'eyebrow', text: 'Certified seller' }),
      h('h2', { class: 'vendor__name', text: v.businessName }),
      h('ul', { class: 'chips' }, chips),
      h('dl', { class: 'facts' }, [
        fact('Certificate number', v.certNo, copyButton(v.certNo)),
        fact('Issued', LT.fmtDate(v.issued)),
        fact('Valid until', LT.fmtDate(v.expires))
      ])
    ]);

    if (v.platformLinks && v.platformLinks.length) {
      card.appendChild(h('h3', { text: 'Where this seller is certified' }));
      card.appendChild(h('div', { class: 'links' }, v.platformLinks.map(linkButton)));   // null entries are skipped by h()
      card.appendChild(h('p', { class: 'note', text: 'Before you pay, make sure the page or number you are dealing with is one of the links above.' }));
    }

    var fig = h('figure', { class: 'badge-copy' });
    card.appendChild(fig);
    show([banner('active', 'check', 'ACTIVE', 'This seller is currently certified'), card, checkedLine(v), reportBlock(v.certNo)]);
    drawBadgeCopy(fig, v);
  }

  function viewExpired(v) {
    document.title = 'Certification expired | LEGIT-TT';
    show([
      banner('expired', 'clock', 'EXPIRED', 'This certification is out of date'),
      h('article', { class: 'card' }, [
        h('h2', { class: 'vendor__name', text: v.businessName }),
        h('ul', { class: 'chips' }, [h('li', { class: 'chip', text: v.category }), h('li', { class: 'chip chip--amber', text: 'Expired' })]),
        h('dl', { class: 'facts' }, [fact('Certificate number', v.certNo), fact('Expired on', LT.fmtDate(v.expires))]),
        h('p', { class: 'note', text: 'This seller was certified but has not renewed. Ask them for proof of renewal before you pay, or choose a seller with an active badge.' })
      ]),
      checkedLine(v), reportBlock(v.certNo)
    ]);
  }

  var NOT_CERT_TEXT = {
    suspended: ['This seller’s certification is suspended', 'LEGIT-TT has paused this certification. Do not rely on any LEGIT-TT badge this seller shows.'],
    revoked: ['This seller’s certification has been withdrawn', 'LEGIT-TT has withdrawn this certification. Do not rely on any LEGIT-TT badge this seller shows.'],
    token_mismatch: ['This badge could not be verified', 'The code on this badge does not match our records. The badge may be fake or altered. Do not rely on it.'],
    invalid_code: ['This badge code is not valid', 'We have no certification matching this code. The badge may be fake. Do not rely on it.'],
    invalid: ['This record could not be confirmed', 'We could not confirm this certification. Do not rely on it until LEGIT-TT confirms it.']
  };

  function viewNotCertified(v) {
    document.title = 'Not certified | LEGIT-TT';
    var t = NOT_CERT_TEXT[v.reason] || NOT_CERT_TEXT.invalid;
    var body = [h('h2', { text: t[0] }), h('p', { text: t[1] })];
    if (v.certNo) body.push(h('dl', { class: 'facts' }, [fact('Certificate number', v.certNo), fact('Status', v.status || 'Not valid')]));
    body.push(h('p', { class: 'note', text: 'If you paid this seller because of the badge, keep your records and report it to us so we can investigate.' }));
    show([banner('notcert', 'x', 'NOT CERTIFIED', 'Do not rely on this badge'), h('article', { class: 'card' }, body), checkedLine(v), reportBlock(v.certNo || cert)]);
  }

  function viewNotFound(shownQuery) {
    document.title = 'No record found | LEGIT-TT';
    var what = shownQuery ? ['No LEGIT-TT record was found for “', shownQuery, '”.'] : ['No LEGIT-TT record was found.'];
    show([
      banner('notfound', 'help', 'NO RECORD FOUND', 'We could not find that seller'),
      h('article', { class: 'card' }, [
        h('p', {}, [h('strong', {}, what)]),
        h('p', { text: 'This does not mean the seller is fraudulent. They may simply not be certified, or the name may be spelled differently.' }),
        h('p', { text: 'If the seller shows a LEGIT-TT badge, scan the QR code on it, or type the certificate number printed under the shield (for example LTT-2026-00001).' })
      ]),
      reportBlock(shownQuery || '')
    ]);
  }

  function viewList(results, q) {
    document.title = 'Search results | LEGIT-TT';
    if (!results.length) return viewNotFound(q);
    var items = results.map(function (r) {
      var active = r.state === 'ACTIVE';
      return h('li', {}, [
        h('a', { class: 'result', href: 'verify.html?c=' + encodeURIComponent(r.certNo) }, [
          h('span', {}, [h('strong', { text: r.businessName }), h('small', { text: r.category + ' · ' + r.certNo })]),
          h('span', { class: 'chip ' + (active ? 'chip--green' : 'chip--amber'), text: active ? 'Active' : 'Expired' })
        ])
      ]);
    });
    show([
      h('h2', { text: results.length + (results.length === 1 ? ' match' : ' matches') + ' for “' + q + '”' }),
      h('p', { text: 'Choose a seller to see their live certification status.' }),
      h('ul', { class: 'result-list' }, items)
    ]);
  }

  function viewPrompt() {
    document.title = 'Verify a seller | LEGIT-TT';
    out.removeAttribute('aria-busy');
    clear();
    out.appendChild(h('div', { class: 'note', text: 'Scan the QR code on a seller’s badge with your phone camera, or search above. You will see the seller’s live status in seconds.' }));
  }

  function viewError(res) {
    var msg = res && res.error && res.error.message ? res.error.message : 'Something went wrong. Please try again.';
    var again = h('button', { type: 'button', class: 'btn btn--navy', text: 'Try again' });
    again.addEventListener('click', run);
    show([h('article', { class: 'card' }, [h('h2', { text: 'We could not check that right now' }), h('p', { text: msg }), again])]);
  }

  function render(v) {
    if (v.state === 'ACTIVE') return viewActive(v);
    if (v.state === 'EXPIRED') return viewExpired(v);
    if (v.state === 'NOT_CERTIFIED') return viewNotCertified(v);
    return viewNotFound(cert || '');
  }

  /* ---------- live badge copy ---------- */
  function loadShield() {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = 'assets/img/shield.png';
    });
  }

  function loadFonts() {
    if (!(document.fonts && document.fonts.load)) return Promise.resolve();
    return Promise.all([document.fonts.load('800 40px Inter'), document.fonts.load('700 40px Inter'), document.fonts.load('600 28px Inter')]).catch(function () {});
  }

  /** Draws the vendor's badge with the same code the admin uses. The QR here carries the certificate number only, never the private token. */
  function drawBadgeCopy(fig, v) {
    Promise.all([loadShield(), loadFonts()]).then(function (r) {
      var shield = r[0];
      if (!shield || typeof LegitBadge === 'undefined' || typeof qrcode === 'undefined') return;
      var canvas = document.createElement('canvas');
      LegitBadge.render(canvas, {
        shieldImg: shield, qrcode: qrcode, certNo: v.certNo, year: v.badgeYear, tier: v.tier, registered: v.registeredBusiness,
        url: LT.publicBase() + 'verify.html?c=' + encodeURIComponent(v.certNo), variant: 'large', width: 660
      });
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'LEGIT-TT badge for ' + v.businessName + ', certificate ' + v.certNo);
      fig.appendChild(canvas);
      fig.appendChild(h('figcaption', { text: 'Official LEGIT-TT badge. Always scan the QR code to confirm: a picture of a badge proves nothing on its own.' }));
    });
  }

  /* ---------- run ---------- */
  function run() {
    if (!cert && !query) return viewPrompt();
    if (!LT_API.configured()) return viewError({ error: { message: 'The verification service has not been connected to this site yet.' } });
    busy();
    if (cert) {
      LT_API.get('verify', { c: cert, t: token }).then(function (res) { return res.ok ? render(res.data) : viewError(res); });
    } else {
      LT_API.get('search', { q: query }).then(function (res) {
        if (!res.ok) return viewError(res);
        if (res.data.type === 'cert') { location.replace('verify.html?c=' + encodeURIComponent(res.data.certNo)); return; }
        viewList(res.data.results || [], query);
      });
    }
  }

  run();
})();
