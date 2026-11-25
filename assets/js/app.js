/* Study Note — interactions (no dependencies) */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function icon(name) { return '<svg class="i" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  window.SN = { $: $, $$: $$, esc: esc, icon: icon, reduceMotion: reduceMotion };

  /* ---------- Theme ---------- */
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  $$("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      store.set("theme", next);
      document.dispatchEvent(new CustomEvent("themechange"));
    });
  });

  /* ---------- Toast ---------- */
  var toastEl = $("[data-toast]"), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.innerHTML = icon("check") + "<span>" + esc(msg) + "</span>";
    toastEl.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-shown"); }, 2200);
  }
  window.SN.toast = toast;

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  /* ---------- Top bar / progress / back-to-top ---------- */
  var topbar = $("[data-topbar]");
  var progress = $("[data-progress]");
  var topBtn = $("[data-top]");
  var prose = $("[data-prose]");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (topbar) topbar.classList.toggle("is-scrolled", y > 4);
    if (topBtn) topBtn.classList.toggle("is-shown", y > 600);
    if (progress && prose) {
      var start = prose.offsetTop - window.innerHeight * 0.3;
      var end = prose.offsetTop + prose.offsetHeight - window.innerHeight;
      var p = Math.min(1, Math.max(0, (y - start) / Math.max(1, end - start)));
      progress.style.transform = "scaleX(" + p + ")";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (topBtn) topBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

  /* ---------- Reveal + count up ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = target.toLocaleString("ko-KR"); return; }
    var t0 = null, dur = 700;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * eased).toLocaleString("ko-KR");
      if (k < 1) requestAnimationFrame(step);
    }
    el.textContent = "0";
    requestAnimationFrame(step);
  }
  window.SN.countUp = countUp;

  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      $$("[data-count]", e.target).forEach(countUp);
      e.target.dispatchEvent(new CustomEvent("revealed"));
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -40px 0px", threshold: 0 }) : null;
  window.SN.observe = function (el) { if (io) io.observe(el); else el.classList.add("is-in"); };
  $$(".reveal").forEach(function (el, i) {
    el.style.transitionDelay = Math.min(i, 6) * 40 + "ms";
    window.SN.observe(el);
  });

  /* ---------- Paged list ("더 보기") + filter ---------- */
  var TIER = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };
  function facetOrder(a, b) {
    var lv = /^Lv\.(\d)/;
    if (lv.test(a) && lv.test(b)) return a.match(lv)[1] - b.match(lv)[1];
    var pa = a.split(" "), pb = b.split(" ");
    if (TIER[pa[0]] !== TIER[pb[0]]) return (TIER[pa[0]] || 0) - (TIER[pb[0]] || 0);
    return pb[1] - pa[1]; // 같은 티어는 5 → 1 (쉬운 것부터)
  }

  $$("[data-list]").forEach(function (list) {
    var size = parseInt(list.getAttribute("data-page-size"), 10) || 12;
    var scope = list.parentNode;
    var more = scope.querySelector("[data-more]");
    var filterBar = scope.querySelector("[data-filter]");
    var attr = (filterBar && filterBar.getAttribute("data-filter-attr")) || "group";
    var countEl = scope.querySelector("[data-list-count]");
    var rows = $$(".row", list);
    var filter = "all", shown = size;

    // 난이도(facet) 칩과 분포 차트는 목록에서 직접 만든다
    if (attr === "facet" && filterBar) {
      var counts = {};
      rows.forEach(function (r) { var f = r.getAttribute("data-facet"); if (f) counts[f] = (counts[f] || 0) + 1; });
      var facets = Object.keys(counts).sort(facetOrder);
      filterBar.innerHTML = '<button class="chip pressable is-active" type="button" data-filter-value="all">전체 <b>' + rows.length + "</b></button>" +
        facets.map(function (f) { return '<button class="chip pressable" type="button" data-filter-value="' + esc(f) + '">' + esc(f) + " <b>" + counts[f] + "</b></button>"; }).join("");
      var chart = $("[data-facet-chart]");
      if (chart) {
        var max = Math.max.apply(null, facets.map(function (f) { return counts[f]; }));
        chart.innerHTML = facets.map(function (f) {
          return '<li class="rank__item"><button class="rank__name rank__btn" type="button" data-facet-pick="' + esc(f) + '">' + esc(f) +
            '</button><span class="rank__track"><span class="rank__bar" data-w="' + (counts[f] / max * 100).toFixed(1) + '"></span></span><span class="rank__val">' + counts[f] + "개</span></li>";
        }).join("");
        var top = facets.slice().sort(function (a, b) { return counts[b] - counts[a]; })[0];
        var sum = $("[data-facet-summary]");
        if (sum && top) sum.textContent = top + " 문제를 가장 많이 풀었어요 · 막대를 누르면 그 난이도만 볼 수 있어요";
        var grow = function () { $$(".rank__bar", chart).forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; }); };
        var card = chart.closest(".reveal");
        if (card && !card.classList.contains("is-in")) card.addEventListener("revealed", grow); else requestAnimationFrame(grow);
        chart.addEventListener("click", function (e) {
          var b = e.target.closest("[data-facet-pick]");
          if (!b) return;
          var chip = filterBar.querySelector('[data-filter-value="' + b.getAttribute("data-facet-pick") + '"]');
          if (chip) { chip.click(); filterBar.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); }
        });
      }
    }

    function render(animateFrom) {
      var match = rows.filter(function (r) { return filter === "all" || r.getAttribute("data-" + attr) === filter; });
      rows.forEach(function (r) { r.classList.add("is-hidden"); r.classList.remove("is-entering"); });
      match.slice(0, shown).forEach(function (r, i) {
        r.classList.remove("is-hidden");
        if (animateFrom != null && i >= animateFrom && !reduceMotion) {
          r.style.animationDelay = Math.min(i - animateFrom, 12) * 30 + "ms";
          r.classList.add("is-entering");
        }
      });
      if (countEl) countEl.textContent = match.length;
      if (more) {
        var rest = match.length - shown;
        more.hidden = rest <= 0;
        more.textContent = "더 보기 (" + rest + "개 남음)";
      }
    }
    if (more) more.addEventListener("click", function () { var from = shown; shown += size; render(from); });
    if (filterBar) {
      filterBar.addEventListener("click", function (e) {
        var b = e.target.closest("[data-filter-value]");
        if (!b) return;
        $$("[data-filter-value]", filterBar).forEach(function (x) { x.classList.toggle("is-active", x === b); x.setAttribute("aria-selected", x === b); });
        filter = b.getAttribute("data-filter-value");
        shown = size;
        render(0);
      });
    }
    render(null);
  });

  /* ---------- Search palette ---------- */
  var palette = $("[data-palette]");
  var input = $("[data-search-input]");
  var results = $("[data-search-results]");
  var hint = $("[data-search-hint]");
  var index = null, loading = null, active = 0, lastFocus = null;

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    results.innerHTML = '<li class="skeleton skeleton--row"></li><li class="skeleton skeleton--row"></li><li class="skeleton skeleton--row"></li>';
    loading = fetch(window.SITE.search).then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (p) {
        p._t = p.t.toLowerCase(); p._g = (p.g || []).join(" ").toLowerCase();
        p._b = (p.b || "").toLowerCase(); p._c = (p.cl + " " + p.c).toLowerCase();
        return p;
      });
      return index;
    });
    return loading;
  }
  window.SN.loadIndex = loadIndex;

  function highlight(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return safe.replace(re, "<mark>$1</mark>");
  }
  function snippet(body, q) {
    var i = body.toLowerCase().indexOf(q);
    if (i < 0) return "";
    var s = Math.max(0, i - 24);
    return (s > 0 ? "…" : "") + body.slice(s, i + 60);
  }
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return { list: index.slice(0, 8), q: "" };
    var words = q.split(/\s+/);
    var scored = [];
    index.forEach(function (p) {
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], s = 0;
        if (p._t.indexOf(w) > -1) s += p._t.indexOf(w) === 0 ? 12 : 8;
        if (p._g.indexOf(w) > -1) s += 5;
        if (p._c.indexOf(w) > -1) s += 4;
        if (p._b.indexOf(w) > -1) s += 1;
        if (!s) return;
        score += s;
      }
      scored.push({ p: p, s: score });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return { list: scored.slice(0, 30).map(function (x) { return x.p; }), q: q };
  }
  function draw() {
    var r = search(input.value);
    var q = r.q.split(/\s+/)[0];
    hint.textContent = r.q ? (r.list.length ? "검색 결과 " + r.list.length + "개" : "") : "최근 글";
    if (!r.list.length) {
      results.innerHTML = '<li class="palette__empty">\'' + esc(input.value.trim()) + "\'에 맞는 글이 없어요</li>";
      return;
    }
    active = 0;
    results.innerHTML = r.list.map(function (p, i) {
      var snip = q ? snippet(p.b || "", q) : "";
      return '<li class="palette__item' + (i === 0 ? " is-active" : "") + '" role="option"><a href="' + esc(p.u) + '">' +
        '<span class="row__body"><span class="row__title">' + highlight(p.t, q) + "</span>" +
        (snip && p._t.indexOf(q) < 0 ? '<span class="palette__snip">' + highlight(snip, q) + "</span>" : "") +
        '<span class="row__meta">' + esc(p.cl) + '<i class="dot"></i>' + esc(p.d) + "</span></span>" +
        icon("chevron").replace('class="i"', 'class="i row__chev"') + "</a></li>";
    }).join("");
  }
  function setActive(n) {
    var items = $$(".palette__item", results);
    if (!items.length) return;
    active = (n + items.length) % items.length;
    items.forEach(function (it, i) { it.classList.toggle("is-active", i === active); });
    items[active].scrollIntoView({ block: "nearest" });
  }
  function openPalette() {
    if (!palette || !palette.hidden) return;
    lastFocus = document.activeElement;
    palette.hidden = false;
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(function () { palette.classList.add("is-open"); input.focus(); });
    loadIndex().then(draw).catch(function () { results.innerHTML = '<li class="palette__empty">검색 데이터를 불러오지 못했어요</li>'; });
  }
  function closePalette() {
    if (!palette || palette.hidden) return;
    palette.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    setTimeout(function () { palette.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.SN.openPalette = openPalette;
  $$("[data-search-open]").forEach(function (b) { b.addEventListener("click", openPalette); });
  $$("[data-search-close]").forEach(function (b) { b.addEventListener("click", closePalette); });
  if (input) {
    input.addEventListener("input", function () { if (index) draw(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") {
        var a = $(".palette__item.is-active a", results);
        if (a) { e.preventDefault(); window.location.href = a.href; }
      }
    });
  }
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
    else if (e.key === "/" && !typing) { e.preventDefault(); openPalette(); }
    else if (e.key === "Escape") { closePalette(); closeSheet(); closeLightbox(); }
  });
  var kbd = $(".searchbtn__kbd");
  if (kbd && !/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) kbd.textContent = "Ctrl K";

  /* ---------- Bottom sheet ---------- */
  var sheet = $("[data-sheet]");
  function openSheet() {
    if (!sheet) return;
    sheet.hidden = false;
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(function () { sheet.classList.add("is-open"); });
  }
  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    setTimeout(function () { sheet.hidden = true; }, 300);
  }
  $$("[data-sheet-close]").forEach(function (b) { b.addEventListener("click", closeSheet); });

  /* ---------- Lightbox (갤러리) ---------- */
  var lightbox = $("[data-lightbox]");
  var gallery = [], gIndex = 0;
  function showImage(i) {
    if (!gallery.length) return;
    gIndex = (i + gallery.length) % gallery.length;
    var src = gallery[gIndex];
    var big = lightbox.querySelector("img");
    big.classList.remove("is-loaded");
    big.onload = function () { big.classList.add("is-loaded"); };
    big.src = src.currentSrc || src.src;
    big.alt = src.alt || "";
    var cap = $("[data-lb-cap]", lightbox), alt = (src.alt || "").trim();
    cap.textContent = alt && !/^image$/i.test(alt) ? alt : "";
    $("[data-lb-count]", lightbox).textContent = gallery.length > 1 ? (gIndex + 1) + " / " + gallery.length : "";
    lightbox.classList.toggle("is-single", gallery.length < 2);
  }
  function openLightbox(i) {
    if (!lightbox) return;
    lightbox.hidden = false;
    document.documentElement.style.overflow = "hidden";
    showImage(i);
    requestAnimationFrame(function () { lightbox.classList.add("is-open"); });
  }
  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    setTimeout(function () { lightbox.hidden = true; }, 200);
  }
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target.closest("[data-lb-prev]")) { showImage(gIndex - 1); return; }
      if (e.target.closest("[data-lb-next]")) { showImage(gIndex + 1); return; }
      if (e.target.tagName !== "IMG") closeLightbox();
    });
    var tx = null;
    lightbox.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (tx == null) return;
      var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) showImage(gIndex + (dx < 0 ? 1 : -1));
    });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "ArrowRight") showImage(gIndex + 1);
      if (e.key === "ArrowLeft") showImage(gIndex - 1);
    });
  }

  /* ---------- Post page ---------- */
  if (prose) {
    // 표 가로 스크롤 감싸기
    $$("table", prose).forEach(function (t) {
      if (t.parentNode.classList.contains("table-wrap")) return;
      var w = document.createElement("div"); w.className = "table-wrap";
      t.parentNode.insertBefore(w, t); w.appendChild(t);
    });

    // 코드 블록 머리 + 복사 버튼
    $$("div.highlighter-rouge, figure.highlight", prose).forEach(function (block) {
      if (block.parentNode.closest && block.parentNode.closest(".highlighter-rouge")) return;
      var m = (block.className || "").match(/language-([\w+-]+)/);
      var head = document.createElement("div");
      head.className = "code-head";
      head.innerHTML = "<span>" + esc(m ? m[1] : "code") + '</span><button class="code-copy" type="button">' + icon("copy") + "<span>복사</span></button>";
      block.insertBefore(head, block.firstChild);
      head.querySelector("button").addEventListener("click", function () {
        var code = block.querySelector("pre code") || block.querySelector("pre");
        var btn = this;
        copyText(code.innerText.replace(/\n$/, "")).then(function () {
          btn.classList.add("is-done");
          btn.innerHTML = icon("check") + "<span>복사됨</span>";
          setTimeout(function () { btn.classList.remove("is-done"); btn.innerHTML = icon("copy") + "<span>복사</span>"; }, 1600);
        });
      });
    });

    // 이미지 확대 (글 안의 모든 이미지를 갤러리로)
    gallery = $$("img", prose);
    gallery.forEach(function (img, i) {
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("click", function () { openLightbox(i); });
    });

    // 목차 + 앵커 + 스크롤 스파이
    var heads = $$("h2[id], h3[id]", prose).filter(function (h) { return !h.closest("[hidden]"); });
    var tocBox = $("[data-toc]"), tocList = $("[data-toc-list]"), tocSheet = $("[data-toc-sheet]"), tocOpen = $("[data-toc-open]");
    heads.forEach(function (h) {
      var a = document.createElement("a");
      a.className = "anchor"; a.href = "#" + h.id; a.setAttribute("aria-label", "이 제목 링크 복사");
      a.innerHTML = icon("link");
      a.addEventListener("click", function (e) {
        e.preventDefault();
        history.replaceState(null, "", "#" + h.id);
        h.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        copyText(location.href).then(function () { toast("제목 링크를 복사했어요"); });
      });
      h.insertBefore(a, h.firstChild);
    });
    if (heads.length >= 2 && tocList) {
      var html = heads.map(function (h) {
        var num = h.querySelector(".hnum"), text = "";
        Array.prototype.forEach.call(h.childNodes, function (n) { if (!(n.nodeType === 1 && (n.classList.contains("hnum") || n.classList.contains("anchor")))) text += n.textContent; });
        text = (num ? num.textContent + ". " : "") + text.trim();
        return '<li class="lv' + h.tagName.charAt(1) + '"><a href="#' + esc(h.id) + '" data-id="' + esc(h.id) + '">' + esc(text) + "</a></li>";
      }).join("");
      tocList.innerHTML = html; tocSheet.innerHTML = html;
      tocBox.hidden = false; tocOpen.hidden = false;
      tocOpen.addEventListener("click", openSheet);
      tocSheet.addEventListener("click", function (e) { if (e.target.closest("a")) closeSheet(); });

      var links = $$("a[data-id]");
      var current = null;
      function setCurrent(id) {
        if (id === current) return;
        current = id;
        links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("data-id") === id); });
        var act = tocList.querySelector(".is-active");
        if (act && tocBox.scrollHeight > tocBox.clientHeight) {
          var top = act.offsetTop - tocBox.clientHeight / 2;
          tocBox.scrollTo({ top: top, behavior: "smooth" });
        }
      }
      var spyTick = false;
      function spy() {
        var line = 120, id = heads[0].id;
        for (var i = 0; i < heads.length; i++) {
          if (heads[i].getBoundingClientRect().top - line <= 0) id = heads[i].id; else break;
        }
        setCurrent(id); spyTick = false;
      }
      window.addEventListener("scroll", function () { if (!spyTick) { spyTick = true; requestAnimationFrame(spy); } }, { passive: true });
      spy();
    }

    // 링크 복사 / 공유
    var copyBtn = $("[data-copy-link]");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      copyText(location.href.split("#")[0]).then(function () { toast("링크를 복사했어요"); }, function () { toast("복사하지 못했어요"); });
    });
    var shareBtn = $("[data-share]");
    if (shareBtn) shareBtn.addEventListener("click", function () {
      var data = { title: document.title, url: location.href.split("#")[0] };
      if (navigator.share) navigator.share(data).catch(function () {});
      else copyText(data.url).then(function () { toast("공유할 링크를 복사했어요"); });
    });

    // 댓글은 화면에 보일 때 불러오기
    var cm = $("[data-comments]");
    if (cm) {
      var loadDisqus = function () {
        if (window.DISQUS) return;
        window.disqus_config = function () { this.page.url = cm.getAttribute("data-url"); this.page.identifier = cm.getAttribute("data-id"); };
        var s = document.createElement("script");
        s.src = "https://" + cm.getAttribute("data-shortname") + ".disqus.com/embed.js";
        s.setAttribute("data-timestamp", +new Date());
        document.body.appendChild(s);
      };
      if ("IntersectionObserver" in window) {
        var cio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { loadDisqus(); cio.disconnect(); } }, { rootMargin: "400px" });
        cio.observe(cm);
      } else loadDisqus();
    }
  }

  /* ---------- Tags page ---------- */
  var tagWrap = $("[data-tags]");
  if (tagWrap) {
    var tagFilter = $("[data-tag-filter]");
    var result = $("[data-tag-result]");
    var chips = $$("[data-tag]", tagWrap);
    tagFilter.addEventListener("input", function () {
      var q = tagFilter.value.trim().toLowerCase();
      chips.forEach(function (c) { c.classList.toggle("is-dim", q && c.getAttribute("data-tag").toLowerCase().indexOf(q) < 0); });
    });
    function showTag(tag, scroll) {
      chips.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-tag") === tag); });
      if (!tag) { result.hidden = true; history.replaceState(null, "", location.pathname); return; }
      history.replaceState(null, "", "#" + encodeURIComponent(tag));
      loadIndex().then(function (idx) {
        var posts = idx.filter(function (p) { return (p.g || []).indexOf(tag) > -1; });
        $("[data-tag-title]").textContent = "#" + tag;
        $("[data-tag-count]").textContent = posts.length + "개의 글";
        var list = $("[data-tag-list]");
        list.innerHTML = posts.map(function (p, i) {
          return '<li class="row is-entering" style="animation-delay:' + Math.min(i, 12) * 25 + 'ms"><a class="row__link pressable" href="' + esc(p.u) + '"><span class="row__body"><span class="row__title">' + esc(p.t) +
            '</span><span class="row__meta">' + esc(p.cl) + '<i class="dot"></i>' + esc(p.d) + "</span></span>" + icon("chevron").replace('class="i"', 'class="i row__chev"') + "</a></li>";
        }).join("");
        result.hidden = false;
        if (scroll) result.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
    }
    tagWrap.addEventListener("click", function (e) {
      var c = e.target.closest("[data-tag]");
      if (!c) return;
      var tag = c.getAttribute("data-tag");
      showTag(c.classList.contains("is-active") ? null : tag, true);
    });
    $("[data-tag-clear]").addEventListener("click", function () { showTag(null); });
    if (location.hash.length > 1) showTag(decodeURIComponent(location.hash.slice(1)), false);
  }
})();
