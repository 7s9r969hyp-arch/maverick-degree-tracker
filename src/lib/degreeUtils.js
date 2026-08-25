// Normalizes a course code for matching: uppercase, strip all whitespace.
// Handles "cis 121", "CIS121", "CIS 121 " -> "CIS121"
export function normalizeCode(code) {
  if (!code) return "";
  return String(code).toUpperCase().replace(/\s+/g, "").trim();
}

export function buildCompletedSet(transcriptCourses) {
  return new Set((transcriptCourses || []).map((c) => normalizeCode(c.course_code)));
}

// Compares a major's requirements against completed transcript courses.
// Returns categories (with per-course status + elective-group progress) and summary stats.
export function analyzeProgress(requirements, transcriptCourses) {
  const completed = buildCompletedSet(transcriptCourses);
  const transcriptByCode = {};
  (transcriptCourses || []).forEach((c) => {
    transcriptByCode[normalizeCode(c.course_code)] = c;
  });

  const categoryMap = {};
  const getCategory = (name) => {
    const key = name || "General";
    if (!categoryMap[key]) {
      categoryMap[key] = { name: key, requiredItems: [], electiveGroups: {} };
    }
    return categoryMap[key];
  };

  (requirements || []).forEach((req) => {
    const cat = getCategory(req.category);
    const isElective = req.requirement_type === "elective" && req.elective_group;

    if (!isElective) {
      const norm = normalizeCode(req.course_code);
      cat.requiredItems.push({
        ...req,
        status: completed.has(norm) ? "complete" : "remaining",
        matchedCourse: transcriptByCode[norm],
      });
    } else {
      const gKey = req.elective_group;
      if (!cat.electiveGroups[gKey]) {
        cat.electiveGroups[gKey] = {
          label: gKey,
          minCredits: 0,
          options: [],
          completedCourses: [],
        };
      }
      const g = cat.electiveGroups[gKey];
      g.options.push(req);
      g.minCredits = Math.max(g.minCredits, req.group_min_credits || 0);
      if (completed.has(normalizeCode(req.course_code))) {
        g.completedCourses.push(req);
      }
    }
  });

  const allGroups = [];
  Object.values(categoryMap).forEach((cat) => {
    cat.electiveGroupList = Object.values(cat.electiveGroups).map((g) => {
      g.completedCredits = g.completedCourses.reduce((s, r) => s + (r.credits || 0), 0);
      g.remainingCredits = Math.max(0, g.minCredits - g.completedCredits);
      g.satisfied = g.completedCredits >= g.minCredits && g.minCredits > 0;
      allGroups.push(g);
      return g;
    });
  });

  const requiredReqs = (requirements || []).filter(
    (r) => !(r.requirement_type === "elective" && r.elective_group)
  );
  const remainingRequired = requiredReqs.filter(
    (r) => !completed.has(normalizeCode(r.course_code))
  );
  const unsatisfiedGroups = allGroups.filter((g) => !g.satisfied);

  const totalRequiredCredits = requiredReqs.reduce((s, r) => s + (r.credits || 0), 0);
  const completedRequiredCredits = requiredReqs
    .filter((r) => completed.has(normalizeCode(r.course_code)))
    .reduce((s, r) => s + (r.credits || 0), 0);
  const totalElectiveMin = allGroups.reduce((s, g) => s + g.minCredits, 0);
  const completedElectiveCredits = allGroups.reduce(
    (s, g) => s + Math.min(g.completedCredits, g.minCredits),
    0
  );

  const totalCredits = totalRequiredCredits + totalElectiveMin;
  const completedCredits = completedRequiredCredits + completedElectiveCredits;

  return {
    categories: Object.values(categoryMap),
    totalRequired: requiredReqs.length,
    completedRequired: requiredReqs.length - remainingRequired.length,
    remainingRequired,
    unsatisfiedGroups,
    totalCredits,
    completedCredits,
    remainingCredits: Math.max(0, totalCredits - completedCredits),
    progressPercent: totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0,
    remainingCount: remainingRequired.length + unsatisfiedGroups.length,
  };
}