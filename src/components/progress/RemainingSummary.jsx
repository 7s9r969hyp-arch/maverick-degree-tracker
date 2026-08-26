import React from "react";
import { AlertCircle, BookMarked, Clock, CalendarPlus } from "lucide-react";

export default function RemainingSummary({ analysis }) {
  const { remainingRequired, unsatisfiedGroups, inProgressRequired, plannedRequired, projectedUnsatisfiedGroups } = analysis;
  const hasRemaining = remainingRequired.length > 0 || unsatisfiedGroups.length > 0;
  const hasInProgress = inProgressRequired && inProgressRequired.length > 0;
  const hasPlanned = plannedRequired && plannedRequired.length > 0;

  if (!hasRemaining && !hasInProgress && !hasPlanned) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-medium text-emerald-700">
          🎉 All requirements satisfied — you've completed this program!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasInProgress && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-medium">Currently in progress</h4>
            <span className="text-xs text-muted-foreground">({inProgressRequired.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {inProgressRequired.map((r) => (
              <span
                key={r.id || r.course_code}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs"
              >
                <span className="font-medium">{r.course_code}</span>
                <span className="text-muted-foreground">{r.credits}cr</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {remainingRequired.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookMarked className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Required courses still needed</h4>
            <span className="text-xs text-muted-foreground">({remainingRequired.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {remainingRequired.map((r) => (
              <span
                key={r.id || r.course_code}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs"
              >
                <span className="font-medium">{r.course_code}</span>
                <span className="text-muted-foreground">{r.credits}cr</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {hasPlanned && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarPlus className="h-4 w-4 text-violet-500" />
            <h4 className="text-sm font-medium">Planned courses</h4>
            <span className="text-xs text-muted-foreground">({plannedRequired.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {plannedRequired.map((r) => (
              <span
                key={r.id || r.course_code}
                className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs"
              >
                <span className="font-medium">{r.course_code}</span>
                <span className="text-muted-foreground">{r.credits}cr</span>
              </span>
            ))}
          </div>
          {projectedUnsatisfiedGroups && projectedUnsatisfiedGroups.length > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠ {projectedUnsatisfiedGroups.length} group{projectedUnsatisfiedGroups.length === 1 ? "" : "s"} still unsatisfied after planned courses
            </p>
          )}
          {(!projectedUnsatisfiedGroups || projectedUnsatisfiedGroups.length === 0) && remainingRequired.length === plannedRequired.length && (
            <p className="text-xs text-emerald-600 mt-2">
              ✓ All remaining requirements covered by planned courses!
            </p>
          )}
        </div>
      )}

      {unsatisfiedGroups.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-medium">Elective groups needing credits</h4>
          </div>
          <div className="flex flex-col gap-1.5">
            {unsatisfiedGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between rounded-md border bg-amber-50/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{g.label}</span>
                  {!g.satisfied && g.projectedSatisfied && g.plannedCredits > 0 && (
                    <span className="text-[11px] text-violet-600 flex items-center gap-0.5">
                      <CalendarPlus className="h-3 w-3" /> covered by planned
                    </span>
                  )}
                  {!g.satisfied && g.projectedSatisfied && g.plannedCredits === 0 && (
                    <span className="text-[11px] text-blue-600 flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> covered by in-progress
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {g.remainingCredits} more credit{g.remainingCredits === 1 ? "" : "s"} needed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}