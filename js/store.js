/* ============================================================================
 * store.js — Data-access layer (localStorage implementation)
 *
 * Every method is async (returns a Promise) even though localStorage is
 * synchronous. This is deliberate: the Supabase-backed store has the exact
 * same method signatures but is genuinely async, so swapping the backend
 * later requires NO changes in app.js — just point BID.store at the other
 * implementation. See supabase/schema.sql and README.md.
 *
 * Data model
 *   paper       { id, label, year, link, blurb, author, createdAt, seed }
 *   comment     { id, paperId, parentId, body, author, createdAt,
 *                 voters:{userId:±1}, deleted }
 *   suggestion  { id, paperId, commentId|null, x, y, categories:[id], author,
 *                 createdAt }
 *
 * A paper's plotted position is the MEAN of all its suggestions' (x,y).
 * Its category tally counts every category tag across all suggestions.
 * ==========================================================================*/

(function (global) {
  "use strict";

  const KEY = "bid_state_v1";
  const USER_KEY = "bid_user_v1";

  let _id = 0;
  function uid(prefix) {
    _id += 1;
    return prefix + "_" + Date.now().toString(36) + "_" + _id.toString(36);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function defer(value) {
    // Mimic an async backend so the UI code is identical for Supabase.
    return new Promise((resolve) => setTimeout(() => resolve(value), 0));
  }

  // ---- Persistence --------------------------------------------------------
  let state = null;
  let storageHealthy = true; // flips false if a write ever fails (quota / private mode)

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      storageHealthy = true;
      return true;
    } catch (e) {
      console.warn("Could not persist state:", e);
      storageHealthy = false; // surfaced by the UI as a visible warning
      return false;
    }
  }

  function seedState() {
    const papers = [];
    const comments = [];
    const suggestions = [];
    (global.BID.SEED_PAPERS || []).forEach((sp) => {
      papers.push({
        id: sp.id,
        label: sp.label,
        year: sp.year,
        link: sp.link || "",
        blurb: sp.blurb || "",
        author: "seed",
        createdAt: nowISO(),
        seed: true,
      });
      if (sp.seedSuggestion) {
        suggestions.push({
          id: uid("sg"),
          paperId: sp.id,
          commentId: null,
          x: sp.seedSuggestion.x,
          y: sp.seedSuggestion.y,
          categories: sp.seedSuggestion.categories.slice(),
          author: "seed",
          createdAt: nowISO(),
        });
      }
    });
    return { version: 1, papers, comments, suggestions };
  }

  function load() {
    if (state) return state;
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      raw = null;
    }
    if (raw) {
      try {
        state = JSON.parse(raw);
      } catch (e) {
        state = null;
      }
    }
    // Validate ALL collections — a partial/old-schema blob (papers present but
    // comments/suggestions missing) would otherwise crash decoratePaper().
    if (
      !state ||
      !Array.isArray(state.papers) ||
      !Array.isArray(state.comments) ||
      !Array.isArray(state.suggestions)
    ) {
      state = seedState();
      persist();
    }
    return state;
  }

  // ---- Derived values -----------------------------------------------------
  function clamp01(v) {
    v = Number(v);
    if (isNaN(v)) return 0.5;
    return Math.max(0, Math.min(1, v));
  }

  function decoratePaper(paper) {
    const sgs = state.suggestions.filter((s) => s.paperId === paper.id);
    const n = sgs.length;
    let position = null;
    if (n > 0) {
      const sx = sgs.reduce((a, s) => a + clamp01(s.x), 0);
      const sy = sgs.reduce((a, s) => a + clamp01(s.y), 0);
      position = { x: sx / n, y: sy / n };
    }
    const tally = {};
    sgs.forEach((s) => {
      (s.categories || []).forEach((cid) => {
        tally[cid] = (tally[cid] || 0) + 1;
      });
    });
    // Order categories by the paper.js declaration order for stable tie-breaks.
    const ordered = (global.BID.CATEGORIES || [])
      .map((c) => ({ id: c.id, count: tally[c.id] || 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);
    const topCategory = ordered.length ? ordered[0].id : null;
    const commentCount = state.comments.filter(
      (c) => c.paperId === paper.id && !c.deleted
    ).length;
    return Object.assign({}, paper, {
      position,
      suggestionCount: n,
      commentCount,
      categoryTally: ordered,
      topCategory,
    });
  }

  // ---- Public API ---------------------------------------------------------
  const store = {
    backendName: "Local prototype (browser storage)",

    async ready() {
      load();
      return defer(true);
    },

    isStorageHealthy() {
      return storageHealthy;
    },

    async getPapers() {
      load();
      return defer(state.papers.map(decoratePaper));
    },

    async getPaper(id) {
      load();
      const p = state.papers.find((x) => x.id === id);
      return defer(p ? decoratePaper(p) : null);
    },

    // Case-insensitive DOI lookup for duplicate prevention. Returns {id,label} or null.
    async findPaperByDoi(doi) {
      load();
      const norm = String(doi || "").trim().toLowerCase();
      if (!norm) return defer(null);
      const p = state.papers.find((x) => (x.doi || "").trim().toLowerCase() === norm);
      return defer(p ? { id: p.id, label: p.label } : null);
    },

    // data: { doi, title, firstAuthor, label, year, link, blurb, x, y,
    //         categories:[], justification, author }
    async addPaper(data) {
      load();
      const id = uid("pp");
      const createdAt = nowISO();
      const author = (data.author || "anonymous").trim() || "anonymous";
      state.papers.push({
        id,
        doi: String(data.doi || "").trim(),
        title: String(data.title || "").trim(),
        firstAuthor: String(data.firstAuthor || "").trim(),
        label: String(data.label || "").trim(),
        year: data.year ? Number(data.year) : null,
        link: String(data.link || "").trim(),
        blurb: String(data.blurb || "").trim(),
        author,
        createdAt,
        seed: false,
      });
      // The submitter's initial classification is the paper's first suggestion.
      state.suggestions.push({
        id: uid("sg"),
        paperId: id,
        commentId: null,
        x: clamp01(data.x),
        y: clamp01(data.y),
        categories: (data.categories || []).slice(),
        author,
        createdAt,
      });
      // Their justification becomes the opening comment of the thread.
      if (data.justification && data.justification.trim()) {
        state.comments.push({
          id: uid("cm"),
          paperId: id,
          parentId: null,
          body: data.justification.trim(),
          author,
          createdAt,
          voters: {},
          deleted: false,
        });
      }
      persist();
      return defer(id);
    },

    async getComments(paperId) {
      load();
      return defer(
        state.comments
          .filter((c) => c.paperId === paperId)
          .map((c) => Object.assign({}, c))
      );
    },

    async getSuggestions(paperId) {
      load();
      return defer(
        state.suggestions
          .filter((s) => s.paperId === paperId)
          .map((s) => Object.assign({}, s))
      );
    },

    // data: { paperId, parentId, body, author, suggestion?:{x,y,categories} }
    async addComment(data) {
      load();
      const id = uid("cm");
      const createdAt = nowISO();
      const author = (data.author || "anonymous").trim() || "anonymous";
      state.comments.push({
        id,
        paperId: data.paperId,
        parentId: data.parentId || null,
        body: String(data.body || "").trim(),
        author,
        createdAt,
        voters: {},
        deleted: false,
      });
      if (data.suggestion) {
        state.suggestions.push({
          id: uid("sg"),
          paperId: data.paperId,
          commentId: id,
          x: clamp01(data.suggestion.x),
          y: clamp01(data.suggestion.y),
          categories: (data.suggestion.categories || []).slice(),
          author,
          createdAt,
        });
      }
      persist();
      return defer(id);
    },

    async voteComment(commentId, userId, dir) {
      load();
      const c = state.comments.find((x) => x.id === commentId);
      if (!c) return defer(null);
      c.voters = c.voters || {};
      if (dir === 0 || c.voters[userId] === dir) {
        delete c.voters[userId]; // toggle off
      } else {
        c.voters[userId] = dir; // 1 or -1
      }
      persist();
      return defer(Object.assign({}, c));
    },

    async deleteComment(commentId, userId) {
      load();
      const c = state.comments.find((x) => x.id === commentId);
      if (!c || c.author !== userId) return defer(false);
      c.deleted = true;
      c.body = "";
      // Drop the classification this comment contributed, so a deleted comment
      // no longer skews the paper's averaged map position.
      state.suggestions = state.suggestions.filter((s) => s.commentId !== commentId);
      persist();
      return defer(true);
    },

    async resetToSeed() {
      state = seedState();
      persist();
      return defer(true);
    },

    // ---- lightweight identity (prototype stand-in for Google/ORCID) -------
    getUser() {
      try {
        return localStorage.getItem(USER_KEY) || "";
      } catch (e) {
        return "";
      }
    },
    setUser(name) {
      try {
        localStorage.setItem(USER_KEY, name || "");
      } catch (e) {}
    },
  };

  global.BID = global.BID || {};
  global.BID.store = store;
})(window);
