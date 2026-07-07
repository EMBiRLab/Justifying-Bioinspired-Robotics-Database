/* ============================================================================
 * app.js — UI wiring for the Bio-Inspired Design Atlas
 *
 * All user-supplied text is inserted with textContent (never innerHTML), so
 * comment/paper content cannot inject markup.
 * ==========================================================================*/

(function (global) {
  "use strict";

  const BID = global.BID;
  let store = BID.store; // may be swapped to the Supabase store during boot()
  const CATS = BID.CATEGORIES;
  const catById = BID.CATEGORY_BY_ID;

  // ---- tiny DOM helper ----------------------------------------------------
  function h(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") n.className = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k]; // only for trusted markup
        else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function")
          n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
      }
    }
    (Array.isArray(children) ? children : children != null ? [children] : [])
      .forEach((c) => {
        if (c == null) return;
        n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) { return ""; }
  }

  const CLIENT_KEY = "bid_client_v1";
  function getClientId() {
    let id = null;
    try { id = localStorage.getItem(CLIENT_KEY); } catch (e) {}
    if (!id) {
      id = "c_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
      try { localStorage.setItem(CLIENT_KEY, id); } catch (e) {}
    }
    return id;
  }

  function currentUser() {
    const el = document.getElementById("bid-user");
    const v = el ? el.value.trim() : "";
    return v || "anonymous";
  }

  // ---- identity abstraction (works for both localStorage and Supabase) ----
  // When the active store supports auth (Supabase), identity comes from the
  // signed-in user; otherwise it falls back to the display-name input + a
  // per-browser client id (the localStorage prototype behavior).
  function authIdentity() {
    return store.getIdentity ? store.getIdentity() : null;
  }
  function authorName() {
    const id = authIdentity();
    if (store.supportsAuth) return id ? id.name : null; // null => not signed in
    return currentUser();
  }
  function voterId() {
    const id = authIdentity();
    if (store.supportsAuth) return id ? id.id : null;
    return getClientId();
  }
  function canDelete(c) {
    const id = authIdentity();
    if (store.supportsAuth) return !!(id && c.authorId && c.authorId === id.id);
    return !!(c.author && c.author === currentUser() && c.author !== "anonymous");
  }
  // Returns true if the user may write; otherwise reports via showErr and false.
  function requireAuth(showErr) {
    if (store.supportsAuth && !authIdentity()) {
      if (showErr) showErr("Please sign in (top right) to contribute.");
      return false;
    }
    return true;
  }

  // Only allow http/https links to become hrefs — blocks javascript:/data: URLs.
  function safeUrl(raw) {
    const s = String(raw || "").trim();
    if (!s) return null;
    let u;
    try {
      u = new URL(s, window.location.href);
    } catch (e) {
      return null;
    }
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  }

  // ---- app state ----------------------------------------------------------
  const S = { papers: [], selectedId: null, filter: "all" };

  const els = {
    plot: document.getElementById("bid-plot"),
    legend: document.getElementById("bid-legend"),
    side: document.getElementById("bid-side"),
    modalRoot: document.getElementById("bid-modal-root"),
    backendNote: document.getElementById("bid-backend-note"),
  };

  // ---- classification widget (2 sliders + category tags) ------------------
  // initial: { x, y, categories:[] }; returns { el, getValue() }
  function buildClassifier(initial) {
    initial = initial || {};
    let x = initial.x != null ? initial.x : 0.5;
    let y = initial.y != null ? initial.y : 0.5;
    const chosen = new Set(initial.categories || []);

    const xVal = h("span", { class: "bid-slider-val" });
    const yVal = h("span", { class: "bid-slider-val" });
    const readout = h("div", { class: "bid-pos-readout" });

    function describe() {
      const xd = x < 0.4 ? "Science-leaning" : x > 0.6 ? "Engineering-leaning" : "Balanced science/engineering";
      const yd = y < 0.4 ? "low engagement with biology" : y > 0.66 ? "high engagement with biology" : "moderate engagement with biology";
      const lean = Math.round(Math.abs(x - 0.5) * 200);
      xVal.textContent = lean === 0 ? "Balanced" : (x < 0.5 ? "Science " : "Engineering ") + lean + "%";
      yVal.textContent = Math.round(y * 100) + "%";
      readout.textContent = "Lands as: " + xd + " · " + yd + ".";
    }

    const xSlider = h("input", {
      type: "range", min: "0", max: "100", value: String(Math.round(x * 100)),
      "aria-label": "Contribution: science to engineering",
      oninput: (e) => { x = e.target.value / 100; describe(); },
    });
    const ySlider = h("input", {
      type: "range", min: "0", max: "100", value: String(Math.round(y * 100)),
      "aria-label": "Engagement with biology",
      oninput: (e) => { y = e.target.value / 100; describe(); },
    });

    const picker = h("div", { class: "bid-cat-picker" });
    CATS.forEach((c) => {
      const input = h("input", { type: "checkbox" });
      input.checked = chosen.has(c.id);
      const label = h("label", {
        class: "bid-cat-toggle" + (input.checked ? " is-on" : ""),
        style: "color:" + c.color,
      }, [input, h("span", { class: "bid-chip-dot", style: "background:" + c.color }), document.createTextNode(c.name)]);
      input.addEventListener("change", () => {
        if (input.checked) chosen.add(c.id); else chosen.delete(c.id);
        label.classList.toggle("is-on", input.checked);
      });
      picker.appendChild(label);
    });

    describe();

    const el = h("div", { class: "bid-classify" }, [
      h("div", { class: "bid-slider-row" }, [
        h("label", {}, [document.createTextNode("Contribution"), xVal]),
        xSlider,
        h("div", { class: "bid-slider-ends" }, [h("span", { text: "Science" }), h("span", { text: "Engineering" })]),
      ]),
      h("div", { class: "bid-slider-row" }, [
        h("label", {}, [document.createTextNode("Engagement with biology"), yVal]),
        ySlider,
        h("div", { class: "bid-slider-ends" }, [h("span", { text: "Low" }), h("span", { text: "High" })]),
      ]),
      h("div", { class: "bid-field", style: "margin-bottom:4px" }, [
        h("label", { text: "Categories (choose one or more)" }),
        picker,
      ]),
      readout,
    ]);

    return { el, getValue: () => ({ x, y, categories: Array.from(chosen) }) };
  }

  // ---- legend -------------------------------------------------------------
  function renderLegend() {
    clear(els.legend);
    CATS.forEach((c) => {
      els.legend.appendChild(
        h("span", { class: "bid-legend-item", title: c.blurb }, [
          h("span", { class: "bid-legend-swatch", style: "background:" + c.color }),
          document.createTextNode(c.name),
        ])
      );
    });
  }

  // ---- plot ---------------------------------------------------------------
  function renderPlot() {
    BID.Plot.render(els.plot, S.papers, {
      selectedId: S.selectedId,
      onSelect: (id) => selectPaper(id),
    });
  }

  // ---- category chip ------------------------------------------------------
  function catChip(cid, count) {
    const c = catById[cid];
    if (!c) return null;
    return h("span", { class: "bid-chip", style: "background:" + c.color }, [
      document.createTextNode(c.name + (count != null ? " · " + count : "")),
    ]);
  }

  // ---- list ---------------------------------------------------------------
  function renderList() {
    clear(els.side);

    const filterSel = h("select", { class: "bid-filter", onchange: (e) => { S.filter = e.target.value; renderSide(); } }, [
      h("option", { value: "all", text: "All categories" }),
    ].concat(CATS.map((c) => {
      const o = h("option", { value: c.id, text: c.name });
      if (S.filter === c.id) o.selected = true;
      return o;
    })));

    let list = S.papers.slice();
    if (S.filter !== "all") {
      list = list.filter((p) => p.categoryTally.some((t) => t.id === S.filter));
    }
    // sort: most-discussed first, then most classifications
    list.sort((a, b) => (b.commentCount - a.commentCount) || (b.suggestionCount - a.suggestionCount) || a.label.localeCompare(b.label));

    els.side.appendChild(
      h("div", { class: "bid-list-head" }, [
        h("div", {}, [h("h2", { text: "Papers" }), h("span", { class: "bid-list-count", text: list.length + " shown · " + S.papers.length + " total" })]),
        filterSel,
      ])
    );

    if (!list.length) {
      els.side.appendChild(h("div", { class: "bid-empty", text: "No papers in this category yet." }));
      return;
    }

    list.forEach((p) => {
      const meta = h("div", { class: "bid-card-meta" });
      if (p.topCategory) meta.appendChild(catChip(p.topCategory));
      p.categoryTally.slice(1, 3).forEach((t) => {
        meta.appendChild(h("span", { class: "bid-chip bid-chip-soft" }, [
          h("span", { class: "bid-chip-dot", style: "background:" + catById[t.id].color }),
          document.createTextNode(catById[t.id].name),
        ]));
      });
      meta.appendChild(h("span", { class: "bid-chip bid-chip-soft", text: "💬 " + p.commentCount }));
      meta.appendChild(h("span", { class: "bid-chip bid-chip-soft", text: "◎ " + p.suggestionCount }));

      const subtitle = p.title || p.blurb;
      els.side.appendChild(
        h("div", { class: "bid-card", onclick: () => selectPaper(p.id) }, [
          h("div", { class: "bid-card-title", text: p.label }),
          subtitle ? h("div", { class: "bid-card-blurb", text: subtitle }) : null,
          meta,
        ])
      );
    });
  }

  // ---- detail -------------------------------------------------------------
  // Monotonic token: if a newer renderDetail starts while this one is awaiting,
  // the older one bails instead of appending a stale/duplicate subtree.
  let detailRenderToken = 0;
  async function renderDetail() {
    const myToken = ++detailRenderToken;
    const p = await store.getPaper(S.selectedId);
    if (myToken !== detailRenderToken) return;
    if (!p) { S.selectedId = null; return renderList(); }
    // Fetch everything BEFORE touching the DOM so the build is synchronous.
    const comments = await store.getComments(p.id);
    const suggestions = await store.getSuggestions(p.id);
    if (myToken !== detailRenderToken) return;

    clear(els.side);
    els.side.appendChild(h("button", { class: "bid-back", text: "← All papers", onclick: () => selectPaper(null) }));
    els.side.appendChild(h("h2", { class: "bid-detail-title", text: p.label + (p.year ? " · " + p.year : "") }));
    if (p.title) els.side.appendChild(h("p", { class: "bid-detail-fulltitle", text: p.title }));
    if (p.blurb) els.side.appendChild(h("p", { class: "bid-detail-blurb", text: p.blurb }));
    const linkHref = safeUrl(p.link);
    if (linkHref) {
      els.side.appendChild(h("p", { class: "bid-detail-link" }, [
        h("a", { href: linkHref, target: "_blank", rel: "noopener noreferrer", text: p.doi ? "doi.org/" + p.doi + " ↗" : "Open source ↗" }),
      ]));
    }

    // --- community position box ---
    const box = h("div", { class: "bid-position-box" });
    box.appendChild(h("h3", { text: "Community classification" }));
    if (p.categoryTally.length) {
      const maxCount = p.categoryTally[0].count;
      p.categoryTally.forEach((t) => {
        box.appendChild(h("div", { class: "bid-tally-row" }, [
          h("span", { class: "bid-chip-dot", style: "background:" + catById[t.id].color }),
          h("span", { style: "flex:0 0 190px", text: catById[t.id].name }),
          h("span", { class: "bid-tally-bar", style: "background:" + catById[t.id].color + ";width:" + (36 + (t.count / maxCount) * 120) + "px" }),
          h("span", { text: String(t.count) }),
        ]));
      });
    } else {
      box.appendChild(h("div", { class: "bid-hint", text: "No classifications yet — add one below." }));
    }
    if (p.position) {
      const xd = p.position.x < 0.4 ? "science-leaning" : p.position.x > 0.6 ? "engineering-leaning" : "balanced";
      const yd = p.position.y < 0.4 ? "low" : p.position.y > 0.66 ? "high" : "moderate";
      box.appendChild(h("div", { class: "bid-pos-readout", text:
        "Mean position from " + p.suggestionCount + " classification" + (p.suggestionCount === 1 ? "" : "s") +
        ": " + xd + " contribution, " + yd + " engagement with biology." }));
    }
    els.side.appendChild(box);

    // --- comments ---
    const wrap = h("div", { class: "bid-comments" });
    wrap.appendChild(h("h3", { text: "Discussion" }));
    const sgByComment = {};
    suggestions.forEach((s) => { if (s.commentId) sgByComment[s.commentId] = s; });

    wrap.appendChild(renderCommentTree(comments, sgByComment, p.id));

    // add root comment form
    wrap.appendChild(h("h3", { text: "Add to the discussion" }));
    wrap.appendChild(buildCommentForm({ paperId: p.id, parentId: null }));

    els.side.appendChild(wrap);
  }

  function netVotes(c) {
    const v = c.voters || {};
    let s = 0;
    for (const k in v) s += v[k];
    return s;
  }

  function renderCommentTree(comments, sgByComment, paperId) {
    const byParent = {};
    comments.forEach((c) => {
      const k = c.parentId || "root";
      (byParent[k] = byParent[k] || []).push(c);
    });
    Object.keys(byParent).forEach((k) => {
      byParent[k].sort((a, b) => (netVotes(b) - netVotes(a)) || (a.createdAt < b.createdAt ? -1 : 1));
    });

    const container = h("div");
    const roots = byParent["root"] || [];
    if (!roots.length) {
      container.appendChild(h("div", { class: "bid-empty", text: "No comments yet. Start the conversation." }));
    }
    function renderNode(c) {
      const node = h("div", { class: "bid-comment" });
      node.appendChild(h("div", { class: "bid-comment-head" }, [
        h("span", { class: "bid-comment-author", text: c.author || "anonymous" }),
        h("span", { text: "· " + fmtDate(c.createdAt) }),
      ]));

      if (c.deleted) {
        node.appendChild(h("div", { class: "bid-comment-body is-deleted", text: "[deleted]" }));
      } else {
        node.appendChild(h("div", { class: "bid-comment-body", text: c.body }));
        const sg = sgByComment[c.id];
        if (sg) {
          const sgEl = h("div", { class: "bid-comment-sg" }, [h("span", { text: "proposed classification:" })]);
          (sg.categories || []).forEach((cid) => {
            if (catById[cid]) sgEl.appendChild(h("span", { class: "bid-chip", style: "background:" + catById[cid].color }, [document.createTextNode(catById[cid].name)]));
          });
          sgEl.appendChild(h("span", { text: "(" + describePos(sg.x, sg.y) + ")" }));
          node.appendChild(sgEl);
        }
      }

      // actions: vote + reply + delete
      const score = netVotes(c);
      const myId = voterId();
      const myVote = myId ? (c.voters || {})[myId] || 0 : 0;
      async function doVote(dir) {
        if (!requireAuth(null)) { updateStorageNote(); return; }
        await store.voteComment(c.id, voterId(), dir);
        renderDetail();
      }
      const upBtn = h("button", { class: myVote === 1 ? "is-on" : "", title: "Upvote", text: "▲", onclick: () => doVote(1) });
      const downBtn = h("button", { class: myVote === -1 ? "is-on" : "", title: "Downvote", text: "▼", onclick: () => doVote(-1) });
      const actions = h("div", { class: "bid-comment-actions" }, [
        h("span", { class: "bid-vote" }, [upBtn, h("span", { class: "bid-vote-score", text: String(score) }), downBtn]),
      ]);
      if (!c.deleted) {
        const replyBtn = h("button", { class: "bid-linkbtn", text: "Reply" });
        const replyHost = h("div");
        replyBtn.addEventListener("click", () => {
          if (replyHost.firstChild) { clear(replyHost); return; }
          replyHost.appendChild(buildCommentForm({ paperId, parentId: c.id, compact: true }));
        });
        actions.appendChild(replyBtn);
        if (canDelete(c)) {
          actions.appendChild(h("button", { class: "bid-linkbtn is-danger", text: "Delete", onclick: async () => { await store.deleteComment(c.id, c.author); refresh(); } }));
        }
        node.appendChild(actions);
        node.appendChild(replyHost);
      } else {
        node.appendChild(actions);
      }

      const kids = byParent[c.id] || [];
      kids.forEach((k) => node.appendChild(renderNode(k)));
      return node;
    }
    roots.forEach((r) => container.appendChild(renderNode(r)));
    return container;
  }

  function describePos(x, y) {
    const xd = x < 0.4 ? "science-leaning" : x > 0.6 ? "engineering-leaning" : "balanced";
    const yd = y < 0.4 ? "low bio" : y > 0.66 ? "high bio" : "moderate bio";
    return xd + ", " + yd;
  }

  // ---- comment form -------------------------------------------------------
  // opts: { paperId, parentId, compact }
  function buildCommentForm(opts) {
    const err = h("div", { class: "bid-error", style: "display:none" });
    const textarea = h("textarea", { placeholder: opts.parentId ? "Write a reply…" : "Share your reasoning about how this paper should be classified…" });

    let classifier = null;
    const classifyHost = h("div", { style: "display:none;margin-top:8px" });
    const toggle = h("label", { class: "bid-toggle-classify" }, [
      (function () {
        const cb = h("input", { type: "checkbox" });
        cb.addEventListener("change", () => {
          if (cb.checked) {
            if (!classifier) { classifier = buildClassifier({}); classifyHost.appendChild(classifier.el); }
            classifyHost.style.display = "block";
          } else {
            classifyHost.style.display = "none";
          }
        });
        return cb;
      })(),
      document.createTextNode(" Attach a classification (moves the paper on the map)"),
    ]);

    const submit = h("button", { class: "bid-btn bid-btn-primary", text: opts.parentId ? "Reply" : "Post comment" });
    submit.addEventListener("click", async () => {
      const body = textarea.value.trim();
      const hasClassify = classifyHost.style.display === "block" && classifier;
      if (!body && !hasClassify) { showErr("Write something, or attach a classification."); return; }
      if (!requireAuth(showErr)) return;
      const payload = { paperId: opts.paperId, parentId: opts.parentId, body: body, author: authorName() };
      if (hasClassify) {
        const v = classifier.getValue();
        if (!v.categories.length) { showErr("Pick at least one category for your classification, or untick the classification box."); return; }
        payload.suggestion = v;
      }
      submit.disabled = true;
      try {
        await store.addComment(payload);
        await refresh(); // re-renders detail and replaces this form
      } catch (e) {
        showErr("Could not save — see the storage warning above.");
        submit.disabled = false;
      }
    });

    function showErr(m) { err.textContent = m; err.style.display = "block"; }

    return h("div", { class: "bid-form" + (opts.compact ? "" : "") }, [
      h("div", { class: "bid-field", style: "margin-bottom:8px" }, [textarea]),
      toggle,
      classifyHost,
      err,
      h("div", { class: "bid-form-actions" }, [submit]),
    ]);
  }

  // ---- submit-paper modal -------------------------------------------------
  function openSubmitModal() {
    const err = h("div", { class: "bid-error", style: "display:none" });
    const doiInput = h("input", { type: "text", placeholder: "10.1234/abcd  (required)" });
    const lookupBtn = h("button", { class: "bid-btn", text: "Look up" });
    const lookupMsg = h("div", { class: "bid-lookup-msg", style: "display:none" });
    const title = h("input", { type: "text", placeholder: "Full paper title" });
    const firstAuthor = h("input", { type: "text", placeholder: "First author surname, e.g. Kriegman" });
    const year = h("input", { type: "number", placeholder: "2021", min: "1800", max: "2100" });
    const blurb = h("textarea", { placeholder: "One or two sentences on what the work is (optional)." });
    const justification = h("textarea", { placeholder: "Why do you classify it this way? (opens the discussion thread)" });
    const classifier = buildClassifier({ x: 0.5, y: 0.5 });

    let lastLookup = null; // { doi, authorCount } from the most recent Crossref hit

    const close = () => clear(els.modalRoot);

    function showMsg(kind, node) {
      clear(lookupMsg);
      lookupMsg.className = "bid-lookup-msg bid-lookup-" + kind;
      lookupMsg.style.display = "block";
      lookupMsg.appendChild(typeof node === "string" ? document.createTextNode(node) : node);
    }

    // "already in the atlas" message with a link to the existing paper
    function dupNode(existing) {
      const openLink = h("button", { class: "bid-linkbtn", text: "Open it →", onclick: () => { close(); selectPaper(existing.id); } });
      return h("span", {}, [document.createTextNode("“" + existing.label + "” is already in the atlas. "), openLink]);
    }

    async function doLookup() {
      const norm = BID.doi.normalizeDoi(doiInput.value);
      if (!norm) { showMsg("error", "That doesn't look like a DOI — expected something like 10.1234/abcd."); return; }
      lookupBtn.disabled = true;
      // Ask the live data source (the database in shared mode) whether this DOI
      // already exists — not just the papers loaded in this browser.
      showMsg("info", "Checking the atlas …");
      const existing = store.findPaperByDoi ? await store.findPaperByDoi(norm) : null;
      if (existing) { showMsg("error", dupNode(existing)); lookupBtn.disabled = false; return; }
      showMsg("info", "Looking up " + norm + " …");
      try {
        const r = await BID.doi.lookupDoi(norm);
        lastLookup = { doi: r.doi, authorCount: r.authorCount };
        title.value = r.title || title.value;
        firstAuthor.value = r.firstAuthor || firstAuthor.value;
        if (r.year) year.value = r.year;
        const summary = (r.firstAuthor ? r.firstAuthor + (r.authorCount === 1 ? "" : " et al.") : "?") +
          (r.year ? ", " + r.year : "") + (r.journal ? " · " + r.journal : "");
        showMsg("ok", h("span", {}, [
          h("strong", { text: "✓ Found: " }),
          document.createTextNode(r.title || "(untitled)"),
          h("div", { class: "bid-found-sub", text: summary + " — confirm or edit the fields below." }),
        ]));
      } catch (e) {
        showMsg("error", e.message || "Lookup failed. Type the details in manually.");
      } finally {
        lookupBtn.disabled = false;
      }
    }

    lookupBtn.addEventListener("click", doLookup);
    doiInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doLookup(); } });

    const submit = h("button", { class: "bid-btn bid-btn-primary", text: "Add paper" });
    submit.addEventListener("click", async () => {
      const setErr = (m) => { clear(err); err.textContent = m; err.style.display = "block"; };
      const setErrNode = (node) => { clear(err); err.appendChild(node); err.style.display = "block"; };
      const doi = BID.doi.normalizeDoi(doiInput.value);
      if (!doi) return setErr("A valid DOI is required (e.g. 10.1234/abcd).");
      const ttl = title.value.trim();
      const fa = firstAuthor.value.trim();
      if (!ttl) return setErr("Enter the paper title (use Look up to auto-fill).");
      if (!fa) return setErr("Enter the first author (use Look up to auto-fill).");
      const v = classifier.getValue();
      if (!v.categories.length) return setErr("Pick at least one initial category.");
      if (!requireAuth(setErr)) return;

      submit.disabled = true;
      // Live duplicate check against the database right before inserting.
      const existing = store.findPaperByDoi ? await store.findPaperByDoi(doi) : null;
      if (existing) { submit.disabled = false; return setErrNode(dupNode(existing)); }

      const yr = year.value ? Number(year.value) : null;
      const authorCount = lastLookup && lastLookup.doi === doi ? lastLookup.authorCount : null;
      const label = BID.doi.makeLabel(fa, yr, authorCount);

      try {
        const id = await store.addPaper({
          doi: doi, title: ttl, firstAuthor: fa, label: label, year: yr,
          link: "https://doi.org/" + doi, blurb: blurb.value,
          x: v.x, y: v.y, categories: v.categories,
          justification: justification.value, author: authorName(),
        });
        close();
        await refresh();
        selectPaper(id);
      } catch (e) {
        submit.disabled = false;
        // The DB unique-DOI index is the final backstop against a race where
        // another user inserted the same paper between our check and insert.
        if (e && e.duplicate) {
          const dup = store.findPaperByDoi ? await store.findPaperByDoi(doi) : null;
          return dup ? setErrNode(dupNode(dup)) : setErr("This paper is already in the atlas.");
        }
        setErr("Could not save the paper. Please try again.");
      }
    });

    const modal = h("div", { class: "bid-modal" }, [
      h("button", { class: "bid-modal-close", text: "×", "aria-label": "Close", onclick: close }),
      h("h2", { text: "Submit a paper" }),
      h("p", { class: "bid-modal-sub", text: "Enter the DOI and press Look up to auto-fill the details, then confirm. Others can debate and re-classify it in the comments." }),
      h("div", { class: "bid-field" }, [
        h("label", { text: "DOI *" }),
        h("div", { class: "bid-doi-row" }, [doiInput, lookupBtn]),
        lookupMsg,
      ]),
      h("div", { class: "bid-field" }, [h("label", { text: "Title *" }), title]),
      h("div", { class: "bid-field" }, [h("label", { text: "First author *" }), firstAuthor]),
      h("div", { class: "bid-field" }, [h("label", { text: "Year" }), year]),
      h("div", { class: "bid-field" }, [h("label", { text: "Short description" }), blurb]),
      h("div", { class: "bid-field" }, [h("label", { text: "Proposed classification *" }), classifier.el]),
      h("div", { class: "bid-field" }, [h("label", { text: "Justification (starts the discussion)" }), justification]),
      err,
      h("div", { class: "bid-form-actions" }, [submit, h("button", { class: "bid-btn bid-btn-ghost", text: "Cancel", onclick: close })]),
    ]);

    const backdrop = h("div", { class: "bid-modal-backdrop", onclick: (e) => { if (e.target === backdrop) close(); } }, [modal]);
    clear(els.modalRoot);
    els.modalRoot.appendChild(backdrop);
    doiInput.focus();
  }

  // ---- orchestration ------------------------------------------------------
  function renderSide() {
    if (S.selectedId) renderDetail();
    else renderList();
  }

  function updateStorageNote() {
    if (store.isStorageHealthy && !store.isStorageHealthy()) {
      els.backendNote.textContent =
        "⚠️ Your browser blocked local storage (private mode or full) — new papers, comments and votes will NOT be saved when you close this tab.";
      els.backendNote.style.background = "#fdecec";
      els.backendNote.style.borderColor = "#f4caca";
    }
  }

  async function refresh() {
    S.papers = await store.getPapers();
    renderPlot();
    renderSide();
    updateStorageNote();
  }

  function selectPaper(id) {
    S.selectedId = id;
    renderPlot(); // update selection highlight
    renderSide();
    if (id) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- backend selection --------------------------------------------------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("failed to load " + src));
      document.head.appendChild(s);
    });
  }

  // Returns the Supabase store if BID_CONFIG has credentials, else the local one.
  async function selectStore() {
    const cfg = global.BID_CONFIG || {};
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && BID.makeSupabaseStore) {
      try {
        if (!global.supabase) {
          await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
        }
        const client = global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        return BID.makeSupabaseStore(client);
      } catch (e) {
        console.error("Supabase init failed; falling back to local store:", e);
        return BID.store;
      }
    }
    return BID.store; // localStorage prototype
  }

  // ---- identity bar (header) ---------------------------------------------
  function renderIdentityBar() {
    const idLabel = document.querySelector(".bid-identity");
    const resetBtn = document.getElementById("bid-reset-btn");
    const userInput = document.getElementById("bid-user");
    const submitBtn = document.getElementById("bid-submit-btn");

    if (!store.supportsAuth) {
      if (userInput) {
        userInput.value = store.getUser();
        userInput.onchange = () => store.setUser(userInput.value.trim());
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.title = ""; }
      return;
    }

    // Shared backend: replace the display-name input with sign-in/out.
    if (idLabel) idLabel.style.display = "none";
    if (resetBtn) resetBtn.style.display = "none";

    let authBox = document.getElementById("bid-auth");
    if (!authBox) {
      authBox = h("div", { id: "bid-auth", class: "bid-auth" });
      const actions = document.querySelector(".bid-header-actions");
      actions.insertBefore(authBox, document.getElementById("bid-submit-btn"));
    }
    clear(authBox);
    const id = authIdentity();
    // Can't submit a paper until signed in.
    if (submitBtn) {
      submitBtn.disabled = !id;
      submitBtn.title = id ? "" : "Sign in to submit a paper";
    }
    if (id) {
      authBox.appendChild(h("span", { class: "bid-auth-name", text: "Signed in as " + id.name }));
      authBox.appendChild(h("button", { class: "bid-btn bid-btn-ghost", text: "Sign out", onclick: () => store.signOut() }));
    } else {
      authBox.appendChild(h("span", { class: "bid-hint", text: "Sign in to contribute:" }));
      authBox.appendChild(h("button", { class: "bid-btn", text: "Google", onclick: () => store.signIn("google") }));
    }
  }

  // ---- boot ---------------------------------------------------------------
  async function boot() {
    store = await selectStore();
    await store.ready();

    els.backendNote.textContent = store.supportsAuth
      ? "Backend: shared database (Supabase). Sign in to submit papers, comment, and vote — everyone sees the same atlas."
      : "Backend: local prototype (browser storage). Your submissions and comments are saved only in this browser for now.";

    renderIdentityBar();
    if (store.onAuthChange) store.onAuthChange(() => { renderIdentityBar(); refresh(); });

    document.getElementById("bid-submit-btn").addEventListener("click", openSubmitModal);
    document.getElementById("bid-reset-btn").addEventListener("click", async () => {
      if (confirm("Reset the atlas back to the seed papers from Fig. 2? This clears all locally-added papers and comments.")) {
        await store.resetToSeed();
        S.selectedId = null;
        refresh();
      }
    });

    renderLegend();
    await refresh();
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window);
