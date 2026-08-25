import React from "react";
import { CheckCircle2, Circle, Clock, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ProgressOverview({ analysis }) {
  const {
    progressPercent,
    completedCredits,
    totalCredits,
    remainingCredits,
    inProgressCredits,
    completedRequired,
    totalRequired,
    inProgressRequired,
    remainingCount,
  } = analysis;

  const stats = [
    {
      label: "Overall progress",
      value: `${progressPercent}%`,
      icon: BookOpen,
    },
    {
      label: "Credits complete",
      value: `${completedCredits} / ${totalCredits}`,
      icon: CheckCircle2,
    },
    {
      label: "In progress",
      value: `${inProgressCredits || 0} cr`,
      icon: Clock,
    },
    {
      label: "Items remaining",
      value: `${remainingCount}`,
      icon: Circle,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Degree progress
          </p>
          <p className="text-4xl font-semibold tracking-tight mt-1">{progressPercent}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {completedCredits} of {totalCredits} credits satisfied
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            {completedRequired} / {totalRequired} required done
          </p>
          {inProgressRequired > 0 && (
            <p className="text-xs text-blue-500 mt-0.5">
              {inProgressRequired} in progress
            </p>
          )}
        </div>
      </div>

      <Progress value={progressPercent} className="h-2.5" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-3.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-xl font-semibold mt-1.5">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}