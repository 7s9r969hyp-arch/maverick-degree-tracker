import React from "react";
import { AlertCircle, BookMarked } from "lucide-react";

export default function RemainingSummary({ analysis }) {
  const { remainingRequired, unsatisfiedGroups } = analysis;
  const hasRemaining = remainingRequired.length > 0 || unsatisfiedGroups.length > 0;

  if (!hasRemaining) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-medium text-emerald-700">
          🎉 All requirements satisfied — you've completed this major!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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

      {unsatisfiedGroups.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-medium">Elective groups needing credits</h4>
          </div>
          <div className="flex flex-col gap-1.5">
            {unsatisfiedGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between rounded-md border bg-amber-50/50 px-3 py-2">
                <span className="text-sm">{g.label}</span>
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