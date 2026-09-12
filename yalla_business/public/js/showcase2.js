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
      trigger.title = (meta && meta.label) || "Accent color";
      trigger.setAttribute("aria-label", "Accent color: " + ((meta && meta.label) || code));
    });
  }

  function applyMode(mode, persist) {
    if (mode !== "dark" && mode !== "light") mode = "light";
    document.documentElement.setAttribute("data-sm-mode", mode);
    document.documentElement.style.colorScheme = mode;
    if (document.body) document.body.setAttribute("data-sm-mode", mode);
    document.querySelectorAll("[data-sm-mode-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
      btn.title = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";
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
        btn.setAttribute("aria-label", theme.label + " theme");
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
      ".sm-section-head, .sm-pillar, .sm-audience-card, .sm-audience > div, .sm-demo-card, .sm-proof, .sm-banner, .sm-price-card, .sm-diff"
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
    var INTERVAL = 6500;

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
        }, 950);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initTheme();
      initMode();
      initReveal();
      initHeroSlider();
    });
  } else {
    initTheme();
    initMode();
    initReveal();
    initHeroSlider();
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

  mountPlans(document.getElementById("ybs-erp-plans"), {
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
    if (key === "service_interest") return ["erp", "sign", "both"].includes(el.value);
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
  fieldEl("service_interest")?.addEventListener("change", togglePlanFields);
  togglePlanFields();
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
    data.source_page = "/showcase2";
    data.privacy = form.privacy.checked ? "1" : "";
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
