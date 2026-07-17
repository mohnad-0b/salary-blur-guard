(function () {
  "use strict";

  const BLUR_CLASS = "sbg-blur";
  const EL_CLASS = "sbg-el"; // blur applied to an existing element, not a wrapper span
  const REVEALED_CLASS = "sbg-revealed";
  const MAX_EL_TEXT = 60; // don't blur a whole paragraph just because an amount sits inside it

  let active = false; // blur enabled AND this site is in scope
  let regex = null;
  let observer = null;

  chrome.storage.sync.get(SBG_DEFAULTS, applyConfig);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    chrome.storage.sync.get(SBG_DEFAULTS, applyConfig);
  });

  function applyConfig(cfg) {
    const inScope = cfg.scope === "all" || sbgHostMatches(location.hostname, cfg.sites);
    const shouldRun = cfg.blurEnabled !== false && inScope;
    regex = sbgBuildCurrencyRegex(cfg.currencies);

    if (!shouldRun || !regex) {
      active = false;
      unblurAll();
      stopObserving();
      return;
    }

    // The currency list may have changed, so rebuild from scratch.
    unblurAll();
    active = true;
    scan(document.body);
    startObserving();
  }

  function unblurAll() {
    document.querySelectorAll("." + BLUR_CLASS).forEach((el) => {
      if (el.classList.contains(EL_CLASS)) {
        el.classList.remove(BLUR_CLASS, EL_CLASS, REVEALED_CLASS);
        el.removeAttribute("title");
        el.removeAttribute("tabindex");
      } else if (el.parentNode) {
        el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
      }
    });
  }

  function attachToggle(el) {
    el.setAttribute("title", "Click to reveal");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      el.classList.toggle(REVEALED_CLASS);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.classList.toggle(REVEALED_CLASS);
      }
    });
  }

  /* Pass 1: the amount lives in a single text node ("JOD 899.00" or "899.00 JOD").
     Wrap just that text so surrounding labels stay readable. */
  function wrapTextNode(node) {
    const text = node.nodeValue;
    if (!text || !regex.test(text)) return;
    const parent = node.parentElement;
    if (!parent || parent.classList.contains(BLUR_CLASS)) return;

    const span = document.createElement("span");
    span.className = BLUR_CLASS;
    span.textContent = text;
    attachToggle(span);
    parent.replaceChild(span, node);
  }

  function scanTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const val = node.nodeValue;
        if (!val || !val.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest("." + BLUR_CLASS)) return NodeFilter.FILTER_REJECT;
        return regex.test(val) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const matches = [];
    let n;
    while ((n = walker.nextNode())) matches.push(n);
    matches.forEach(wrapTextNode);
  }

  /* Pass 2: the currency and the number are split across elements, e.g.
     <span>JOD</span><span>899.00</span> or <span>899.00</span><span>JOD</span>.
     Neither text node matches on its own, so blur the smallest element whose
     combined text matches. Runs after pass 1, so anything already handled
     there is skipped. */
  function scanElements(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const candidates = [root, ...root.querySelectorAll("*")];

    for (const el of candidates) {
      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") continue;
      if (el.classList.contains(BLUR_CLASS)) continue;
      if (el.closest("." + BLUR_CLASS)) continue;
      if (!el.children.length) continue; // single text node: pass 1 handles it
      if (el.querySelector("." + BLUR_CLASS)) continue; // pass 1 already covered the amount inside

      const text = el.textContent;
      if (!text || text.length > MAX_EL_TEXT || !regex.test(text)) continue;

      // Prefer the innermost element whose text matches.
      const deeper = [...el.querySelectorAll("*")].some((d) => {
        const t = d.textContent;
        return t && t.length <= MAX_EL_TEXT && regex.test(t);
      });
      if (deeper) continue;

      el.classList.add(BLUR_CLASS, EL_CLASS);
      attachToggle(el);
    }
  }

  function scan(root) {
    if (!active || !root || !regex) return;

    if (root.nodeType === Node.TEXT_NODE) {
      wrapTextNode(root);
      if (root.parentElement) scanElements(root.parentElement);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;

    scanTextNodes(root);
    scanElements(root);

    // A split amount may only be complete one level up from the node that changed.
    if (root.parentElement && root.parentElement !== document.documentElement) {
      scanElements(root.parentElement);
    }
  }

  function startObserving() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!active) return;
      for (const m of mutations) m.addedNodes.forEach((added) => scan(added));
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopObserving() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  }

  function hideAll() {
    document.querySelectorAll("." + REVEALED_CLASS).forEach((el) => el.classList.remove(REVEALED_CLASS));
  }

  // Re-blur on click elsewhere, tab switch, or window losing focus.
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("." + BLUR_CLASS)) return;
    hideAll();
  });
  window.addEventListener("blur", hideAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hideAll();
  });
})();
