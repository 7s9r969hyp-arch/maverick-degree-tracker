// Normalizes a course code for matching: uppercase, strip all whitespace.
export function normalizeCode(code) {
  if (!code) return "";
  return String(code).toUpperCase().replace(/\s+/g, "").trim();
}

// Set of completed course codes (status === "completed" or unset).
export function buildCompletedSet(transcriptCourses) {
  return new Set((transcriptCourses || [])
    .filter((c) => (c.status || "completed") === "completed")
    .map((c) => normalizeCode(c.course_code)));
}

// Set of in-progress course codes (status === "in_progress").
export function buildInProgressSet(transcriptCourses) {
  return new Set((transcriptCourses || [])
    .filter((c) => c.status === "in_progress")
    .map((c) => normalizeCode(c.course_code)));
}

// Compares requirements against completed + in-progress transcript courses.
export function analyzeProgress(requirements, transcriptCourses) {
  const completed = buildCompletedSet(transcriptCourses);
  const inProgress = buildInProgressSet(transcriptCourses);
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
    const norm = normalizeCode(req.course_code);

    if (!isElective) {
      const status = completed.has(norm)
        ? "complete"
        : inProgress.has(norm)
          ? "in_progress"
          : "remaining";
      cat.requiredItems.push({
        ...req,
        status,
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
          inProgressCourses: [],
        };
      }
      const g = cat.electiveGroups[gKey];
      g.options.push(req);
      g.minCredits = Math.max(g.minCredits, req.group_min_credits || 0);
      if (completed.has(norm)) {
        g.completedCourses.push(req);
      } else if (inProgress.has(norm)) {
        g.inProgressCourses.push(req);
      }
    }
  });

  const allGroups = [];
  Object.values(categoryMap).forEach((cat) => {
    cat.electiveGroupList = Object.values(cat.electiveGroups).map((g) => {
      g.completedCredits = g.completedCourses.reduce((s, r) => s + (r.credits || 0), 0);
      g.inProgressCredits = g.inProgressCourses.reduce((s, r) => s + (r.credits || 0), 0);
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
    (r) => !completed.has(normalizeCode(r.course_code)) && !inProgress.has(normalizeCode(r.course_code))
  );
  const inProgressRequired = requiredReqs.filter(
    (r) => inProgress.has(normalizeCode(r.course_code))
  );
  const unsatisfiedGroups = allGroups.filter((g) => !g.satisfied);

  const totalRequiredCredits = requiredReqs.reduce((s, r) => s + (r.credits || 0), 0);
  const completedRequiredCredits = requiredReqs
    .filter((r) => completed.has(normalizeCode(r.course_code)))
    .reduce((s, r) => s + (r.credits || 0), 0);
  const inProgressRequiredCredits = inProgressRequired.reduce((s, r) => s + (r.credits || 0), 0);
  const totalElectiveMin = allGroups.reduce((s, g) => s + g.minCredits, 0);
  const completedElectiveCredits = allGroups.reduce(
    (s, g) => s + Math.min(g.completedCredits, g.minCredits),
    0
  );
  const inProgressElectiveCredits = allGroups.reduce(
    (s, g) => s + Math.min(g.inProgressCredits, Math.max(0, g.minCredits - g.completedCredits)),
    0
  );

  const totalCredits = totalRequiredCredits + totalElectiveMin;
  const completedCredits = completedRequiredCredits + completedElectiveCredits;
  const inProgressCredits = inProgressRequiredCredits + inProgressElectiveCredits;

  return {
    categories: Object.values(categoryMap),
    totalRequired: requiredReqs.length,
    completedRequired: requiredReqs.length - remainingRequired.length,
    inProgressRequired: inProgressRequired.length,
    remainingRequired,
    inProgressRequired,
    unsatisfiedGroups,
    totalCredits,
    completedCredits,
    inProgressCredits,
    remainingCredits: Math.max(0, totalCredits - completedCredits),
    progressPercent: totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0,
    remainingCount: remainingRequired.length + unsatisfiedGroups.length,
  };
}