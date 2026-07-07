/* ============================================================================
 * doi.js — DOI validation + Crossref metadata lookup
 *
 * Crossref's REST API is free, needs no key, and sends permissive CORS headers,
 * so it works from a static page (including file://). We include a mailto for
 * the "polite pool" per Crossref etiquette.
 *
 * Exposes BID.doi = { normalizeDoi, lookupDoi, makeLabel }.
 * ==========================================================================*/

(function (global) {
  "use strict";

  const MAILTO = "taliaym@umich.edu";

  // Accepts a bare DOI, a doi: prefix, or a doi.org URL. Returns the bare DOI
  // (e.g. "10.1073/pnas.1910837117") or null if it isn't shaped like a DOI.
  function normalizeDoi(s) {
    s = String(s || "").trim();
    s = s.replace(/^\s*doi:\s*/i, "");
    s = s.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    s = s.trim();
    return /^10\.\d{4,9}\/\S+$/.test(s) ? s : null;
  }

  // Compact citation label used across the UI, e.g. "Kriegman et al. (2020)".
  function makeLabel(firstAuthor, year, authorCount) {
    const a = String(firstAuthor || "").trim();
    if (!a) return year ? "(" + year + ")" : "Untitled";
    const etal = authorCount === 1 ? "" : " et al.";
    return a + etal + (year ? " (" + year + ")" : "");
  }

  async function lookupDoi(rawDoi) {
    const doi = normalizeDoi(rawDoi);
    if (!doi) throw new Error("That doesn't look like a DOI (expected e.g. 10.1234/abcd).");
    const url =
      "https://api.crossref.org/works/" + encodeURIComponent(doi) +
      "?mailto=" + encodeURIComponent(MAILTO);
    let res;
    try {
      res = await fetch(url, { headers: { Accept: "application/json" } });
    } catch (e) {
      throw new Error("Could not reach the DOI service (offline?). You can type the details in manually.");
    }
    if (res.status === 404) throw new Error("No paper found for that DOI. Check it, or type the details in manually.");
    if (!res.ok) throw new Error("DOI lookup failed (HTTP " + res.status + "). Try again, or type the details in manually.");
    const data = await res.json();
    const m = data.message || {};
    const authors = (m.author || []).map((a) => ({
      family: a.family || "", given: a.given || "", seq: a.sequence,
    }));
    const first = authors.filter((a) => a.seq === "first")[0] || authors[0];
    const firstAuthor = first ? (first.family || first.given || "") : "";
    const dp =
      (m.issued && m.issued["date-parts"] && m.issued["date-parts"][0]) ||
      (m.published && m.published["date-parts"] && m.published["date-parts"][0]) ||
      (m["published-print"] && m["published-print"]["date-parts"] && m["published-print"]["date-parts"][0]) ||
      [];
    return {
      doi: doi,
      title: (m.title && m.title[0]) || "",
      firstAuthor: firstAuthor,
      year: dp[0] || null,
      journal: (m["container-title"] && m["container-title"][0]) || "",
      authorCount: authors.length,
      type: m.type || "",
    };
  }

  global.BID = global.BID || {};
  global.BID.doi = { normalizeDoi, lookupDoi, makeLabel };
})(window);
