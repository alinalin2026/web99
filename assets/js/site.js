/* Web99.ie — the only script on the page. ~2KB. No dependencies.
   Three jobs: reveal se ctions on scroll, count the counter up once,
   shade the header once you've scrolled. Nothing else. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- header hairline on scroll ---------------------------------------- */
  var hdr = document.getElementById("siteHeader");
  if (hdr) {
    var setStuck = function () {
      hdr.setAttribute("data-stuck", window.scrollY > 8 ? "true" : "false");
    };
    setStuck();
    window.addEventListener("scroll", setStuck, { passive: true });
  }

  /* --- mobile menu -------------------------------------------------------
     Progressive: the links are real links in the markup and reachable without
     JS. This only collapses them behind a button on small screens. */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("siteNav");
  if (toggle && nav && hdr) {
    var setOpen = function (open) {
      hdr.setAttribute("data-open", open ? "true" : "false");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    setOpen(false);

    toggle.addEventListener("click", function () {
      setOpen(hdr.getAttribute("data-open") !== "true");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && hdr.getAttribute("data-open") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (hdr.getAttribute("data-open") !== "true") return;
      if (!hdr.contains(e.target)) setOpen(false);
    });
  }

  /* --- mark the current nav item ---------------------------------------- */
  var trim = function (p) {
    return (p || "").replace(/\/+$/, "") || "/";
  };
  var here = trim(window.location.pathname);
  Array.prototype.forEach.call(document.querySelectorAll(".nav a"), function (a) {
    if (trim(a.getAttribute("href")) === here) a.setAttribute("aria-current", "page");
  });

  /* --- fade and rise ----------------------------------------------------- */
  var risers = document.querySelectorAll(".rise");

  if (reduced || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(risers, function (el) {
      el.classList.add("is-in");
    });
  } else {
    var revealer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    Array.prototype.forEach.call(risers, function (el) {
      revealer.observe(el);
    });
  }

  /* --- counter, once, when it comes into view ---------------------------- */
  var fig = document.querySelector("[data-count-to]");
  if (fig) {
    var target = parseInt(fig.getAttribute("data-count-to"), 10) || 0;

    var run = function () {
      if (reduced || target === 0) {
        fig.textContent = target.toLocaleString("en-IE");
        return;
      }
      var started = null;
      var ms = Math.min(1600, 400 + target * 12);
      var tick = function (now) {
        if (started === null) started = now;
        var p = Math.min((now - started) / ms, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        fig.textContent = Math.round(target * eased).toLocaleString("en-IE");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      run();
    } else {
      var counterObs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            counterObs.disconnect();
            run();
          });
        },
        { threshold: 0.4 }
      );
      counterObs.observe(fig);
    }
  }

  /* --- sticky CTA bar -----------------------------------------------------
     Percentage-of-page-scrolled rather than a fixed pixel value, so "around
     half page" holds true regardless of how long the page is. Hides again
     near the very bottom so it never sits on top of the page's own CTA. */
  var stickyBars = document.querySelectorAll(".sticky-cta");
  if (stickyBars.length) {
    var ticking = false;

    var updateSticky = function () {
      ticking = false;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      var pct = scrollable > 0 ? window.scrollY / scrollable : 0;
      var show = pct > 0.42 && pct < 0.94;

      Array.prototype.forEach.call(stickyBars, function (bar) {
        bar.classList.toggle("is-visible", show);
        if (show) {
          bar.removeAttribute("inert");
        } else {
          bar.setAttribute("inert", "");
        }
      });
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateSticky);
    };

    updateSticky();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* --- /start conversation -----------------------------------------------
     Talks to the dashboard's /api/chat. The order id comes back on the first
     reply and is kept in sessionStorage, so a refresh mid-conversation picks
     up where they left off instead of starting a stranger's order.

     Degrades honestly: if the API can't be reached, the composer is replaced
     with the WhatsApp number rather than swallowing what they typed. */
  var startForm = document.getElementById("startForm");
  if (startForm) {
    var field = document.getElementById("businessStory");
    var thread = document.getElementById("chatThread");
    var intro = document.getElementById("sarahIntro");
    var sendBtn = startForm.querySelector("button[type=submit]");
    var api = startForm.getAttribute("data-api") || "";
    var KEY = "web99:orderId";
    var orderId = null;
    var sending = false;
    var confirmWrap = null;

    try {
      orderId = window.sessionStorage.getItem(KEY);
    } catch (err) {
      /* private browsing — the conversation still works, it just won't resume */
    }

    /* grow the box as they type, so nothing scrolls out of sight */
    field.addEventListener("input", function () {
      field.style.height = "auto";
      field.style.height = Math.max(128, field.scrollHeight) + "px";
    });

    var el = function (tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    var addTurn = function (who, text) {
      var turn = el("div", "turn turn--" + who);
      var av = el("span", "avatar avatar--sm");

      if (who === "sarah") {
        var img = document.createElement("img");
        img.src = "/assets/img/sarah.svg";
        img.alt = "";
        img.width = 38;
        img.height = 38;
        av.appendChild(img);
      } else {
        av.textContent = "You";
        av.style.fontSize = "0.7rem";
      }

      var body = el("div", "turn__body");
      if (text === null) {
        var dots = el("span", "turn__dots");
        dots.appendChild(el("i"));
        dots.appendChild(el("i"));
        dots.appendChild(el("i"));
        body.appendChild(dots);
        turn.setAttribute("data-pending", "true");
      } else {
        body.textContent = text;
      }

      turn.appendChild(av);
      turn.appendChild(body);
      thread.appendChild(turn);
      turn.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
      return turn;
    };

    var finish = function () {
      if (confirmWrap && confirmWrap.parentNode) confirmWrap.remove();
      confirmWrap = null;
      startForm.remove();
      var done = el("div", "chat__done");
      done.appendChild(el("h2", null, "That's everything — thanks."));
      done.appendChild(
        el("p", null, "Your website is being built now. We'll email you the link tomorrow.")
      );
      done.appendChild(
        el("p", null, "You'll see the whole thing before you decide. Nothing has been charged.")
      );
      thread.parentNode.insertBefore(done, thread.nextSibling);
      done.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    };

    var breakDown = function () {
      var wrap = el("div", "chat__done");
      wrap.appendChild(el("h2", null, "Something went wrong our end."));
      wrap.appendChild(
        el("p", null, "Sorry about that. Message us on WhatsApp and we'll take it from there — you won't have to type it all again.")
      );
      var a = el("a", "btn", "Message us on WhatsApp");
      a.href = startForm.getAttribute("data-whatsapp") || "/contact/";
      a.rel = "noopener";
      wrap.appendChild(a);
      startForm.replaceWith(wrap);
    };

    var clearConfirm = function () {
      if (confirmWrap && confirmWrap.parentNode) confirmWrap.remove();
      confirmWrap = null;
    };

    var showConfirm = function () {
      clearConfirm();
      confirmWrap = el("div", "chat__confirm");
      var yes = el("button", "btn", "Yes — that's right");
      yes.type = "button";
      yes.addEventListener("click", function () {
        clearConfirm();
        field.value = "Yes, that's right.";
        startForm.requestSubmit();
      });
      confirmWrap.appendChild(yes);
      startForm.parentNode.insertBefore(confirmWrap, startForm);
      yes.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    };

    startForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;

      var story = field.value.trim();
      if (!story) {
        field.focus();
        return;
      }

      clearConfirm();

      /* Sarah's opening bubble becomes part of the thread once it's underway. */
      if (intro && intro.parentNode) {
        addTurn("sarah", document.getElementById("sarahPrompt").textContent);
        intro.remove();
        intro = null;
      }

      addTurn("them", story);
      field.value = "";
      field.style.height = "auto";

      sending = true;
      if (sendBtn) sendBtn.disabled = true;
      var pending = addTurn("sarah", null);

      fetch(api + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId, message: story }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          pending.remove();
          sending = false;
          if (sendBtn) sendBtn.disabled = false;

          if (data.orderId && data.orderId !== orderId) {
            orderId = data.orderId;
            try {
              window.sessionStorage.setItem(KEY, orderId);
            } catch (err) {}
          }

          addTurn("sarah", data.reply);
          if (data.readyToBuild) {
            finish();
          } else if (
            Array.isArray(data.missing) &&
            data.missing.length === 0 &&
            /\?\s*$/.test(data.reply || "")
          ) {
            showConfirm();
          } else {
            field.focus();
          }
        })
        .catch(function () {
          pending.remove();
          sending = false;
          if (sendBtn) sendBtn.disabled = false;
          breakDown();
        });
    });
  }
})();
