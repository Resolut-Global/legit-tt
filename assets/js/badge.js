/**
 * LEGIT-TT  |  badge.js
 * Draws a vendor's badge on a canvas: the official shield artwork plus the
 * vendor's own details (gold LEGIT-TT name, tier ribbon, year pill, cert
 * number, tagline and a QR code). The QR code is generated here, in the
 * browser, so no outside service ever sees a verify link.
 *
 * Used by the Admin page (to create the PNGs that are e-mailed to vendors)
 * and by the Verify page (to show a live copy). Same code, same result.
 *
 * Layout is designed on a 1200-unit-wide sheet and scaled to the output width.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LegitBadge = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  var NAVY = '#0A2650', BLUE = '#004AAD', GOLD_DEEP = '#B8860B', INK_SOFT = '#5B6677';
  var DESIGN_W = 1200;
  var SHIELD_W = 760;
  var FONT = 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  /** Ribbon text for a tier. Only claims "Registered Business" when it has been verified. */
  function ribbonLines(tier, registered) {
    if (tier === 'Premium') return registered ? ['PREMIUM', 'REGISTERED BUSINESS'] : ['PREMIUM'];
    if (tier === 'Standard' && registered) return ['REGISTERED BUSINESS'];
    return [];
  }

  function variantSettings(variant) {
    // The small (WhatsApp) badge gets a larger QR tile and the lighter error-correction level, so the code stays easy to scan after compression.
    return variant === 'small' ? { tile: 460, ecc: 'L' } : { tile: 380, ecc: 'M' };
  }

  function layout(opts) {
    var vs = variantSettings(opts.variant);
    var shieldH = SHIELD_W * opts.shieldImg.height / opts.shieldImg.width;
    var shieldTop = 70;
    var shieldBottom = shieldTop + shieldH;
    var lines = ribbonLines(opts.tier, opts.registered);
    var L = { shieldX: (DESIGN_W - SHIELD_W) / 2, shieldTop: shieldTop, shieldH: shieldH, lines: lines, tile: vs.tile, ecc: opts.qrEcc || vs.ecc };
    var pillH = 76;
    if (lines.length) {
      L.ribbonH = lines.length === 2 ? 108 : 80;
      L.ribbonTop = shieldBottom - 122;
      L.pillTop = L.ribbonTop + L.ribbonH + 34;
    } else {
      L.pillTop = shieldBottom - 28;
    }
    L.pillH = pillH;
    L.certY = L.pillTop + pillH + 62;
    L.tagY = L.certY + 66;
    L.dividerY = L.tagY + 44;
    L.tileTop = L.dividerY + 40;
    L.captionY = L.tileTop + L.tile + 56;
    L.hostY = L.captionY + 44;
    L.height = Math.ceil(L.hostY + 64);
    return L;
  }

  /** Output size in pixels for the given options (needs the shield image to be loaded). */
  function measure(opts) {
    var L = layout(opts);
    var w = opts.width || DESIGN_W;
    return { width: w, height: Math.round(L.height * w / DESIGN_W) };
  }

  /* ---------- drawing helpers ---------- */

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function setFont(ctx, weight, size) { ctx.font = weight + ' ' + size + 'px ' + FONT; }

  /** Centered text with manual letter spacing (consistent in every browser). */
  function spacedText(ctx, text, cx, y, spacing, strokeFirst) {
    var widths = [], total = 0, i;
    for (i = 0; i < text.length; i++) { widths[i] = ctx.measureText(text.charAt(i)).width; total += widths[i]; }
    total += spacing * (text.length - 1);
    var x = cx - total / 2;
    ctx.textAlign = 'left';
    for (i = 0; i < text.length; i++) {
      if (strokeFirst) ctx.strokeText(text.charAt(i), x, y);
      ctx.fillText(text.charAt(i), x, y);
      x += widths[i] + spacing;
    }
    ctx.textAlign = 'center';
    return total;
  }

  function spacedWidth(ctx, text, spacing) {
    var total = 0;
    for (var i = 0; i < text.length; i++) total += ctx.measureText(text.charAt(i)).width;
    return total + spacing * (text.length - 1);
  }

  function goldGradient(ctx, y0, y1) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#FFE98F'); g.addColorStop(0.45, '#F2C94C'); g.addColorStop(1, '#D39F1B');
    return g;
  }

  function drawRibbon(ctx, L, cx) {
    var lines = L.lines, top = L.ribbonTop, h = L.ribbonH, drop = 22;
    var bigSize = 40, smallSize = 25;
    ctx.fillStyle = NAVY;
    setFont(ctx, 800, lines.length === 2 ? bigSize : 34);
    var w1 = spacedWidth(ctx, lines[0], lines.length === 2 ? 8 : 4);
    var w2 = 0;
    if (lines.length === 2) { setFont(ctx, 700, smallSize); w2 = spacedWidth(ctx, lines[1], 3); }
    var w = Math.max(w1, w2) + 150;
    if (w < 380) w = 380;
    var x0 = cx - w / 2, x1 = cx + w / 2, y0 = top, y1 = top + h, tail = 52;

    // folded tails (behind the band)
    [[-1, x0], [1, x1]].forEach(function (s) {
      var edge = s[1], dir = s[0], far = edge + dir * tail, inner = edge - dir * 22;
      ctx.beginPath();
      ctx.moveTo(inner, y0 + drop); ctx.lineTo(far, y0 + drop);
      ctx.lineTo(far - dir * 22, (y0 + y1) / 2 + drop); ctx.lineTo(far, y1 + drop);
      ctx.lineTo(inner, y1 + drop); ctx.closePath();
      ctx.fillStyle = '#C79A22'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = GOLD_DEEP; ctx.stroke();
      // the fold
      ctx.beginPath();
      ctx.moveTo(edge, y1); ctx.lineTo(inner, y1 + drop); ctx.lineTo(edge, y1 + drop); ctx.closePath();
      ctx.fillStyle = '#8A6100'; ctx.fill();
    });

    // band
    var g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#E7BE45'); g.addColorStop(0.5, '#FFE98F'); g.addColorStop(1, '#E7BE45');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    ctx.lineWidth = 3; ctx.strokeStyle = GOLD_DEEP; ctx.strokeRect(x0, y0, w, h);

    // text
    ctx.fillStyle = NAVY; ctx.textBaseline = 'middle';
    if (lines.length === 2) {
      setFont(ctx, 800, bigSize); spacedText(ctx, lines[0], cx, y0 + h * 0.36, 8);
      setFont(ctx, 700, smallSize); spacedText(ctx, lines[1], cx, y0 + h * 0.74, 3);
    } else {
      setFont(ctx, 800, 34); spacedText(ctx, lines[0], cx, y0 + h / 2 + 1, 4);
    }
  }

  function drawQr(ctx, qrcodeFactory, url, L, scale, cx) {
    var qr = qrcodeFactory(0, L.ecc);
    qr.addData(url);
    qr.make();
    var n = qr.getModuleCount();
    var tileX = cx - L.tile / 2, tileY = L.tileTop;
    // white tile with a fine border
    roundRectPath(ctx, tileX, tileY, L.tile, L.tile, 22);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#C9D1DE'; ctx.stroke();
    // module size is a whole number of output pixels, so the edges are sharp
    var pad = 5;
    var modPx = Math.max(1, Math.floor(((L.tile - 2 * pad) / (n + 8)) * scale));
    var box = modPx * (n + 8);                       // in output pixels, includes a 4-module quiet zone
    var originX = Math.round((tileX + L.tile / 2) * scale - box / 2) + 4 * modPx;
    var originY = Math.round((tileY + L.tile / 2) * scale - box / 2) + 4 * modPx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = NAVY;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(originX + c * modPx, originY + r * modPx, modPx, modPx);
      }
    }
    ctx.restore();
    return { modules: n, modulePx: modPx };
  }

  /**
   * Render a badge onto a canvas.
   * opts: {
   *   shieldImg   loaded Image of the shield artwork (assets/img/shield.png)
   *   qrcode      the qrcode-generator function
   *   certNo      'LTT-2026-00001'
   *   year        '2026'
   *   tier        'Basic' | 'Standard' | 'Premium'
   *   registered  true when the registration document was verified
   *   url         address the QR code opens
   *   variant     'large' (default) or 'small' for WhatsApp
   *   width       output width in pixels (default 1200)
   * }
   */
  function render(canvas, opts) {
    var size = measure(opts);
    canvas.width = size.width; canvas.height = size.height;
    var ctx = canvas.getContext('2d');
    var L = layout(opts);
    var s = size.width / DESIGN_W, cx = DESIGN_W / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, size.width, size.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // frame
    roundRectPath(ctx, 18, 18, DESIGN_W - 36, L.height - 36, 46);
    ctx.lineWidth = 6; ctx.strokeStyle = '#D9B24A'; ctx.stroke();

    // shield artwork
    ctx.drawImage(opts.shieldImg, L.shieldX, L.shieldTop, SHIELD_W, L.shieldH);

    // gold LEGIT-TT name on the red band
    setFont(ctx, 800, 52);
    ctx.save();
    ctx.shadowColor = 'rgba(40,0,0,0.65)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = goldGradient(ctx, L.shieldTop + L.shieldH * 0.06, L.shieldTop + L.shieldH * 0.14);
    spacedText(ctx, 'LEGIT-TT', L.shieldX + SHIELD_W * 0.585, L.shieldTop + L.shieldH * 0.102, 8);
    ctx.restore();

    // tier ribbon
    if (L.lines.length) drawRibbon(ctx, L, cx);

    // year pill (white ring so it sits cleanly over the shield tip)
    var pillW = 236;
    roundRectPath(ctx, cx - pillW / 2, L.pillTop, pillW, L.pillH, L.pillH / 2);
    ctx.lineWidth = 16; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    ctx.fillStyle = goldGradient(ctx, L.pillTop, L.pillTop + L.pillH); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = GOLD_DEEP; ctx.stroke();
    ctx.fillStyle = NAVY; setFont(ctx, 800, 46);
    ctx.fillText(String(opts.year), cx, L.pillTop + L.pillH / 2 + 2);

    // certificate number, small, under the shield
    ctx.fillStyle = NAVY; setFont(ctx, 700, 36);
    spacedText(ctx, String(opts.certNo), cx, L.certY, 4);

    // tagline
    ctx.fillStyle = BLUE; setFont(ctx, 700, 40);
    ctx.fillText('Certified, Verified, Trusted', cx, L.tagY);

    // divider
    ctx.fillStyle = '#D9B24A'; ctx.fillRect(cx - 70, L.dividerY, 140, 4);

    // QR code
    var qrInfo = drawQr(ctx, opts.qrcode, opts.url, L, s, cx);

    // caption and address
    ctx.fillStyle = NAVY; setFont(ctx, 800, 30);
    spacedText(ctx, 'SCAN TO VERIFY', cx, L.captionY, 6);
    var host = (/^https?:\/\/([^\/?#]+)/i.exec(opts.url) || [])[1] || '';
    ctx.fillStyle = INK_SOFT; setFont(ctx, 600, 28);
    ctx.fillText(host, cx, L.hostY);

    return { canvas: canvas, width: size.width, height: size.height, qr: qrInfo };
  }

  return { render: render, measure: measure, ribbonLines: ribbonLines, DESIGN_W: DESIGN_W };
}));
