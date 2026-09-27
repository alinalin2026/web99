/* Web99.ie — the only script on the page. ~2KB. No dependencies.
   Three jobs: reveal sections on scroll, count the counter up once,
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

  /* --- genuine reviewer feedback ----------------------------------------
     These quotes came from Reddit reviewers who received a free Web99 review
     build. Keep the connection disclosed, but do not label genuine feedback
     as sample or illustrative copy. */
  var feedback = document.getElementById("feedback");
  if (feedback) {
    var eyebrow = feedback.querySelector(".eyebrow");
    var heading = feedback.querySelector(".h2");
    var lede = feedback.querySelector(".lede");
    if (eyebrow) eyebrow.textContent = "Real feedback";
    if (heading) heading.textContent = "What reviewers said about Web99.";
    if (lede) lede.textContent = "Feedback from Reddit reviewers who received a free Web99 review build.";

    Array.prototype.forEach.call(feedback.querySelectorAll(".tcard cite"), function (cite) {
      cite.textContent = "Reddit reviewer";
      var small = document.createElement("small");
      small.textContent = "Received a free review build";
      cite.appendChild(small);
    });
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
    var quickWrap = null;

    /* --- attachments (photos/documents, up to 100MB each) ---------------- */
    var attachBtn = document.getElementById("attachBtn");
    var filesInput = document.getElementById("storyFiles");
    var filesWrap = document.getElementById("composerFiles");
    var filesError = document.getElementById("composerFilesError");
    var selectedFiles = [];
    var MAX_FILE_BYTES = 100 * 1024 * 1024;
    var MAX_FILES = 5;

    var showFilesError = function (msg) {
      if (!filesError) return;
      filesError.textContent = msg || "";
      filesError.hidden = !msg;
    };

    var formatFileSize = function (bytes) {
      if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
      return Math.max(1, Math.round(bytes / 1024)) + " KB";
    };

    var renderFiles = function () {
      if (!filesWrap) return;
      filesWrap.innerHTML = "";
      filesWrap.hidden = selectedFiles.length === 0;
      selectedFiles.forEach(function (file, index) {
        var chip = el("span", "composer__file");
        var label = el("span", null, file.name + " (" + formatFileSize(file.size) + ")");
        var remove = el("button", null, "×");
        remove.type = "button";
        remove.setAttribute("aria-label", "Remove " + file.name);
        remove.addEventListener("click", function () {
          selectedFiles.splice(index, 1);
          renderFiles();
        });
        chip.appendChild(label);
        chip.appendChild(remove);
        filesWrap.appendChild(chip);
      });
    };

    if (attachBtn && filesInput) {
      attachBtn.addEventListener("click", function () {
        filesInput.click();
      });

      filesInput.addEventListener("change", function () {
        showFilesError("");
        var incoming = Array.prototype.slice.call(filesInput.files || []);
        incoming.forEach(function (file) {
          if (selectedFiles.length >= MAX_FILES) {
            showFilesError("You can attach up to " + MAX_FILES + " files at a time.");
            return;
          }
          if (file.size > MAX_FILE_BYTES) {
            showFilesError('"' + file.name + '" is over the 100MB limit.');
            return;
          }
          selectedFiles.push(file);
        });
        filesInput.value = "";
        renderFiles();
      });
    }

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

    var addTurn = function (who, text, files) {
      var turn = el("div", "turn turn--" + who);
      var av = el("span", "avatar avatar--sm");

      if (who === "sarah") {
        var img = document.createElement("img");
        img.src = "/assets/img/sarah.svg?v=20260808c";
        img.alt = "Sarah, Web99's AI assistant";
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
        if (text) body.textContent = text;
        if (Array.isArray(files) && files.length) {
          var list = el("ul", "turn__files");
          files.forEach(function (file) {
            list.appendChild(el("li", null, "📎 " + file.name));
          });
          body.appendChild(list);
        }
      }

      turn.appendChild(av);
      turn.appendChild(body);
      thread.appendChild(turn);
      turn.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
      return turn;
    };

    var clearQuickReplies = function () {
      if (quickWrap && quickWrap.parentNode) quickWrap.remove();
      quickWrap = null;
    };

    var showQuickReplies = function (items) {
      clearQuickReplies();
      if (!Array.isArray(items) || items.length < 2) return;

      quickWrap = el("div", "chat__confirm");
      quickWrap.setAttribute("aria-label", "Quick replies");
      quickWrap.style.display = "flex";
      quickWrap.style.flexWrap = "wrap";
      quickWrap.style.gap = "10px";
      quickWrap.style.margin = "-8px 0 18px 51px";

      items.slice(0, 3).forEach(function (item) {
        if (!item) return;
        var label = String(item.label || item.value || "").trim();
        var value = String(item.value || item.label || "").trim();
        if (!label || !value) return;

        var button = el("button", "btn btn--ghost", label);
        button.type = "button";
        button.style.width = "auto";
        button.style.padding = "11px 18px";
        button.style.fontSize = "0.95rem";
        button.addEventListener("click", function () {
          clearQuickReplies();
          field.value = value;
          field.blur();
          startForm.requestSubmit();
        });
        quickWrap.appendChild(button);
      });

      if (!quickWrap.children.length) {
        clearQuickReplies();
        return;
      }

      startForm.parentNode.insertBefore(quickWrap, startForm);
      quickWrap.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    };

    var finish = function () {
      clearQuickReplies();
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
      clearQuickReplies();
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

    startForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;

      var story = field.value.trim();
      var files = selectedFiles.slice();
      if (!story && !files.length) {
        field.focus();
        return;
      }

      /* On phones, submitting should dismiss the keyboard. Never re-focus the
         textarea when Sarah replies; it opens again only when the user taps it. */
      field.blur();
      if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }
      clearQuickReplies();
      showFilesError("");

      /* Sarah's opening bubble becomes part of the thread once it's underway. */
      if (intro && intro.parentNode) {
        addTurn("sarah", document.getElementById("sarahPrompt").textContent);
        intro.remove();
        intro = null;
      }

      addTurn("them", story, files);
      field.value = "";
      field.style.height = "auto";
      selectedFiles = [];
      renderFiles();

      sending = true;
      if (sendBtn) sendBtn.disabled = true;
      var pending = addTurn("sarah", null);
      var attribution = typeof window.web99Attribution === "function" ? window.web99Attribution() : null;
      var trackingConsent = typeof window.web99TrackingConsent === "function" ? window.web99TrackingConsent() : false;

      var requestInit;
      if (files.length) {
        var formData = new FormData();
        formData.append("orderId", orderId || "");
        formData.append("message", story);
        formData.append("attribution", JSON.stringify(attribution || {}));
        formData.append("trackingConsent", trackingConsent ? "true" : "false");
        files.forEach(function (file) {
          formData.append("files", file, file.name);
        });
        requestInit = { method: "POST", body: formData };
      } else {
        requestInit = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderId,
            message: story,
            attribution: attribution,
            trackingConsent: trackingConsent
          }),
        };
      }

      fetch(api + "/api/chat", requestInit)
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) {
            if (!r.ok) {
              var err = new Error((data && data.error) || ("HTTP " + r.status));
              if (data && data.error) err.userMessage = data.error;
              throw err;
            }
            return data;
          });
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
            try {
              window.dispatchEvent(new CustomEvent("web99:lead", {
                detail: { orderId: data.orderId || orderId }
              }));
            } catch (err) {}
            finish();
          } else if (Array.isArray(data.quickReplies) && data.quickReplies.length >= 2) {
            showQuickReplies(data.quickReplies);
          } else if (
            Array.isArray(data.missing) &&
            data.missing.length === 0 &&
            /\?\s*$/.test(data.reply || "")
          ) {
            showQuickReplies([
              { label: "Yes — that's right", value: "Yes, that's right." },
              { label: "I want to add something", value: "I'd like to add something." }
            ]);
          }
          /* Deliberately no field.focus() here. On mobile, Sarah's reply should
             stay readable instead of making the keyboard jump back up. */
        })
        .catch(function (err) {
          pending.remove();
          sending = false;
          if (sendBtn) sendBtn.disabled = false;
          if (err && err.userMessage) {
            addTurn("sarah", err.userMessage);
          } else {
            breakDown();
          }
        });
    });
  }
})();
