/* Web99 analytics + ad attribution. Google tag is loaded in <head>; Meta Pixel
   loads only after measurement consent. */
(function () {
  "use strict";

  var META_PIXEL_ID = "1523480709550301";
  var CONSENT_KEY = "web99:trackingConsent";
  var ATTR_KEY = "web99:attribution";
  var metaLoaded = false;
  var offerEventsSent = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) {}
  }

  function readAttribution() {
    var existing = null;
    try { existing = JSON.parse(window.sessionStorage.getItem(ATTR_KEY) || "null"); } catch (e) {}
    var url = new URL(window.location.href);
    var keys = ["fbclid", "gclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    var found = {};
    keys.forEach(function (key) {
      var value = url.searchParams.get(key);
      if (value) found[key] = value.slice(0, 500);
    });

    if (!existing || Object.keys(found).length) {
      existing = Object.assign({}, existing || {}, found, {
        landing_url: (existing && existing.landing_url) || window.location.href.slice(0, 2000),
        landing_path: (existing && existing.landing_path) || window.location.pathname.slice(0, 500),
        landed_at: (existing && existing.landed_at) || Date.now(),
        user_agent: navigator.userAgent.slice(0, 1000)
      });
      try { window.sessionStorage.setItem(ATTR_KEY, JSON.stringify(existing)); } catch (e) {}
    }
    return existing || {};
  }

  var attribution = readAttribution();

  window.web99Attribution = function () {
    return Object.assign({}, attribution);
  };

  window.web99TrackingConsent = function () {
    return safeGet(CONSENT_KEY) === "granted";
  };

  function updateGoogleConsent(granted) {
    var state = granted ? "granted" : "denied";
    window.gtag("consent", "update", {
      analytics_storage: state,
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state
    });
  }

  function loadMeta() {
    if (metaLoaded || !/^\d+$/.test(META_PIXEL_ID)) return;
    metaLoaded = true;

    if (!window.fbq) {
      var fbq = function () {
        fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      window.fbq = fbq;

      var script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      script.onerror = function () {
        metaLoaded = false;
      };
      document.head.appendChild(script);
    }

    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  function productParams() {
    return {
      content_ids: ["web99-website"],
      content_type: "product",
      content_name: "Web99 business website package",
      currency: "EUR",
      value: 99
    };
  }

  function sendInitialOfferEvents() {
    if (offerEventsSent || !window.web99TrackingConsent()) return;
    offerEventsSent = true;
    var path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/" && path !== "/start" && path !== "/pricing" && path !== "/features") return;

    window.gtag("event", "view_item", {
      currency: "EUR",
      value: 99,
      items: [{ item_id: "web99-website", item_name: "Web99 business website package", price: 99, quantity: 1 }]
    });
    if (window.fbq) window.fbq("track", "ViewContent", productParams());
  }

  function enableTracking() {
    updateGoogleConsent(true);
    loadMeta();
    sendInitialOfferEvents();
  }

  function sendEvent(gaName, metaName, params, eventId) {
    if (!window.web99TrackingConsent()) return;
    enableTracking();
    if (gaName) window.gtag("event", gaName, params || {});
    if (metaName && window.fbq) {
      if (eventId) window.fbq("track", metaName, params || {}, { eventID: eventId });
      else window.fbq("track", metaName, params || {});
    }
  }

  window.web99Track = sendEvent;

  window.addEventListener("web99:lead", function (event) {
    var detail = event.detail || {};
    var orderId = detail.orderId ? String(detail.orderId) : "";
    sendEvent(
      "generate_lead",
      "Lead",
      { content_name: "Website brief completed", currency: "EUR", value: 99 },
      orderId ? "lead_" + orderId : undefined
    );
  });

  var chatStarted = false;
  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!chatStarted && form && form.id === "startForm") {
      chatStarted = true;
      sendEvent("chat_start", "Contact", {
        content_name: "Web99 website brief",
        currency: "EUR",
        value: 99
      });
    }
  }, true);

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!target) return;
    var href = target.getAttribute("href") || "";
    if (href.indexOf("/start") === 0 || href.indexOf("https://www.web99.ie/start") === 0 || href.indexOf("https://web99.ie/start") === 0) {
      sendEvent("select_content", null, {
        content_type: "cta",
        item_id: "build-my-website",
        item_name: (target.textContent || "Build My Website").trim().slice(0, 100)
      });
    }
  }, true);

  function bannerMarkup() {
    var wrap = document.createElement("div");
    wrap.id = "web99CookieBanner";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Cookie choices");
    wrap.innerHTML =
      '<div style="position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:760px;margin:auto;background:#17132f;color:#fff;border-radius:16px;padding:17px 18px;box-shadow:0 18px 55px rgba(20,16,51,.28);font:14px/1.5 Manrope,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">' +
        '<strong style="display:block;font-size:16px;margin-bottom:5px">Cookies & measurement</strong>' +
        '<span style="color:#ded9f4">We use Google Analytics and Meta Pixel to measure visits, enquiries and ad results. They only use measurement cookies if you accept.</span>' +
        '<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:13px">' +
          '<button type="button" data-cookie="accept" style="border:0;border-radius:999px;padding:10px 16px;background:#6c4df6;color:#fff;font:700 14px Manrope,sans-serif;cursor:pointer">Accept</button>' +
          '<button type="button" data-cookie="reject" style="border:1px solid #746d9e;border-radius:999px;padding:9px 16px;background:transparent;color:#fff;font:700 14px Manrope,sans-serif;cursor:pointer">Reject</button>' +
          '<a href="/privacy/" style="color:#d8d0ff;align-self:center;margin-left:2px">Privacy</a>' +
        '</div>' +
      '</div>';
    return wrap;
  }

  function showBanner() {
    if (document.getElementById("web99CookieBanner")) return;
    var banner = bannerMarkup();
    document.body.appendChild(banner);
    banner.addEventListener("click", function (event) {
      var button = event.target && event.target.closest ? event.target.closest("[data-cookie]") : null;
      if (!button) return;
      var choice = button.getAttribute("data-cookie");
      if (choice === "accept") {
        safeSet(CONSENT_KEY, "granted");
        enableTracking();
      } else {
        safeSet(CONSENT_KEY, "denied");
        updateGoogleConsent(false);
      }
      banner.remove();
    });
  }

  document.addEventListener("click", function (event) {
    var link = event.target && event.target.closest ? event.target.closest("#cookieSettings,[data-cookie-settings]") : null;
    if (!link) return;
    event.preventDefault();
    showBanner();
  });

  var savedConsent = safeGet(CONSENT_KEY);
  if (savedConsent === "granted") {
    enableTracking();
  } else if (savedConsent !== "denied") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showBanner);
    else showBanner();
  }
})();
