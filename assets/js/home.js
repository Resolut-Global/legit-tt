/* LEGIT-TT  |  home.js */
(function () {
  var form = document.getElementById('search-form');
  var input = document.getElementById('q');
  var err = document.getElementById('search-error');
  if (!form) return;

  // The "Apply" call-to-action only links to a page that exists.
  var applyBtn = document.getElementById('cta-apply');
  if (applyBtn) {
    if (LT.cfg.FEATURES && LT.cfg.FEATURES.apply) applyBtn.setAttribute('href', 'apply.html');
    else {
      applyBtn.setAttribute('href', 'mailto:' + LT.cfg.CONTACT_EMAIL + '?subject=' + encodeURIComponent('LEGIT-TT certification enquiry'));
      applyBtn.textContent = 'Ask about certification';
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = LT.searchTarget(input.value);
    if (t.error) {
      err.textContent = t.error;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    location.href = t.href;
  });
  input.addEventListener('input', function () { err.textContent = ''; input.removeAttribute('aria-invalid'); });
})();
