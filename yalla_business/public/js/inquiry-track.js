(function () {
  var STORAGE_KEY = "yb_attrib";
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var CLICK_KEYS = ["gclid", "gbraid", "wbraid", "fbclid", "ttclid", "msclkid", "li_fat_id", "twclid", "yclid"];

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function writeStore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (err) {
      /* private mode / quota */
    }
  }

  function pick(params, keys) {
    var out = {};
    keys.forEach(function (key) {
      var value = (params.get(key) || "").trim();
      if (value) out[key] = value.slice(0, 200);
    });
    return out;
  }

  function currentSnapshot() {
    var params = new URLSearchParams(window.location.search);
    var utm = pick(params, UTM_KEYS);
    var clicks = pick(params, CLICK_KEYS);
    var clickId = "";
    CLICK_KEYS.forEach(function (key) {
      if (!clickId && clicks[key]) clickId = clicks[key];
    });
    var tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (err) {
      tz = "";
    }
    return {
      landing_page: ((window.location.pathname || "/") + (window.location.search || "")).slice(0, 300),
      referrer: (document.referrer || "").slice(0, 400),
      utm: utm,
      clicks: clicks,
      click_id: clickId,
      locale: (navigator.language || "").slice(0, 40),
      languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 8) : [],
      timezone: tz.slice(0, 80),
      platform: (navigator.platform || "").slice(0, 80),
      screen: {
        w: window.screen && window.screen.width,
        h: window.screen && window.screen.height,
        dpr: window.devicePixelRatio || 1,
      },
      captured_at: new Date().toISOString(),
    };
  }

  function hasAttribution(snap) {
    if (!snap) return false;
    if (snap.click_id) return true;
    var utm = snap.utm || {};
    return UTM_KEYS.some(function (key) { return !!utm[key]; });
  }

  function captureFirstTouch() {
    var now = currentSnapshot();
    var first = readStore();
    if (!first || (hasAttribution(now) && !hasAttribution(first))) {
      writeStore(now);
      first = now;
    }
    return first;
  }

  function firstValue(first, last, key) {
    var lastUtm = (last.utm || {})[key];
    var firstUtm = (first && first.utm) || {};
    return lastUtm || firstUtm[key] || "";
  }

  function payload() {
    var last = currentSnapshot();
    var first = captureFirstTouch() || last;
    return {
      utm_source: firstValue(first, last, "utm_source"),
      utm_medium: firstValue(first, last, "utm_medium"),
      utm_campaign: firstValue(first, last, "utm_campaign"),
      utm_term: firstValue(first, last, "utm_term"),
      utm_content: firstValue(first, last, "utm_content"),
      click_id: last.click_id || first.click_id || "",
      referrer: first.referrer || last.referrer || "",
      landing_page: first.landing_page || last.landing_page || "",
      client_timezone: last.timezone || first.timezone || "",
      extra_data: JSON.stringify({
        first: first,
        last: last,
      }).slice(0, 4000),
    };
  }

  captureFirstTouch();
  window.ybInquiryTracking = payload;
})();
