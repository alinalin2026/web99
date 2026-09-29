/* ===========================================================================
   Live preview on /start
   ---------------------------------------------------------------------------
   site.js fires "web99:preview" whenever Sarah says the preview should appear
   or change. This file turns that into a small browser-window card that
   assembles itself:

     1. the design (colours, fonts, imagery) arrives instantly and is shown
        straight away, so there is something to look at while the words load;
     2. the four sections then stream in, in whatever order they finish.

   The page is drawn inside a sandboxed, script-less iframe and every fragment
   is cleaned again here — the text is AI-generated and the owner's own words
   feed the prompt, so it is treated as untrusted at every step.
   =========================================================================== */
(function () {
  "use strict";

  var thread = document.getElementById("chatThread");
  if (!thread) return;

  var api = thread.getAttribute("data-api") || "";
  var slot = document.getElementById("pvSlot");
  var chat = thread.closest(".chat");
  var wide = window.matchMedia ? window.matchMedia("(min-width: 1000px)") : { matches: false };

  var MAX_RUNS = 6;
  var SECTIONS = ["hero", "services", "trust", "contact"];
  var SHELL =
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style id="theme"></style></head><body>' +
    '<header class="w99-nav"><b id="brand"></b><span><i></i><i></i><i></i></span></header>' +
    '<main><div class="slot" id="s-hero"></div><div class="slot" id="s-services"></div>' +
    '<div class="slot" id="s-trust"></div><div class="slot" id="s-contact"></div></main>' +
    '<footer id="foot"></footer></body></html>';

  var card = null;
  var frame = null;
  var statusEl = null;
  var urlEl = null;
  var buyEl = null;
  var pill = null;
  var state = { theme: null, sections: {} }; /* everything received, re-applied on any reload */
  var pendingKeys = { theme: false, sections: {} };
  var orderId = null;
  var lastContent = "";
  var lastStyle = "";
  var runs = 0;
  var controller = null;
  var running = false;
  var unseen = false;

  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* Never trust generated markup: drop anything active and every attribute
     that can run code or load something. Parsing into a <template> is inert. */
  var BLOCKED = /^(script|style|iframe|object|embed|link|meta|base|form|svg|img|video|audio|picture|source)$/i;
  var clean = function (html) {
    var t = document.createElement("template");
    t.innerHTML = String(html || "");
    Array.prototype.slice.call(t.content.querySelectorAll("*")).forEach(function (n) {
      if (BLOCKED.test(n.tagName)) {
        n.remove();
        return;
      }
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (/^on/i.test(a.name) || /^(href|src|srcset|action|formaction|style|xlink:href)$/i.test(a.name)) {
          n.removeAttribute(a.name);
        }
      });
    });
    return t.innerHTML;
  };

  var slug = function (name) {
    var s = String(name || "yourbusiness")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24);
    return (s || "yourbusiness") + ".ie";
  };

  /* --- drawing ------------------------------------------------------------- */

  var apply = function () {
    var d = frame && frame.contentDocument;
    if (!d || !d.getElementById("s-hero")) return;

    if (state.theme && (pendingKeys.theme || !d.getElementById("theme").textContent)) {
      d.getElementById("theme").textContent = state.theme.css;
      d.getElementById("brand").textContent = state.theme.brand;
      d.getElementById("foot").textContent = "© " + new Date().getFullYear() + " " + state.theme.brand;
      pendingKeys.theme = false;
    }
    SECTIONS.forEach(function (id) {
      var target = d.getElementById("s-" + id);
      if (!target) return;
      var html = state.sections[id];
      if (html == null) {
        if (target.innerHTML !== "") target.innerHTML = "";
        return;
      }
      if (pendingKeys.sections[id] || target.innerHTML === "") {
        target.innerHTML = clean(html);
        target.classList.remove("in");
        void target.offsetWidth;
        target.classList.add("in");
        pendingKeys.sections[id] = false;
      }
    });
  };

  var setStatus = function (text, live) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle("pv__status--live", !!live);
  };

  var markUpdated = function () {
    if (!card) return;
    var r = card.getBoundingClientRect();
    var visible = r.top < window.innerHeight * 0.85 && r.bottom > window.innerHeight * 0.15;
    if (!visible) {
      unseen = true;
      if (pill) pill.classList.add("pv-pill--new");
    }
  };

  var updateBuy = function () {
    if (!buyEl) return;
    if (orderId) {
      buyEl.href = api + "/buy/" + encodeURIComponent(orderId);
      buyEl.hidden = false;
    } else {
      buyEl.hidden = true;
    }
  };

  var build = function () {
    card = el("div", "pv");
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", "Live preview of your website");

    var bar = el("div", "pv__bar");
    bar.appendChild(el("i"));
    bar.appendChild(el("i"));
    bar.appendChild(el("i"));
    urlEl = el("span", "pv__url", "yourbusiness.ie");
    statusEl = el("span", "pv__status", "Building your design…");
    bar.appendChild(urlEl);
    bar.appendChild(statusEl);
    card.appendChild(bar);

    var stage = el("div", "pv__stage");
    frame = document.createElement("iframe");
    frame.className = "pv__frame";
    frame.setAttribute("sandbox", "allow-same-origin");
    frame.setAttribute("title", "Live preview of your website");
    frame.addEventListener("load", apply);
    stage.appendChild(frame);
    card.appendChild(stage);

    var foot = el("div", "pv__foot");
    foot.appendChild(
      el("p", null, "This is the look and feel. Your own photos and details go in after you pay — nothing is charged to see it.")
    );
    buyEl = el("a", "btn pv__buy", "Love it? Get it for €99");
    buyEl.rel = "noopener";
    buyEl.hidden = true;
    foot.appendChild(buyEl);
    card.appendChild(foot);

    /* Wide screens: a sticky panel beside the chat. Phones: inline in the
       conversation, plus a floating pill to jump back to it. */
    if (wide.matches && slot && chat) {
      chat.classList.add("chat--split");
      slot.appendChild(card);
    } else {
      var wrap = el("div", "pv-wrap");
      wrap.appendChild(card);
      thread.appendChild(wrap);
      wrap.scrollIntoView({ block: "nearest", behavior: "smooth" });
      addPill();
    }
    frame.srcdoc = SHELL;
    updateBuy();
  };

  var addPill = function () {
    pill = el("button", "pv-pill", "View preview");
    pill.type = "button";
    pill.hidden = true;
    pill.addEventListener("click", function () {
      unseen = false;
      pill.classList.remove("pv-pill--new");
      card.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    document.body.appendChild(pill);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          var inView = entries[0].isIntersecting;
          pill.hidden = inView;
          if (inView) {
            unseen = false;
            pill.classList.remove("pv-pill--new");
          }
        },
        { threshold: 0.15 }
      ).observe(card);
    }
  };

  /* --- streaming ----------------------------------------------------------- */

  var handle = function (block) {
    var ev = "message";
    var data = "";
    block.split("\n").forEach(function (line) {
      if (line.indexOf("event:") === 0) ev = line.slice(6).trim();
      else if (line.indexOf("data:") === 0) data += line.slice(5).trim();
    });
    if (!data) return;
    var payload;
    try {
      payload = JSON.parse(data);
    } catch (err) {
      return;
    }

    if (ev === "theme") {
      state.theme = payload;
      pendingKeys.theme = true;
      urlEl.textContent = slug(payload.brand);
      apply();
      markUpdated();
    } else if (ev === "section") {
      state.sections[payload.id] = payload.html;
      pendingKeys.sections[payload.id] = true;
      apply();
      markUpdated();
    } else if (ev === "error") {
      fail();
    }
  };

  var done = function () {
    running = false;
    setStatus("Live preview", true);
    updateBuy();
  };

  var fail = function (limited) {
    running = false;
    setStatus(limited ? "Preview paused for a moment" : "Preview unavailable just now", false);
  };

  var run = function (brief, themeOnly) {
    if (controller) controller.abort();
    controller = "AbortController" in window ? new AbortController() : null;
    running = true;
    setStatus(themeOnly ? "Updating the look…" : "Building your design…", false);

    fetch(api + "/api/instant-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: brief.businessName,
        trade: brief.trade,
        description: brief.description,
        location: brief.location,
        style: brief.style,
        language: brief.language,
        themeOnly: !!themeOnly
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (r) {
        if (r.status === 429) {
          fail(true);
          return null;
        }
        if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        var pump = function () {
          return reader.read().then(function (res) {
            if (res.done) {
              done();
              return null;
            }
            buffer += decoder.decode(res.value, { stream: true });
            var parts = buffer.split("\n\n");
            buffer = parts.pop();
            parts.forEach(handle);
            return pump();
          });
        };
        return pump();
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") return;
        fail(false);
      });
  };

  /* --- entry point ----------------------------------------------------------- */

  window.addEventListener("web99:preview", function (e) {
    var detail = e.detail || {};
    var brief = detail.brief;
    if (!brief || !brief.trade) return;
    if (detail.orderId) orderId = detail.orderId;

    var content = JSON.stringify([brief.businessName, brief.trade, brief.description, brief.location, brief.language]);

    if (!card) {
      build();
      lastContent = content;
      lastStyle = brief.style;
      runs = 1;
      run(brief, false);
      return;
    }
    updateBuy();

    if (content !== lastContent) {
      if (runs >= MAX_RUNS) return;
      runs += 1;
      lastContent = content;
      lastStyle = brief.style;
      SECTIONS.forEach(function (id) {
        delete state.sections[id];
      });
      apply();
      run(brief, false);
    } else if (brief.style !== lastStyle) {
      lastStyle = brief.style;
      run(brief, true);
    }
  });

  /* Sarah's reply can carry the order id before any preview exists. */
  window.addEventListener("web99:order", function (e) {
    if (e.detail && e.detail.orderId) {
      orderId = e.detail.orderId;
      updateBuy();
    }
  });
})();
