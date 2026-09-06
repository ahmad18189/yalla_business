(function () {
	const root = document.getElementById("business-journey");
	if (!root) return;

	const PINNED = "(min-width: 768px) and (min-height: 721px)";
	const COMPACT = "(max-width: 767px), (max-height: 720px)";
	const REDUCE = "(prefers-reduced-motion: reduce)";

	let ctx = null;
	let mm = null;
	let timeline = null;
	let triggers = [];
	let observers = [];
	let listeners = [];
	let resizeTimer = null;
	let lastSize = { w: window.innerWidth, h: window.innerHeight };
	let building = false;
	let lastProgress = 0;

	function prefersReduced() {
		return window.matchMedia(REDUCE).matches;
	}

	function canAnimate() {
		return !!(window.gsap && window.ScrollTrigger) && !prefersReduced();
	}

	function addListener(target, type, fn, opts) {
		target.addEventListener(type, fn, opts);
		listeners.push({ target, type, fn, opts });
	}

	function caption(scene) {
		root.dataset.scene = scene;
		root.querySelectorAll(".yb-caption").forEach((el) => {
			el.classList.toggle("is-active", el.getAttribute("data-scene") === scene);
		});
	}

	function setCaptionFromProgress(p) {
		if (p < 0.12) caption("hub");
		else if (p < 0.55) caption("erp");
		else if (p < 0.88) caption("sign");
		else caption("done");
	}

	function offsetTo(el, target) {
		const a = el.getBoundingClientRect();
		const b = target.getBoundingClientRect();
		return {
			x: b.left + b.width / 2 - (a.left + a.width / 2),
			y: b.top + b.height / 2 - (a.top + a.height / 2),
		};
	}

	function svgPointToPad(path, t, pad, pen) {
		const svg = path.ownerSVGElement;
		if (!svg) return { x: 0, y: 0 };
		const len = path.getTotalLength();
		const pt = path.getPointAtLength(len * t);
		const p = svg.createSVGPoint();
		p.x = pt.x;
		p.y = pt.y;
		const ctm = svg.getScreenCTM();
		if (!ctm) return { x: pt.x, y: pt.y };
		const screen = p.matrixTransform(ctm);
		const padRect = pad.getBoundingClientRect();
		const pw = pen.offsetWidth || 18;
		const ph = pen.offsetHeight || 18;
		return {
			x: screen.x - padRect.left - pw * 0.2,
			y: screen.y - padRect.top - ph * 0.82,
		};
	}

	function prepareSignature(path) {
		if (!path || !path.getTotalLength) return 0;
		const len = path.getTotalLength();
		path.style.strokeDasharray = String(len);
		path.style.strokeDashoffset = String(len);
		return len;
	}

	function currentProgress() {
		if (timeline && timeline.scrollTrigger) return timeline.scrollTrigger.progress;
		return lastProgress;
	}

	function scrollInstant(top) {
		const html = document.documentElement;
		const prev = html.style.scrollBehavior;
		html.style.scrollBehavior = "auto";
		window.scrollTo(0, Math.max(0, top));
		html.style.scrollBehavior = prev;
	}

	function restoreProgress(progress, smooth) {
		const p = Math.min(1, Math.max(0, Number(progress) || 0));
		const st = timeline && timeline.scrollTrigger;
		let top;
		if (st && typeof st.start === "number" && st.end > st.start) {
			top = st.start + (st.end - st.start) * p;
		} else {
			const panel = root.querySelector(".yb-journey__sticky") || root.querySelector(".yb-journey__pin");
			if (!panel) return;
			top = panel.getBoundingClientRect().top + window.scrollY - 76;
		}
		if (smooth && !prefersReduced()) window.scrollTo({ top, behavior: "smooth" });
		else scrollInstant(top);
	}

	function clearObservers() {
		observers.forEach((obs) => obs.disconnect && obs.disconnect());
		observers = [];
	}

	function killTriggers() {
		triggers.forEach((st) => {
			if (st && st.kill) st.kill();
		});
		triggers = [];
		if (timeline) {
			if (timeline.scrollTrigger && timeline.scrollTrigger.kill) timeline.scrollTrigger.kill();
			timeline.kill();
			timeline = null;
		}
	}

	function destroyJourney() {
		clearObservers();
		listeners.forEach(({ target, type, fn, opts }) => {
			target.removeEventListener(type, fn, opts);
		});
		listeners = [];
		if (resizeTimer) {
			clearTimeout(resizeTimer);
			resizeTimer = null;
		}
		killTriggers();
		if (ctx && ctx.revert) ctx.revert();
		ctx = null;
		mm = null;
		root.classList.remove("is-compact");
		if (window.ScrollTrigger) {
			window.ScrollTrigger.getAll().forEach((st) => {
				if (st.trigger === root || (st.trigger && root.contains(st.trigger))) st.kill();
			});
		}
	}

	function applyStatic() {
		root.classList.add("is-static");
		root.classList.remove("is-compact");
		caption("hub");
		root.querySelectorAll(".yb-caption").forEach((el) => el.classList.add("is-active"));
	}

	function buildDesktop(gsap, isTablet) {
		root.classList.remove("is-static", "is-compact");
		root.dataset.scene = "hub";
		const rtl = document.documentElement.dir === "rtl";
		const hub = root.querySelector(".yb-journey__hub");
		const dash = root.querySelector(".yb-erp-dash");
		const sign = root.querySelector(".yb-sign-doc");
		const eco = root.querySelector(".yb-journey__eco");
		const objects = Array.from(root.querySelectorAll(".yb-obj"));
		const cards = Array.from(root.querySelectorAll(".yb-erp-card"));
		const bars = root.querySelectorAll(".yb-erp-bars:not(.yb-erp-bars--m) i");
		const line = root.querySelector(".yb-erp-line");
		const lines = root.querySelectorAll("#ybSignScene .yb-sign-line");
		const signature = document.getElementById("ybSignature");
		const pen = root.querySelector("#ybSignPad .yb-pen");
		const pad = document.getElementById("ybSignPad");
		const ok = root.querySelector("#ybSignScene .yb-sign-ok");
		const ecoLines = root.querySelectorAll(".yb-journey__eco i");
		const sheets = {
			back: root.querySelector(".yb-sign-sheet--back"),
			mid: root.querySelector(".yb-sign-sheet--mid"),
			front: root.querySelector(".yb-sign-sheet--front"),
		};
		const pin = root.querySelector(".yb-journey__pin");
		const sticky = root.querySelector(".yb-journey__sticky");
		const sigLen = prepareSignature(signature);

		gsap.set(objects, { opacity: 0, x: 0, y: 0, scale: 0.55, rotation: 0 });
		gsap.set(cards, { opacity: 0, y: 10, scale: 1, x: 0 });
		gsap.set([dash, sign, eco], { opacity: 0, scale: 1, x: 0, y: 0, borderRadius: "" });
		gsap.set(hub, { opacity: 1, scale: 0.9, xPercent: -50, yPercent: -50, x: 0, y: 0 });
		gsap.set(bars, { scaleY: 0.12 });
		if (line) gsap.set(line, { strokeDashoffset: 220 });
		gsap.set(lines, { scaleX: 0 });
		gsap.set(ok, { opacity: 0 });
		if (pen) gsap.set(pen, { opacity: 0, x: 0, y: 0 });
		if (sheets.back) gsap.set(sheets.back, { opacity: 0, y: 18 });
		if (sheets.mid) gsap.set(sheets.mid, { opacity: 0, y: 12 });
		if (sheets.front) gsap.set(sheets.front, { opacity: 0, y: 24, scale: 0.96 });
		gsap.set(ecoLines, { scaleX: 0 });

		const destCounts = {};
		const dests = objects.map((obj) => {
			const id = obj.getAttribute("data-target");
			const card = id ? document.getElementById(id) : null;
			const lane = obj.getAttribute("data-lane");
			if (!card) return { x: 0, y: 0, card: null, lane };
			const point = offsetTo(obj, card);
			const n = destCounts[id] || 0;
			destCounts[id] = n + 1;
			const same = objects.filter((o) => o.getAttribute("data-target") === id).length;
			const spread = (n - (same - 1) / 2) * 16;
			point.x += spread;
			return Object.assign(point, { card, lane });
		});

		const tl = gsap.timeline({
			defaults: { ease: "power2.out" },
			scrollTrigger: {
				trigger: sticky || pin,
				start: "top 76px",
				end: () => "+=" + Math.max(1600, Math.round(window.innerHeight * 2.7)),
				pin: true,
				pinSpacing: true,
				scrub: 1,
				anticipatePin: 1,
				invalidateOnRefresh: true,
				onUpdate(self) {
					lastProgress = self.progress;
					setCaptionFromProgress(self.progress);
				},
			},
		});
		timeline = tl;
		if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);

		tl.addLabel("hub", 0);
		tl.to(hub, { scale: 1, duration: 1.2 }, 0);

		tl.addLabel("objects", 1.2);
		objects.forEach((obj, i) => {
			const dest = dests[i];
			const start = 1.2 + i * 0.12;
			const bend = (dest.lane === "inventory" ? 0.18 : dest.lane === "hr" ? -0.12 : 0.1) * (rtl ? -1 : 1);
			const mid = {
				x: dest.x * 0.42 - dest.y * bend,
				y: dest.y * 0.35 + dest.x * bend * 0.35,
			};
			tl.to(obj, { opacity: 1, scale: 1, x: mid.x, y: mid.y, duration: 0.45, ease: "power2.out" }, start);
			tl.to(obj, { x: dest.x, y: dest.y, duration: 0.7, ease: "power2.inOut" }, start + 0.45);
			if (dest.card) {
				tl.to(dest.card, { opacity: 1, y: 0, duration: 0.35 }, start + 0.95);
			}
			tl.to(obj, { opacity: 0, scale: 0.35, duration: 0.28 }, start + 1.15);
		});

		tl.addLabel("assemble", 3.7);
		tl.to(dash, { opacity: 1, scale: 1, duration: 0.85, ease: "power2.out" }, 3.7);
		tl.to(hub, { opacity: 0.18, scale: 0.72, duration: 0.9 }, 3.7);
		tl.to(cards, { opacity: 1, y: 0, stagger: 0.05, duration: 0.42 }, 3.85);
		tl.to(bars, { scaleY: 1, stagger: 0.06, duration: 0.62 }, 4.3);
		if (line) tl.to(line, { strokeDashoffset: 0, duration: 0.9 }, 4.4);
		tl.to(cards, { y: 0, scale: 1, duration: 0.45 }, 5.05);

		tl.addLabel("morph", 5.5);
		cards.forEach((card, i) => {
			const dashRect = dash.getBoundingClientRect();
			const cardRect = card.getBoundingClientRect();
			const cx = dashRect.left + dashRect.width / 2 - (cardRect.left + cardRect.width / 2);
			const cy = dashRect.top + dashRect.height * (0.28 + (i % 6) * 0.08) - (cardRect.top + cardRect.height / 2);
			tl.to(
				card,
				{
					x: cx * 0.85,
					y: cy,
					scaleY: 0.22,
					scaleX: 1.08,
					borderRadius: 6,
					duration: 0.9,
					ease: "power2.inOut",
				},
				5.5 + i * 0.02
			);
		});
		tl.to(bars, { scaleY: 0.08, duration: 0.55 }, 5.55);
		if (line) tl.to(line, { opacity: 0.25, duration: 0.5 }, 5.6);
		tl.to(dash, { borderRadius: "14px", scaleX: 0.78, scaleY: 1.06, duration: 0.9, ease: "power2.inOut" }, 5.7);
		if (sheets.back) tl.to(sheets.back, { opacity: 1, y: 0, duration: 0.45 }, 6.15);
		if (sheets.mid) tl.to(sheets.mid, { opacity: 1, y: 0, duration: 0.45 }, 6.24);
		tl.to(sign, { opacity: 1, duration: 0.5 }, 6.28);
		if (sheets.front) tl.to(sheets.front, { opacity: 1, y: 0, scale: 1, duration: 0.5 }, 6.36);
		tl.to(dash, { opacity: 0, duration: 0.55 }, 6.32);

		tl.addLabel("sign", 6.8);
		if (sheets.front) tl.to(sheets.front, { y: -10, scale: 1.03, duration: 0.4 }, 6.8);
		tl.to(root.querySelector("#ybSignScene .yb-sign-title"), { opacity: 1, duration: 0.25 }, 6.95);
		tl.to(lines, { scaleX: 1, stagger: 0.08, duration: 0.4 }, 7.05);
		tl.to(root.querySelector("#ybSignScene .yb-sign-meta"), { opacity: 1, duration: 0.3 }, 7.3);
		if (pad) {
			tl.to(pad, {
				duration: 0.2,
				onStart() { pad.classList.add("is-focus"); },
				onReverseComplete() { pad.classList.remove("is-focus"); },
			}, 7.45);
		}
		if (pen && signature && pad) {
			const proxy = { t: 0 };
			const startPt = svgPointToPad(signature, 0, pad, pen);
			tl.set(pen, { opacity: 1, x: startPt.x, y: startPt.y }, 7.5);
			tl.to(
				proxy,
				{
					t: 1,
					duration: 1.15,
					ease: "none",
					onUpdate() {
						const pos = svgPointToPad(signature, proxy.t, pad, pen);
						gsap.set(pen, { x: pos.x, y: pos.y, opacity: 1 });
						signature.style.strokeDashoffset = String(sigLen * (1 - proxy.t));
					},
				},
				7.55
			);
			tl.to(pen, { opacity: 0, duration: 0.22 }, 8.72);
		}
		tl.to(ok, { opacity: 1, duration: 0.3 }, 8.78);
		tl.to(sign, { scale: 1.015, duration: 0.22, yoyo: true, repeat: 1 }, 8.9);
		if (pad) {
			tl.to(pad, {
				duration: 0.15,
				onStart() { pad.classList.remove("is-focus"); },
				onReverseComplete() { pad.classList.add("is-focus"); },
			}, 8.95);
		}

		tl.addLabel("done", 8.8);
		tl.to(eco, { opacity: 1, duration: 0.7 }, 8.85);
		tl.to(ecoLines, { scaleX: 1, duration: 0.55 }, 8.95);
		tl.to(hub, { opacity: 1, scale: 0.62, y: isTablet ? 90 : 110, duration: 0.7 }, 8.9);
		tl.to(sign, { y: -28, scale: 0.92, duration: 0.7 }, 8.95);
		const hold = { n: 0 };
		tl.to(hold, { n: 1, duration: 0.7 }, 9.3);
	}

	function playMobileErp(gsap, scene) {
		if (scene.dataset.played) return;
		scene.dataset.played = "1";
		const objs = Array.from(scene.querySelectorAll(".yb-m-obj"));
		const mods = scene.querySelectorAll(".yb-m-mod");
		const bars = scene.querySelectorAll(".yb-erp-bars i");
		const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
		objs.forEach((obj, i) => {
			const target = document.getElementById(obj.getAttribute("data-target"));
			const dest = target ? offsetTo(obj, target) : { x: 0, y: 0 };
			tl.fromTo(obj, { opacity: 0, scale: 0.7, x: 0, y: 0 }, { opacity: 1, scale: 1, duration: 0.18 }, i * 0.08);
			tl.to(obj, { x: dest.x, y: dest.y, duration: 0.42 }, i * 0.08 + 0.16);
			if (target) tl.to(target, { opacity: 1, y: 0, duration: 0.2 }, i * 0.08 + 0.5);
			tl.to(obj, { opacity: 0, scale: 0.4, duration: 0.16 }, i * 0.08 + 0.58);
		});
		tl.to(mods, { opacity: 1, y: 0, stagger: 0.04, duration: 0.2 }, 0.55);
		tl.to(bars, { scaleY: 1, stagger: 0.05, duration: 0.28 }, 0.85);
		tl.add(() => scene.classList.add("is-done"));
	}

	function playMobileSign(gsap, scene) {
		if (scene.dataset.played) return;
		scene.dataset.played = "1";
		const contract = scene.querySelector(".yb-m-sign");
		const lines = scene.querySelectorAll(".yb-sign-line");
		const path = document.getElementById("ybMobileSignature");
		const pad = document.getElementById("ybMobileSignPad");
		const pen = scene.querySelector(".yb-pen");
		const ok = scene.querySelector(".yb-sign-ok");
		const len = prepareSignature(path);
		const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
		tl.fromTo(contract, { y: 12, opacity: 0.65 }, { y: 0, opacity: 1, duration: 0.28 });
		tl.to(lines, { scaleX: 1, stagger: 0.08, duration: 0.28 }, 0.18);
		if (pen && path && pad) {
			const proxy = { t: 0 };
			const startPt = svgPointToPad(path, 0, pad, pen);
			tl.set(pen, { opacity: 1, x: startPt.x, y: startPt.y }, 0.55);
			tl.to(
				proxy,
				{
					t: 1,
					duration: 0.7,
					ease: "none",
					onUpdate() {
						const pos = svgPointToPad(path, proxy.t, pad, pen);
						gsap.set(pen, { x: pos.x, y: pos.y });
						path.style.strokeDashoffset = String(len * (1 - proxy.t));
					},
				},
				0.55
			);
			tl.to(pen, { opacity: 0, duration: 0.15 }, 1.25);
		}
		tl.to(ok, { opacity: 1, duration: 0.2 }, 1.28);
		tl.add(() => scene.classList.add("is-done"));
	}

	function buildMobile(gsap) {
		root.classList.add("is-compact");
		root.classList.remove("is-static");
		caption("erp");
		root.querySelectorAll(".yb-caption").forEach((el) => el.classList.add("is-active"));
		const erp = document.getElementById("ybMobileErpScene");
		const sign = document.getElementById("ybMobileSignScene");
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					if (entry.target.id === "ybMobileErpScene") playMobileErp(gsap, entry.target);
					if (entry.target.id === "ybMobileSignScene") playMobileSign(gsap, entry.target);
					io.unobserve(entry.target);
				});
			},
			{ threshold: 0.4 }
		);
		if (erp) io.observe(erp);
		if (sign) io.observe(sign);
		observers.push(io);
	}

	function buildJourney() {
		if (building) return;
		building = true;
		destroyJourney();

		if (prefersReduced() || !canAnimate()) {
			applyStatic();
			building = false;
			return;
		}

		const gsap = window.gsap;
		gsap.registerPlugin(window.ScrollTrigger);
		ctx = gsap.context(() => {
			mm = gsap.matchMedia();
			mm.add(
				{
					isPinned: PINNED,
					isCompact: COMPACT,
					reduce: REDUCE,
				},
				(media) => {
					const { isPinned, isCompact, reduce } = media.conditions;
					clearObservers();
					killTriggers();
					if (reduce) {
						applyStatic();
						return () => root.classList.remove("is-static");
					}
					if (isCompact) {
						buildMobile(gsap);
						return () => {
							clearObservers();
							root.classList.remove("is-compact");
							root.querySelectorAll("[data-played]").forEach((el) => {
								delete el.dataset.played;
								el.classList.remove("is-done");
							});
						};
					}
					if (isPinned) {
						const tablet = window.matchMedia("(max-width: 1024px)").matches;
						buildDesktop(gsap, tablet);
						return () => {
							killTriggers();
							gsap.set(root.querySelectorAll(".yb-obj, .yb-erp-card, .yb-erp-dash, .yb-sign-doc, .yb-journey__hub, .yb-journey__eco, .yb-pen"), {
								clearProps: "all",
							});
						};
					}
					buildMobile(gsap);
					return () => {
						clearObservers();
						root.classList.remove("is-compact");
					};
				}
			);
		}, root);

		addListener(window, "resize", onResize);
		building = false;
		if (window.ScrollTrigger) window.ScrollTrigger.refresh();
	}

	function onResize() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			const w = window.innerWidth;
			const h = window.innerHeight;
			if (Math.abs(w - lastSize.w) < 48 && Math.abs(h - lastSize.h) < 48) return;
			lastSize = { w, h };
			rebuildJourney({ preserveProgress: true });
		}, 280);
	}

	function rebuildJourney(options) {
		const opts = options || {};
		const progress = opts.preserveProgress ? currentProgress() : 0;
		lastProgress = progress;
		destroyJourney();
		buildJourney();
		if (opts.preserveProgress) {
			requestAnimationFrame(() => {
				restoreProgress(progress);
				if (window.ScrollTrigger) window.ScrollTrigger.refresh();
			});
		}
	}

	function goto(scene) {
		if (window.matchMedia(COMPACT).matches || prefersReduced()) {
			const target = scene === "sign" ? document.getElementById("ybMobileSignScene") || document.getElementById("yallasign") : document.getElementById("ybMobileErpScene") || document.getElementById("yalla-erp");
			target?.scrollIntoView({ behavior: "smooth", block: "start" });
			return;
		}
		const map = { hub: 0.02, erp: 0.38, sign: 0.72, done: 0.94 };
		restoreProgress(map[scene] != null ? map[scene] : 0.02, true);
	}

	function onLangChange() {
		const progress = currentProgress();
		destroyJourney();
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				buildJourney();
				restoreProgress(progress);
				if (window.ScrollTrigger) window.ScrollTrigger.refresh();
			});
		});
	}

	function syncHash() {
		const hash = (location.hash || "").replace("#", "");
		if (hash === "business-journey") restoreProgress(0, false);
	}

	function startJourney() {
		buildJourney();
		requestAnimationFrame(() => {
			if (window.ScrollTrigger) window.ScrollTrigger.refresh();
			syncHash();
		});
	}

	window.YBJourney = { buildJourney, destroyJourney, rebuildJourney };

	if (document.readyState === "complete") startJourney();
	else window.addEventListener("load", startJourney, { once: true });

	window.addEventListener("yb:goto", (e) => goto(e.detail && e.detail.scene));
	window.addEventListener("yb:langchange", onLangChange);
})();
