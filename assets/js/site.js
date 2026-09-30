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
    var chatRoot = document.getElementById("chatRoot");
    var panelHead = document.getElementById("panelHead");
    var composerHint = document.getElementById("composerHint");
    var chipsWrap = document.getElementById("previewChips");
    var mode = "intake";
    var intakeDone = false;
    var siteReady = false;
    var workspace = false;
    var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    /* --- instant preview ---------------------------------------------------
       Fires once, the moment we have a business name (turn 1), an email
       (turn 2, per Sarah's fixed question order — see sarah.ts), and a
       description of the business (turn 3 onward). Free, best-effort, never
       blocks the real chat: if it fails or the connection drops, the panel
       just disappears and the conversation carries on as normal. */
    var instantPreview = document.getElementById("instantPreview");
    var userTurns = [];
    var instantPreviewStarted = false;

    var handleInstantPreviewEvent = function (block) {
      var eventName = "message";
      var dataLines = [];
      block.split("\n").forEach(function (line) {
        if (line.indexOf("event:") === 0) eventName = line.slice(6).trim();
        else if (line.indexOf("data:") === 0) dataLines.push(line.slice(5).trim());
      });
      if (!dataLines.length) return;
      var data;
      try { data = JSON.parse(dataLines.join("\n")); } catch (err) { return; }

      if (eventName === "section" && data && data.id) {
        var slot = instantPreview.querySelector('[data-ip-section="' + data.id + '"]');
        if (slot) {
          slot.innerHTML = data.html || "";
          slot.classList.remove("is-loading");
        }
      } else if (eventName === "error") {
        instantPreview.hidden = true;
      }
    };

    var startInstantPreview = function () {
      if (!instantPreview) return;
      var description = userTurns.slice(2).join("\n\n");
      if (!description) return;
      var trade = (description.split(/[\n.!?]/)[0] || description).trim().slice(0, 100);

      instantPreview.hidden = false;
      instantPreview.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });

      fetch(api + "/api/instant-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: userTurns[0],
          trade: trade,
          description: description
        })
      })
        .then(function (r) {
          if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
          var reader = r.body.getReader();
          var decoder = new TextDecoder();
          var buffer = "";

          var readChunk = function () {
            return reader.read().then(function (result) {
              if (result.done) return;
              buffer += decoder.decode(result.value, { stream: true });
              var events = buffer.split("\n\n");
              buffer = events.pop();
              events.forEach(handleInstantPreviewEvent);
              return readChunk();
            });
          };
          return readChunk();
        })
        .catch(function () {
          instantPreview.hidden = true;
        });
    };

    /* --- full-page preview -------------------------------------------------
       The server builds a complete art-directed front page from the owner's own
       chat messages (by orderId — nothing the browser sends becomes a prompt)
       and streams real progress. It is untrusted model output, so it is shown
       in a script-less sandboxed iframe (sandbox="" = no scripts, no same-origin), loaded by URL rather
       than srcdoc so its menu links scroll to real sections.
       If it fails the four-section teaser above simply stays. */
    var siteBox = document.getElementById("instantSite");
    var buildBar = document.getElementById("buildBar");
    var siteLabel = document.getElementById("instantSiteLabel");
    var siteBar = document.getElementById("instantSiteBar");
    var siteProgress = document.getElementById("instantSiteProgress");
    var siteStage = document.getElementById("instantSiteStage");
    var siteViewport = document.getElementById("instantSiteViewport");
    var siteFrame = document.getElementById("instantSiteFrame");
    var siteMode = window.innerWidth < 720 ? "mobile" : "desktop";
    var loveAnnounced = false;
    var regenerating = false;
    var againBtn = document.getElementById("instantSiteAgain");
    var stylesRow = document.getElementById("instantSiteStyles");
    var loveBar = document.getElementById("instantSiteLove");
    var finishRegen = function () {
      regenerating = false;
      if (loveBar) loveBar.classList.remove("is-busy");
      if (buildBar) buildBar.hidden = true;
    };

    var fitSiteFrame = function () {
      if (!siteFrame || !siteViewport) return;
      var w = siteMode === "mobile" ? 390 : 1280;
      var avail = siteViewport.clientWidth;
      var s = Math.min(1, avail / w);
      siteFrame.style.width = w + "px";
      siteFrame.style.height = siteViewport.clientHeight / s + "px";
      siteFrame.style.transform = "scale(" + s + ")";
      siteFrame.style.marginLeft = Math.max(0, (avail - w * s) / 2) + "px";
    };

    var siteStatusText = function (pct) {
      if (pct < 12) return "Choosing your style…";
      if (pct < 45) return "Writing your pages…";
      if (pct < 80) return "Laying out your sections…";
      return "Adding the finishing touches…";
    };

    var setStatus = function (text, actionLabel) {
      var box = document.getElementById("siteStatus");
      var txt = document.getElementById("siteStatusText");
      var act = document.getElementById("siteStatusAction");
      if (!box || !txt) return;
      txt.textContent = text;
      if (act) { act.hidden = !actionLabel; if (actionLabel) act.textContent = actionLabel; }
      box.hidden = false;
    };

    var loadFrame = function () {
      siteFrame.onload = function () { fitSiteFrame(); siteFrame.style.visibility = "hidden"; void siteFrame.offsetHeight; siteFrame.style.visibility = ""; };
      siteFrame.src = api + "/api/instant-site/view/" + encodeURIComponent(orderId) + "?frame=1&t=" + Date.now();
    };

    var flashUpdated = function () {
      if (!siteViewport) return;
      siteViewport.classList.add("is-updated");
      setTimeout(function () { siteViewport.classList.remove("is-updated"); }, 1800);
    };

    var openWorkspace = function () {
      if (workspace) return;
      workspace = true;
      chatRoot.classList.add("is-workspace");
      document.documentElement.classList.add("is-workspace");
      if (panelHead) panelHead.hidden = false;
      var eyebrow = document.getElementById("chatEyebrow");
      var title = document.getElementById("chatTitle");
      if (eyebrow) eyebrow.textContent = "Your website";
      if (title) title.textContent = "Here it is. Have a look around.";
      thread.scrollTop = thread.scrollHeight;
    };

    var showSite = function (data) {
      openWorkspace();
      siteReady = true;
      loadFrame();
      var buyBtn = document.getElementById("instantSiteBuy");
      var love = document.getElementById("instantSiteLove");
      if (buyBtn && love && orderId) { buyBtn.href = "/buy/" + encodeURIComponent(orderId); love.hidden = false; }
      var openLink = document.getElementById("instantSiteOpen");
      if (openLink && orderId) openLink.href = api + "/api/instant-site/view/" + encodeURIComponent(orderId);
      if (instantPreview) instantPreview.hidden = false;
      if (siteBox) siteBox.hidden = false;
      if (buildBar) buildBar.hidden = true;
      siteProgress.hidden = true;
      siteStage.hidden = false;
      setVersion(data.version, data.remaining);
      fitSiteFrame();
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(fitSiteFrame);
      var statusBox = document.getElementById("siteStatus");
      if (data.emailed === undefined && statusBox && !statusBox.hidden) { /* a later look keeps the existing "saved" note */ }
      else if (data.emailed && typeof data.emailed === "string") setStatus("Saved automatically \u2014 link emailed to " + data.emailed + ".");
      else if (data.emailed === true) setStatus("Saved automatically \u2014 we\u2019ve emailed you the link.");
      else setStatus("Saved automatically.", data.emailed === false ? "Email me the link" : null);
    };

    var setVersion = function (version, remaining) {
      var ver = document.getElementById("siteVersion");
      if (ver && version) ver.textContent = "Version " + version;
      if (againBtn) {
        againBtn.hidden = typeof remaining === "number" && remaining <= 0;
        if (typeof remaining === "number" && remaining > 0 && version > 1) againBtn.textContent = "Try another look (" + remaining + " left)";
      }
    };

    var handleSiteEvent = function (block) {
      var eventName = "message";
      var dataLines = [];
      block.split("\n").forEach(function (line) {
        if (line.indexOf("event:") === 0) eventName = line.slice(6).trim();
        else if (line.indexOf("data:") === 0) dataLines.push(line.slice(5).trim());
      });
      if (!dataLines.length) return;
      var data;
      try { data = JSON.parse(dataLines.join("\n")); } catch (err) { return; }

      if (eventName === "progress" && typeof data.pct === "number") {
        siteBar.style.width = data.pct + "%";
        siteLabel.textContent = siteStatusText(data.pct);
      } else if (eventName === "page" && data && typeof data.html === "string") {
        var firstShow = !siteReady;
        showSite(data);
        if (!loveAnnounced && orderId) {
          loveAnnounced = true;
          addTurn("sarah", "Here it is \u2014 your website! It\u2019s saved automatically" + (data.emailed ? ", and I\u2019ve emailed the link to " + data.emailed : "") +
            ".\nClick around it. Want anything changed? Just tell me and I\u2019ll update it while you watch \u2014 or tap \u201cYes, I love it\u201d when you\u2019re happy.");
          if (!data.emailed) setStatus("Saved automatically.", "Email me the link");
        }
        if (regenerating) {
          finishRegen();
          addTurn("sarah", "Here\u2019s another take \u2014 version " + (data.version || "") + ". Like this one better? Tap \u201cYes, I love it\u201d, or ask me to adjust anything.");
        }
        if (firstShow && intakeDone) enterPreviewMode(false);
        setTimeout(function () { if (!workspace || window.innerWidth < 980) siteStage.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }); }, 150);
      } else if (eventName === "error" && regenerating) {
        finishRegen();
        addTurn("sarah", "Sorry \u2014 I couldn\u2019t build another version just now. Your first design is still here, and you can try again in a moment.");
      } else if (eventName === "error") {
        siteBox.hidden = true;
        if (buildBar) buildBar.hidden = true;
        var sketchLabel = document.getElementById("instantPreviewLabel");
        if (sketchLabel) sketchLabel.textContent = "Your site, building live —";
      }
    };

    var streamSite = function (payload, onFail) {
      fetch(api + "/api/instant-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
          var reader = r.body.getReader();
          var decoder = new TextDecoder();
          var buffer = "";
          var readChunk = function () {
            return reader.read().then(function (result) {
              if (result.done) return;
              buffer += decoder.decode(result.value, { stream: true });
              var events = buffer.split("\n\n");
              buffer = events.pop();
              events.forEach(handleSiteEvent);
              return readChunk();
            });
          };
          return readChunk();
        })
        .catch(function (err) { onFail(err); });
    };

    /* "Try another version": rebuilds the site in a different direction (the server caps how many). */
    var regenerate = function (style) {
      if (regenerating || !orderId) return;
      regenerating = true;
      if (loveBar) loveBar.classList.add("is-busy");
      if (buildBar) buildBar.hidden = false;
      siteProgress.hidden = false;
      siteBar.style.width = "2%";
      siteLabel.textContent = "Building another version\u2026";
      addTurn("sarah", "Sure \u2014 one moment while I give it a fresh look.");
      var payload = { orderId: orderId, regenerate: true };
      if (style) payload.style = style;
      streamSite(payload, function (err) {
        finishRegen();
        if (err && err.message === "HTTP 409" && againBtn) {
          againBtn.hidden = true;
          addTurn("sarah", "You\u2019ve seen all the versions I can build here. Pick the one you like best \u2014 and once it\u2019s yours you can ask for changes.");
        } else {
          addTurn("sarah", "Sorry \u2014 I couldn\u2019t build another version just now. Your current design is still here.");
        }
      });
    };
    if (againBtn && stylesRow) {
      againBtn.addEventListener("click", function () { stylesRow.hidden = !stylesRow.hidden; });
      stylesRow.addEventListener("click", function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest("[data-style]") : null;
        if (!b) return;
        stylesRow.hidden = true;
        regenerate(b.getAttribute("data-style"));
      });
    }

    if (siteBox) {
      Array.prototype.forEach.call(siteBox.querySelectorAll("[data-mode]"), function (btn) {
        btn.addEventListener("click", function () {
          siteMode = btn.getAttribute("data-mode");
          Array.prototype.forEach.call(siteBox.querySelectorAll("[data-mode]"), function (b) {
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
          fitSiteFrame();
        });
      });
      window.addEventListener("resize", fitSiteFrame);
    }

    var startInstantSite = function () {
      if (!siteBox || !siteFrame || !orderId) return;
      siteBox.hidden = false;
      if (buildBar) buildBar.hidden = false;
      addTurn("sarah", "Please wait while we build your website \u2014 it usually takes less than a minute. It will appear right below.");
      siteBar.style.width = "2%";
      siteLabel.textContent = siteStatusText(0);

      streamSite({ orderId: orderId }, function () {
        if (siteStage.hidden) {
          siteBox.hidden = true;
          if (buildBar) buildBar.hidden = true;
        }
      });
    };

    /* --- Saving ------------------------------------------------------------
       The site saves itself and the first build emails the customer a link back to their workspace. This is only
       the fallback for "no email on file / the email didn't go": Sarah asks for the address right here. */
    var keepSaved = false;
    var keepPost = function (email, done) {
      var payload = email ? { email: email } : {};
      fetch(api + "/api/keep/" + encodeURIComponent(orderId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return { status: "failed" }; }); })
        .then(done)
        .catch(function () { done({ status: "failed" }); });
    };

    var askForEmail = function (message) {
      var turn = addTurn("sarah", message);
      var body = turn.querySelector(".turn__body");
      var form = el("form", "keep-form");
      var input = el("input");
      input.type = "email";
      input.required = true;
      input.placeholder = "you@yourbusiness.ie";
      input.setAttribute("aria-label", "Your email");
      input.autocomplete = "email";
      var go = el("button", "btn", "Email me the link");
      go.type = "submit";
      form.appendChild(input);
      form.appendChild(go);
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        go.disabled = true;
        keepPost(input.value.trim(), function (res) {
          go.disabled = false;
          if (res.status === "invalid_email") { addTurn("sarah", "That email doesn\u2019t look quite right \u2014 could you check it?"); return; }
          form.remove();
          handleKeepResult(res);
        });
      });
      body.appendChild(form);
      input.focus();
    };

    var handleKeepResult = function (res) {
      if (res.status === "sent" || res.status === "throttled") {
        keepSaved = true;
        setStatus("Saved automatically \u2014 link emailed to " + res.maskedEmail + ".");
        addTurn("sarah", (res.status === "sent" ? "Done \u2014 I\u2019ve emailed a private link to " : "Your link is already on its way to ") + res.maskedEmail +
          ". Open it whenever you\u2019re ready \u2014 your website and this chat will be waiting. Nothing to pay today. (If you can\u2019t see it in a minute, look in spam.)");
      } else if (res.status === "need_email") {
        askForEmail("Happy to keep it for you. What email should I send the link to?");
      } else if (res.status === "invalid_email") {
        askForEmail("That email doesn\u2019t look quite right \u2014 could you check it?");
      } else if (res.status === "rate_limited") {
        addTurn("sarah", "That\u2019s a few too many tries in a row \u2014 please wait a little while and try again.");
      } else if (res.status === "no_site") {
        addTurn("sarah", "Your website is still being built \u2014 give it a moment and try again.");
      } else {
        addTurn("sarah", "Sorry \u2014 I couldn\u2019t send that just now. Please try again in a minute.");
      }
    };

    var statusAction = document.getElementById("siteStatusAction");
    if (statusAction) {
      statusAction.addEventListener("click", function () {
        if (!orderId || keepSaved) return;
        statusAction.disabled = true;
        keepPost(null, function (res) { statusAction.disabled = false; handleKeepResult(res); });
      });
    }

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
      field.style.height = Math.max(56, Math.min(220, field.scrollHeight)) + "px";
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
      if (workspace) thread.scrollTo({ top: thread.scrollHeight, behavior: reduced ? "auto" : "smooth" });
      else turn.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
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
      intakeDone = true;
      if (siteReady) { enterPreviewMode(false); return; }
      startForm.hidden = true;
      var done = el("div", "chat__done");
      done.appendChild(el("h2", null, "That's everything \u2014 thanks."));
      done.appendChild(
        el("p", null, "Your preview is building just below \u2014 it takes a minute or two. It shows the look and feel; your own photos and details go in after you decide.")
      );
      done.appendChild(
        el("p", null, "Nothing has been charged, and you'll see the whole thing before you decide.")
      );
      thread.parentNode.insertBefore(done, thread.nextSibling);
      if (!workspace) done.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    };

    /* --- chatting about the finished preview --------------------------------
       Once the site exists the same composer talks to /api/preview-chat: Sarah answers, and when she changes
       something the preview reloads. Every change is validated server-side, so the page can never break. */
    var CHIP_TEXTS = [
      "Make it a bit brighter",
      "Change the headline",
      "Add my phone number",
      "I need to think about it"
    ];

    var hideChips = function () { if (chipsWrap) chipsWrap.hidden = true; };

    var setMode = function (m) {
      mode = m;
      chatRoot.classList.toggle("is-preview-mode", m === "preview");
      if (m === "preview") {
        field.placeholder = "Tell Sarah what you\u2019d like changed, or ask anything\u2026";
        if (composerHint) composerHint.textContent = "Changes are free until you buy.";
        if (chipsWrap && !chipsWrap.children.length) {
          CHIP_TEXTS.forEach(function (t) {
            var b = el("button", null, t);
            b.type = "button";
            b.addEventListener("click", function () {
              if (sending) return;
              field.value = t;
              startForm.requestSubmit();
            });
            chipsWrap.appendChild(b);
          });
        }
        if (chipsWrap) chipsWrap.hidden = false;
      }
    };

    var enterPreviewMode = function (announce) {
      if (mode === "preview") return;
      var done = chatRoot.querySelector(".chat__done");
      if (done) done.remove();
      startForm.hidden = false;
      clearQuickReplies();
      setMode("preview");
      if (announce) addTurn("sarah", "Of course \u2014 what would you like to change, or ask about? I\u2019ll update your website while you watch.");
    };

    var sendPreviewMessage = function (story) {
      addTurn("them", story);
      field.value = "";
      field.style.height = "auto";
      sending = true;
      if (sendBtn) sendBtn.disabled = true;
      var pending = addTurn("sarah", null);
      var settle = function () { pending.remove(); sending = false; if (sendBtn) sendBtn.disabled = false; };

      fetch(api + "/api/preview-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId, message: story })
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) { return { ok: r.ok, data: data }; });
        })
        .then(function (res) {
          settle();
          var data = res.data || {};
          if (!res.ok) {
            addTurn("sarah", data.error || "Sorry \u2014 I couldn\u2019t get a reply through just now. Please try again.");
            return;
          }
          addTurn("sarah", data.reply || "Done.");
          if (data.updated) {
            loadFrame();
            flashUpdated();
            setVersion(data.version, data.remaining);
          }
          if (data.readyToBuy) {
            var buy = document.getElementById("instantSiteBuy");
            if (buy) { buy.classList.remove("is-pulse"); void buy.offsetWidth; buy.classList.add("is-pulse"); }
          }
        })
        .catch(function () {
          settle();
          addTurn("sarah", "Sorry \u2014 I couldn\u2019t get a reply through just now. Please try again.");
        });
    };

    var chatBtn = document.getElementById("chatAboutIt");
    if (chatBtn) {
      chatBtn.addEventListener("click", function () {
        if (!siteReady) return;
        if (mode !== "preview") { intakeDone = true; enterPreviewMode(true); }
        if (window.innerWidth < 980) {
          var panel = document.getElementById("sarahPanel");
          if (panel) panel.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
        }
        field.focus({ preventScroll: true });
      });
    }

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

      if (mode === "preview") {
        if (!story) return;
        if (window.innerWidth < 980) field.blur();
        hideChips();
        sendPreviewMessage(story);
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
      if (story) userTurns.push(story);

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
          if (!instantPreviewStarted && userTurns.length >= 3) {
            instantPreviewStarted = true;
            startInstantPreview();
            startInstantSite();
          }
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

    /* --- coming back to a saved website --------------------------------------
       The link in the "saved" email (and a refresh) opens /start/?site=<order id>: straight into the workspace
       with the website, the chat so far and the buy button. Nothing is shown unless that order has a website. */
    var resumeWorkspace = function (id, state) {
      orderId = id;
      try { window.sessionStorage.setItem(KEY, orderId); } catch (err) {}
      intakeDone = true;
      loveAnnounced = true;
      instantPreviewStarted = true;
      if (intro && intro.parentNode) { intro.remove(); intro = null; }
      showSite({ version: state.version, remaining: state.remaining, emailed: state.emailed ? (state.maskedEmail || true) : false });
      var title = document.getElementById("chatTitle");
      if (title) title.textContent = state.businessName ? "Welcome back \u2014 here\u2019s " + state.businessName + "." : "Welcome back \u2014 here\u2019s your website.";
      var history = Array.isArray(state.history) ? state.history : [];
      history.forEach(function (h) {
        if (h && h.content) addTurn(h.role === "user" ? "them" : "sarah", h.content);
      });
      enterPreviewMode(false);
      if (!state.canChat) {
        addTurn("sarah", "This website was made before chat editing arrived. Tap \u201cTry another look\u201d once and then I can make changes for you while you watch.");
      } else if (!history.length) {
        addTurn("sarah", "Your website is saved and waiting. Want anything changed? Tell me and I\u2019ll update it while you watch \u2014 or tap \u201cYes, I love it\u201d when you\u2019re ready.");
      } else {
        addTurn("sarah", "Welcome back! Anything else you\u2019d like to change?");
      }
    };

    var params = new URLSearchParams(window.location.search);
    var siteParam = params.get("site");
    var resumeId = siteParam && UUID_RE.test(siteParam) ? siteParam : (orderId && UUID_RE.test(orderId) ? orderId : null);
    if (resumeId) {
      fetch(api + "/api/preview-chat?orderId=" + encodeURIComponent(resumeId), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (state) {
          if (state && state.hasSite && !siteReady && !userTurns.length) resumeWorkspace(resumeId, state);
        })
        .catch(function () { /* no saved website to resume: the normal conversation carries on */ });
    }
  }
})();
