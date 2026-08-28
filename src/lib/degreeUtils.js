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

// Set of planned course codes.
export function buildPlannedSet(plannedCourses) {
  return new Set((plannedCourses || [])
    .map((c) => normalizeCode(c.course_code)));
}

// Extracts the department/discipline from a course code (e.g. "ENG 101" -> "ENG").
export function getDiscipline(courseCode) {
  if (!courseCode) return "";
  const match = String(courseCode).match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : "";
}

// Compares requirements against completed + in-progress + planned courses.
export function analyzeProgress(requirements, transcriptCourses, plannedCourses = []) {
  const completed = buildCompletedSet(transcriptCourses);
  const inProgress = buildInProgressSet(transcriptCourses);
  const planned = buildPlannedSet(plannedCourses);
  const transcriptByCode = {};
  (transcriptCourses || []).forEach((c) => {
    transcriptByCode[normalizeCode(c.course_code)] = c;
  });
  const plannedByCode = {};
  (plannedCourses || []).forEach((c) => {
    plannedByCode[normalizeCode(c.course_code)] = c;
  });

  const categoryMap = {};
  const getCategory = (name, programGroup) => {
    const key = programGroup ? `${programGroup}|||${name || "General"}` : (name || "General");
    if (!categoryMap[key]) {
      categoryMap[key] = { name: name || "General", programGroup: programGroup || null, key, requiredItems: [], electiveGroups: {} };
    }
    return categoryMap[key];
  };

  (requirements || []).forEach((req) => {
    const cat = getCategory(req.category, req.program_group);
    const isElective = req.requirement_type === "elective" && req.elective_group;
    const norm = normalizeCode(req.course_code);

    if (!isElective) {
      const status = completed.has(norm)
        ? "complete"
        : inProgress.has(norm)
          ? "in_progress"
          : planned.has(norm)
            ? "planned"
            : "remaining";
      cat.requiredItems.push({
        ...req,
        status,
        matchedCourse: transcriptByCode[norm],
        plannedCourse: plannedByCode[norm],
      });
    } else {
      const gKey = req.elective_group;
      if (!cat.electiveGroups[gKey]) {
        cat.electiveGroups[gKey] = {
          label: gKey,
          minCredits: 0,
          minDisciplines: 0,
          minPurpleCredits: 0,
          options: [],
          completedCourses: [],
          inProgressCourses: [],
          plannedCourses: [],
        };
      }
      const g = cat.electiveGroups[gKey];
      g.options.push(req);
      g.minCredits = Math.max(g.minCredits, req.group_min_credits || 0);
      g.minDisciplines = Math.max(g.minDisciplines, req.group_min_disciplines || 0);
      g.minPurpleCredits = Math.max(g.minPurpleCredits, req.group_min_purple_credits || 0);
      if (completed.has(norm)) {
        g.completedCourses.push(req);
      } else if (inProgress.has(norm)) {
        g.inProgressCourses.push(req);
      } else if (planned.has(norm)) {
        g.plannedCourses.push(req);
      }
    }
  });

  const allGroups = [];
  Object.values(categoryMap).forEach((cat) => {
    cat.electiveGroupList = Object.values(cat.electiveGroups).map((g) => {
      g.completedCredits = g.completedCourses.reduce((s, r) => s + (r.credits || 0), 0);
      g.inProgressCredits = g.inProgressCourses.reduce((s, r) => s + (r.credits || 0), 0);
      g.plannedCredits = g.plannedCourses.reduce((s, r) => s + (r.credits || 0), 0);
      g.completedPurpleCredits = g.completedCourses.filter((r) => r.course_tag === "purple").reduce((s, r) => s + (r.credits || 0), 0);
      g.inProgressPurpleCredits = g.inProgressCourses.filter((r) => r.course_tag === "purple").reduce((s, r) => s + (r.credits || 0), 0);
      g.plannedPurpleCredits = g.plannedCourses.filter((r) => r.course_tag === "purple").reduce((s, r) => s + (r.credits || 0), 0);
      g.remainingCredits = Math.max(0, g.minCredits - g.completedCredits);
      // Track distinct disciplines
      g.completedDisciplines = [...new Set(g.completedCourses.map((r) => getDiscipline(r.course_code)))].filter(Boolean);
      g.inProgressDisciplines = [...new Set(g.inProgressCourses.map((r) => getDiscipline(r.course_code)))].filter(Boolean);
      g.plannedDisciplines = [...new Set(g.plannedCourses.map((r) => getDiscipline(r.course_code)))].filter(Boolean);
      g.distinctDisciplines = g.completedDisciplines.length;
      // Projected disciplines: completed + in-progress + planned
      g.projectedDisciplines = [...new Set([...g.completedDisciplines, ...g.inProgressDisciplines, ...g.plannedDisciplines])];
      // Satisfied only if credit threshold AND discipline threshold are both met
      const creditsMet = g.completedCredits >= g.minCredits && g.minCredits > 0;
      const disciplinesMet = g.minDisciplines > 0 ? g.distinctDisciplines >= g.minDisciplines : true;
      const purpleMet = g.minPurpleCredits > 0 ? g.completedPurpleCredits >= g.minPurpleCredits : true;
      g.satisfied = creditsMet && disciplinesMet && purpleMet;
      // Projected: would this group be satisfied if planned courses are taken?
      const projectedCredits = g.completedCredits + g.inProgressCredits + g.plannedCredits;
      const projectedCreditsMet = projectedCredits >= g.minCredits && g.minCredits > 0;
      const projectedDisciplinesMet = g.minDisciplines > 0 ? g.projectedDisciplines.length >= g.minDisciplines : true;
      const projectedPurpleCredits = g.completedPurpleCredits + g.inProgressPurpleCredits + g.plannedPurpleCredits;
      const projectedPurpleMet = g.minPurpleCredits > 0 ? projectedPurpleCredits >= g.minPurpleCredits : true;
      g.projectedSatisfied = projectedCreditsMet && projectedDisciplinesMet && projectedPurpleMet;
      g.projectedRemainingCredits = Math.max(0, g.minCredits - projectedCredits);
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
  const plannedRequired = requiredReqs.filter(
    (r) => planned.has(normalizeCode(r.course_code)) && !completed.has(normalizeCode(r.course_code)) && !inProgress.has(normalizeCode(r.course_code))
  );
  const unsatisfiedGroups = allGroups.filter((g) => !g.satisfied);
  const projectedUnsatisfiedGroups = allGroups.filter((g) => !g.projectedSatisfied);

  const totalRequiredCredits = requiredReqs.reduce((s, r) => s + (r.credits || 0), 0);
  const completedRequiredCredits = requiredReqs
    .filter((r) => completed.has(normalizeCode(r.course_code)))
    .reduce((s, r) => s + (r.credits || 0), 0);
  const inProgressRequiredCredits = inProgressRequired.reduce((s, r) => s + (r.credits || 0), 0);
  const plannedRequiredCredits = plannedRequired.reduce((s, r) => s + (r.credits || 0), 0);
  const totalElectiveMin = allGroups.reduce((s, g) => s + g.minCredits, 0);
  const completedElectiveCredits = allGroups.reduce(
    (s, g) => s + Math.min(g.completedCredits, g.minCredits),
    0
  );
  const allCompletedElectiveCredits = allGroups.reduce((s, g) => s + g.completedCredits, 0);
  const inProgressElectiveCredits = allGroups.reduce(
    (s, g) => s + Math.min(g.inProgressCredits, Math.max(0, g.minCredits - g.completedCredits)),
    0
  );
  const plannedElectiveCredits = allGroups.reduce(
    (s, g) => s + Math.min(g.plannedCredits, Math.max(0, g.minCredits - g.completedCredits - g.inProgressCredits)),
    0
  );

  const totalCredits = totalRequiredCredits + totalElectiveMin;
  const completedCredits = completedRequiredCredits + completedElectiveCredits;
  const inProgressCredits = inProgressRequiredCredits + inProgressElectiveCredits;
  const plannedCredits = plannedRequiredCredits + plannedElectiveCredits;
  const projectedCredits = completedCredits + inProgressCredits + plannedCredits;
  const projectedRemainingCredits = Math.max(0, totalCredits - projectedCredits);

  return {
    categories: Object.values(categoryMap),
    totalRequired: requiredReqs.length,
    completedRequired: requiredReqs.length - remainingRequired.length,
    inProgressRequired,
    plannedRequired,
    remainingRequired,
    unsatisfiedGroups,
    projectedUnsatisfiedGroups,
    totalCredits,
    completedCredits,
    inProgressCredits,
    plannedCredits,
    projectedCredits,
    projectedRemainingCredits,
    remainingCredits: Math.max(0, totalCredits - completedCredits),
    allCompletedCredits: completedRequiredCredits + allCompletedElectiveCredits,
    progressPercent: totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0,
    projectedPercent: totalCredits > 0 ? Math.round((projectedCredits / totalCredits) * 100) : 0,
    remainingCount: remainingRequired.length + unsatisfiedGroups.length,
    projectedRemainingCount: projectedUnsatisfiedGroups.length + requiredReqs.filter(
      (r) => !completed.has(normalizeCode(r.course_code)) && !inProgress.has(normalizeCode(r.course_code)) && !planned.has(normalizeCode(r.course_code))
    ).length,
  };
}