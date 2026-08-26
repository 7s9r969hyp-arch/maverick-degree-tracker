import React from "react";
import { CheckCircle2, Circle, Clock, BookOpen, GraduationCap, CalendarPlus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function ProgramBar({ program, analysis }) {
  const pct = analysis.progressPercent;
  const ip = analysis.inProgressRequired;
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-end justify-between mb-2.5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            {program.name}
            <span className="text-muted-foreground/60">{program.degree_type}</span>
          </p>
          <p className="text-2xl font-semibold tracking-tight mt-0.5">{pct}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {analysis.completedCredits} of {analysis.totalCredits} credits
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {analysis.completedRequired} / {analysis.totalRequired} required
          </p>
          {ip > 0 && (
            <p className="text-[11px] text-blue-500 mt-0.5">{ip} in progress</p>
          )}
        </div>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

export default function ProgressOverview({ overallAnalysis, perProgramAnalyses }) {
  const {
    progressPercent,
    projectedPercent,
    completedCredits,
    totalCredits,
    inProgressCredits,
    plannedCredits,
    projectedCredits,
    completedRequired,
    totalRequired,
    inProgressRequired,
    plannedRequired,
    remainingCount,
    projectedRemainingCount,
  } = overallAnalysis;

  const hasPlanned = (plannedCredits || 0) > 0 || (plannedRequired && plannedRequired.length > 0);

  const stats = [
    { label: "Overall progress", value: `${progressPercent}%`, icon: BookOpen },
    { label: "Credits complete", value: `${completedCredits} / ${totalCredits}`, icon: CheckCircle2 },
    { label: "In progress", value: `${inProgressCredits || 0} cr`, icon: Clock },
    { label: "Items remaining", value: `${remainingCount}`, icon: Circle },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Overall Degree Progress */}
      <div>
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
              <p className="text-xs text-blue-500 mt-0.5">{inProgressRequired} in progress</p>
            )}
          </div>
        </div>
        <Progress value={progressPercent} className="h-2.5 mt-3" />
        {hasPlanned && projectedPercent > progressPercent && (
          <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
            <div className="flex items-end justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <CalendarPlus className="h-3.5 w-3.5 text-violet-500" />
                <p className="text-xs font-medium text-violet-700">
                  Projected with planned courses
                </p>
              </div>
              <p className="text-lg font-semibold text-violet-700">{projectedPercent}%</p>
            </div>
            <Progress value={projectedPercent} className="h-2" />
            <p className="text-[11px] text-violet-600 mt-1.5">
              {projectedCredits} of {totalCredits} credits — {projectedRemainingCount} item{projectedRemainingCount === 1 ? "" : "s"} still remaining
            </p>
          </div>
        )}
      </div>

      {/* Per-program progress bars */}
      {perProgramAnalyses && perProgramAnalyses.length > 0 && (
        <div className="flex flex-col gap-3">
          {perProgramAnalyses.map(({ program, analysis }) => (
            <ProgramBar key={program.id} program={program} analysis={analysis} />
          ))}
        </div>
      )}

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