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
      initField();
    });
  } else {
    initTheme();
    initMode();
    initReveal();
    initHeroSlider();
    initProofMarquee();
    initField();
  }

  /* Stitch particle field: hero orbit, YB mark, side glide, then a neural web. */
  function initField() {
    var canvas = document.querySelector("canvas.sm-nabd-field");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var width = 0;
    var height = 0;
    var particles = [];
    var logoTargets = [];
    var raf = 0;
    var running = true;
    var time = 0;
    var count = 165;
    var colors = [
      { r: 147, g: 51, b: 234 },
      { r: 192, g: 132, b: 252 },
      { r: 0, g: 210, b: 200 },
      { r: 168, g: 85, b: 247 },
      { r: 45, g: 212, b: 191 }
    ];
    var logoNorm = [
      { x: -0.80, y: -0.75 }, { x: -0.68, y: -0.55 }, { x: -0.56, y: -0.35 }, { x: -0.44, y: -0.15 },
      { x: -0.32, y: 0.05 }, { x: -0.20, y: 0.25 }, { x: -0.08, y: 0.45 }, { x: 0.04, y: 0.65 },
      { x: -0.85, y: -0.65 }, { x: -0.75, y: -0.40 }, { x: -0.92, y: -0.85 }, { x: -0.78, y: -0.92 },
      { x: -0.62, y: -0.75 }, { x: -0.48, y: -0.55 },
      { x: -0.36, y: -0.18 }, { x: -0.46, y: -0.02 }, { x: -0.56, y: 0.15 }, { x: -0.66, y: 0.32 },
      { x: -0.76, y: 0.50 }, { x: -0.86, y: 0.68 }, { x: -0.96, y: 0.85 },
      { x: -0.15, y: -0.75 }, { x: 0.05, y: -0.75 }, { x: 0.25, y: -0.75 }, { x: 0.45, y: -0.75 },
      { x: 0.60, y: -0.65 }, { x: 0.70, y: -0.50 }, { x: 0.72, y: -0.35 }, { x: 0.65, y: -0.20 },
      { x: 0.50, y: -0.10 }, { x: 0.30, y: -0.08 }, { x: 0.10, y: -0.08 }, { x: -0.05, y: -0.08 },
      { x: 0.15, y: -0.08 }, { x: 0.35, y: -0.08 }, { x: 0.55, y: -0.05 }, { x: 0.70, y: 0.08 },
      { x: 0.78, y: 0.25 }, { x: 0.76, y: 0.45 }, { x: 0.68, y: 0.62 }, { x: 0.52, y: 0.72 },
      { x: 0.32, y: 0.75 }, { x: 0.12, y: 0.75 }, { x: -0.08, y: 0.75 }, { x: -0.25, y: 0.75 },
      { x: 0.05, y: -0.55 }, { x: 0.25, y: -0.55 }, { x: 0.45, y: -0.50 }, { x: 0.50, y: -0.35 },
      { x: 0.35, y: -0.25 }, { x: 0.18, y: -0.25 }, { x: 0.10, y: 0.12 }, { x: 0.30, y: 0.15 },
      { x: 0.50, y: 0.22 }, { x: 0.58, y: 0.38 }, { x: 0.48, y: 0.55 }, { x: 0.28, y: 0.58 }
    ];
    var weights = { hero: 1, logo: 0, drift: 0, neural: 0 };
    var target = { hero: 1, logo: 0, drift: 0, neural: 0 };
    var mouse = { x: -1000, y: -1000, active: false };

    function logoTargetsForSize() {
      var scale = Math.min(width, height) * 0.30;
      var next = [];
      var i, ref;
      for (i = 0; i < count; i++) {
        ref = logoNorm[i % logoNorm.length];
        next.push({
          x: (ref.x + Math.sin(i * 99) * 0.03) * scale,
          y: (ref.y + Math.cos(i * 77) * 0.03) * scale
        });
      }
      logoTargets = next;
    }
    function resize() {
      width = document.documentElement.clientWidth;
      height = document.documentElement.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      logoTargetsForSize();
    }
    function makeParticles() {
      var i, col;
      particles = [];
      for (i = 0; i < count; i++) {
        col = colors[i % colors.length];
        particles.push({
          x: Math.random() * (width || 1),
          y: Math.random() * (height || 1),
          vx: (Math.random() - 0.5) * 1.1,
          vy: (Math.random() - 0.5) * 1.1,
          baseRadius: 2.5 + Math.random() * 2,
          color: col,
          angle: Math.random() * Math.PI * 2,
          orbitRadius: 80 + Math.random() * 150,
          orbitSpeed: 0.01 + Math.random() * 0.018,
          pulseOffset: Math.random() * Math.PI * 2,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
    function scrollWeights() {
      var maxScroll = Math.max(1, document.documentElement.scrollHeight - height);
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      var ratio = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      var t;
      if (ratio < 0.20) {
        target.hero = 1 - (ratio / 0.20);
        target.logo = ratio / 0.20;
        target.drift = 0;
        target.neural = 0;
      } else if (ratio < 0.50) {
        t = (ratio - 0.20) / 0.30;
        target.hero = 0;
        target.logo = 1 - t * 0.4;
        target.drift = t * 0.4;
        target.neural = 0;
      } else if (ratio < 0.78) {
        t = (ratio - 0.50) / 0.28;
        target.hero = 0;
        target.logo = Math.max(0, 0.6 - t * 0.6);
        target.drift = Math.sin(t * Math.PI) * 0.8;
        target.neural = t;
      } else {
        target.hero = 0;
        target.logo = 0;
        target.drift = 0;
        target.neural = 1;
      }
    }
    function frame() {
      if (!running) return;
      var i, j, p, p2, dx, dy, dist, force, pulse, radius, alpha, lineAlpha;
      var heroEl, rect, heroAnchor, driftX, driftY, tilt, lt, cx, cy, cosT, sinT, rx, ry, logoX, logoY, factor;
      time += 0.02;
      ctx.clearRect(0, 0, width, height);
      if (!reduce) scrollWeights();
      weights.hero += (target.hero - weights.hero) * 0.055;
      weights.logo += (target.logo - weights.logo) * 0.055;
      weights.drift += (target.drift - weights.drift) * 0.055;
      weights.neural += (target.neural - weights.neural) * 0.055;

      heroAnchor = { x: width * 0.28, y: height * 0.35 };
      heroEl = document.querySelector(".sm-hero-nabd");
      if (heroEl) {
        rect = heroEl.getBoundingClientRect();
        if (rect.width > 0) {
          heroAnchor = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
      driftX = Math.sin(time * 0.8) * (width * 0.25);
      driftY = Math.cos(time * 0.95) * 50;
      tilt = Math.sin(time * 0.6) * 0.25;

      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        if (!reduce) {
          p.angle += p.orbitSpeed;
          p.phase += 0.025;
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }
        var reach = p.orbitRadius;
        if (rect && rect.width > 80) {
          reach = rect.width * (0.42 + ((p.orbitRadius - 80) / 150) * 0.16);
        }
        var wobble = Math.sin(time * 2.2 + p.pulseOffset) * 16;
        var heroX = heroAnchor.x + Math.cos(p.angle) * (reach + wobble);
        var heroY = heroAnchor.y + Math.sin(p.angle) * (reach * 0.72 + wobble);
        lt = logoTargets[i % logoTargets.length];
        cx = width * 0.5 + (weights.drift * driftX);
        cy = height * 0.48 + (weights.drift * driftY);
        cosT = Math.cos(tilt * (weights.drift + 0.1));
        sinT = Math.sin(tilt * (weights.drift + 0.1));
        rx = lt.x * cosT - lt.y * sinT;
        ry = lt.x * sinT + lt.y * cosT;
        logoX = cx + rx;
        logoY = cy + ry;
        if (!reduce && weights.hero > 0.001) {
          p.x += (heroX - p.x) * (0.055 * weights.hero);
          p.y += (heroY - p.y) * (0.055 * weights.hero);
        }
        if (!reduce && (weights.logo > 0.001 || weights.drift > 0.001)) {
          factor = Math.max(weights.logo, weights.drift);
          p.x += (logoX - p.x) * (0.06 * factor);
          p.y += (logoY - p.y) * (0.06 * factor);
        }
        if (!reduce && mouse.active) {
          dx = p.x - mouse.x;
          dy = p.y - mouse.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160 && dist > 0) {
            force = (1 - dist / 160) * 22;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }
        pulse = 0.9 + Math.sin(time * 3.5 + p.pulseOffset) * 0.28;
        radius = p.baseRadius * pulse;
        alpha = 0.75 + Math.sin(p.phase) * 0.25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color.r + "," + p.color.g + "," + p.color.b + "," + alpha + ")";
        ctx.shadowBlur = width > 768 ? 14 : 0;
        ctx.shadowColor = "rgba(" + p.color.r + "," + p.color.g + "," + p.color.b + ",0.85)";
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.lineWidth = 0.85;
      for (i = 0; i < particles.length; i += 2) {
        for (j = i + 1; j < particles.length; j += 3) {
          p = particles[i];
          p2 = particles[j];
          dx = p.x - p2.x;
          dy = p.y - p2.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            lineAlpha = (1 - dist / 80) * 0.35;
            ctx.strokeStyle = "rgba(" + p.color.r + "," + p.color.g + "," + p.color.b + "," + lineAlpha + ")";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      if (!reduce && running) raf = requestAnimationFrame(frame);
    }

    resize();
    if (!width) return;
    makeParticles();
    if (reduce) {
      frame();
      return;
    }
    window.addEventListener("mousemove", function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });
    window.addEventListener("mouseleave", function () {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    });
    window.addEventListener("resize", function () {
      clearTimeout(canvas._rs);
      canvas._rs = setTimeout(resize, 120);
    });
    document.addEventListener("visibilitychange", function () {
      running = document.visibilityState !== "hidden";
      if (running) raf = requestAnimationFrame(frame);
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
