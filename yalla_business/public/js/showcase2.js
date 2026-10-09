(function () {
  document.documentElement.classList.add("js");
  var THEMES = [
    { id: "aqua", label: "Aqua" },
    { id: "teal", label: "Teal" },
    { id: "gold", label: "Gold" },
    { id: "coral", label: "Coral" },
    { id: "orange", label: "Orange" },
    { id: "rose", label: "Rose" },
    { id: "violet", label: "Violet" },
    { id: "indigo", label: "Indigo" },
    { id: "blue", label: "Blue" },
    { id: "cyan", label: "Cyan" },
    { id: "emerald", label: "Emerald" },
    { id: "lime", label: "Lime" },
    { id: "slate", label: "Slate" },
  ];
  var THEME_IDS = THEMES.map(function (t) { return t.id; });

  // Arabic only when the page itself is Arabic; every other language keeps the English label.
  function tr(en, ar) {
    return document.documentElement.getAttribute("lang") === "ar" ? ar : en;
  }

  function readCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  function setLang(code) {
    if (!code) return;
    // Signup page: live translate AR / EN / TR without full reload
    if (typeof window.smApplySignupLang === "function" && window.smApplySignupLang(code)) {
      return;
    }
    document.cookie = "sm_lang=" + code + "; path=/; max-age=31536000; SameSite=Lax";
    var url = new URL(window.location.href);
    url.searchParams.set("lang", code);
    window.location.href = url.toString();
  }

  function closeThemeMenus(except) {
    document.querySelectorAll(".sm-theme-picker").forEach(function (picker) {
      if (except && picker === except) return;
      var menu = picker.querySelector(".sm-theme-menu");
      var trigger = picker.querySelector(".sm-theme-trigger");
      if (menu) menu.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function syncThemeUi(code) {
    document.querySelectorAll(".sm-theme-btn[data-sm-theme]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-sm-theme") === code);
    });
    document.querySelectorAll(".sm-theme-trigger").forEach(function (trigger) {
      var meta = THEMES.find(function (t) { return t.id === code; });
      trigger.title = (meta && meta.label) || tr("Accent color", "لون التمييز");
      trigger.setAttribute("aria-label", tr("Accent color: ", "لون التمييز: ") + ((meta && meta.label) || code));
    });
  }

  function applyMode(mode, persist) {
    if (mode !== "dark" && mode !== "light") mode = "light";
    document.documentElement.setAttribute("data-sm-mode", mode);
    document.documentElement.style.colorScheme = mode;
    if (document.body) document.body.setAttribute("data-sm-mode", mode);
    document.querySelectorAll("[data-sm-mode-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
      btn.title = mode === "dark"
        ? tr("Switch to light mode", "التبديل إلى الوضع الفاتح")
        : tr("Switch to dark mode", "التبديل إلى الوضع الداكن");
      btn.setAttribute("aria-label", btn.title);
    });
    if (persist) {
      document.cookie = "sm_mode=" + mode + "; path=/; max-age=31536000; SameSite=Lax";
    }
  }

  function initMode() {
    var fromCookie = readCookie("sm_mode");
    applyMode(fromCookie === "dark" ? "dark" : "light", false);
  }

  function applyTheme(code, persist) {
    if (!code || THEME_IDS.indexOf(code) === -1) code = "teal";
    document.documentElement.setAttribute("data-sm-theme", code);
    if (document.body) document.body.setAttribute("data-sm-theme", code);
    syncThemeUi(code);
    if (persist) {
      document.cookie = "sm_theme=" + code + "; path=/; max-age=31536000; SameSite=Lax";
    }
  }

  function ensureThemeMenus() {
    document.querySelectorAll("[data-sm-theme-picker]").forEach(function (picker) {
      var menu = picker.querySelector(".sm-theme-menu");
      var grid = picker.querySelector(".sm-theme-grid");
      if (!menu || !grid || grid.childElementCount) return;
      THEMES.forEach(function (theme) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sm-theme-btn";
        btn.setAttribute("data-sm-theme", theme.id);
        btn.title = theme.label;
        btn.setAttribute("aria-label", tr(theme.label + " theme", "سمة " + theme.label));
        btn.setAttribute("role", "option");
        grid.appendChild(btn);
      });
    });
  }

  function initTheme() {
    ensureThemeMenus();
    var fromUrl = new URL(window.location.href).searchParams.get("theme");
    var fromCookie = readCookie("sm_theme");
    var fromDom = document.documentElement.getAttribute("data-sm-theme");
    // Pages that do not render the accent picker (the public site) always use the
    // brand default, so a colour saved earlier cannot get "stuck" with no way to undo it.
    if (!document.querySelector("[data-sm-theme-picker]")) {
      applyTheme(fromDom || "teal", false);
      return;
    }
    applyTheme(fromUrl || fromCookie || fromDom || "teal", false);
  }

  document.addEventListener("click", function (e) {
    var langBtn = e.target.closest("button[data-sm-lang], a[data-sm-lang]");
    if (langBtn) {
      e.preventDefault();
      setLang(langBtn.getAttribute("data-sm-lang"));
      return;
    }

    var trigger = e.target.closest(".sm-theme-trigger");
    if (trigger) {
      e.preventDefault();
      var picker = trigger.closest(".sm-theme-picker");
      var menu = picker && picker.querySelector(".sm-theme-menu");
      if (!menu) return;
      var open = menu.hidden;
      closeThemeMenus(picker);
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }

    var themeBtn = e.target.closest("button.sm-theme-btn[data-sm-theme]");
    if (themeBtn) {
      e.preventDefault();
      applyTheme(themeBtn.getAttribute("data-sm-theme"), true);
      closeThemeMenus();
      return;
    }

    var modeBtn = e.target.closest("[data-sm-mode-toggle]");
    if (modeBtn) {
      e.preventDefault();
      var next = document.documentElement.getAttribute("data-sm-mode") === "dark" ? "light" : "dark";
      applyMode(next, true);
      return;
    }

    var menuBtn = e.target.closest("[data-sm-menu-toggle]");
    if (menuBtn) {
      e.preventDefault();
      var header = menuBtn.closest(".sm-header");
      if (!header) return;
      var open = header.classList.toggle("is-nav-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("sm-nav-lock", open);
      return;
    }

    var navLink = e.target.closest(".sm-nav a");
    if (navLink) {
      document.querySelectorAll(".sm-header.is-nav-open").forEach(function (openHeader) {
        openHeader.classList.remove("is-nav-open");
        var toggle = openHeader.querySelector("[data-sm-menu-toggle]");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
      document.body.classList.remove("sm-nav-lock");
    }

    if (!e.target.closest(".sm-theme-picker")) closeThemeMenus();
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeThemeMenus();
      document.querySelectorAll(".sm-header.is-nav-open").forEach(function (header) {
        header.classList.remove("is-nav-open");
        var toggle = header.querySelector("[data-sm-menu-toggle]");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
      document.body.classList.remove("sm-nav-lock");
    }
  });

  var lang = document.documentElement.getAttribute("data-sm-lang");
  if (lang === "ar") {
    document.documentElement.setAttribute("dir", "rtl");
    document.body && document.body.classList.add("sm-rtl");
  }

  function initReveal() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    var nodes = document.querySelectorAll(
      ".sm-section-head, .sm-pillar, .sm-audience-card, .sm-audience > div, .sm-demo-card, .sm-banner, .sm-price-card, .sm-diff"
    );
    if (!nodes.length || !("IntersectionObserver" in window)) return;
    nodes.forEach(function (el) {
      el.classList.add("sm-reveal");
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  function initHeroSlider() {
    var hero = document.querySelector("[data-sm-hero-slider]");
    if (!hero) return;
    var slides = Array.prototype.slice.call(hero.querySelectorAll(".sm-hero-slide"));
    var msgs = Array.prototype.slice.call(hero.querySelectorAll(".sm-hero-msg"));
    var dots = Array.prototype.slice.call(hero.querySelectorAll(".sm-hero-dot"));
    var progress = hero.querySelector(".sm-hero-progress i");
    var n = slides.length;
    if (n < 2) return;
    var i = 0;
    var timer = null;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var INTERVAL = 4200;
    var quoteBtn = hero.querySelector(".sm-hero-copy .sm-hero-actions .sm-btn:not(.sm-btn-ghost)");
    var exploreBtn = hero.querySelector(".sm-hero-copy .sm-hero-actions .sm-btn-ghost");

    function restartProgress() {
      if (!progress) return;
      hero.classList.remove("is-playing");
      void hero.offsetWidth;
      if (!reduced) hero.classList.add("is-playing");
    }

    function go(next, user) {
      var prev = i;
      i = ((next % n) + n) % n;
      if (prev !== i) {
        slides[prev].classList.add("is-leave");
        window.setTimeout(function () {
          slides[prev].classList.remove("is-leave");
        }, 500);
      }
      hero.setAttribute("data-slide", String(i));
      slides.forEach(function (el, idx) {
        el.classList.toggle("is-active", idx === i);
      });
      msgs.forEach(function (el, idx) {
        var on = idx === i;
        el.classList.toggle("is-active", on);
        el.hidden = !on;
        el.setAttribute("aria-hidden", on ? "false" : "true");
      });
      dots.forEach(function (el, idx) {
        var on = idx === i;
        el.classList.toggle("is-active", on);
        if (on) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
      });
      var msg = msgs[i];
      if (msg && quoteBtn) {
        var service = msg.getAttribute("data-service");
        if (service) quoteBtn.setAttribute("data-service", service);
      }
      if (msg && exploreBtn) {
        var exploreHref = msg.getAttribute("data-explore");
        if (exploreHref) exploreBtn.setAttribute("href", exploreHref);
      }
      restartProgress();
      if (user) restart();
    }

    function tick() {
      go(i + 1, false);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      hero.classList.remove("is-playing");
    }
    function start() {
      if (reduced) return;
      stop();
      restartProgress();
      timer = setInterval(tick, INTERVAL);
    }
    function restart() {
      stop();
      start();
    }

    var prevBtn = hero.querySelector("[data-hero-prev]");
    var nextBtn = hero.querySelector("[data-hero-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { go(i - 1, true); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(i + 1, true); });
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        go(Number(dot.getAttribute("data-hero-to")), true);
      });
    });
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", function (e) {
      if (!hero.contains(e.relatedTarget)) start();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    var startX = 0;
    var dragging = false;
    hero.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a, button")) return;
      dragging = true;
      startX = e.clientX;
    });
    hero.addEventListener("pointerup", function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.clientX - startX;
      if (Math.abs(dx) < 48) return;
      var rtl = document.documentElement.getAttribute("dir") === "rtl";
      if (dx > 0) go(i + (rtl ? 1 : -1), true);
      else go(i + (rtl ? -1 : 1), true);
    });

    go(0, false);
    start();
  }

  function initProofMarquee() {
    var root = document.querySelector("[data-sm-proof-marquee]");
    if (!root) return;
    var viewport = root.querySelector(".sm-proof-viewport");
    var track = root.querySelector(".sm-proof-track");
    var half = root.querySelector(".sm-proof-half");
    if (!viewport || !track || !half) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    var original = half.innerHTML;

    function measure() {
      half.innerHTML = original;
      var guard = 0;
      while (half.scrollWidth < Math.max(viewport.clientWidth, 360) && guard++ < 12) {
        half.insertAdjacentHTML("beforeend", original);
      }
      var clone = track.querySelector(".sm-proof-half[data-clone]");
      if (clone) clone.remove();
      clone = half.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("data-clone", "1");
      track.appendChild(clone);
      track.style.setProperty("--sm-proof-shift", "-" + half.scrollWidth + "px");
    }

    function start() {
      measure();
      track.style.animation = "none";
      void track.offsetWidth;
      track.style.animation = "";
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start).catch(start);
    } else {
      start();
    }
    window.addEventListener("resize", function () {
      window.clearTimeout(root._proofResize);
      root._proofResize = window.setTimeout(start, 150);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initTheme();
      initMode();
      initReveal();
      initHeroSlider();
      initProofMarquee();
      initHeroDots();
      initField();
    });
  } else {
    initTheme();
    initMode();
    initReveal();
    initHeroSlider();
    initProofMarquee();
    initHeroDots();
    initField();
  }

  /* Hero dust, same as the NABD reference: dots drift and link in front of the cream. */
  function initHeroDots() {
    var cv = document.querySelector("canvas.sm-hero-dust");
    if (!cv || !cv.getContext) return;
    var cx = cv.getContext("2d");
    if (!cx) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var pts = [], W = 0, H = 0, running = true;

    function size() {
      var r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      if (!W || !H) return;
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      var n = Math.round(Math.min(70, (W * H) / 16000));
      var i;
      for (i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 2.4 + 0.8,
          a: Math.random() * 0.5 + 0.25
        });
      }
    }
    function draw() {
      if (!running) return;
      cx.clearRect(0, 0, W, H);
      var i, j, p, q, dx, dy, d;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        for (j = i + 1; j < pts.length; j++) {
          q = pts[j];
          dx = p.x - q.x;
          dy = p.y - q.y;
          d = dx * dx + dy * dy;
          if (d < 12000) {
            cx.strokeStyle = "rgba(108,84,140," + (0.14 * (1 - d / 12000)) + ")";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(p.x, p.y);
            cx.lineTo(q.x, q.y);
            cx.stroke();
          }
        }
        cx.fillStyle = "rgba(122,58,200," + p.a + ")";
        cx.beginPath();
        cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        cx.fill();
      }
      if (!reduce) requestAnimationFrame(draw);
    }
    size();
    if (!W) {
      window.addEventListener("load", function () { size(); draw(); }, { once: true });
      return;
    }
    draw();
    if (reduce) return;
    window.addEventListener("resize", function () {
      clearTimeout(cv._rs);
      cv._rs = setTimeout(size, 120);
    });
    document.addEventListener("visibilitychange", function () {
      running = document.visibilityState !== "hidden";
      if (running) requestAnimationFrame(draw);
    });
  }

  /* Site-wide NABD field: particles + polygons that gather into structure on scroll.
     Motion: scatter → orbit ring → pulse wave → hex lattice (inspired by octodd.com). */
  function initField() {
    var canvas = document.querySelector("canvas.sm-nabd-field");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, pts = [], forms = null, t = 0, mx = 0.5, my = 0.4, raf = 0, running = true;

    function ease(u) {
      u = Math.max(0, Math.min(1, u));
      return 1 - Math.pow(1 - u, 3);
    }
    function lerp(a, b, u) {
      return a + (b - a) * u;
    }
    function mix(a, b, u) {
      return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
    }
    function samplePath(path, n) {
      var out = [], i, k, f, a, b;
      for (i = 0; i < n; i++) {
        f = (i / n) * (path.length - 1);
        k = Math.floor(f);
        a = path[k];
        b = path[Math.min(k + 1, path.length - 1)];
        out.push({ x: lerp(a.x, b.x, f - k), y: lerp(a.y, b.y, f - k) });
      }
      return out;
    }
    function pulsePath() {
      var pad = Math.min(W, H) * 0.08;
      var x0 = pad, x1 = W - pad, y = H * 0.5, amp = Math.min(110, H * 0.16);
      var keys = [0, 0.33, 0.36, 0.378, 0.398, 0.42, 0.444, 0.466, 0.486, 0.56, 0.578, 0.594, 0.61, 0.626, 1];
      var ys = [0, 0, 0, -amp * 0.55, amp * 0.62, -amp, amp * 0.85, -amp * 0.28, 0, 0, 0, -amp * 0.32, amp * 0.28, 0, 0];
      return keys.map(function (k, i) { return { x: lerp(x0, x1, k), y: y + ys[i] }; });
    }
    function hexLattice(n) {
      var out = [], spacing = Math.max(56, Math.min(W, H) / 9);
      var cols = Math.ceil(W / spacing) + 2;
      var rows = Math.ceil(H / (spacing * 0.86)) + 2;
      var r, c, i = 0;
      for (r = 0; r < rows && i < n; r++) {
        for (c = 0; c < cols && i < n; c++, i++) {
          out.push({
            x: (c + (r % 2 ? 0.5 : 0)) * spacing + spacing * 0.2,
            y: r * spacing * 0.86 + spacing * 0.3
          });
        }
      }
      while (out.length < n) out.push({ x: W * Math.random(), y: H * Math.random() });
      return out;
    }
    function ringForm(n) {
      var out = [], i, a, rr;
      var cx = W * 0.5, cy = H * 0.46, R = Math.min(W, H) * 0.32;
      for (i = 0; i < n; i++) {
        a = (i / n) * Math.PI * 2 - Math.PI / 2;
        rr = R * (0.62 + (i % 7) * 0.055);
        out.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.72 });
      }
      return out;
    }
    function buildForms(n) {
      var scatter = [], i;
      for (i = 0; i < n; i++) scatter.push({ x: Math.random() * W, y: Math.random() * H });
      return {
        scatter: scatter,
        ring: ringForm(n),
        pulse: samplePath(pulsePath(), n),
        lattice: hexLattice(n)
      };
    }
    function structureAt(i, p) {
      if (p < 0.2) return mix(forms.scatter[i], forms.ring[i], ease(p / 0.2));
      if (p < 0.52) return mix(forms.ring[i], forms.pulse[i], ease((p - 0.2) / 0.32));
      return mix(forms.pulse[i], forms.lattice[i], ease((p - 0.52) / 0.48));
    }
    function scrollP() {
      var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      return Math.max(0, Math.min(1, window.scrollY / max));
    }
    function resize() {
      W = innerWidth;
      H = innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var mobile = W < 760;
      var n = Math.round(Math.min(mobile ? 38 : 72, (W * H) / 18000));
      n = Math.max(24, n);
      var i, kind;
      pts = [];
      for (i = 0; i < n; i++) {
        kind = i % 5 === 0 ? 6 : i % 4 === 0 ? 3 : i % 3 === 0 ? 4 : 0;
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: kind ? 5.5 + Math.random() * 7 : 1.5 + Math.random() * 1.8,
          a: 0.38 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.012,
          rot: Math.random() * Math.PI * 2,
          sides: kind
        });
      }
      forms = buildForms(n);
    }
    function drawPoly(x, y, r, sides, rot) {
      var i, ang;
      ctx.beginPath();
      for (i = 0; i < sides; i++) {
        ang = rot + (i * Math.PI * 2) / sides - Math.PI / 2;
        if (i) ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        else ctx.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      }
      ctx.closePath();
    }
    function frame(now) {
      if (!running) return;
      t = now || 0;
      var p = scrollP();
      var gather = ease(Math.min(1, p / 0.18));
      var dark = document.documentElement.getAttribute("data-sm-mode") === "dark";
      var ink = dark ? "176,124,255" : "122,58,200";
      var line = dark ? "212,179,255" : "108,84,140";
      var i, j, pt, tgt, dx, dy, d, dist, link, drift, px, py, u;
      ctx.clearRect(0, 0, W, H);
      for (i = 0; i < pts.length; i++) {
        pt = pts[i];
        tgt = structureAt(i, p);
        u = 0.045 + gather * 0.08;
        pt.x += (tgt.x - pt.x) * u;
        pt.y += (tgt.y - pt.y) * u;
        drift = 7 * (1 - gather * 0.72);
        px = pt.x + Math.sin(t * 0.00055 + pt.phase) * drift;
        py = pt.y + Math.cos(t * 0.00042 + pt.phase * 1.3) * drift * 0.7;
        px += (mx - 0.5) * 18 * (1 - gather);
        py += (my - 0.4) * 12 * (1 - gather);
        pt._px = px;
        pt._py = py;
        pt.rot += pt.spin;
      }
      link = 70 + gather * 70;
      ctx.lineWidth = 1;
      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          dx = pts[i]._px - pts[j]._px;
          dy = pts[i]._py - pts[j]._py;
          d = dx * dx + dy * dy;
          dist = link * link;
          if (d < dist) {
            ctx.strokeStyle = "rgba(" + line + "," + (0.12 + 0.22 * gather) * (1 - d / dist) + ")";
            ctx.beginPath();
            ctx.moveTo(pts[i]._px, pts[i]._py);
            ctx.lineTo(pts[j]._px, pts[j]._py);
            ctx.stroke();
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        pt = pts[i];
        if (pt.sides) {
          ctx.strokeStyle = "rgba(" + ink + "," + Math.min(0.85, pt.a + 0.15) + ")";
          ctx.fillStyle = "rgba(" + ink + "," + (pt.a * 0.22) + ")";
          drawPoly(pt._px, pt._py, pt.r, pt.sides, pt.rot);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(" + ink + "," + pt.a + ")";
          ctx.beginPath();
          ctx.arc(pt._px, pt._py, pt.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    resize();
    if (reduce) {
      scrollP();
      frame(0);
      return;
    }
    window.addEventListener("resize", function () {
      clearTimeout(canvas._rs);
      canvas._rs = setTimeout(resize, 120);
    });
    window.addEventListener("pointermove", function (e) {
      if (!window.matchMedia("(pointer:fine)").matches) return;
      mx = e.clientX / Math.max(1, W);
      my = e.clientY / Math.max(1, H);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      running = document.visibilityState !== "hidden";
      if (running && !reduce) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }
})();

(function () {
  function latnMoney(n) {
    const num = Number(n);
    if (Number.isNaN(num)) return String(n ?? "");
    return Math.round(num).toLocaleString("en-US");
  }
  function numHTML(n) {
    return '<span class="yep-num" lang="en" dir="ltr">' + latnMoney(n) + "</span>";
  }
  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function mountPlans(root, config) {
    if (!root) return;
    const lang = root.dataset.lang || "ar";
    const plans = JSON.parse(root.dataset.catalog || "[]");
    const toggle = root.querySelector(".yep-term-toggle");
    const grid = root.querySelector(".yep-plan-grid");
    if (!toggle || !grid) return;
    const terms = config.terms;
    let term = config.defaultTerm;
    function t(ar, en) {
      return lang === "en" ? en : ar;
    }
    function price(plan, months) {
      return (plan.prices || []).find((p) => Number(p.term_months) === months);
    }
    function termLabel(m) {
      if (config.termLabel) return config.termLabel(m, lang);
      if (lang !== "ar") return m + " months";
      return m === 12 ? "12 شهر" : m + " أشهر";
    }
    function render() {
      toggle.innerHTML = "";
      terms.forEach((m) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sm-btn" + (m === term ? "" : " sm-btn-outline");
        b.textContent = termLabel(m);
        b.addEventListener("click", () => { term = m; render(); });
        toggle.appendChild(b);
      });
      grid.innerHTML = "";
      plans.forEach((plan) => {
        const row = price(plan, term);
        if (!row) return;
        const card = document.createElement("article");
        card.className = "sm-price-card" + (plan.highlighted ? " is-current" : "");
        const title = lang === "en" ? plan.title_en : plan.title_ar;
        const blurb = lang === "en" ? plan.blurb_en : plan.blurb_ar;
        const features = (lang === "en" ? plan.features_en : plan.features_ar) || [];
        const limit = lang === "en" ? plan.limit_en : plan.limit_ar;
        const rec = plan.highlighted
          ? t(plan.highlight_label_ar || "نوصي بها", plan.highlight_label_en || "Recommended")
          : t("باقة", "Package");
        const save = Number(row.discount_percent || 0);
        const big = config.bigPrice === "monthly" ? row.monthly_sar : row.total_sar;
        const amountSuffix = config.bigPrice === "monthly"
          ? t("ر.س / شهر", "SAR / month")
          : t("ر.س", "SAR");
        const subline = config.bigPrice === "monthly"
          ? '<div class="sm-price-period">' + t("إجمالي المدة", "Term total") + " " + numHTML(row.total_sar) + " " + t("ر.س", "SAR") + "</div>"
          : '<div class="sm-price-period">' + t("إجمالي المدة المختارة", "Total for selected term") + "</div>" +
            '<div class="sm-price-excl">' + t("يعادل", "Equivalent to") + " " + numHTML(row.monthly_sar) + " " + t("ر.س / شهرياً", "SAR / month") + "</div>";
        card.innerHTML =
          '<span class="sm-badge' + (plan.highlighted ? " sm-badge-ok" : "") + '">' + esc(rec) + "</span>" +
          "<h3>" + esc(title) + "</h3>" +
          '<p class="sm-price-excl">' + esc(plan.name || "") + "</p>" +
          "<p>" + esc(blurb) + "</p>" +
          (limit ? '<p class="ybs2-limit">' + esc(limit) + "</p>" : "") +
          '<div class="sm-price-amount">' + numHTML(big) + ' <span class="sm-price-period">' + amountSuffix + "</span></div>" +
          subline +
          (save ? '<p class="sm-muted">' + t("خصم " + save + "٪", save + "% off") + "</p>" : "") +
          "<p>" + t("ماذا يشمل؟", "What is included?") + "</p>" +
          "<ul>" + features.map((f) => "<li>" + esc(f) + "</li>").join("") + "</ul>" +
          '<a class="sm-btn' + (plan.highlighted ? "" : " sm-btn-outline") + '" href="#ybs-inquiry" data-service="' + esc(config.service) + '" data-plan="' + esc(plan.plan_key) + '" data-term="' + term + '">' +
          t("اطلب هذه الخطة", "Request this plan") + "</a>";
        grid.appendChild(card);
      });
    }
    render();
  }

  mountPlans(document.getElementById("ybs-erp-panel"), {
    terms: [3, 6, 12],
    defaultTerm: 12,
    service: "erp",
    bigPrice: "total",
  });
  mountPlans(document.getElementById("ybs-sign-plans"), {
    terms: [1, 6, 12],
    defaultTerm: 12,
    service: "sign",
    bigPrice: "monthly",
    termLabel(m, lang) {
      if (lang !== "ar") {
        if (m === 1) return "Monthly";
        if (m === 12) return "Annual";
        return "6 months";
      }
      if (m === 1) return "شهرياً";
      if (m === 12) return "سنوي";
      return "6 أشهر";
    },
  });

  (function initPlanTabs() {
    const root = document.getElementById("ybs-erp-plans");
    if (!root) return;
    const tabs = Array.from(root.querySelectorAll(".ybs-plan-tab[data-plan-tab]"));
    const panels = {
      erp: document.getElementById("ybs-erp-panel"),
      sign: document.getElementById("ybs-sign-plans"),
    };
    function keyFromHash(hash) {
      const id = String(hash || "").replace(/^#/, "");
      if (id === "ybs-sign-plans") return "sign";
      if (id === "ybs-erp-plans" || id === "ybs-erp-panel" || id === "ybs-plans") return "erp";
      return "";
    }
    function show(name, opts) {
      const key = name === "sign" ? "sign" : "erp";
      const hash = key === "sign" ? "#ybs-sign-plans" : "#ybs-erp-plans";
      tabs.forEach((btn) => {
        const on = btn.getAttribute("data-plan-tab") === key;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.tabIndex = on ? 0 : -1;
      });
      Object.keys(panels).forEach((k) => {
        const el = panels[k];
        if (!el) return;
        const on = k === key;
        el.hidden = !on;
        el.setAttribute("aria-hidden", on ? "false" : "true");
      });
      root.dataset.planTab = key;
      if (opts && opts.hash) {
        if (location.hash !== hash) history.replaceState(null, "", hash);
      }
    }
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        show(btn.getAttribute("data-plan-tab"), { hash: true });
      });
    });
    root.querySelector(".ybs-plan-tabs")?.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const rtl = document.documentElement.dir === "rtl";
      let next = i;
      if (e.key === "ArrowRight") next = rtl ? i - 1 : i + 1;
      else if (e.key === "ArrowLeft") next = rtl ? i + 1 : i - 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      else return;
      e.preventDefault();
      const btn = tabs[(next + tabs.length) % tabs.length];
      btn.focus();
      show(btn.getAttribute("data-plan-tab"), { hash: true });
    });
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href="#ybs-sign-plans"], a[href="#ybs-erp-plans"]');
      if (!a) return;
      e.preventDefault();
      const key = keyFromHash(a.getAttribute("href")) || "erp";
      show(key, { hash: true });
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    window.addEventListener("hashchange", () => {
      const key = keyFromHash(location.hash);
      if (key) show(key);
    });
    show(keyFromHash(location.hash) || "erp");
  })();
})();

