/* Scroll-linked particle field for the homepage.
   One canvas, one loop: orbit the heart, stream into the real logo, glide, then scatter. */
(function (global) {
  "use strict";

  var CFG = {
    countDesktop: 1500,
    countMobile: 640,
    mobileWidth: 760,
    dprCap: 2,
    alphaThreshold: 100,
    spring: 9,
    springLogo: 34,
    damp: 7.5,
    dampLogo: 16,
    pointerRadius: 108,
    pointerForce: 420,
    pointerLogo: 0.16,
    logoWidthDesktop: 380,
    maxDt: 0.033
  };

  var BANDS = [
    { rx: 1.16, ry: 0.92, speed: 0.48, tilt: 0.36 },
    { rx: 1.42, ry: 1.08, speed: -0.32, tilt: -0.22 },
    { rx: 1.72, ry: 1.26, speed: 0.2, tilt: 0.48 }
  ];

  var mounted = null;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function palette() {
    var dark = document.documentElement.getAttribute("data-sm-mode") === "dark";
    return dark
      ? [[214, 176, 255], [168, 120, 255], [94, 224, 214]]
      : [[126, 34, 206], [147, 51, 234], [0, 169, 165]];
  }

  function makeSprite(rgb, radius, dpr) {
    var pad = 1.15;
    var size = Math.max(4, Math.ceil((radius + pad) * 2 * dpr));
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d");
    var mid = size / 2;
    var grd = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
    grd.addColorStop(0, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",1)");
    grd.addColorStop(0.46, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.95)");
    grd.addColorStop(0.72, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.28)");
    grd.addColorStop(1, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return { canvas: c, css: (radius + pad) * 2 };
  }

  function sampleSilhouette(img, count) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    var off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    var g = off.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    var data;
    try { data = g.getImageData(0, 0, w, h).data; }
    catch (err) { return null; }
    var minX = w, minY = h, maxX = 0, maxY = 0, any = false, p, a;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        a = data[(y * w + x) * 4 + 3];
        if (a > CFG.alphaThreshold) {
          any = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!any) return null;
    var cw = maxX - minX + 1;
    var ch = maxY - minY + 1;
    var cols = Math.max(10, Math.round(Math.sqrt(count * (cw / ch)) * 1.25));
    var rows = Math.max(8, Math.round((count * 1.25) / cols));
    var cells = cols * rows;
    var buckets = new Array(cells);
    for (var i = 0; i < cells; i++) buckets[i] = null;
    var step = (cw * ch > 280000) ? 2 : 1;
    for (y = minY; y <= maxY; y += step) {
      for (x = minX; x <= maxX; x += step) {
        if (data[(y * w + x) * 4 + 3] <= CFG.alphaThreshold) continue;
        var cx = Math.min(cols - 1, ((x - minX) / cw * cols) | 0);
        var cy = Math.min(rows - 1, ((y - minY) / ch * rows) | 0);
        var idx = cy * cols + cx;
        var cellCx = minX + ((cx + 0.5) / cols) * cw;
        var cellCy = minY + ((cy + 0.5) / rows) * ch;
        var dx = x - cellCx;
        var dy = y - cellCy;
        var dd = dx * dx + dy * dy;
        var prev = buckets[idx];
        if (!prev || dd < prev.d) buckets[idx] = { x: x, y: y, d: dd };
      }
    }
    var picked = [];
    for (i = 0; i < cells; i++) if (buckets[i]) picked.push(buckets[i]);
    if (!picked.length) return null;
    var midX = (minX + maxX) / 2;
    var midY = (minY + maxY) / 2;
    var points = new Array(count);
    for (i = 0; i < count; i++) {
      var src = picked[Math.round(i * (picked.length - 1) / Math.max(1, count - 1))];
      var jx = 0, jy = 0;
      if (picked.length < count) {
        jx = (hash(i + 4) - 0.5) * (cw / cols) * 0.35;
        jy = (hash(i + 9) - 0.5) * (ch / rows) * 0.35;
      }
      points[i] = {
        x: (src.x + jx - midX) / cw,
        y: (src.y + jy - midY) / ch
      };
    }
    return { points: points, aspect: cw / ch, cropW: cw, cropH: ch };
  }

  function contentBox(img) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    var scale = Math.min(1, 180 / Math.max(w, h));
    var sw = Math.max(1, Math.round(w * scale));
    var sh = Math.max(1, Math.round(h * scale));
    var off = document.createElement("canvas");
    off.width = sw;
    off.height = sh;
    var g = off.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, sw, sh);
    var data;
    try { data = g.getImageData(0, 0, sw, sh).data; }
    catch (err) { return null; }
    var minX = sw, minY = sh, maxX = 0, maxY = 0, any = false;
    for (var y = 0; y < sh; y++) {
      for (var x = 0; x < sw; x++) {
        if (data[(y * sw + x) * 4 + 3] > 24) {
          any = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!any) return null;
    return { l: minX / sw, t: minY / sh, r: (maxX + 1) / sw, b: (maxY + 1) / sh };
  }

  function loadImage(src, done) {
    var img = new Image();
    img.decoding = "async";
    img.onload = function () { done(img); };
    img.onerror = function () { done(null); };
    img.src = src;
  }

  function mount() {
    if (mounted) return mounted;
    var canvas = document.querySelector("canvas.sm-nabd-field");
    var heart = document.querySelector(".sm-hero-nabd");
    if (!canvas || !heart || !canvas.getContext) return null;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;

    var reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var fineMq = window.matchMedia("(pointer: fine)");
    var reduced = reduceMq.matches;
    var dpr = Math.min(CFG.dprCap, window.devicePixelRatio || 1);
    var viewW = 0;
    var viewH = 0;
    var count = 0;
    var particles = [];
    var sprites = [];
    var weights = { orbit: 1, flow: 0, logo: 0, glide: 0, scatter: 0 };
    var raw = { orbit: 1, flow: 0, logo: 0, glide: 0, scatter: 0 };
    var logoModel = null;
    var heartFrac = { l: 0.18, t: 0.16, r: 0.82, b: 0.78 };
    var pointer = { x: -9999, y: -9999, on: false, blocked: false };
    var running = true;
    var raf = 0;
    var last = 0;
    var time = 0;
    var snapped = false;
    var resizeTimer = 0;
    var anchors = {};
    var glideVis = 1;
    var logoSize = { w: 360, h: 220, cx: 0, cy: 0 };

    function queryAnchors() {
      anchors.heart = heart;
      anchors.stage = document.querySelector(".sm-hero-stage");
      anchors.copy = document.querySelector(".sm-hero-copy");
      anchors.hero = document.querySelector(".sm-hero--nabd");
      anchors.eco = document.getElementById("ybs-ecosystem");
      anchors.logo = document.getElementById("ybs-logo-anchor");
      anchors.footer = document.querySelector(".sm-footer");
      anchors.footerInner = document.querySelector(".sm-footer-inner");
      anchors.wrap = document.querySelector("main .sm-wrap");
    }

    function rebuildSprites() {
      var colors = palette();
      sprites = colors.map(function (rgb) {
        return [makeSprite(rgb, 1.55, dpr), makeSprite(rgb, 2.35, dpr)];
      });
    }

    function resize() {
      dpr = Math.min(CFG.dprCap, window.devicePixelRatio || 1);
      viewW = document.documentElement.clientWidth || window.innerWidth;
      viewH = document.documentElement.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(viewW * dpr));
      canvas.height = Math.max(1, Math.floor(viewH * dpr));
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildSprites();
    }

    function ensureParticles() {
      var next = viewW < CFG.mobileWidth ? CFG.countMobile : CFG.countDesktop;
      if (next === count && particles.length === count) return;
      var prevLogo = logoModel;
      count = next;
      particles = new Array(count);
      for (var i = 0; i < count; i++) {
        var u = hash(i + 1);
        particles[i] = {
          x: viewW * u,
          y: viewH * hash(i + 2),
          vx: 0,
          vy: 0,
          phase: hash(i + 3) * Math.PI * 2,
          u: u,
          band: i % 3,
          depth: 0.72 + hash(i + 6) * 0.5,
          color: i % 5 === 0 ? 2 : (i % 3),
          accent: i % 11 === 0,
          scatterX: hash(i + 8),
          scatterY: hash(i + 12)
        };
      }
      snapped = false;
      if (prevLogo) logoModel = null;
      var mark = document.querySelector("img[src*='logo-mark.png']");
      var src = (mark && mark.getAttribute("src")) || "/assets/yalla_business/images/logo-mark.png";
      loadImage(src.split("?")[0], function (img) {
        if (!img) return;
        try { logoModel = sampleSilhouette(img, count); }
        catch (err) { logoModel = null; }
        snapped = false;
      });
    }

    function logoPoint(i, cx, cy, w) {
      var p = particles[i];
      if (!logoModel) {
        var ang = p.phase;
        var rad = w * (0.18 + (i % 5) * 0.03);
        return { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad * 0.66 };
      }
      var pt = logoModel.points[i % logoModel.points.length];
      var h = w / logoModel.aspect;
      return { x: cx + pt.x * w, y: cy + pt.y * h };
    }

    function scatterPoint(i, fr) {
      var p = particles[i];
      var inner = anchors.footerInner ? anchors.footerInner.getBoundingClientRect() : null;
      var top = fr.top;
      var height = Math.max(fr.height, 180);
      var leftG = inner ? Math.max(36, inner.left - 4) : viewW * 0.1;
      var rightG = inner ? Math.max(36, viewW - inner.right - 4) : viewW * 0.1;
      var band = i % 6;
      var x;
      var y;
      if (band < 3) {
        x = p.u < 0.5 ? 10 + p.scatterX * leftG : viewW - 10 - p.scatterX * rightG;
        y = top + 18 + p.scatterY * (height - 36);
      } else if (band < 5) {
        x = 20 + p.scatterX * (viewW - 40);
        y = top + 4 + p.scatterY * 18;
        if (inner && x > inner.left + 8 && x < inner.right - 8) y = top - 6;
      } else {
        x = 24 + p.scatterX * (viewW - 48);
        y = top + height - 8 - p.scatterY * 16;
        if (inner && x > inner.left + 12 && x < inner.right - 12) {
          x = p.u < 0.5 ? 12 + p.scatterX * leftG : viewW - 12 - p.scatterX * rightG;
        }
      }
      return { x: x, y: y };
    }

    function computeWeights() {
      var vh = viewH || 1;
      var H = heart.getBoundingClientRect();
      var logoEl = anchors.logo || anchors.eco;
      var A = logoEl ? logoEl.getBoundingClientRect() : { top: vh * 2, height: 10, left: 0, width: 10 };
      var F = anchors.footer ? anchors.footer.getBoundingClientRect() : { top: vh * 4, height: 10, left: 0, width: 10 };
      var hy = (H.top + H.height * 0.5) / vh;
      var ay = (A.top + A.height * 0.45) / vh;
      var orbit = smooth((hy - 0.02) / 0.42) * smooth((1.05 - hy) / 0.4);
      var logo = smooth((0.78 - ay) / 0.22) * smooth((ay + 0.42) / 0.36);
      var past = smooth((-0.28 - ay) / 0.26);
      var footerIn = smooth((1.02 - F.top / vh) / 0.5);
      var maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      var endBoost = smooth((scrollY - (maxScroll - vh * 0.22)) / (vh * 0.22));
      footerIn = Math.max(footerIn, endBoost);
      var flow = (1 - orbit) * (1 - logo) * (1 - past) * (1 - footerIn);
      var glide = past * (1 - footerIn);
      var scatter = footerIn;
      var sum = orbit + flow + logo + glide + scatter;
      if (sum < 0.001) orbit = 1;
      sum = orbit + flow + logo + glide + scatter;
      raw.orbit = orbit / sum;
      raw.flow = flow / sum;
      raw.logo = logo / sum;
      raw.glide = glide / sum;
      raw.scatter = scatter / sum;

      var wrap = anchors.wrap ? anchors.wrap.getBoundingClientRect() : null;
      var gutter = wrap ? Math.min(wrap.left, viewW - wrap.right) : 48;
      var mobile = viewW < CFG.mobileWidth;
      glideVis = mobile || gutter < 88 ? 0.14 : 0.62;
      var want = mobile ? Math.min(260, viewW * 0.72) : Math.min(CFG.logoWidthDesktop, (A.width || 380) * 0.92);
      if (anchors.logo && A.width > 40) want = Math.min(want, A.width * 0.94);
      var aspect = logoModel ? logoModel.aspect : 1.52;
      logoSize.w = want;
      logoSize.h = want / aspect;
      logoSize.cx = A.left + A.width / 2;
      logoSize.cy = A.top + A.height / 2;
      if (!anchors.logo && anchors.eco) {
        var er = anchors.eco.getBoundingClientRect();
        logoSize.cx = er.left + er.width / 2;
        logoSize.cy = er.top + Math.min(180, vh * 0.22);
      }
      logoSize.gutter = gutter;
      logoSize.footer = F;
      var heartAbs = H.top + scrollY + H.height * 0.45;
      var anchorAbs = A.top + scrollY + A.height * 0.5;
      var focus = scrollY + vh * 0.46;
      logoSize.flowT = clamp((focus - (heartAbs - vh * 0.2)) / Math.max(1, anchorAbs - heartAbs + vh * 0.2), 0, 1);
      var anchorTopAbs = A.top + scrollY;
      var footerAbs = F.top + scrollY;
      logoSize.glideT = clamp((scrollY + vh * 0.35 - anchorTopAbs) / Math.max(1, footerAbs - anchorTopAbs), 0, 1);
      logoSize.scatterT = Math.max(smooth((1.05 - F.top / vh) / 0.62), endBoost);
    }

    function heartCenter() {
      var H = heart.getBoundingClientRect();
      var box = heartFrac;
      var left = H.left + H.width * box.l;
      var top = H.top + H.height * box.t;
      var w = H.width * (box.r - box.l);
      var h = H.height * (box.b - box.t);
      return { cx: left + w / 2, cy: top + h / 2, hw: w, hh: h };
    }

    function orbitTarget(p, hc) {
      var band = BANDS[p.band];
      var pulse = 1 + Math.sin(time * 1.55) * 0.03;
      var rx = hc.hw * 0.5 * band.rx * pulse * (0.94 + p.u * 0.1);
      var ry = hc.hh * 0.5 * band.ry * pulse * (0.94 + (1 - p.u) * 0.08);
      var ang = p.phase + time * band.speed;
      var ex = Math.cos(ang) * rx;
      var ey = Math.sin(ang) * ry;
      var tilt = band.tilt;
      return {
        x: hc.cx + ex * Math.cos(tilt) - ey * Math.sin(tilt) * 0.32,
        y: hc.cy + ex * Math.sin(tilt) * 0.28 + ey * Math.cos(tilt)
      };
    }

    function glideAnchor() {
      var rtl = document.documentElement.getAttribute("dir") === "rtl";
      var gw = logoSize.w * (glideVis < 0.3 ? 0.34 : 0.42);
      var gx = rtl ? 24 + gw / 2 : viewW - 24 - gw / 2;
      if (logoSize.gutter > 100) {
        gx = rtl ? Math.min(gx, 16 + logoSize.gutter * 0.55) : Math.max(gx, viewW - 16 - logoSize.gutter * 0.55);
      }
      var gy = viewH * (0.26 + logoSize.glideT * 0.42) + Math.sin(logoSize.glideT * Math.PI) * 24;
      return { cx: gx, cy: gy, w: gw };
    }

    function targetsFor(i, hc, glideBox, stageBox) {
      var p = particles[i];
      var orbit = orbitTarget(p, hc);
      var breathe = 1 + Math.sin(time * 1.35 + p.phase) * (0.008 + raw.logo * 0.006);
      var logo = logoPoint(i, logoSize.cx, logoSize.cy, logoSize.w);
      logo = {
        x: logoSize.cx + (logo.x - logoSize.cx) * breathe,
        y: logoSize.cy + (logo.y - logoSize.cy) * breathe
      };
      var glide = logoPoint(i, glideBox.cx, glideBox.cy, glideBox.w);
      var tFlow = clamp(logoSize.flowT + (p.u - 0.5) * 0.14, 0, 1);
      var wrap = anchors.wrap ? anchors.wrap.getBoundingClientRect() : { left: 72, right: viewW - 72 };
      var edge = Math.max(22, Math.min(64, Math.min(wrap.left, viewW - wrap.right) * 0.42));
      var lanes = [edge, viewW - edge, p.u < 0.5 ? edge + 26 : viewW - edge - 26];
      var lane = lanes[p.band];
      var along = smooth(clamp(tFlow / 0.32, 0, 1));
      var converge = smooth((tFlow - 0.7) / 0.3);
      var flowx = orbit.x * (1 - along) + lane * along;
      flowx = flowx * (1 - converge) + logo.x * converge;
      var flowy = orbit.y + (logo.y - orbit.y) * tFlow;
      flowy += Math.sin(tFlow * Math.PI) * ((p.band - 1) * 34 + (p.u - 0.5) * 48);
      var turb = (1 - raw.logo) * (1 - converge * 0.85);
      flowx += Math.sin(time * 0.9 + p.phase) * (12 * turb);
      flowy += Math.cos(time * 0.7 + p.phase) * (8 * turb);
      var settle = scatterPoint(i, logoSize.footer || { left: 0, top: viewH * 0.7, width: viewW, height: viewH * 0.3 });
      var sT = logoSize.scatterT;
      var peel = smooth(sT / 0.45);
      var settleW = smooth((sT - 0.25) / 0.75);
      var ang = p.phase + peel * 5.2;
      var rad = peel * (28 + p.u * 70) * (1 - settleW);
      var scatterX = (glide.x + Math.cos(ang) * rad) * (1 - settleW) + settle.x * settleW;
      var scatterY = (glide.y + Math.sin(ang) * rad * 0.7) * (1 - settleW) + settle.y * settleW;
      var tx = orbit.x * raw.orbit + flowx * raw.flow + logo.x * raw.logo + glide.x * raw.glide + scatterX * raw.scatter;
      var ty = orbit.y * raw.orbit + flowy * raw.flow + logo.y * raw.logo + glide.y * raw.glide + scatterY * raw.scatter;
      if (raw.orbit > 0.55 && anchors.copy) {
        var copy = anchors.copy.getBoundingClientRect();
        var pad = 16;
        if (tx > copy.left - pad && tx < copy.right + pad && ty > copy.top - 8 && ty < copy.bottom + 8) {
          tx = hc.cx < copy.left ? Math.min(tx, copy.left - pad) : Math.max(tx, copy.right + pad);
        }
      }
      return { x: tx, y: ty };
    }

    function blendWeights(dt) {
      var k = dt <= 0 ? 1 : 1 - Math.exp(-7 * dt);
      weights.orbit += (raw.orbit - weights.orbit) * k;
      weights.flow += (raw.flow - weights.flow) * k;
      weights.logo += (raw.logo - weights.logo) * k;
      weights.glide += (raw.glide - weights.glide) * k;
      weights.scatter += (raw.scatter - weights.scatter) * k;
    }

    function step(dt) {
      var hc = heartCenter();
      var hold = weights.logo;
      var spring = CFG.spring + (CFG.springLogo - CFG.spring) * hold;
      var damp = CFG.damp + (CFG.dampLogo - CFG.damp) * hold;
      var pointerScale = fineMq.matches && pointer.on && !pointer.blocked ? (1 - hold * (1 - CFG.pointerLogo)) : 0;
      var glideBox = glideAnchor();
      var i, p, tgt, ax, ay, dx, dy, dist;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        tgt = targetsFor(i, hc, glideBox, null);
        if (!snapped || reduced) {
          p.x = tgt.x;
          p.y = tgt.y;
          p.vx = 0;
          p.vy = 0;
          continue;
        }
        ax = (tgt.x - p.x) * spring - p.vx * damp;
        ay = (tgt.y - p.y) * spring - p.vy * damp;
        if (pointerScale > 0) {
          dx = p.x - pointer.x;
          dy = p.y - pointer.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CFG.pointerRadius && dist > 0.5) {
            var force = (1 - dist / CFG.pointerRadius) * CFG.pointerForce * pointerScale;
            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }
        p.vx += ax * dt;
        p.vy += ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      snapped = true;
    }

    function drawConnections() {
      if (weights.scatter < 0.72 || weights.logo > 0.12) return;
      var cell = 68;
      var cols = Math.max(1, Math.ceil(viewW / cell));
      var buckets = new Map();
      var i, p, ix, iy, key;
      for (i = 0; i < particles.length; i += 3) {
        p = particles[i];
        ix = (p.x / cell) | 0;
        iy = (p.y / cell) | 0;
        key = ix + iy * cols;
        var list = buckets.get(key);
        if (!list) buckets.set(key, [i]);
        else if (list.length < 4) list.push(i);
      }
      ctx.save();
      ctx.lineWidth = 1;
      var lines = 0;
      buckets.forEach(function (list, key) {
        var bx = key % cols;
        var by = (key / cols) | 0;
        for (var a = 0; a < list.length; a++) {
          var pa = particles[list[a]];
          for (var oy = -1; oy <= 1 && lines < 160; oy++) {
            for (var ox = -1; ox <= 1 && lines < 160; ox++) {
              var other = buckets.get((bx + ox) + (by + oy) * cols);
              if (!other) continue;
              for (var b = 0; b < other.length; b++) {
                var ib = other[b];
                if (ib <= list[a]) continue;
                var pb = particles[ib];
                var dx = pa.x - pb.x;
                var dy = pa.y - pb.y;
                if (dx * dx + dy * dy > 54 * 54) continue;
                var rgb = palette()[pa.color] || palette()[0];
                ctx.strokeStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.18)";
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.stroke();
                lines++;
                if (lines >= 160) return;
              }
            }
          }
        }
      });
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, viewW, viewH);
      var vis = weights.orbit * 0.92 + weights.flow * 0.9 + weights.logo * 1 + weights.glide * glideVis + weights.scatter * 0.78;
      var crisp = 1 - weights.logo * 0.28;
      var i, p, sprite, size, alpha;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        sprite = sprites[p.color] && sprites[p.color][p.accent ? 1 : 0];
        if (!sprite) continue;
        size = sprite.css * p.depth * (crisp + weights.orbit * 0.22);
        alpha = (0.62 + p.u * 0.38) * vis;
        alpha *= 0.86 + 0.14 * Math.sin(time * 2.1 + p.phase) * (0.35 + weights.logo * 0.2);
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.drawImage(sprite.canvas, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      drawConnections();
    }

    function frame(now) {
      if (!running) return;
      if (!last) last = now;
      var dt = clamp((now - last) / 1000, 0, CFG.maxDt);
      last = now;
      if (!reduced) time += dt;
      computeWeights();
      blendWeights(reduced ? 1 : dt);
      step(reduced ? 0 : dt);
      draw();
      if (!reduced) raf = global.requestAnimationFrame(frame);
    }

    function onPointer(e) {
      if (!fineMq.matches || reduced) {
        pointer.on = false;
        return;
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      pointer.blocked = !!(el && el.closest && el.closest("a, button, input, textarea, select, label, summary, [role='button']"));
      pointer.on = !pointer.blocked;
    }
    function onPointerLeave() { pointer.on = false; }
    function onResize() {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(function () {
        resize();
        ensureParticles();
        if (window.ScrollTrigger && window.ScrollTrigger.refresh) {
          /* Measurements follow layout; do not rebuild other triggers. */
        }
      }, 120);
    }
    function onVisible() {
      running = document.visibilityState !== "hidden";
      if (running) {
        last = 0;
        if (!reduced) raf = global.requestAnimationFrame(frame);
        else frame(performance.now());
      } else if (raf) {
        global.cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    function onReduce() {
      reduced = reduceMq.matches;
      if (reduced) {
        if (raf) global.cancelAnimationFrame(raf);
        raf = 0;
        frame(performance.now());
      } else if (!raf) {
        last = 0;
        snapped = true;
        raf = global.requestAnimationFrame(frame);
      }
    }
    function onScroll() {
      if (!reduced || !running) return;
      frame(performance.now());
    }
    function onRefresh() {
      if (reduced) frame(performance.now());
    }

    queryAnchors();
    resize();
    ensureParticles();
    canvas.style.pointerEvents = "none";
    var heartImg = heart.querySelector("img");
    if (heartImg) {
      var applyHeart = function () {
        var box = contentBox(heartImg);
        if (box) heartFrac = box;
      };
      if (heartImg.complete && heartImg.naturalWidth) applyHeart();
      else heartImg.addEventListener("load", applyHeart, { once: true });
    }

    global.addEventListener("pointermove", onPointer, { passive: true });
    global.addEventListener("pointerleave", onPointerLeave, { passive: true });
    global.addEventListener("resize", onResize);
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
    if (reduceMq.addEventListener) reduceMq.addEventListener("change", onReduce);
    else if (reduceMq.addListener) reduceMq.addListener(onReduce);

    var observer = new MutationObserver(function () { rebuildSprites(); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sm-mode", "dir"] });

    var ro = null;
    if (global.ResizeObserver && anchors.eco) {
      ro = new ResizeObserver(onResize);
      ro.observe(document.documentElement);
    }
    if (window.ScrollTrigger && window.ScrollTrigger.addEventListener) {
      window.ScrollTrigger.addEventListener("refresh", onRefresh);
    }

    mounted = {
      canvas: canvas,
      destroy: function () {
        running = false;
        if (raf) global.cancelAnimationFrame(raf);
        global.removeEventListener("pointermove", onPointer);
        global.removeEventListener("pointerleave", onPointerLeave);
        global.removeEventListener("resize", onResize);
        document.removeEventListener("scroll", onScroll, true);
        document.removeEventListener("visibilitychange", onVisible);
        if (reduceMq.removeEventListener) reduceMq.removeEventListener("change", onReduce);
        if (window.ScrollTrigger && window.ScrollTrigger.removeEventListener) {
          window.ScrollTrigger.removeEventListener("refresh", onRefresh);
        }
        observer.disconnect();
        if (ro) ro.disconnect();
        mounted = null;
      }
    };
    raf = global.requestAnimationFrame(frame);
    return mounted;
  }

  global.YallaNabdField = { mount: mount };
})(window);
