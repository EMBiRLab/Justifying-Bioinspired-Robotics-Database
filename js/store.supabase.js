/* ============================================================================
 * store.supabase.js — Shared-database backend (Supabase)
 *
 * Exposes BID.makeSupabaseStore(client), returning an object with the SAME
 * method signatures as js/store.js, plus auth helpers. app.js talks to whichever
 * store is active without caring which one it is.
 *
 * Requires the Supabase JS client (loaded on demand by app.js when
 * BID_CONFIG has a url + anon key). Schema: supabase/schema.sql.
 *
 * Snake_case columns (paper_id, created_at, …) are mapped to the camelCase
 * shape app.js expects (paperId, createdAt, …) on the way out.
 * ==========================================================================*/

(function (global) {
  "use strict";

  function makeSupabaseStore(client) {
    let identity = null; // { id, name } of the signed-in user, or null
    const authListeners = [];

    function userFromSession(session) {
      if (!session || !session.user) return null;
      const u = session.user;
      const meta = u.user_metadata || {};
      const name =
        meta.full_name || meta.name || meta.preferred_username || u.email || "member";
      return { id: u.id, name: name };
    }

    function notifyAuth() {
      authListeners.forEach((cb) => {
        try { cb(identity); } catch (e) {}
      });
    }

    // Keep `identity` current.
    client.auth.getSession().then(({ data }) => {
      identity = userFromSession(data && data.session);
      notifyAuth();
    });
    client.auth.onAuthStateChange((_event, session) => {
      identity = userFromSession(session);
      notifyAuth();
    });

    function requireUser() {
      if (!identity) throw new Error("Please sign in to do that.");
      return identity;
    }

    // ---- decorate a paper into app.js's expected shape --------------------
    function decorate(paper, pos, tallyRows) {
      const rows = (tallyRows || []).slice().sort((a, b) => b.votes - a.votes);
      // stable order by the declared category order for ties
      const order = {};
      (global.BID.CATEGORIES || []).forEach((c, i) => (order[c.id] = i));
      rows.sort((a, b) => (b.votes - a.votes) || (order[a.category_id] - order[b.category_id]));
      const categoryTally = rows.map((r) => ({ id: r.category_id, count: r.votes }));
      const topCategory = categoryTally.length ? categoryTally[0].id : null;
      const hasPos = pos && pos.x != null && pos.y != null && (pos.suggestion_count || 0) > 0;
      return {
        id: paper.id,
        doi: paper.doi || "",
        title: paper.title || "",
        firstAuthor: paper.first_author || "",
        label: paper.label,
        year: paper.year,
        link: paper.link || "",
        blurb: paper.blurb || "",
        author: paper.author_name || "member",
        authorId: paper.author_id,
        createdAt: paper.created_at,
        seed: !!paper.seed,
        position: hasPos ? { x: pos.x, y: pos.y } : null,
        suggestionCount: pos ? pos.suggestion_count || 0 : 0,
        commentCount: pos ? pos.comment_count || 0 : 0,
        categoryTally: categoryTally,
        topCategory: topCategory,
      };
    }

    const store = {
      backendName: "Supabase (shared database)",
      supportsAuth: true,

      async ready() {
        // make sure we've resolved the initial session before first render
        const { data } = await client.auth.getSession();
        identity = userFromSession(data && data.session);
        return true;
      },

      isStorageHealthy() { return true; },

      // ---- auth -----------------------------------------------------------
      getIdentity() { return identity; },
      onAuthChange(cb) { authListeners.push(cb); },
      async signIn(provider) {
        // provider: 'google' or 'orcid' (ORCID configured as a custom OIDC
        // provider in the Supabase dashboard).
        return client.auth.signInWithOAuth({
          provider: provider,
          options: { redirectTo: global.location.href.split("#")[0] },
        });
      },
      async signOut() { return client.auth.signOut(); },

      // ---- reads ----------------------------------------------------------
      async getPapers() {
        const [papersRes, posRes, tallyRes] = await Promise.all([
          client.from("papers").select("*"),
          client.from("paper_positions").select("*"),
          client.from("paper_category_tally").select("*"),
        ]);
        const papers = papersRes.data || [];
        const posBy = {};
        (posRes.data || []).forEach((p) => (posBy[p.paper_id] = p));
        const tallyBy = {};
        (tallyRes.data || []).forEach((t) => {
          (tallyBy[t.paper_id] = tallyBy[t.paper_id] || []).push(t);
        });
        return papers.map((p) => decorate(p, posBy[p.id], tallyBy[p.id]));
      },

      async getPaper(id) {
        const [paperRes, posRes, tallyRes] = await Promise.all([
          client.from("papers").select("*").eq("id", id).maybeSingle(),
          client.from("paper_positions").select("*").eq("paper_id", id).maybeSingle(),
          client.from("paper_category_tally").select("*").eq("paper_id", id),
        ]);
        if (!paperRes.data) return null;
        return decorate(paperRes.data, posRes.data, tallyRes.data);
      },

      // Case-insensitive DOI lookup for duplicate prevention (ilike w/ no
      // wildcards = exact, case-insensitive). Returns {id,label} or null.
      async findPaperByDoi(doi) {
        const d = String(doi || "").trim();
        if (!d) return null;
        const { data } = await client
          .from("papers").select("id,label").ilike("doi", d).limit(1);
        return data && data[0] ? data[0] : null;
      },

      async getComments(paperId) {
        const { data: comments } = await client
          .from("comments").select("*").eq("paper_id", paperId);
        const list = comments || [];
        // attach a voters map per comment (built from the votes table)
        const ids = list.map((c) => c.id);
        let votes = [];
        if (ids.length) {
          const res = await client.from("votes").select("*").in("comment_id", ids);
          votes = res.data || [];
        }
        const votersBy = {};
        votes.forEach((v) => {
          (votersBy[v.comment_id] = votersBy[v.comment_id] || {})[v.user_id] = v.dir;
        });
        return list.map((c) => ({
          id: c.id,
          paperId: c.paper_id,
          parentId: c.parent_id,
          body: c.body,
          author: c.author_name || "member",
          authorId: c.author_id,
          createdAt: c.created_at,
          deleted: c.deleted,
          voters: votersBy[c.id] || {},
        }));
      },

      async getSuggestions(paperId) {
        const { data } = await client
          .from("suggestions").select("*").eq("paper_id", paperId);
        return (data || []).map((s) => ({
          id: s.id,
          paperId: s.paper_id,
          commentId: s.comment_id,
          x: s.x,
          y: s.y,
          categories: s.categories || [],
          author: s.author_name || "member",
          authorId: s.author_id,
          createdAt: s.created_at,
        }));
      },

      // ---- writes (all require a signed-in user; RLS enforces ownership) --
      async addPaper(data) {
        const u = requireUser();
        const { data: paper, error } = await client
          .from("papers")
          .insert({
            doi: String(data.doi || "").trim() || null,
            title: String(data.title || "").trim(),
            first_author: String(data.firstAuthor || "").trim(),
            label: String(data.label || "").trim(),
            year: data.year ? Number(data.year) : null,
            link: String(data.link || "").trim(),
            blurb: String(data.blurb || "").trim(),
            author_id: u.id,
            author_name: u.name,
          })
          .select().single();
        if (error) {
          // 23505 = unique_violation on the papers_doi_unique index
          if (error.code === "23505") throw Object.assign(new Error("duplicate"), { duplicate: true });
          throw error;
        }
        await client.from("suggestions").insert({
          paper_id: paper.id, comment_id: null,
          x: data.x, y: data.y, categories: data.categories || [],
          author_id: u.id, author_name: u.name,
        });
        if (data.justification && data.justification.trim()) {
          await client.from("comments").insert({
            paper_id: paper.id, parent_id: null,
            body: data.justification.trim(), author_id: u.id, author_name: u.name,
          });
        }
        return paper.id;
      },

      async addComment(data) {
        const u = requireUser();
        const { data: c, error } = await client
          .from("comments")
          .insert({
            paper_id: data.paperId, parent_id: data.parentId || null,
            body: String(data.body || "").trim(),
            author_id: u.id, author_name: u.name,
          })
          .select().single();
        if (error) throw error;
        if (data.suggestion) {
          await client.from("suggestions").insert({
            paper_id: data.paperId, comment_id: c.id,
            x: data.suggestion.x, y: data.suggestion.y,
            categories: data.suggestion.categories || [],
            author_id: u.id, author_name: u.name,
          });
        }
        return c.id;
      },

      async voteComment(commentId, userId, dir) {
        const u = requireUser();
        const { data: existing } = await client
          .from("votes").select("dir")
          .eq("comment_id", commentId).eq("user_id", u.id).maybeSingle();
        if (dir === 0 || (existing && existing.dir === dir)) {
          await client.from("votes").delete()
            .eq("comment_id", commentId).eq("user_id", u.id);
        } else {
          await client.from("votes")
            .upsert({ comment_id: commentId, user_id: u.id, dir: dir });
        }
        return true;
      },

      async deleteComment(commentId /*, userId */) {
        requireUser(); // RLS ensures only the author's row is affected
        await client.from("comments")
          .update({ deleted: true, body: "" }).eq("id", commentId);
        await client.from("suggestions").delete().eq("comment_id", commentId);
        return true;
      },

      // Edit own paper metadata. RLS ("papers update own") ensures a user can
      // only touch their own row and can't reassign ownership.
      // fields.suggestion revises the submitter's original classification:
      // object = replace, null = remove, undefined = untouched.
      async updatePaper(id, fields /*, userId */) {
        const u = requireUser();
        const patch = {};
        if ("doi" in fields) patch.doi = String(fields.doi || "").trim() || null;
        if ("title" in fields) patch.title = String(fields.title || "").trim();
        if ("firstAuthor" in fields) patch.first_author = String(fields.firstAuthor || "").trim();
        if ("label" in fields) patch.label = String(fields.label || "").trim();
        if ("link" in fields) patch.link = String(fields.link || "").trim();
        if ("blurb" in fields) patch.blurb = String(fields.blurb || "").trim();
        if ("year" in fields) patch.year = fields.year ? Number(fields.year) : null;
        if (Object.keys(patch).length) {
          const { error } = await client.from("papers").update(patch).eq("id", id);
          if (error) {
            if (error.code === "23505") throw Object.assign(new Error("duplicate"), { duplicate: true });
            throw error;
          }
        }
        if ("suggestion" in fields) {
          // The live RLS policies allow insert-own and delete-own on
          // suggestions (no update policy), so revise = delete + re-insert.
          await client.from("suggestions").delete()
            .eq("paper_id", id).is("comment_id", null).eq("author_id", u.id);
          if (fields.suggestion) {
            const { error } = await client.from("suggestions").insert({
              paper_id: id, comment_id: null,
              x: fields.suggestion.x, y: fields.suggestion.y,
              categories: fields.suggestion.categories || [],
              author_id: u.id, author_name: u.name,
            });
            if (error) throw error;
          }
        }
        return true;
      },

      // Edit own comment body. RLS ("comments update own") enforces ownership.
      // fields.suggestion revises the comment's attached classification
      // (object = replace, null = remove, undefined = untouched); the app
      // passes fields.paperId alongside so the re-insert can reference it.
      async updateComment(id, fields /*, userId */) {
        const u = requireUser();
        if ("body" in fields) {
          const { error } = await client.from("comments")
            .update({ body: String(fields.body || "").trim() }).eq("id", id);
          if (error) throw error;
        }
        if ("suggestion" in fields) {
          await client.from("suggestions").delete()
            .eq("comment_id", id).eq("author_id", u.id);
          if (fields.suggestion) {
            const { error } = await client.from("suggestions").insert({
              paper_id: fields.paperId, comment_id: id,
              x: fields.suggestion.x, y: fields.suggestion.y,
              categories: fields.suggestion.categories || [],
              author_id: u.id, author_name: u.name,
            });
            if (error) throw error;
          }
        }
        return true;
      },

      // ---- prototype-only helpers: no-ops on the shared DB ----------------
      async resetToSeed() { return false; },
      getUser() { return identity ? identity.name : ""; },
      setUser() { /* identity comes from auth */ },
    };

    return store;
  }

  global.BID = global.BID || {};
  global.BID.makeSupabaseStore = makeSupabaseStore;
})(window);
