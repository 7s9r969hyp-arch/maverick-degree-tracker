import React, { useState } from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
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
  return (
    <div className="flex items-center gap-3 py-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>
            {item.course_code}
          </span>
          {item.course_name && (
            <span className="text-xs text-muted-foreground truncate">{item.course_name}</span>
          )}
        </div>
        {done && item.matchedCourse?.grade && (
          <p className="text-[11px] text-muted-foreground">Grade: {item.matchedCourse.grade}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{item.credits} cr</span>
    </div>
  );
}

function ElectiveGroupBlock({ group }) {
  const pct = group.minCredits > 0 ? Math.min(100, Math.round((group.completedCredits / group.minCredits) * 100)) : 0;
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
        </span>
      </div>
      <Progress value={pct} className="h-1.5 my-2" />
      <p className="text-[11px] text-muted-foreground mb-1">
        Choose from {group.options.length} options:
      </p>
      <div className="grid gap-0.5">
        {group.options.map((opt) => {
          const taken = group.completedCourses.some(
            (c) => c.course_code === opt.course_code
          );
          return (
            <div key={opt.id || opt.course_code} className="flex items-center gap-2 py-1">
              {taken ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )}
              <span className={cn("text-xs", taken ? "text-muted-foreground line-through" : "")}>
                {opt.course_code}
              </span>
              {opt.course_name && (
                <span className="text-[11px] text-muted-foreground truncate">— {opt.course_name}</span>
              )}
              <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{opt.credits} cr</span>
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
        Select a major to view its requirements.
      </p>
    );
  }

  return (
    <Accordion type="multiple" value={openCats} onValueChange={setOpenCats} className="w-full">
      {categories.map((cat) => {
        const doneCount = cat.requiredItems.filter((i) => i.status === "complete").length;
        const total = cat.requiredItems.length + cat.electiveGroupList.length;
        const doneTotal = doneCount + cat.electiveGroupList.filter((g) => g.satisfied).length;
        const allDone = doneTotal === total && total > 0;

        return (
          <AccordionItem key={cat.name} value={cat.name} className="border-b">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="font-medium text-sm">{cat.name}</span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    allDone ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                  )}
                >
                  {doneTotal}/{total}
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