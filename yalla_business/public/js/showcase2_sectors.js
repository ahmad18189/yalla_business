(function () {
  const root = document.getElementById("sector-demo");
  if (!root) return;

  const lang = root.dataset.lang || "ar";
  const sectors = JSON.parse(root.dataset.sectors || "{}");
  const tabs = root.querySelector(".yep-sector-tabs");
  const stage = root.querySelector(".yep-sector-stage");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const list = Object.values(sectors).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!list.length) return;

  const AUTOPLAY_MS = 16000;
  const RUN_DELAY = 900;
  const COUNT_MS = 1800;
  const rtl = (document.documentElement.getAttribute("dir") || "") === "rtl";

  let index = 0;
  let autoplayTimer = null;
  let runTimer = null;
  let paused = false;
  let dragging = false;
  let dragStartX = 0;
  let dragDelta = 0;

  function t(ar, en) {
    return lang === "en" ? en : ar;
  }
  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fmt(n, asMoney) {
    if (n === null || n === undefined || n === "") return "—";
    const num = Number(n);
    if (Number.isNaN(num)) return String(n);
    return num.toLocaleString("en-US", asMoney
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { maximumFractionDigits: 0 });
  }
  function numHTML(n, asMoney) {
    return `<span class="yep-num" lang="en" dir="ltr">${esc(fmt(n, asMoney))}</span>`;
  }
  function projectLabel(value) {
    if (value === "invoiced") return t("تمت الفوترة", "Invoiced");
    if (value === "pending") return t("بانتظار الفوترة", "Pending invoicing");
    return "—";
  }

  function kpiDefs(spec) {
    const defs = [];
    if (spec.affects_stock) {
      defs.push({
        key: "stock",
        label: t("المخزون", "Stock"),
        suffix: " " + t(spec.stock_label_ar, spec.stock_label_en),
      });
    }
    defs.push({ key: "revenue", label: t("إيراد بدون الضريبة", "Revenue excl. VAT"), suffix: "" });
    if (spec.before.cash !== null && spec.before.cash !== undefined) {
      defs.push({ key: "cash", label: t("النقد", "Cash"), suffix: "" });
    }
    if (spec.before.receivables !== null && spec.before.receivables !== undefined) {
      defs.push({ key: "receivables", label: t("المستحقات", "Receivables"), suffix: "" });
    }
    if (spec.before.project) {
      defs.push({ key: "project", label: t("حالة المشروع", "Project"), suffix: "", kind: "status" });
    }
    return defs;
  }

  function slideHTML(spec, i) {
    const inv = spec.invoice || {};
    const img = spec.image
      ? `<div class="sm-audience-media"><img class="sm-audience-img" src="${esc(spec.image)}" alt="" width="450" height="550" loading="${i === 0 ? "eager" : "lazy"}" decoding="async"></div>`
      : "";
    const benefits = (spec.benefits || [])
      .map((b) => `<li>${esc(t(b.ar, b.en))}</li>`)
      .join("");
    const flow = (spec.flow || [])
      .map((step, n) => `<span class="yep-sector-flow-step" data-step="${n}"><i>${n + 1}</i>${esc(t(step.ar, step.en))}</span>`)
      .join("<span class=\"yep-sector-flow-line\" aria-hidden=\"true\"></span>");
    const kpis = kpiDefs(spec)
      .map((d) => {
        const start = spec.before[d.key];
        const shown = d.kind === "status" ? projectLabel(start) : fmt(start) + d.suffix;
        const numAttr = d.kind === "status" ? "" : ' class="yep-num" lang="en" dir="ltr"';
        return `<div class="yep-kpi-cell" data-kpi="${esc(d.key)}"><small>${esc(d.label)}</small><strong${numAttr} data-from="${start ?? ""}" data-to="${spec.after[d.key] ?? ""}" data-suffix="${esc(d.suffix)}" data-kind="${d.kind || "num"}">${esc(shown)}</strong></div>`;
      })
      .join("");
    const pay =
      spec.payment === "cash"
        ? t("بيع نقدي — الصندوق يزيد مع نقص المخزون", "Cash sale — till up, stock down")
        : t("فاتورة آجلة — لا يدخل نقد، ويزيد المستحق", "Invoice on account — no cash in, receivables up");

    return `
      <article class="sm-audience-card yep-sector-card yep-sector-slide" data-key="${esc(spec.key)}" data-index="${i}" aria-hidden="${i === 0 ? "false" : "true"}">
        <div class="sm-audience-body">
          <p class="yep-sector-persona">${esc(t(spec.persona_ar, spec.persona_en))}</p>
          <h3>${esc(t(spec.company_ar, spec.company_en))}</h3>
          <p class="yep-sector-headline">${esc(t(spec.headline_ar, spec.headline_en))}</p>
          <p class="yep-sector-pain">${esc(t(spec.pain_ar, spec.pain_en))}</p>
          <p class="yep-sector-win">${esc(t(spec.win_ar, spec.win_en))}</p>
          <ul class="yep-sector-benefits">${benefits}</ul>
          <div class="yep-sector-flow" aria-hidden="true">${flow}</div>
          <div class="yep-sector-ticket">
            <p>${esc(t(spec.item_ar, spec.item_en))} × ${numHTML(spec.qty)} × ${numHTML(spec.unit_price)} ${t("ريال", "SAR")}</p>
            <p>${t("المجموع", "Subtotal")} ${numHTML(inv.subtotal, true)} · ${t("ضريبة 15٪", "15% VAT")} ${numHTML(inv.vat, true)} · ${t("الإجمالي", "Total")} ${numHTML(inv.total, true)}</p>
            <p>${esc(pay)}</p>
          </div>
          <div class="yep-kpi">${kpis}</div>
          <div class="yep-sector-actions">
            <button type="button" class="sm-btn yep-sector-run">${esc(t("شغّل العملية", "Run the process"))}</button>
            <a class="sm-btn sm-btn-outline" href="${esc((window.YEP_ORIGIN || "") + "/signup")}">${esc(t(spec.cta_ar, spec.cta_en))}</a>
          </div>
        </div>
        ${img}
      </article>`;
  }

  function mount() {
    tabs.innerHTML = "";
    tabs.setAttribute("role", "tablist");
    list.forEach((spec, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sm-btn yep-sector-tab" + (i === 0 ? "" : " sm-btn-outline");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
      btn.dataset.index = String(i);
      btn.innerHTML = `<span>${esc(t(spec.label_ar, spec.label_en))}</span><i class="yep-sector-tab-bar" aria-hidden="true"></i>`;
      tabs.appendChild(btn);
    });

    stage.innerHTML = `
      <div class="yep-sector-slider">
        <div class="yep-sector-viewport">
          <div class="yep-sector-track">
            ${list.map((spec, i) => slideHTML(spec, i)).join("")}
          </div>
        </div>
        <div class="yep-sector-controls">
          <button type="button" class="yep-sector-arrow yep-sector-prev" aria-label="${esc(t("الشريحة السابقة", "Previous slide"))}">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M15.4 4.6 8 12l7.4 7.4 1.2-1.2L10.4 12l6.2-6.2z"/></svg>
          </button>
          <div class="yep-sector-dots" role="tablist" aria-label="${esc(t("الشرائح", "Slides"))}"></div>
          <button type="button" class="yep-sector-arrow yep-sector-next" aria-label="${esc(t("الشريحة التالية", "Next slide"))}">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8.6 4.6 7.4 5.8 13.6 12l-6.2 6.2 1.2 1.2L16 12z"/></svg>
          </button>
        </div>
      </div>`;

    const dots = stage.querySelector(".yep-sector-dots");
    list.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "yep-sector-dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", String(i + 1));
      dot.dataset.index = String(i);
      dots.appendChild(dot);
    });

    stage.querySelectorAll(".yep-sector-run").forEach((btn, n) => {
      btn.dataset.index = String(n);
    });

    root.addEventListener("pointerdown", (ev) => {
      const tab = ev.target.closest(".yep-sector-tab");
      if (tab && tabs.contains(tab)) {
        go(Number(tab.dataset.index), { user: true });
        return;
      }
      const dot = ev.target.closest(".yep-sector-dot");
      if (dot && stage.contains(dot)) {
        go(Number(dot.dataset.index), { user: true });
        return;
      }
      if (ev.target.closest(".yep-sector-next")) {
        go(index + 1, { user: true });
        return;
      }
      if (ev.target.closest(".yep-sector-prev")) {
        go(index - 1, { user: true });
        return;
      }
      const run = ev.target.closest(".yep-sector-run");
      if (run && stage.contains(run)) {
        runSlide(index, { replay: true, user: true });
      }
    });

    bindSwipe(stage.querySelector(".yep-sector-viewport"));
    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", resume);
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", (ev) => {
      if (!root.contains(ev.relatedTarget)) resume();
    });
    root.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        go(index + (rtl ? -1 : 1), { user: true });
      } else if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        go(index + (rtl ? 1 : -1), { user: true });
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
      else resume();
    });
    window.addEventListener("resize", () => apply(index));
    startAutoplay();
    apply(0);
    runSlide(0, { user: false });
  }

  function bindSwipe(viewport) {
    viewport.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      if (ev.target.closest("button, a, input")) return;
      dragging = true;
      dragStartX = ev.clientX;
      dragDelta = 0;
      pause();
      viewport.setPointerCapture(ev.pointerId);
    });
    viewport.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      dragDelta = ev.clientX - dragStartX;
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dragDelta) > 56) {
        const towardNext = rtl ? dragDelta > 0 : dragDelta < 0;
        go(towardNext ? index + 1 : index - 1, { user: true });
      } else {
        resume();
      }
    }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
  }

  function wrap(i) {
    const n = list.length;
    return ((i % n) + n) % n;
  }

  function go(next, opts) {
    const user = Boolean(opts && opts.user);
    const target = wrap(next);
    if (target === index && !(opts && opts.force)) {
      apply(index);
      if (user) restartAutoplay();
      return;
    }
    index = target;
    apply(index);
    runSlide(index, { user: false });
    if (user) restartAutoplay();
  }

  function apply(i) {
    const viewport = stage.querySelector(".yep-sector-viewport");
    const track = stage.querySelector(".yep-sector-track");
    if (track && viewport) {
      const w = viewport.clientWidth;
      const x = rtl ? i * w : -i * w;
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    }
    stage.querySelectorAll(".yep-sector-slide").forEach((slide, n) => {
      slide.setAttribute("aria-hidden", n === i ? "false" : "true");
      slide.classList.toggle("is-active", n === i);
    });
    tabs.querySelectorAll(".yep-sector-tab").forEach((btn, n) => {
      const on = n === i;
      btn.classList.toggle("sm-btn-outline", !on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });
    stage.querySelectorAll(".yep-sector-dot").forEach((dot, n) => {
      dot.classList.toggle("is-active", n === i);
    });
    tabs.querySelectorAll(".yep-sector-tab-bar").forEach((bar) => {
      bar.style.animation = "none";
    });
    const activeBar = tabs.querySelector(".yep-sector-tab.is-active .yep-sector-tab-bar");
    if (activeBar && root.classList.contains("is-autoplay")) {
      void activeBar.offsetWidth;
      activeBar.style.animation = "";
    }
  }

  function resetSlide(i) {
    const spec = list[i];
    const slide = stage.querySelectorAll(".yep-sector-slide")[i];
    if (!slide) return;
    slide.classList.remove("is-played");
    slide.querySelectorAll(".yep-sector-flow-step").forEach((el) => el.classList.remove("is-on"));
    slide.querySelectorAll("[data-kpi] strong").forEach((el) => {
      const kind = el.dataset.kind;
      const from = el.dataset.from;
      if (kind === "status") {
        el.textContent = projectLabel(from);
      } else {
        el.textContent = fmt(from === "" ? null : Number(from)) + (el.dataset.suffix || "");
      }
    });
    const btn = slide.querySelector(".yep-sector-run");
    if (btn) btn.textContent = t("شغّل العملية", "Run the process");
  }

  function runSlide(i, opts) {
    const spec = list[i];
    const slide = stage.querySelectorAll(".yep-sector-slide")[i];
    if (!spec || !slide) return;
    if (runTimer) {
      clearTimeout(runTimer);
      runTimer = null;
    }
    if (opts && opts.replay) {
      resetSlide(i);
    }
    const start = () => {
      slide.classList.add("is-played");
      const steps = slide.querySelectorAll(".yep-sector-flow-step");
      steps.forEach((el, n) => {
        setTimeout(() => el.classList.add("is-on"), reduce ? 0 : n * 420);
      });
      slide.querySelectorAll("[data-kpi] strong").forEach((el) => {
        const kind = el.dataset.kind;
        const from = el.dataset.from;
        const to = el.dataset.to;
        if (kind === "status") {
          el.textContent = projectLabel(to);
          return;
        }
        const startVal = from === "" ? null : Number(from);
        const endVal = to === "" ? null : Number(to);
        if (reduce || startVal === null || endVal === null) {
          el.textContent = fmt(endVal) + (el.dataset.suffix || "");
          return;
        }
        countUp(el, startVal, endVal, el.dataset.suffix || "");
      });
      const btn = slide.querySelector(".yep-sector-run");
      if (btn) btn.textContent = t("أعد عرض العملية", "Replay the process");
    };
    if (reduce) {
      start();
      return;
    }
    runTimer = setTimeout(start, opts && opts.replay ? 220 : RUN_DELAY);
  }

  function countUp(el, from, to, suffix) {
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * eased)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function startAutoplay() {
    if (reduce || paused) return;
    stopAutoplay();
    root.classList.add("is-autoplay");
    autoplayTimer = setInterval(() => go(index + 1, { user: false }), AUTOPLAY_MS);
  }
  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    root.classList.remove("is-autoplay");
  }
  function restartAutoplay() {
    if (root.matches(":hover")) {
      paused = true;
      stopAutoplay();
      return;
    }
    paused = false;
    startAutoplay();
  }
  function pause() {
    paused = true;
    stopAutoplay();
  }
  function resume() {
    if (dragging) return;
    paused = false;
    startAutoplay();
  }

  mount();
})();
