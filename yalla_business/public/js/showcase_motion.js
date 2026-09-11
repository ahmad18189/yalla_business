(function () {
	const root = document.getElementById("ybs-story");
	if (!root) return;

	const PINNED = "(min-width: 1024px)";
	const COMPACT = "(max-width: 1023px)";
	const REDUCE = "(prefers-reduced-motion: reduce)";
	const HEADER = 72;

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
		const cap = scene === "kateb" ? "sign" : scene;
		root.querySelectorAll(".ybs-caption").forEach((el) => {
			el.classList.toggle("is-active", el.getAttribute("data-scene") === cap);
		});
		const chapter = scene === "hub" || scene === "erp" ? "erp" : scene === "kateb" ? "kateb" : "sign";
		root.querySelectorAll(".ybs-chapters button").forEach((btn) => {
			btn.setAttribute("aria-pressed", btn.getAttribute("data-chapter") === chapter ? "true" : "false");
		});
	}

	function setCaptionFromProgress(p) {
		if (p < 0.18) caption("hub");
		else if (p < 0.54) caption("erp");
		else if (p < 0.74) caption("kateb");
		else if (p < 0.93) caption("sign");
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

	function storyInView() {
		const pin = root.querySelector(".ybs-story__pin") || root;
		const box = pin.getBoundingClientRect();
		return box.top <= HEADER + 8 && box.bottom > HEADER + 120;
	}

	function scrollInstant(top) {
		const html = document.documentElement;
		const prev = html.style.scrollBehavior;
		html.style.scrollBehavior = "auto";
		window.scrollTo(0, Math.max(0, top));
		html.style.scrollBehavior = prev;
	}

	function liveTrigger() {
		if (timeline && timeline.scrollTrigger && typeof timeline.scrollTrigger.start === "number") {
			return timeline.scrollTrigger;
		}
		if (!window.ScrollTrigger) return null;
		return (
			window.ScrollTrigger.getAll().find((st) => {
				return st.trigger === root || (st.trigger && root.contains(st.trigger));
			}) || null
		);
	}

	function restoreProgress(progress) {
		const p = Math.min(1, Math.max(0, Number(progress) || 0));
		const st = liveTrigger();
		let top;
		if (st && typeof st.start === "number" && st.end > st.start) {
			top = st.start + (st.end - st.start) * p;
		} else {
			const panel = root.querySelector(".ybs-story__pin") || root;
			top = panel.getBoundingClientRect().top + window.scrollY - HEADER;
		}
		if (st && typeof st.scroll === "function") {
			st.scroll(top);
			if (st.update) st.update();
			lastProgress = p;
			setCaptionFromProgress(p);
			return;
		}
		scrollInstant(top);
		lastProgress = p;
		setCaptionFromProgress(p);
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

	function destroyStory() {
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
		root.querySelectorAll(".ybs-caption").forEach((el) => el.classList.add("is-active"));
		root.querySelectorAll(".ybs-m-mod, .ybs-chip, .ybs-ok, .ybs-passage").forEach((el) => {
			el.classList.add("is-on");
			el.style.opacity = "1";
		});
	}

	function measureDests(objects) {
		return objects.map((obj) => {
			const id = obj.getAttribute("data-target");
			const card = id ? document.getElementById(id) : null;
			if (!card) return { x: 0, y: 0, card: null };
			return Object.assign(offsetTo(obj, card), { card });
		});
	}

	function buildDesktop(gsap) {
		root.classList.remove("is-static", "is-compact");
		root.dataset.scene = "hub";
		const pinWrap = root.querySelector(".ybs-story__pin");
		if (!pinWrap) return;
		const orb = root.querySelector(".ybs-story__orb");
		const panel = document.getElementById("ybsPanel");
		const erp = document.getElementById("ybsErpScene");
		const erpLabel = root.querySelector(".ybs-erp__label");
		const doc = document.getElementById("ybsSignScene");
		const objects = Array.from(root.querySelectorAll(".ybs-story__canvas .ybs-obj"));
		const mods = Array.from(root.querySelectorAll(".ybs-erp .ybs-mod"));
		const bars = root.querySelectorAll(".ybs-erp .ybs-bars i");
		const line = root.querySelector(".ybs-erp-line");
		const passages = Array.from(root.querySelectorAll("#ybsSignScene .ybs-passage"));
		const chips = Array.from(root.querySelectorAll("#ybsSignScene .ybs-chip"));
		const signature = document.getElementById("ybsSignature");
		const pen = root.querySelector("#ybsSignPad .ybs-pen");
		const pad = document.getElementById("ybsSignPad");
		const ok = root.querySelector("#ybsSignScene .ybs-ok");
		const sigLen = prepareSignature(signature);
		const shards = Array.from(root.querySelectorAll(".ybs-shard"));
		const dests = measureDests(objects);
		const toMark = orb ? objects.map((obj) => offsetTo(obj, orb)) : objects.map(() => ({ x: 0, y: 0 }));
		const flip = document.documentElement.dir === "ltr" ? -1 : 1;
		const scatter = [
			{ x: -320 * flip, y: -200, r: -26, s: 0.72 },
			{ x: 300 * flip, y: -170, r: 24, s: 0.7 },
			{ x: 340 * flip, y: 160, r: 16, s: 0.68 },
			{ x: -280 * flip, y: 210, r: -18, s: 0.74 },
			{ x: -40 * flip, y: -280, r: 14, s: 0.8 },
			{ x: 70 * flip, y: 260, r: -22, s: 0.7 },
		];

		gsap.set(objects, { opacity: 0, x: 0, y: 0, scale: 0.55 });
		gsap.set(mods, { opacity: 0, y: 8 });
		gsap.set(erp, { opacity: 1, y: 0 });
		if (erpLabel) gsap.set(erpLabel, { opacity: 1 });
		gsap.set(doc, { opacity: 0 });
		if (orb) gsap.set(orb, { opacity: 0, scale: 0.94 });
		shards.forEach((el, i) => {
			const d = scatter[i] || scatter[0];
			gsap.set(el, { x: d.x, y: d.y, rotation: d.r, scale: d.s, opacity: 0.95 });
		});
		gsap.set(panel, { opacity: 0, scale: 0.86, borderRadius: "22px", backgroundColor: "#fff" });
		gsap.set(bars, { scaleY: 0.14 });
		if (line) gsap.set(line, { strokeDashoffset: 220 });
		passages.forEach((el) => el.classList.remove("is-on"));
		gsap.set(chips, { opacity: 0, y: 6 });
		gsap.set(ok, { opacity: 0 });
		if (pen) gsap.set(pen, { opacity: 0, x: 0, y: 0 });

		const tl = gsap.timeline({
			defaults: { ease: "power2.out" },
			scrollTrigger: {
				trigger: pinWrap,
				start: "top " + HEADER + "px",
				end: () => "+=" + Math.round(window.innerHeight * 2.8),
				pin: pinWrap,
				pinSpacing: true,
				scrub: 1.15,
				anticipatePin: 1,
				invalidateOnRefresh: true,
				onRefresh(self) {
					if (!self.pin) return;
					self.pin.style.left = "0px";
					self.pin.style.right = "0px";
					self.pin.style.width = "100%";
				},
				onUpdate(self) {
					lastProgress = self.progress;
					setCaptionFromProgress(self.progress);
				},
			},
		});
		timeline = tl;
		if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);

		tl.addLabel("hub", 0);
		tl.to({}, { duration: 0.25 }, 0);

		tl.addLabel("connect", 0.3);
		shards.forEach((el, i) => {
			tl.to(el, { x: 0, y: 0, rotation: 0, scale: 1, duration: 1.45, ease: "power3.inOut" }, 0.35 + i * 0.07);
		});
		if (orb) tl.to(orb, { opacity: 0.48, scale: 1, duration: 0.85, ease: "power2.out" }, 1.45);
		tl.to(shards, { opacity: 0, duration: 0.45, ease: "power1.out" }, 1.85);
		objects.forEach((obj, i) => {
			tl.to(obj, { opacity: 1, scale: 1, duration: 0.35 }, 1.55 + i * 0.08);
		});
		objects.forEach((obj, i) => {
			const dock = toMark[i] || { x: 0, y: 0 };
			tl.to(obj, { x: dock.x * 0.62, y: dock.y * 0.62, scale: 0.88, duration: 0.7, ease: "power2.inOut" }, 2.15 + i * 0.05);
		});

		tl.addLabel("erp", 3.15);
		objects.forEach((obj, i) => {
			const dest = dests[i] || { x: 0, y: 0, card: null };
			const start = 3.2 + i * 0.14;
			tl.to(obj, { x: dest.x, y: dest.y, scale: 1, duration: 0.9, ease: "power2.inOut" }, start);
			if (dest.card) tl.to(dest.card, { opacity: 1, y: 0, duration: 0.28 }, start + 0.68);
			tl.to(obj, { opacity: 0, scale: 0.7, duration: 0.2 }, start + 0.78);
		});
		tl.to(panel, { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" }, 3.35);
		if (orb) tl.to(orb, { opacity: 0.16, scale: 1.08, duration: 0.8 }, 3.4);
		tl.to(mods, { opacity: 1, y: 0, duration: 0.3 }, 3.85);
		tl.to(bars, { scaleY: 1, stagger: 0.05, duration: 0.45 }, 4.15);
		if (line) tl.to(line, { strokeDashoffset: 0, duration: 0.7 }, 4.2);

		tl.addLabel("hold", 4.85);
		const hold = { n: 0 };
		tl.to(hold, { n: 1, duration: 0.85 }, 4.9);

		tl.addLabel("morph", 5.85);
		tl.to(mods, { y: (i) => i * 4, scaleY: 0.55, duration: 0.7, ease: "power2.inOut" }, 5.9);
		tl.to(panel, { borderRadius: "20px", backgroundColor: "#f6f1fa", duration: 0.75, ease: "power2.inOut" }, 5.95);
		tl.to(erp, { opacity: 0, duration: 0.4 }, 6.45);
		if (erpLabel) tl.to(erpLabel, { opacity: 0, duration: 0.3 }, 6.45);
		tl.to(doc, { opacity: 1, duration: 0.45 }, 6.5);
		tl.to(mods, { scaleY: 1, y: 0, duration: 0.01 }, 6.7);

		tl.addLabel("kateb", 6.95);
		passages.forEach((el, i) => {
			tl.to(el, { duration: 0.01, onStart() { el.classList.add("is-on"); }, onReverseComplete() { el.classList.remove("is-on"); } }, 7.05 + i * 0.28);
		});
		chips.forEach((chip, i) => {
			tl.to(chip, { opacity: 1, y: 0, duration: 0.25 }, 7.75 + i * 0.12);
		});

		tl.addLabel("sign", 8.65);
		if (pad) {
			tl.to(pad, {
				duration: 0.15,
				onStart() { pad.classList.add("is-focus"); },
				onReverseComplete() { pad.classList.remove("is-focus"); },
			}, 8.7);
		}
		if (pen && signature && pad) {
			const proxy = { t: 0 };
			const startPt = svgPointToPad(signature, 0, pad, pen);
			tl.set(pen, { opacity: 1, x: startPt.x, y: startPt.y }, 8.8);
			tl.to(
				proxy,
				{
					t: 1,
					duration: 1.2,
					ease: "none",
					onUpdate() {
						const pos = svgPointToPad(signature, proxy.t, pad, pen);
						gsap.set(pen, { x: pos.x, y: pos.y, opacity: 1 });
						signature.style.strokeDashoffset = String(sigLen * (1 - proxy.t));
					},
				},
				8.85
			);
			tl.to(pen, { opacity: 0, duration: 0.18 }, 10.07);
		}
		tl.to(ok, { opacity: 1, duration: 0.28 }, 10.13);
		if (pad) {
			tl.to(pad, {
				duration: 0.12,
				onStart() { pad.classList.remove("is-focus"); },
				onReverseComplete() { pad.classList.add("is-focus"); },
			}, 10.2);
		}

		tl.addLabel("done", 10.35);
		tl.to(hold, { n: 0, duration: 0.7 }, 10.4);
		if (orb) tl.to(orb, { opacity: 0.22, duration: 0.5 }, 10.4);
	}

	function finishMobileErp(scene) {
		scene.querySelectorAll(".ybs-m-mod").forEach((el) => el.classList.add("is-on"));
		scene.classList.add("is-done");
		scene.dataset.played = "1";
	}

	function finishMobileKateb(scene) {
		scene.querySelectorAll(".ybs-chip, .ybs-passage").forEach((el) => {
			el.classList.add("is-on");
			el.style.opacity = "1";
		});
		scene.classList.add("is-done");
		scene.dataset.played = "1";
	}

	function finishMobileSign(scene) {
		const path = document.getElementById("ybsMobileSignature");
		const ok = scene.querySelector(".ybs-ok");
		if (path) {
			path.style.strokeDasharray = "none";
			path.style.strokeDashoffset = "0";
		}
		if (ok) ok.style.opacity = "1";
		scene.classList.add("is-done");
		scene.dataset.played = "1";
	}

	function playMobileErp(gsap, scene) {
		if (scene.dataset.played) return;
		if (scene.getBoundingClientRect().bottom < HEADER) {
			finishMobileErp(scene);
			return;
		}
		scene.dataset.played = "1";
		const mods = scene.querySelectorAll(".ybs-m-mod");
		gsap.fromTo(mods, { opacity: 0.35 }, { opacity: 1, stagger: 0.12, duration: 0.28, onComplete() { finishMobileErp(scene); } });
	}

	function playMobileKateb(gsap, scene) {
		if (scene.dataset.played) return;
		if (scene.getBoundingClientRect().bottom < HEADER) {
			finishMobileKateb(scene);
			return;
		}
		scene.dataset.played = "1";
		const passages = scene.querySelectorAll(".ybs-passage");
		const chips = scene.querySelectorAll(".ybs-chip");
		const tl = gsap.timeline({ onComplete() { finishMobileKateb(scene); } });
		tl.fromTo(passages, { opacity: 0.4 }, { opacity: 1, stagger: 0.18, duration: 0.28 });
		tl.fromTo(chips, { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.22 }, 0.45);
	}

	function playMobileSign(gsap, scene) {
		if (scene.dataset.played) return;
		if (scene.getBoundingClientRect().bottom < HEADER) {
			finishMobileSign(scene);
			return;
		}
		scene.dataset.played = "1";
		const path = document.getElementById("ybsMobileSignature");
		const pad = document.getElementById("ybsMobileSignPad");
		const pen = scene.querySelector(".ybs-pen");
		const ok = scene.querySelector(".ybs-ok");
		const len = prepareSignature(path);
		const tl = gsap.timeline({ onComplete() { finishMobileSign(scene); } });
		if (pen && path && pad) {
			const proxy = { t: 0 };
			const startPt = svgPointToPad(path, 0, pad, pen);
			tl.set(pen, { opacity: 1, x: startPt.x, y: startPt.y });
			tl.to(proxy, {
				t: 1,
				duration: 1.15,
				ease: "none",
				onUpdate() {
					const pos = svgPointToPad(path, proxy.t, pad, pen);
					gsap.set(pen, { x: pos.x, y: pos.y });
					path.style.strokeDashoffset = String(len * (1 - proxy.t));
				},
			});
			tl.to(pen, { opacity: 0, duration: 0.12 });
		}
		tl.to(ok, { opacity: 1, duration: 0.2 });
	}

	function buildMobile(gsap) {
		root.classList.add("is-compact");
		root.classList.remove("is-static");
		caption("erp");
		root.querySelectorAll(".ybs-caption").forEach((el) => el.classList.add("is-active"));
		const erp = document.getElementById("ybsMobileErp");
		const kateb = document.getElementById("ybsMobileKateb");
		const sign = document.getElementById("ybsMobileSign");
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					if (entry.target.id === "ybsMobileErp") playMobileErp(gsap, entry.target);
					if (entry.target.id === "ybsMobileKateb") playMobileKateb(gsap, entry.target);
					if (entry.target.id === "ybsMobileSign") playMobileSign(gsap, entry.target);
					io.unobserve(entry.target);
				});
			},
			{ threshold: 0.35 }
		);
		if (erp) io.observe(erp);
		if (kateb) io.observe(kateb);
		if (sign) io.observe(sign);
		observers.push(io);
	}

	function buildStory() {
		if (building) return;
		building = true;
		destroyStory();

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
					if (isCompact || !isPinned) {
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
					buildDesktop(gsap);
					return () => {
						killTriggers();
						gsap.set(root.querySelectorAll(".ybs-obj, .ybs-mod, .ybs-erp, .ybs-doc, .ybs-pen, .ybs-chip, .ybs-story__orb, .ybs-shard, .ybs-stage__panel"), {
							clearProps: "all",
						});
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
			rebuildStory({ preserveProgress: storyInView() });
		}, 280);
	}

	function rebuildStory(options) {
		const opts = options || {};
		const progress = opts.preserveProgress ? currentProgress() : 0;
		lastProgress = progress;
		destroyStory();
		buildStory();
		if (opts.preserveProgress && storyInView()) {
			requestAnimationFrame(() => {
				restoreProgress(progress);
				if (window.ScrollTrigger) window.ScrollTrigger.refresh();
			});
		}
	}

	function goto(scene) {
		if (window.matchMedia(COMPACT).matches || prefersReduced()) {
			const map = {
				erp: document.getElementById("ybsMobileErp") || document.getElementById("ybs-yalla-erp"),
				kateb: document.getElementById("ybsMobileKateb") || document.getElementById("ybs-yallasign"),
				sign: document.getElementById("ybsMobileSign") || document.getElementById("ybs-yallasign"),
				hub: document.getElementById("ybs-story"),
			};
			(map[scene] || map.hub)?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
			return;
		}
		const labels = { hub: "hub", erp: "erp", kateb: "kateb", sign: "sign", done: "done" };
		const label = labels[scene] || "hub";
		let p = { hub: 0.03, erp: 0.3, kateb: 0.64, sign: 0.92, done: 0.96 }[scene] || 0.03;
		if (timeline && timeline.labels && timeline.labels[label] != null) {
			const dur = timeline.duration() || 1;
			const extra = scene === "sign" ? 0.145 : 0.015;
			p = Math.min(0.97, timeline.labels[label] / dur + extra);
		}
		restoreProgress(p);
		if (window.ScrollTrigger) window.ScrollTrigger.update();
	}

	function onLangChange() {
		const keep = storyInView();
		const progress = keep ? currentProgress() : 0;
		destroyStory();
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				buildStory();
				if (keep) restoreProgress(progress);
				if (window.ScrollTrigger) window.ScrollTrigger.refresh();
			});
		});
	}

	function startStory() {
		buildStory();
		requestAnimationFrame(() => {
			if (window.ScrollTrigger) window.ScrollTrigger.refresh();
		});
	}

	document.addEventListener(
		"click",
		(e) => {
			const btn = e.target.closest("#ybs-story .ybs-chapters [data-chapter]");
			if (!btn) return;
			e.preventDefault();
			goto(btn.getAttribute("data-chapter"));
		},
		true
	);

	if (document.readyState === "complete") startStory();
	else window.addEventListener("load", startStory, { once: true });

	window.addEventListener("ybs:goto", (e) => goto(e.detail && e.detail.scene));
	window.addEventListener("ybs:langchange", onLangChange);
	window.YBSShowcase = { goto };

	const reduceMq = window.matchMedia(REDUCE);
	const onReduce = () => rebuildStory({ preserveProgress: storyInView() });
	if (reduceMq.addEventListener) reduceMq.addEventListener("change", onReduce);
	else reduceMq.addListener(onReduce);
})();
