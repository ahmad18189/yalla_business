(function () {
	const STORAGE_LANG = "ybLang";
	const STORAGE_TERM = "ybPlanTerm";
	const PRICES = {
		lite: { 3: [450, 150, 0], 6: [810, 135, 10], 12: [1440, 120, 20] },
		standard: { 3: [1050, 350, 0], 6: [1890, 315, 10], 12: [3360, 280, 20] },
		professional: { 3: [1800, 600, 0], 6: [3240, 540, 10], 12: [5760, 480, 20] },
	};
	const REQUIRED = ["full_name", "email", "phone", "service_interest", "privacy"];
	const FIELD_ERRORS = {
		full_name: { ar: "فضلاً اكتب اسمك الكامل.", en: "Please enter your full name." },
		email: { ar: "فضلاً أدخل بريد إلكتروني صحيح.", en: "Please enter a valid email." },
		phone: { ar: "فضلاً أدخل رقم جوال صحيح.", en: "Please enter a valid phone number." },
		service_interest: { ar: "فضلاً اختر الخدمة.", en: "Please choose a service." },
		privacy: { ar: "فضلاً وافق على التواصل بخصوص هذا الطلب.", en: "Please agree to be contacted about this request." },
		plan_interest: { ar: "فضلاً اختر خطة صحيحة.", en: "Please choose a valid plan." },
		plan_term: { ar: "فضلاً اختر مدة صحيحة.", en: "Please choose a valid term." },
	};

	const html = document.documentElement;
	const form = document.getElementById("ybForm");
	const live = document.getElementById("ybFormLive");
	const success = document.getElementById("ybSuccess");
	const menuBtn = document.getElementById("ybMenu");
	const nav = document.getElementById("ybNav");
	let lang = localStorage.getItem(STORAGE_LANG) === "en" ? "en" : "ar";
	let term = localStorage.getItem(STORAGE_TERM) || "12";
	if (!["3", "6", "12"].includes(term)) term = "12";
	let submitting = false;

	html.classList.add("js");

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
			if (el.matches("input, textarea, select, .yb-field-error")) return;
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
		refreshFieldErrorsLang();
		closeMenu({ restoreFocus: false });
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
			const active = btn.getAttribute("data-term") === term;
			btn.classList.toggle("is-active", active);
			btn.setAttribute("aria-pressed", active ? "true" : "false");
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
		if (opts.term && planTerm) {
			planTerm.value = opts.term;
			term = opts.term;
		}
		togglePlanFields();
		clearFieldError("service_interest");
	}

	function isMenuOpen() {
		return !!(nav && nav.classList.contains("is-open"));
	}

	function closeMenu(opts) {
		if (!menuBtn || !nav) return;
		nav.classList.remove("is-open");
		menuBtn.setAttribute("aria-expanded", "false");
		const label = menuBtn.getAttribute(`data-${lang}-aria`) || t("فتح القائمة", "Open menu");
		menuBtn.setAttribute("aria-label", label);
		if (opts && opts.restoreFocus) menuBtn.focus();
	}

	function openMenu() {
		if (!menuBtn || !nav) return;
		nav.classList.add("is-open");
		menuBtn.setAttribute("aria-expanded", "true");
		menuBtn.setAttribute("aria-label", t("إغلاق القائمة", "Close menu"));
	}

	function setupNav() {
		if (menuBtn && nav) {
			menuBtn.addEventListener("click", () => {
				if (isMenuOpen()) closeMenu();
				else openMenu();
			});
			nav.querySelectorAll("a").forEach((link) => {
				link.addEventListener("click", () => closeMenu());
			});
		}
		document.addEventListener("click", (e) => {
			if (!isMenuOpen()) return;
			if (e.target.closest("#ybNav, #ybMenu")) return;
			closeMenu();
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && isMenuOpen()) {
				closeMenu({ restoreFocus: true });
			}
		});
		const desktopMq = window.matchMedia("(min-width: 768px)");
		const onDesktop = () => {
			if (desktopMq.matches) closeMenu();
		};
		if (desktopMq.addEventListener) desktopMq.addEventListener("change", onDesktop);
		else desktopMq.addListener(onDesktop);

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
				return;
			}
			const href = link.getAttribute("href");
			if (href === "#business-journey") {
				e.preventDefault();
				window.dispatchEvent(new CustomEvent("yb:goto", { detail: { scene: "hub" } }));
			}
		});
		document.getElementById("service_interest")?.addEventListener("change", togglePlanFields);
	}

	function errorEl(id) {
		return document.getElementById(`err-${id}`);
	}

	function setFieldError(id, message) {
		const field = document.getElementById(id);
		const err = errorEl(id);
		if (field) field.setAttribute("aria-invalid", "true");
		if (err) {
			err.hidden = false;
			err.textContent = message;
		}
	}

	function clearFieldError(id) {
		const field = document.getElementById(id);
		const err = errorEl(id);
		if (field) field.removeAttribute("aria-invalid");
		if (err) {
			err.hidden = true;
			err.textContent = "";
		}
	}

	function fieldMessage(id) {
		const copy = FIELD_ERRORS[id];
		return copy ? t(copy.ar, copy.en) : t("فضلاً أكمل هذا الحقل.", "Please complete this field.");
	}

	function isFieldValid(id) {
		const el = document.getElementById(id);
		if (!el) return true;
		if (id === "privacy") return el.checked;
		if (id === "service_interest") return ["erp", "sign", "both"].includes(el.value);
		return el.checkValidity();
	}

	function validateForm() {
		const invalid = [];
		REQUIRED.forEach((id) => {
			if (isFieldValid(id)) clearFieldError(id);
			else {
				setFieldError(id, fieldMessage(id));
				invalid.push(id);
			}
		});
		return invalid;
	}

	function refreshFieldErrorsLang() {
		REQUIRED.forEach((id) => {
			const field = document.getElementById(id);
			if (field && field.getAttribute("aria-invalid") === "true") {
				setFieldError(id, fieldMessage(id));
			}
		});
	}

	function setupForm() {
		if (!form) return;
		REQUIRED.forEach((id) => {
			const el = document.getElementById(id);
			if (!el) return;
			const evt = id === "privacy" || id === "service_interest" ? "change" : "input";
			el.addEventListener(evt, () => {
				if (isFieldValid(id)) clearFieldError(id);
			});
		});
		form.addEventListener("submit", async (e) => {
			e.preventDefault();
			if (submitting) return;
			if (live) live.textContent = "";
			const invalid = validateForm();
			if (invalid.length) {
				document.getElementById(invalid[0])?.focus();
				return;
			}
			const submit = document.getElementById("ybSubmit");
			const label = submit && submit.querySelector(".yb-btn__label");
			const spin = submit && submit.querySelector(".yb-btn__spin");
			const original = label ? label.textContent : "";
			submitting = true;
			form.classList.add("is-loading");
			if (submit) submit.disabled = true;
			if (label) label.textContent = t("نرسل طلبك...", "Sending...");
			if (spin) spin.hidden = false;
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
					if (success) {
						success.hidden = false;
						const msg = document.getElementById("ybSuccessMsg");
						if (msg) {
							msg.setAttribute("role", "status");
							msg.setAttribute("aria-live", "polite");
						}
						success.focus();
					}
				} else if (body.code === "rate_limited") {
					if (live) live.textContent = t("حاول مرة ثانية بعد قليل.", "Please try again shortly.");
				} else {
					(body.fields || []).forEach((id) => setFieldError(id, fieldMessage(id)));
					const first = (body.fields || []).find((id) => document.getElementById(id));
					if (first) document.getElementById(first).focus();
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
				form.classList.remove("is-loading");
				if (submit) submit.disabled = false;
				if (label) label.textContent = original || t("أرسل الطلب", "Send request");
				if (spin) spin.hidden = true;
				submitting = false;
			}
		});
	}

	function setupReveal() {
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const reveals = Array.from(document.querySelectorAll(".yb-reveal"));
		if (reduced) {
			reveals.forEach((el) => el.classList.add("is-in"));
			document.querySelectorAll("main > section").forEach((el) => el.classList.add("is-seen"));
			return;
		}

		const groups = new Map();
		reveals.forEach((el) => {
			const parent = el.parentElement;
			if (!parent) return;
			if (!groups.has(parent)) groups.set(parent, []);
			groups.get(parent).push(el);
		});
		groups.forEach((kids) => {
			kids.forEach((el, i) => {
				el.style.setProperty("--yb-reveal-delay", `${i * 90}ms`);
			});
		});

		const show = (el) => {
			if (el.classList.contains("is-in")) return;
			el.classList.add("is-in");
		};

		document.querySelectorAll(".yb-hero .yb-reveal").forEach((el) => {
			requestAnimationFrame(() => show(el));
		});

		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					show(entry.target);
					io.unobserve(entry.target);
				});
			},
			{ threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
		);
		reveals.forEach((el) => {
			if (el.closest(".yb-hero")) return;
			io.observe(el);
		});

		const sections = document.querySelectorAll("main > section");
		if (sections.length) {
			const secIo = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						entry.target.classList.toggle("is-seen", entry.isIntersecting);
					});
				},
				{ threshold: 0.22 }
			);
			sections.forEach((el) => secIo.observe(el));
		}
	}

	applyLanguage();
	setupNav();
	togglePlanFields();
	setupForm();
	setupReveal();
})();
