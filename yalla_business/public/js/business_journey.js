(function () {
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const mobile = window.matchMedia("(max-width: 767px)").matches;
	const root = document.getElementById("business-journey");
	if (!root) return;

	let trigger;
	let tweening = false;

	function caption(scene) {
		root.querySelectorAll(".yb-caption").forEach((el) => {
			el.classList.toggle("is-active", el.getAttribute("data-scene") === scene);
		});
	}

	function scrollToProgress(progress) {
		const pin = root.querySelector(".yb-journey__pin") || root;
		const start = root.offsetTop;
		const range = Math.max(pin.offsetHeight - window.innerHeight, 1);
		window.scrollTo({ top: start + range * progress, behavior: "smooth" });
	}

	function objectOffsets(rtl) {
		const accX = rtl ? 130 : -130;
		const stkX = rtl ? -150 : 150;
		const hrY = -120;
		return { accX, stkX, hrY };
	}

	function buildDesktop() {
		if (!window.gsap || !window.ScrollTrigger) {
			root.classList.add("is-static");
			caption("erp");
			return;
		}
		const gsap = window.gsap;
		gsap.registerPlugin(window.ScrollTrigger);
		const rtl = document.documentElement.dir === "rtl";
		const { accX, stkX, hrY } = objectOffsets(rtl);
		const hub = root.querySelector(".yb-journey__hub");
		const dash = root.querySelector(".yb-erp-dash");
		const sign = root.querySelector(".yb-sign-doc");
		const eco = root.querySelector(".yb-journey__eco");
		const objects = root.querySelectorAll(".yb-obj");
		const bars = root.querySelectorAll(".yb-erp-bars i");
		const line = root.querySelector(".yb-erp-line");
		const lines = root.querySelectorAll(".yb-sign-line");
		const signature = document.getElementById("ybSignature");
		const pen = root.querySelector(".yb-pen");
		const ok = root.querySelector(".yb-sign-ok");
		const ecoLines = root.querySelectorAll(".yb-journey__eco i");

		gsap.set(objects, { opacity: 0, x: 0, y: 0, scale: 0.6 });
		gsap.set([dash, sign, eco], { opacity: 0, scale: 0.92 });
		gsap.set(hub, { opacity: 0, scale: 0.86 });

		const tl = gsap.timeline({
			defaults: { ease: "power3.out" },
			scrollTrigger: {
				trigger: root,
				start: "top top+=76",
				end: "bottom bottom",
				scrub: 0.65,
				onUpdate(self) {
					const p = self.progress;
					if (p < 0.18) caption("hub");
					else if (p < 0.62) caption("erp");
					else if (p < 0.9) caption("sign");
					else caption("done");
				},
			},
		});
		trigger = tl.scrollTrigger;

		tl.to(hub, { opacity: 1, scale: 1, duration: 1.2 }, 0);
		objects.forEach((obj, i) => {
			const lane = obj.getAttribute("data-lane");
			const x = lane === "stk" ? stkX + (i % 3) * 18 : lane === "hr" ? (rtl ? 40 : -40) : accX + (i % 4) * 16;
			const y = lane === "hr" ? hrY : lane === "stk" ? 90 + (i % 2) * 20 : -40 + (i % 3) * 28;
			tl.to(obj, { opacity: 1, x, y, rotation: (i % 2 ? 8 : -6), scale: 1, duration: 1.1 }, 1.4 + i * 0.08);
		});
		tl.to(dash, { opacity: 1, scale: 1, duration: 1 }, 4.4);
		tl.to(objects, { opacity: 0, scale: 0.4, x: 0, y: 0, duration: 0.8 }, 4.6);
		tl.to(bars, { scaleY: 1, stagger: 0.08, duration: 0.7 }, 5);
		if (line) tl.to(line, { strokeDashoffset: 0, duration: 0.9 }, 5.1);
		tl.to(dash, { borderRadius: "18px", scaleX: 0.72, scaleY: 0.92, duration: 0.8, ease: "power2.inOut" }, 6.2);
		tl.to(sign, { opacity: 1, scale: 1, duration: 0.8 }, 6.35);
		tl.to(dash, { opacity: 0, duration: 0.5 }, 6.55);
		tl.to(lines, { scaleX: 1, stagger: 0.1, duration: 0.5 }, 6.8);
		if (pen) tl.to(pen, { opacity: 1, x: 140, y: 8, duration: 0.9 }, 7.3);
		if (signature) tl.to(signature, { strokeDashoffset: 0, duration: 0.9 }, 7.3);
		if (pen) tl.to(pen, { opacity: 0, duration: 0.3 }, 8.2);
		if (ok) tl.to(ok, { opacity: 1, duration: 0.4 }, 8.25);
		tl.to(eco, { opacity: 1, duration: 0.6 }, 8.8);
		tl.to(ecoLines, { scaleX: 1, duration: 0.5 }, 8.9);
		tl.to(sign, { y: -24, duration: 0.6 }, 8.95);
	}

	function buildMobile() {
		const scenes = root.querySelectorAll(".yb-mobile-scene");
		if (reduced) return;
		const io = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) entry.target.classList.add("is-in");
			});
		}, { threshold: 0.4 });
		scenes.forEach((el) => io.observe(el));
	}

	function goto(scene) {
		if (mobile || reduced) {
			const target = scene === "sign" ? document.getElementById("yallasign") : document.getElementById("yalla-erp");
			target?.scrollIntoView({ behavior: "smooth", block: "start" });
			return;
		}
		scrollToProgress(scene === "sign" ? 0.78 : 0.5);
	}

	function refresh() {
		if (window.ScrollTrigger) window.ScrollTrigger.refresh();
	}

	if (reduced) {
		root.classList.add("is-static");
		caption("erp");
	} else if (mobile) {
		buildMobile();
	} else if (document.readyState === "complete") {
		buildDesktop();
	} else {
		window.addEventListener("load", buildDesktop, { once: true });
	}

	window.addEventListener("yb:goto", (e) => goto(e.detail.scene));
	window.addEventListener("yb:langchange", () => {
		if (tweening) return;
		tweening = true;
		refresh();
		setTimeout(() => {
			tweening = false;
		}, 250);
	});
})();
