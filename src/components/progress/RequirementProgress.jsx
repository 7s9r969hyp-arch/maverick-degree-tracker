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
      <span className="text-xs text-muted-foreground shrink-0">{item.credits} cr</span>
    </div>
  );
}

function ElectiveGroupBlock({ group }) {
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
      <div className="flex flex-col gap-1">
        {group.options.map((opt) => {
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
              <span className="text-xs text-muted-foreground shrink-0">{opt.credits} cr</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RequirementProgress({ categories }) {
  const [openCats, setOpenCats] = useState([]);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Select a program to view its requirements.
      </p>
    );
  }

  return (
    <Accordion type="multiple" value={openCats} onValueChange={setOpenCats} className="w-full">
      {categories.map((cat) => {
        const doneCount = cat.requiredItems.filter((i) => i.status === "complete").length;
        const inProgressCount = cat.requiredItems.filter((i) => i.status === "in_progress").length;
        const plannedCount = cat.requiredItems.filter((i) => i.status === "planned").length;
        const total = cat.requiredItems.length + cat.electiveGroupList.length;
        const doneTotal = doneCount + cat.electiveGroupList.filter((g) => g.satisfied).length;
        const allDone = doneTotal === total && total > 0;
        const projectedDoneTotal = doneTotal + plannedCount + cat.electiveGroupList.filter((g) => !g.satisfied && g.projectedSatisfied).length;

        return (
          <AccordionItem key={cat.name} value={cat.name} className="border-b">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="font-medium text-sm">{cat.name}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                    allDone ? "bg-emerald-100 text-emerald-700" : doneTotal > 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                  )}
                >
                  {allDone ? "Complete" : doneTotal > 0 ? "In progress" : "Not started"}
                  {inProgressCount > 0 && (
                    <span className="text-blue-500 ml-1">+{inProgressCount} IP</span>
                  )}
                  {plannedCount > 0 && (
                    <span className="text-violet-500 ml-1">+{plannedCount} planned</span>
                  )}
                  {!allDone && projectedDoneTotal === total && plannedCount > 0 && (
                    <span className="text-violet-600 ml-1">✓ projected</span>
                  )}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="divide-y">
                {cat.requiredItems.map((item) => (
                  <CourseRow key={item.id || item.course_code} item={item} />
                ))}
              </div>
              {cat.electiveGroupList.map((g) => (
                <ElectiveGroupBlock key={g.label} group={g} />
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}