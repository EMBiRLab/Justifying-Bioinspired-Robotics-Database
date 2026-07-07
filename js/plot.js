/* ============================================================================
 * plot.js — The interactive "Figure 2" map (dependency-free SVG)
 *
 * Renders every paper as a point whose position is the community-averaged
 * (x, y) and whose color is its top-voted category. Hovering shows a tooltip;
 * clicking selects a paper (onSelect callback).
 * ==========================================================================*/

(function (global) {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const VIEW = { w: 760, h: 560 };
  const M = { top: 34, right: 24, bottom: 54, left: 64 };
  const PLOT = {
    x: M.left,
    y: M.top,
    w: VIEW.w - M.left - M.right,
    h: VIEW.h - M.top - M.bottom,
  };

  function el(name, attrs, text) {
    const n = document.createElementNS(SVGNS, name);
    if (attrs) {
      for (const k in attrs) n.setAttribute(k, attrs[k]);
    }
    if (text != null) n.textContent = text;
    return n;
  }

  // data (x,y) in [0,1] -> pixel coordinates. y is inverted (1 = top).
  function px(x) {
    return PLOT.x + x * PLOT.w;
  }
  function py(y) {
    return PLOT.y + (1 - y) * PLOT.h;
  }

  const Plot = {
    /**
     * @param {HTMLElement} container
     * @param {Array} papers  decorated papers (with .position, .topCategory…)
     * @param {Object} opts    { selectedId, onSelect(id) }
     */
    render(container, papers, opts) {
      opts = opts || {};
      const cats = global.BID.CATEGORIES;
      const catById = global.BID.CATEGORY_BY_ID;
      const AX = global.BID.AXES;

      container.innerHTML = "";
      container.style.position = "relative";

      const svg = el("svg", {
        viewBox: "0 0 " + VIEW.w + " " + VIEW.h,
        class: "bid-plot-svg",
        role: "img",
        "aria-label": "Map of papers by engagement with biology and contribution type",
      });

      // --- plot frame ---
      svg.appendChild(
        el("rect", {
          x: PLOT.x,
          y: PLOT.y,
          width: PLOT.w,
          height: PLOT.h,
          class: "bid-plot-frame",
        })
      );

      // --- quadrant guide lines (mid axes) ---
      svg.appendChild(
        el("line", {
          x1: px(0.5), y1: PLOT.y, x2: px(0.5), y2: PLOT.y + PLOT.h,
          class: "bid-plot-grid",
        })
      );
      svg.appendChild(
        el("line", {
          x1: PLOT.x, y1: py(0.5), x2: PLOT.x + PLOT.w, y2: py(0.5),
          class: "bid-plot-grid",
        })
      );

      // --- faint category labels at their centroids ---
      cats.forEach((c) => {
        const t = el(
          "text",
          {
            x: px(c.centroid.x),
            y: py(c.centroid.y),
            class: "bid-cat-label",
            fill: c.color,
            "text-anchor": "middle",
          },
          c.name
        );
        svg.appendChild(t);
      });

      // --- axis titles ---
      // x axis
      svg.appendChild(
        el("text", { x: PLOT.x, y: VIEW.h - 28, class: "bid-axis-end", "text-anchor": "start" }, "← " + AX.x.low)
      );
      svg.appendChild(
        el("text", { x: PLOT.x + PLOT.w, y: VIEW.h - 28, class: "bid-axis-end", "text-anchor": "end" }, AX.x.high + " →")
      );
      svg.appendChild(
        el("text", { x: PLOT.x + PLOT.w / 2, y: VIEW.h - 10, class: "bid-axis-title", "text-anchor": "middle" }, AX.x.label)
      );
      // y axis (rotated)
      const yt = el(
        "text",
        { x: 16, y: PLOT.y + PLOT.h / 2, class: "bid-axis-title", "text-anchor": "middle", transform: "rotate(-90 16 " + (PLOT.y + PLOT.h / 2) + ")" },
        AX.y.label
      );
      svg.appendChild(yt);
      svg.appendChild(
        el("text", { x: 30, y: PLOT.y + PLOT.h - 4, class: "bid-axis-end", "text-anchor": "middle", transform: "rotate(-90 30 " + (PLOT.y + PLOT.h - 4) + ")" }, AX.y.low)
      );
      svg.appendChild(
        el("text", { x: 30, y: PLOT.y + 4, class: "bid-axis-end", "text-anchor": "middle", transform: "rotate(-90 30 " + (PLOT.y + 4) + ")" }, AX.y.high)
      );

      // --- tooltip element ---
      const tip = document.createElement("div");
      tip.className = "bid-plot-tip";
      tip.style.display = "none";
      container.appendChild(tip);

      function showTip(html, cx, cy) {
        tip.innerHTML = html;
        tip.style.display = "block";
        // position relative to container using the SVG's on-screen scale
        const rect = svg.getBoundingClientRect();
        const scaleX = rect.width / VIEW.w;
        const scaleY = rect.height / VIEW.h;
        tip.style.left = cx * scaleX + 12 + "px";
        tip.style.top = cy * scaleY - 10 + "px";
      }
      function hideTip() {
        tip.style.display = "none";
      }

      // --- points ---
      const withPos = papers.filter((p) => p.position);
      withPos.forEach((p) => {
        const color = p.topCategory ? catById[p.topCategory].color : "#999";
        const r = 6 + Math.min(6, (p.suggestionCount - 1) * 1.2);
        const cx = px(p.position.x);
        const cy = py(p.position.y);
        const isSel = opts.selectedId === p.id;

        const dot = el("circle", {
          cx,
          cy,
          r,
          fill: color,
          class: "bid-dot" + (isSel ? " is-selected" : ""),
          "data-id": p.id,
          tabindex: "0",
          role: "button",
          "aria-label": p.label,
        });

        const topName = p.topCategory ? catById[p.topCategory].name : "unclassified";
        const tipHtml =
          "<strong>" + escapeHtml(p.label) + "</strong><br>" +
          '<span style="color:' + color + '">●</span> ' + escapeHtml(topName) +
          "<br><span class='bid-tip-meta'>" + p.suggestionCount +
          " classification" + (p.suggestionCount === 1 ? "" : "s") + " · " +
          p.commentCount + " comment" + (p.commentCount === 1 ? "" : "s") + "</span>";

        dot.addEventListener("mouseenter", () => showTip(tipHtml, cx, cy));
        dot.addEventListener("mousemove", () => showTip(tipHtml, cx, cy));
        dot.addEventListener("mouseleave", hideTip);
        dot.addEventListener("click", () => {
          hideTip();
          if (opts.onSelect) opts.onSelect(p.id);
        });
        dot.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (opts.onSelect) opts.onSelect(p.id);
          }
        });
        svg.appendChild(dot);
      });

      container.appendChild(svg);
    },
  };

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  global.BID = global.BID || {};
  global.BID.Plot = Plot;
})(window);