(function () {
  const IDS = {
    full_name: "ybs_full_name",
    email: "ybs_email",
    phone: "ybs_phone",
    service_interest: "ybs_service_interest",
    privacy: "ybs_privacy",
    plan_interest: "ybs_plan_interest",
    plan_term: "ybs_plan_term",
  };
  const REQUIRED = ["full_name", "email", "phone", "service_interest", "privacy"];
  const FIELD_ERRORS = {
    full_name: { ar: "فضلاً اكتب اسمك الكامل.", en: "Please enter your full name." },
    email: { ar: "فضلاً أدخل بريد إلكتروني صحيح.", en: "Please enter a valid email." },
    phone: { ar: "فضلاً أدخل رقم جوال صحيح.", en: "Please enter a valid phone number." },
    service_interest: { ar: "فضلاً اختر الخدمة.", en: "Please choose a service." },
    privacy: { ar: "فضلاً وافق على التواصل بخصوص هذا الطلب.", en: "Please agree to be contacted about this request." },
  };
  const form = document.getElementById("ybsForm");
  const live = document.getElementById("ybsFormLive");
  const success = document.getElementById("ybsSuccess");
  const lang = document.documentElement.getAttribute("data-sm-lang") || "ar";
  let submitting = false;

  function t(ar, en) {
    return lang === "en" ? en : ar;
  }
  function fieldEl(key) {
    return document.getElementById(IDS[key] || key);
  }
  function errorEl(key) {
    return document.getElementById("ybs_err_" + key);
  }
  function fieldMessage(key) {
    const copy = FIELD_ERRORS[key];
    return copy ? t(copy.ar, copy.en) : t("فضلاً أكمل هذا الحقل.", "Please complete this field.");
  }
  function setFieldError(key, message) {
    const field = fieldEl(key);
    const err = errorEl(key);
    if (field) field.setAttribute("aria-invalid", "true");
    if (err) {
      err.hidden = false;
      err.textContent = message;
    }
  }
  function clearFieldError(key) {
    const field = fieldEl(key);
    const err = errorEl(key);
    if (field) field.removeAttribute("aria-invalid");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
  }
  function isFieldValid(key) {
    const el = fieldEl(key);
    if (!el) return true;
    if (key === "privacy") return el.checked;
    if (key === "service_interest") return ["marketing", "erp", "sign", "both", "ai", "consulting"].includes(el.value);
    return el.checkValidity();
  }
  function syncPlanOptions(service) {
    const plan = fieldEl("plan_interest");
    const term = fieldEl("plan_term");
    if (plan) {
      const current = plan.value;
      let keep = current === "";
      plan.querySelectorAll("[data-plan-group]").forEach((opt) => {
        const group = opt.getAttribute("data-plan-group");
        const visible = !service
          ? true
          : group === "erp"
            ? service === "erp" || service === "both"
            : service === "sign" || service === "both";
        opt.hidden = !visible;
        opt.disabled = !visible;
        if (visible && opt.value === current) keep = true;
      });
      if (!keep) plan.value = "";
    }
    if (term) {
      const current = term.value;
      let keep = false;
      term.querySelectorAll("option[value]").forEach((opt) => {
        const forGroup = opt.getAttribute("data-term-for");
        const visible = !forGroup || !service
          ? true
          : forGroup === "erp"
            ? service === "erp" || service === "both"
            : service === "sign" || service === "both";
        if (!opt.value) return;
        opt.hidden = !visible;
        opt.disabled = !visible;
        if (visible && opt.value === current) keep = true;
      });
      if (!keep) term.value = "12";
    }
  }
  function togglePlanFields() {
    const service = fieldEl("service_interest");
    const val = service && service.value;
    const show = ["erp", "sign", "both"].includes(val);
    document.querySelectorAll(".ybs-plan-fields").forEach((el) => {
      el.hidden = !show;
    });
    syncPlanOptions(val || "");
  }
  function preselect(opts) {
    const service = fieldEl("service_interest");
    const plan = fieldEl("plan_interest");
    const planTerm = fieldEl("plan_term");
    if (opts.service && service) service.value = opts.service;
    if (opts.plan && plan) plan.value = opts.plan;
    if (opts.term && planTerm) planTerm.value = String(opts.term);
    togglePlanFields();
    clearFieldError("service_interest");
    markActiveAction(opts.service);
  }

  function markActiveAction(service) {
    document.querySelectorAll(".yb-action-card").forEach((card) => {
      card.classList.toggle("is-active", !!service && card.getAttribute("data-service") === service);
    });
  }

  function sourcePage() {
    const path = window.location.pathname || "/";
    const query = window.location.search || "";
    return (path + query).slice(0, 200) || "/";
  }

  function preselectFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const service = (params.get("service") || "").toLowerCase();
    const plan = (params.get("plan") || "").toLowerCase();
    const term = params.get("term") || "";
    if (!service && !plan && !term) return;
    preselect({ service, plan, term });
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href='#ybs-inquiry'][data-service], a[href^='#ybs-inquiry'][data-service]");
    if (!link) return;
    preselect({
      service: link.getAttribute("data-service"),
      plan: link.getAttribute("data-plan"),
      term: link.getAttribute("data-term"),
    });
  });

  if (!form) return;
  fieldEl("service_interest")?.addEventListener("change", () => {
    togglePlanFields();
    markActiveAction(fieldEl("service_interest")?.value || "");
  });
  togglePlanFields();
  preselectFromQuery();
  REQUIRED.forEach((key) => {
    const el = fieldEl(key);
    if (!el) return;
    const evt = key === "privacy" || key === "service_interest" ? "change" : "input";
    el.addEventListener(evt, () => {
      if (isFieldValid(key)) clearFieldError(key);
    });
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (live) live.textContent = "";
    const invalid = REQUIRED.filter((key) => !isFieldValid(key));
    invalid.forEach((key) => setFieldError(key, fieldMessage(key)));
    REQUIRED.filter((key) => !invalid.includes(key)).forEach(clearFieldError);
    if (invalid.length) {
      fieldEl(invalid[0])?.focus();
      return;
    }
    const submit = document.getElementById("ybsSubmit");
    const label = submit && submit.querySelector(".ybs-btn__label");
    const original = label ? label.textContent : "";
    submitting = true;
    if (submit) submit.disabled = true;
    if (label) label.textContent = t("نرسل طلبك...", "Sending...");
    const data = Object.fromEntries(new FormData(form).entries());
    data.preferred_language = lang;
    data.source_page = sourcePage();
    data.privacy = form.privacy.checked ? "1" : "";
    if (typeof window.ybInquiryTracking === "function") {
      Object.assign(data, window.ybInquiryTracking());
    }
    try {
      const res = await fetch("/api/method/yalla_business.www.submit_inquiry.submit_inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": window.YB_CSRF || "",
        },
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      const body = payload.message || payload;
      if (res.ok && body.ok) {
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.focus();
        }
      } else if (body.code === "rate_limited") {
        if (live) live.textContent = t("حاول مرة ثانية بعد قليل.", "Please try again shortly.");
      } else {
        (body.fields || []).forEach((key) => setFieldError(key, fieldMessage(key)));
        const first = (body.fields || []).find((key) => fieldEl(key));
        if (first) fieldEl(first).focus();
        if (live) {
          live.textContent = t(
            "ما قدرنا نرسل الطلب. تأكد من البيانات وحاول مرة ثانية.",
            "Could not send the request. Check the details and try again."
          );
        }
      }
    } catch (err) {
      if (live) live.textContent = t("ما قدرنا نرسل الطلب حالياً.", "The request could not be sent right now.");
    } finally {
      if (submit) submit.disabled = false;
      if (label) label.textContent = original || t("أرسل الطلب", "Send request");
      submitting = false;
    }
  });
})();

