(function () {
	const STORAGE_LANG = "ybLang";
	const STORAGE_TERM = "ybPlanTerm";
	const PRICES = {
		lite: { 3: [450, 150, 0], 6: [810, 135, 10], 12: [1440, 120, 20] },
		standard: { 3: [1050, 350, 0], 6: [1890, 315, 10], 12: [3360, 280, 20] },
		professional: { 3: [1800, 600, 0], 6: [3240, 540, 10], 12: [5760, 480, 20] },
	};

	const html = document.documentElement;
	const form = document.getElementById("ybForm");
	const live = document.getElementById("ybFormLive");
	const success = document.getElementById("ybSuccess");
	let lang = localStorage.getItem(STORAGE_LANG) === "en" ? "en" : "ar";
	let term = localStorage.getItem(STORAGE_TERM) || "12";
	if (!["3", "6", "12"].includes(term)) term = "12";

	document.documentElement.classList.add("js");

	function eastern(num) {
		return String(num).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
	}
	function formatNumber(n) {
		const grouped = n.toLocaleString("en-US");
		return lang === "ar" ? eastern(grouped.replace(/,/g, "٬")) : grouped;
	}
	function t(ar, en) {
		return lang === "ar" ? ar : en;
	}

	function applyLanguage() {
		html.setAttribute("lang", lang);
		html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
		document.querySelectorAll("[data-ar][data-en]").forEach((el) => {
			if (el.matches("input, textarea, select")) return;
			const value = el.getAttribute(`data-${lang}`);
			if (value) el.textContent = value;
		});
		document.querySelectorAll("[data-ar-placeholder]").forEach((el) => {
			el.setAttribute("placeholder", el.getAttribute(`data-${lang}-placeholder`) || "");
		});
		document.querySelectorAll("[data-ar-aria]").forEach((el) => {
			el.setAttribute("aria-label", el.getAttribute(`data-${lang}-aria`) || "");
		});
		const title = document.querySelector("title");
		if (title && title.getAttribute(`data-${lang}`)) title.textContent = title.getAttribute(`data-${lang}`);
		const desc = document.querySelector('meta[name="description"]');
		if (desc && desc.getAttribute(`data-${lang}`)) desc.setAttribute("content", desc.getAttribute(`data-${lang}`));
		const langBtn = document.getElementById("ybLang");
		if (langBtn) langBtn.textContent = lang === "ar" ? "EN" : "AR";
		renderPrices();
		window.dispatchEvent(new CustomEvent("yb:langchange", { detail: { lang } }));
	}

	function renderPrices() {
		document.querySelectorAll(".yb-plan").forEach((card) => {
			const plan = card.getAttribute("data-plan");
			const row = PRICES[plan] && PRICES[plan][term];
			if (!row) return;
			const [total, monthly, save] = row;
			const priceEl = card.querySelector(".js-price");
			const monthEl = card.querySelector(".js-month");
			const saveEl = card.querySelector(".js-save");
			if (priceEl) priceEl.textContent = formatNumber(total);
			if (monthEl) monthEl.textContent = formatNumber(monthly);
			if (saveEl) {
				if (save) {
					saveEl.hidden = false;
					saveEl.textContent = t(`خصم ${eastern(save)}٪`, `${save}% off`);
				} else {
					saveEl.hidden = true;
					saveEl.textContent = "";
				}
			}
			card.querySelectorAll("[data-service][data-plan]").forEach((btn) => {
				btn.setAttribute("data-term", term);
			});
		});
		document.querySelectorAll(".yb-term").forEach((btn) => {
			btn.classList.toggle("is-active", btn.getAttribute("data-term") === term);
		});
		const termSelect = document.getElementById("plan_term");
		if (termSelect) termSelect.value = term;
	}

	function togglePlanFields() {
		const service = document.getElementById("service_interest");
		const show = service && ["erp", "both"].includes(service.value);
		document.querySelectorAll(".yb-plan-fields").forEach((el) => {
			el.hidden = !show;
		});
	}

	function preselect(opts) {
		const service = document.getElementById("service_interest");
		const plan = document.getElementById("plan_interest");
		const planTerm = document.getElementById("plan_term");
		if (opts.service && service) service.value = opts.service;
		if (opts.plan && plan) plan.value = opts.plan;
		if (opts.term && planTerm) planTerm.value = opts.term;
		togglePlanFields();
	}

	function setupNav() {
		const menu = document.getElementById("ybMenu");
		const nav = document.getElementById("ybNav");
		if (menu && nav) {
			menu.addEventListener("click", () => {
				const open = nav.classList.toggle("is-open");
				menu.setAttribute("aria-expanded", open ? "true" : "false");
			});
		}
		document.getElementById("ybLang")?.addEventListener("click", () => {
			lang = lang === "ar" ? "en" : "ar";
			localStorage.setItem(STORAGE_LANG, lang);
			applyLanguage();
		});
		document.querySelectorAll(".yb-term").forEach((btn) => {
			btn.addEventListener("click", () => {
				term = btn.getAttribute("data-term");
				localStorage.setItem(STORAGE_TERM, term);
				renderPrices();
			});
		});
		document.addEventListener("click", (e) => {
			const link = e.target.closest("a[href^='#']");
			if (!link) return;
			const service = link.getAttribute("data-service");
			const plan = link.getAttribute("data-plan");
			const dataTerm = link.getAttribute("data-term") || term;
			const journey = link.getAttribute("data-journey");
			if (service) preselect({ service, plan, term: dataTerm });
			if (journey) {
				e.preventDefault();
				window.dispatchEvent(new CustomEvent("yb:goto", { detail: { scene: journey } }));
			}
		});
		document.getElementById("service_interest")?.addEventListener("change", togglePlanFields);
	}

	function firstInvalid(fields) {
		for (const id of fields) {
			const el = document.getElementById(id);
			if (el && !el.checkValidity()) return el;
		}
		return null;
	}

	function setupForm() {
		if (!form) return;
		form.addEventListener("submit", async (e) => {
			e.preventDefault();
			live.textContent = "";
			if (!form.checkValidity()) {
				const invalid = firstInvalid(["full_name", "email", "phone", "service_interest", "privacy"]);
				if (invalid) invalid.focus();
				live.textContent = t("يرجى إكمال الحقول المطلوبة.", "Please complete the required fields.");
				return;
			}
			form.classList.add("is-loading");
			const submit = form.querySelector("[type=submit]");
			if (submit) submit.disabled = true;
			const data = Object.fromEntries(new FormData(form).entries());
			data.preferred_language = lang;
			data.source_page = window.location.pathname || "/";
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
					success.hidden = false;
					success.focus?.();
				} else if (body.code === "rate_limited") {
					live.textContent = t("حاول مرة أخرى بعد قليل.", "Please try again shortly.");
				} else {
					live.textContent = t("تعذر إرسال الطلب. تحقق من البيانات وحاول مرة أخرى.", "Could not send the request. Check the details and try again.");
				}
			} catch (err) {
				live.textContent = t("تعذر إرسال الطلب حالياً.", "The request could not be sent right now.");
			} finally {
				form.classList.remove("is-loading");
				if (submit) submit.disabled = false;
			}
		});
	}

	function setupReveal() {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			document.querySelectorAll(".yb-reveal").forEach((el) => el.classList.add("is-in"));
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add("is-in");
						io.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.16 }
		);
		document.querySelectorAll(".yb-reveal").forEach((el) => io.observe(el));
	}

	applyLanguage();
	setupNav();
	togglePlanFields();
	setupForm();
	setupReveal();
})();
