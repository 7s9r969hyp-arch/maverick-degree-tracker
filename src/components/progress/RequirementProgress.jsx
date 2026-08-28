import React, { useState } from "react";
import { CheckCircle2, Circle, AlertCircle, Clock, CalendarPlus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const getDept = (code) => {
  const m = (code || "").match(/^([A-Za-z]+)/);
  return m ? m[1].toUpperCase() : "";
};

const formatCredits = (item) => {
  if (item.credits_range) return `${item.credits_range} cr`;
  return `${item.credits || 0} cr`;
};

function CourseRow({ item }) {
  const done = item.status === "complete";
  const inProgress = item.status === "in_progress";
  const planned = item.status === "planned";
  return (
    <div className="flex items-center gap-3 py-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : inProgress ? (
        <Clock className="h-4 w-4 text-blue-500 shrink-0" />
      ) : planned ? (
        <CalendarPlus className="h-4 w-4 text-violet-500 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-sm font-medium",
            done && "text-muted-foreground line-through",
            inProgress && "text-blue-600",
            planned && "text-violet-600"
          )}>
            {item.course_code}
          </span>
          {item.course_name && (
            <span className="text-xs text-muted-foreground truncate">{item.course_name}</span>
          )}
        </div>
        {done && item.matchedCourse?.grade && (
          <p className="text-[11px] text-muted-foreground">Grade: {item.matchedCourse.grade}</p>
        )}
        {inProgress && (
          <p className="text-[11px] text-blue-500">In progress</p>
        )}
        {planned && (
          <p className="text-[11px] text-violet-500">
            {item.plannedCourse?.term ? `Planned: ${item.plannedCourse.term}` : "Planned"}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{formatCredits(item)}</span>
    </div>
  );
}

function ElectiveGroupBlock({ group }) {
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const disciplines = [...new Set(group.options.map((o) => getDept(o.course_code)))].filter(Boolean).sort();
  const visibleOptions = selectedDiscipline
    ? group.options.filter((o) => getDept(o.course_code) === selectedDiscipline)
    : group.options;
  const sortedOptions = [...visibleOptions].sort((a, b) =>
    (a.course_code || "").localeCompare(b.course_code || "", undefined, { numeric: true })
  );
  const pct = group.minCredits > 0 ? Math.min(100, Math.round((group.completedCredits / group.minCredits) * 100)) : 0;
  const minOptionCredits = group.options.length > 0 ? Math.min(...group.options.map((o) => o.credits || 3)) : 3;
  const coursesNeeded = Math.ceil(group.minCredits / minOptionCredits);

  const disciplinesMet = group.minDisciplines > 0 ? group.distinctDisciplines >= group.minDisciplines : true;
  const remainingDisciplines = Math.max(0, (group.minDisciplines || 0) - group.distinctDisciplines);

  return (
    <div className="rounded-lg border bg-muted/30 p-3 my-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {group.satisfied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm font-medium">{group.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {group.completedCredits} / {group.minCredits} cr
          {group.inProgressCredits > 0 && (
            <span className="text-blue-500"> ({group.inProgressCredits} in progress)</span>
          )}
        </span>
      </div>
      <Progress value={pct} className="h-1.5 my-2" />
      {group.minDisciplines > 0 && (
        <div className={cn(
          "flex items-center gap-1.5 text-xs mb-1.5",
          disciplinesMet ? "text-emerald-600" : "text-amber-600"
        )}>
          {disciplinesMet ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          <span>
            {group.distinctDisciplines} / {group.minDisciplines} disciplines
            {group.completedDisciplines.length > 0 && (
              <span className="text-muted-foreground"> ({group.completedDisciplines.join(", ")})</span>
            )}
            {!disciplinesMet && remainingDisciplines > 0 && (
              <span className="font-medium"> — need {remainingDisciplines} more</span>
            )}
          </span>
        </div>
      )}
      {group.minPurpleCredits > 0 && (
        <div className={cn(
          "flex items-center gap-1.5 text-xs mb-1.5",
          group.completedPurpleCredits >= group.minPurpleCredits ? "text-emerald-600" : "text-amber-600"
        )}>
          {group.completedPurpleCredits >= group.minPurpleCredits ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          <span>
            {group.completedPurpleCredits} / {group.minPurpleCredits} purple credits
            {group.completedPurpleCredits < group.minPurpleCredits && (
              <span className="font-medium"> — need {group.minPurpleCredits - group.completedPurpleCredits} more</span>
            )}
          </span>
        </div>
      )}
      <p className="text-xs text-muted-foreground mb-1.5">
        {group.satisfied
          ? "✓ Requirement satisfied"
          : `Choose ${coursesNeeded} (${group.minCredits} cr needed${group.minDisciplines > 0 ? ` from ${group.minDisciplines} disciplines` : ""})`}
      </p>
      {!group.satisfied && group.projectedSatisfied && group.plannedCredits > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-violet-600 mb-1.5">
          <CalendarPlus className="h-3 w-3" />
          <span>Would be satisfied with planned courses</span>
        </div>
      )}
      {disciplines.length > 1 && (
        <div className="mb-2">
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All disciplines ({group.options.length})</option>
            {disciplines.map((d) => {
              const count = group.options.filter((o) => getDept(o.course_code) === d).length;
              return <option key={d} value={d}>{d} ({count})</option>;
            })}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-1">
        {sortedOptions.map((opt) => {
          const taken = group.completedCourses.some((c) => c.course_code === opt.course_code);
          const inProg = group.inProgressCourses.some((c) => c.course_code === opt.course_code);
          const planned = group.plannedCourses.some((c) => c.course_code === opt.course_code);
          return (
            <div
              key={opt.id || opt.course_code}
              className={cn(
                "flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm",
                taken && "border-emerald-200 bg-emerald-50/50",
                inProg && "border-blue-200 bg-blue-50/50",
                planned && "border-violet-200 bg-violet-50/50"
              )}
            >
              {taken ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : inProg ? (
                <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              ) : planned ? (
                <CalendarPlus className="h-3.5 w-3.5 text-violet-500 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="font-medium">{opt.course_code}</span>
              {opt.course_tag && (
                <span className={cn(
                  "text-[10px] px-1 rounded font-medium shrink-0",
                  opt.course_tag === "purple" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
                )}>
                  {opt.course_tag === "purple" ? "P" : "G"}
                </span>
              )}
              <span className="text-xs text-muted-foreground truncate flex-1">
                {opt.course_name || "Untitled"}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{formatCredits(opt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryContent({ cat }) {
  return (
    <div>
      <div className="divide-y">
        {[...cat.requiredItems].sort((a, b) => (a.course_code || "").localeCompare(b.course_code || "", undefined, { numeric: true })).map((item) => (
          <CourseRow key={item.id || item.course_code} item={item} />
        ))}
      </div>
      {[...cat.electiveGroupList].sort((a, b) => (a.label || "").localeCompare(b.label || "")).map((g) => (
        <ElectiveGroupBlock key={g.label} group={g} />
      ))}
    </div>
  );
}

function calcCategoryStats(cat) {
  const doneCount = cat.requiredItems.filter((i) => i.status === "complete").length;
  const inProgressCount = cat.requiredItems.filter((i) => i.status === "in_progress").length;
  const plannedCount = cat.requiredItems.filter((i) => i.status === "planned").length;
  const total = cat.requiredItems.length + cat.electiveGroupList.length;
  const doneTotal = doneCount + cat.electiveGroupList.filter((g) => g.satisfied).length;
  const allDone = doneTotal === total && total > 0;

  const catTotalCredits = cat.requiredItems.reduce((s, i) => s + (i.credits || 0), 0) + cat.electiveGroupList.reduce((s, g) => s + (g.minCredits || 0), 0);
  const catCompletedCredits = cat.requiredItems.filter((i) => i.status === "complete").reduce((s, i) => s + (i.credits || 0), 0) + cat.electiveGroupList.reduce((s, g) => s + (g.completedCredits || 0), 0);
  const catInProgressCredits = cat.requiredItems.filter((i) => i.status === "in_progress").reduce((s, i) => s + (i.credits || 0), 0) + cat.electiveGroupList.reduce((s, g) => s + (g.inProgressCredits || 0), 0);
  const catPlannedCredits = cat.requiredItems.filter((i) => i.status === "planned").reduce((s, i) => s + (i.credits || 0), 0) + cat.electiveGroupList.reduce((s, g) => s + (g.plannedCredits || 0), 0);
  const catRemainingCredits = Math.max(0, catTotalCredits - catCompletedCredits - catInProgressCredits);
  const catPct = catTotalCredits > 0 ? Math.min(100, Math.round((catCompletedCredits / catTotalCredits) * 100)) : 0;

  return { doneCount, inProgressCount, plannedCount, total, doneTotal, allDone, catTotalCredits, catCompletedCredits, catInProgressCredits, catPlannedCredits, catRemainingCredits, catPct };
}

export default function RequirementProgress({ categories }) {
  const [openItems, setOpenItems] = useState([]);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Select a program to view its requirements.
      </p>
    );
  }

  // Group categories by programGroup
  const geCategories = categories.filter((c) => !c.programGroup);
  const programGroupsMap = {};
  categories.filter((c) => c.programGroup).forEach((c) => {
    if (!programGroupsMap[c.programGroup]) programGroupsMap[c.programGroup] = [];
    programGroupsMap[c.programGroup].push(c);
  });

  // Sort GE categories alphabetically
  geCategories.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  // Sort program groups alphabetically
  const sortedProgramGroups = Object.keys(programGroupsMap).sort();
  // Sort categories within each program group alphabetically
  sortedProgramGroups.forEach((pg) => {
    programGroupsMap[pg].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  });

  const renderCategoryTrigger = (cat, stats) => (
    <AccordionTrigger className="hover:no-underline py-4">
      <div className="flex items-center gap-3 flex-1">
        <span className="font-medium text-sm">{cat.name}</span>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-24">
            <Progress value={stats.catPct} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {stats.catRemainingCredits > 0 ? `${stats.catRemainingCredits} cr left` : "✓ Complete"}
            {stats.catInProgressCredits > 0 && <span className="text-blue-500 ml-1">+{stats.catInProgressCredits} IP</span>}
            {stats.catPlannedCredits > 0 && <span className="text-violet-500 ml-1">+{stats.catPlannedCredits} planned</span>}
          </span>
        </div>
      </div>
    </AccordionTrigger>
  );

  const renderProgramGroupTrigger = (pgName, cats) => {
    // Aggregate stats across all sub-categories
    const totalCredits = cats.reduce((s, cat) => {
      const st = calcCategoryStats(cat);
      return s + st.catTotalCredits;
    }, 0);
    const completedCredits = cats.reduce((s, cat) => {
      const st = calcCategoryStats(cat);
      return s + st.catCompletedCredits;
    }, 0);
    const inProgressCredits = cats.reduce((s, cat) => {
      const st = calcCategoryStats(cat);
      return s + st.catInProgressCredits;
    }, 0);
    const plannedCredits = cats.reduce((s, cat) => {
      const st = calcCategoryStats(cat);
      return s + st.catPlannedCredits;
    }, 0);
    const remainingCredits = Math.max(0, totalCredits - completedCredits - inProgressCredits);
    const pct = totalCredits > 0 ? Math.min(100, Math.round((completedCredits / totalCredits) * 100)) : 0;

    return (
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="font-semibold text-sm">{pgName}</span>
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-24">
              <Progress value={pct} className="h-2" />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {remainingCredits > 0 ? `${remainingCredits} cr left` : "✓ Complete"}
              {inProgressCredits > 0 && <span className="text-blue-500 ml-1">+{inProgressCredits} IP</span>}
              {plannedCredits > 0 && <span className="text-violet-500 ml-1">+{plannedCredits} planned</span>}
            </span>
          </div>
        </div>
      </AccordionTrigger>
    );
  };

  return (
    <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full">
      {/* GE categories (no program group) */}
      {geCategories.map((cat) => {
        const stats = calcCategoryStats(cat);
        return (
          <AccordionItem key={cat.key} value={cat.key} className="border-b">
            {renderCategoryTrigger(cat, stats)}
            <AccordionContent className="pb-3">
              <CategoryContent cat={cat} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
      {/* Program groups */}
      {sortedProgramGroups.map((pgName) => {
        const pgKey = `pg|||${pgName}`;
        const cats = programGroupsMap[pgName];
        return (
          <AccordionItem key={pgKey} value={pgKey} className="border-b">
            {renderProgramGroupTrigger(pgName, cats)}
            <AccordionContent className="pb-3">
              <div className="flex flex-col gap-3">
                {cats.map((cat) => {
                  const stats = calcCategoryStats(cat);
                  return (
                    <div key={cat.key} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {cat.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stats.catRemainingCredits > 0 ? `${stats.catRemainingCredits} cr left` : "✓ Complete"}
                        </span>
                      </div>
                      <CategoryContent cat={cat} />
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}