(function () {
  var PRESETS = {
    eco: {
      names: ["LISTEN", "ANALYZE", "MOVE", "KATEB", "SOLVE", "COMPLETE"],
      lines: [[0], [1], [2], [3], [4], [5]],
      captions: ["hub", "erp", "sign", "kateb", "kateb", "sign"],
      chapters: { erp: 1, kateb: 3, sign: 5 }
    },
    ops: {
      names: ["IDLE", "ANALYZE", "MOVE", "SOLVE", "COMPLETE"],
      lines: [[0], [0, 1, 2], [1, 2, 3, 4], [4, 5, 6], [7]],
      captions: ["hub", "sell", "stock", "books", "done"],
      chapters: { sell: 1, stock: 2, books: 3 }
    }
  };

  function fill(span, full) {
    var dot = full.indexOf("·");
    if (dot > 0) {
      var verb = full.slice(0, dot).trim().replace(/[&<>]/g, function (ch) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch];
      });
      span.innerHTML = "<b>" + verb + "</b> " + full.slice(dot);
    } else {
      span.textContent = full;
    }
  }

  function boot(root) {
    if (root.dataset.nabdBoot) return;
    root.dataset.nabdBoot = "1";
    var kind = root.getAttribute("data-nabd-console");
    var preset = PRESETS[kind];
    if (!preset) return;
    var stateEl = root.querySelector("[data-nabd-state]");
    var rows = Array.prototype.slice.call(root.querySelectorAll(".nabd-feed li"));
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var idx = 0;
    var timer = 0;
    var typer = 0;
    var hold = 0;

    rows.forEach(function (li) {
      var span = li.querySelector("[data-msg]");
      li._full = span ? span.getAttribute("data-msg") || "" : "";
      if (span) span.textContent = "";
    });

    function paint(i, typeIt) {
      idx = i;
      if (stateEl) stateEl.textContent = preset.names[i] || "";
      var on = preset.lines[i] || [0];
      var last = on[on.length - 1];
      rows.forEach(function (li, n) {
        var span = li.querySelector("[data-msg]");
        var shown = n <= last;
        li.classList.toggle("on", n === last);
        li.classList.toggle("done", n < last);
        if (!span) return;
        if (!shown) {
          span.textContent = "";
          return;
        }
        if (reduce || n < last || !typeIt) fill(span, li._full);
      });
      var current = rows[last];
      if (typeIt && current && !reduce) typeLine(current);
      var section = root.closest("section");
      if (section) {
        var scene = (preset.captions && preset.captions[i]) || "hub";
        section.querySelectorAll(".ybs-caption").forEach(function (el) {
          el.classList.toggle("is-active", el.getAttribute("data-scene") === scene);
        });
        section.querySelectorAll(".ybs-chapters button").forEach(function (btn) {
          btn.setAttribute("aria-pressed", preset.chapters[btn.getAttribute("data-chapter")] === i ? "true" : "false");
        });
      }
    }

    function typeLine(li) {
      var span = li.querySelector("[data-msg]");
      var full = li._full;
      var n = 0;
      window.clearInterval(typer);
      span.textContent = "";
      typer = window.setInterval(function () {
        n += 1;
        if (n >= full.length) {
          fill(span, full);
          window.clearInterval(typer);
          return;
        }
        span.textContent = full.slice(0, n);
        if (n >= full.length) window.clearInterval(typer);
      }, 18);
    }

    function play() {
      window.clearInterval(timer);
      if (reduce) {
        paint(preset.names.length - 1, false);
        rows.forEach(function (li) {
          var span = li.querySelector("[data-msg]");
          if (span) fill(span, li._full);
        });
        return;
      }
      timer = window.setInterval(function () {
        if (Date.now() < hold) return;
        paint((idx + 1) % preset.names.length, true);
      }, 2800);
    }

    paint(0, true);
    play();
    var section = root.closest("section");
    if (section) {
      section.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-chapter]");
        if (!btn || !section.contains(btn)) return;
        var next = preset.chapters[btn.getAttribute("data-chapter")];
        if (next == null) return;
        hold = Date.now() + 9000;
        paint(next, true);
      });
    }
  }

  function start() {
    document.querySelectorAll("[data-nabd-console]").forEach(boot);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
