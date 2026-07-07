/* ============================================================================
 * data.js — Taxonomy definitions and seed papers
 *
 * The taxonomy follows Zhang, Ting & Moore (2026), "Justifying bio-inspired
 * robotics research: A taxonomy of strategies."
 *
 * Plot axes (Fig. 2 of the paper):
 *   x  : 0.0 = purely Scientific contribution ... 1.0 = purely Engineering
 *   y  : 0.0 = low Engagement with Biology     ... 1.0 = high Engagement
 *
 * Everything here is *seed* data. Positions and category tallies are meant to
 * be overwritten by the community: each classification suggestion a user adds
 * (on submission, or in a comment) contributes an (x, y) point and a set of
 * category tags. A paper's plotted position is the mean of all such points.
 * ==========================================================================*/

(function (global) {
  "use strict";

  // ---- The two axes of Figure 2 -------------------------------------------
  const AXES = {
    x: { label: "Contribution", low: "Science", high: "Engineering" },
    y: { label: "Engagement with Biology", low: "Low", high: "High" },
  };

  // ---- The seven taxonomic categories -------------------------------------
  // `centroid` is where the category label floats on the map and where new
  // suggestions default their slider — it is a visual hint, not a constraint.
  const CATEGORIES = [
    {
      id: "task",
      name: "Task Bio-inspiration",
      color: "#E07B39",
      centroid: { x: 0.80, y: 0.30 },
      blurb:
        "A biological behavior or capability is the motivating goal, but the " +
        "design uses an independent mechanism. Biology serves as an existence " +
        "proof that the task is possible; it informs the goal, not the how.",
    },
    {
      id: "mechanistic",
      name: "Mechanistic Bio-Informed Design",
      color: "#2E7D5B",
      centroid: { x: 0.55, y: 0.74 },
      blurb:
        "A well-characterized biological mechanism is understood, abstracted, " +
        "and translated into an engineered system to enhance performance or " +
        "confer new capabilities. Each design decision is traceable to biology.",
    },
    {
      id: "reductionist",
      name: "Reductionist Biomimicry",
      color: "#7B5EA7",
      centroid: { x: 0.72, y: 0.66 },
      blurb:
        "Closely mirrors the structures of a biological system without " +
        "identifying the mechanistic principle behind their function. Strongest " +
        "when used iteratively as an experimental platform.",
    },
    {
      id: "perceptual",
      name: "Perceptual Biomimicry",
      color: "#C0397A",
      centroid: { x: 0.60, y: 0.44 },
      blurb:
        "The biological presentation of the design is the primary objective. " +
        "Success means the design is perceived as biological or naturalistic " +
        "by its intended audience — the presentation is the function.",
    },
    {
      id: "rep",
      name: "Robotic Experimental Platform",
      color: "#2F6DB5",
      centroid: { x: 0.18, y: 0.60 },
      blurb:
        "A robotic or mechanical surrogate replaces live animals to isolate and " +
        "study specific properties (morphology, kinematics, behavior) under " +
        "repeatable conditions to test scientific hypotheses.",
    },
    {
      id: "bioexploitation",
      name: "Bioexploitation",
      color: "#4FA3A5",
      centroid: { x: 0.32, y: 0.90 },
      blurb:
        "Directly incorporates biological material — living tissue or deceased " +
        "appendages — into engineered systems. Exploits biology's small-scale " +
        "manufacturing and pre-integrated components (e.g., bio-hybrid robots).",
    },
    {
      id: "backspiration",
      name: "Backspiration",
      color: "#8A8D91",
      centroid: { x: 0.86, y: 0.12 },
      blurb:
        "The 'bio-inspired' label is applied retroactively rather than arising " +
        "from the design process — a post-hoc analogy or visibility keyword " +
        "where biology did not substantively shape the engineering decisions.",
    },
  ];

  const CATEGORY_BY_ID = {};
  CATEGORIES.forEach((c) => (CATEGORY_BY_ID[c.id] = c));

  // ---- Seed papers (drawn from Fig. 2 of the review) ----------------------
  // Each paper carries an initial "seed" suggestion so the map is populated on
  // first load. `blurb` is a short editable descriptor, not an exact title.
  // p() = helper to build a seed paper with one seed suggestion.
  function p(id, label, year, cats, x, y, blurb) {
    return {
      id,
      label, // e.g. "Kriegman et al. (2020)"
      year,
      link: "",
      blurb: blurb || "Seed example from Fig. 2 of the review.",
      seed: true,
      seedSuggestion: { x, y, categories: cats },
    };
  }

  const SEED_PAPERS = [
    // --- Robotic Experimental Platform ---
    p("vanatter2026", "VanAtter et al. (2026)", 2026, ["rep"], 0.15, 0.58,
      "Robo-physical model used as an experimental platform."),
    p("libby2012", "Libby et al. (2012)", 2012, ["rep", "mechanistic"], 0.34, 0.70,
      "Tail-assisted aerial righting; both a platform and a mechanistic model."),
    p("steinhardt2021", "Steinhardt et al. (2021)", 2021, ["rep"], 0.20, 0.55,
      "Robotic platform probing form–function relationships."),
    p("cieply2026", "Cieply & Moore (2026)", 2026, ["rep"], 0.12, 0.63,
      "Robotic model organism for controlled locomotion experiments."),
    p("zhang2023", "Zhang et al. (2023)", 2023, ["rep"], 0.16, 0.66,
      "Robo-physical model for form–function study."),
    p("sponberg2015", "Sponberg et al. (2015)", 2015, ["rep"], 0.22, 0.61,
      "Robotic platform investigating biophysical mechanisms."),
    p("dufour2020", "Dufour et al. (2020)", 2020, ["rep", "perceptual"], 0.30, 0.50,
      "Robotic surrogate used in behavioral experiments."),
    p("patricelli2010", "Patricelli & Krakauer (2010)", 2010, ["rep", "perceptual"], 0.36, 0.48,
      "Robotic female sage grouse used to study courtship behavior."),
    p("danforth2020", "Danforth et al. (2020)", 2020, ["rep", "perceptual"], 0.40, 0.52,
      "Robotic model organism for behavioral and evolutionary experiments."),
    p("hannaford1995", "Hannaford et al. (1995)", 1995, ["rep", "reductionist"], 0.32, 0.64,
      "Anthroform biorobotic arm; a reductionist model used as a platform."),
    p("nyakatura2019", "Nyakatura et al. (2019)", 2019, ["reductionist", "rep"], 0.42, 0.70,
      "OroBOT — reconstructed locomotion of the extinct tetrapod Orobates."),

    // --- Mechanistic Bio-Informed Design ---
    p("jayaram2016", "Jayaram & Full (2016)", 2016, ["mechanistic", "rep"], 0.48, 0.78,
      "CRAM — cockroach-inspired compressible robot from a body-compliance mechanism."),
    p("saranli2001", "Saranli et al. (2001)", 2001, ["mechanistic"], 0.62, 0.72,
      "RHex — hexapedal runner using a sprawled-posture locomotion principle."),
    p("agerholm1961", "Agerholm & Lord (1961)", 1961, ["mechanistic", "task"], 0.66, 0.68,
      "Early pneumatic artificial muscle actuator."),
    p("kim2008", "Kim et al. (2008)", 2008, ["mechanistic"], 0.58, 0.70,
      "Stickybot — gecko adhesion-inspired climbing robot."),
    p("asbeck2006", "Asbeck et al. (2006)", 2006, ["mechanistic"], 0.60, 0.66,
      "Directional dry-adhesion climbing inspired by gecko/insect attachment."),
    p("ramezani2017", "Ramezani et al. (2017)", 2017, ["mechanistic", "reductionist"], 0.64, 0.74,
      "Bat Bot — flapping-wing MAV replicating bat wing kinematics."),
    p("lynch2002", "Lynch et al. (2002)", 2002, ["mechanistic"], 0.52, 0.70,
      "Mechanism-informed legged/limbed design."),

    // --- Reductionist Biomimicry ---
    p("niikura2022", "Niikura et al. (2022)", 2022, ["reductionist"], 0.72, 0.66,
      "Detailed musculoskeletal replica emphasizing structural fidelity."),

    // --- Perceptual Biomimicry ---
    p("chen2023", "Chen et al. (2023)", 2023, ["perceptual", "rep"], 0.58, 0.50,
      "Robotic stimulus for animal-interaction experiments."),
    p("bingham2024", "Bingham et al. (2024)", 2024, ["perceptual"], 0.70, 0.40,
      "Animatronic figure prioritizing lifelike appearance and motion."),
    p("azocar2018", "Azocar et al. (2018)", 2018, ["perceptual"], 0.64, 0.44,
      "Prosthesis matching natural gait patterns and appearance."),
    p("sansoni2016", "Sansoni et al. (2016)", 2016, ["perceptual"], 0.66, 0.42,
      "Design emphasizing naturalistic perception by an observer."),
    p("zekaria2026", "Zekaria et al. (2026)", 2026, ["perceptual"], 0.60, 0.46,
      "Biological phantom for medical training."),
    p("razoki2025", "Razoki et al. (2025)", 2025, ["perceptual"], 0.72, 0.36,
      "Bio-inspired architectural form emphasizing naturalistic presentation."),
    p("li2025", "Li et al. (2025)", 2025, ["perceptual"], 0.55, 0.42,
      "Laser/hologram visual stimuli of prey and conspecifics presented to fish."),

    // --- Task Bio-inspiration ---
    p("yoo2023", "Yoo et al. (2023)", 2023, ["task"], 0.80, 0.32,
      "Achieves a biologically motivated task with an independent mechanism."),
    p("wang2025", "Wang et al. (2025)", 2025, ["task"], 0.84, 0.28,
      "Adopts a biological task as a target without the biological mechanism."),
    p("yap2022", "Yap et al. (2022)", 2022, ["task"], 0.78, 0.34,
      "Task-driven design using biology as an existence proof."),
    p("lee2025", "Lee et al. (2025)", 2025, ["task"], 0.82, 0.30,
      "Lizard-inspired task capability realized by independent means."),

    // --- Bioexploitation ---
    p("kriegman2020", "Kriegman et al. (2020)", 2020, ["bioexploitation"], 0.30, 0.92,
      "Xenobots — computer-designed living machines built from frog cells."),
    p("carlsen2014", "Carlsen & Sitti (2014)", 2014, ["bioexploitation"], 0.38, 0.86,
      "Bacteria-propelled microswimmers using living cells as actuators."),

    // --- Backspiration ---
    p("hung2025", "Hung et al. (2025)", 2025, ["backspiration"], 0.84, 0.14,
      "SKOOTR — biology considered only after design and fabrication (authors' example)."),
    p("sedal2023", "Sedal et al. (2023)", 2023, ["backspiration"], 0.88, 0.10,
      "Sequential Auxetic robot — a self-cited example of Backspiration."),
  ];

  global.BID = global.BID || {};
  global.BID.AXES = AXES;
  global.BID.CATEGORIES = CATEGORIES;
  global.BID.CATEGORY_BY_ID = CATEGORY_BY_ID;
  global.BID.SEED_PAPERS = SEED_PAPERS;
})(window);
