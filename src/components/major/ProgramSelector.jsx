import React from "react";
import { GraduationCap, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProgramSelector({ programs, selectedIds, onToggle }) {
  const majors = programs.filter((p) => p.degree_type !== "Minor" && p.degree_type !== "Certificate");
  const minors = programs.filter((p) => p.degree_type === "Minor");

  const renderGroup = (label, icon, list) => {
    if (list.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          {icon}
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {list.map((m) => {
            const selected = selectedIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggle(m.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent"
                )}
              >
                {m.name}
                {m.degree_type !== "Minor" && m.degree_type !== "Certificate" && (
                  <span className={cn("text-xs", selected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.degree_type}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {renderGroup("Majors", <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />, majors)}
      {renderGroup("Minors", <Layers className="h-3.5 w-3.5 text-muted-foreground" />, minors)}
      {selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} program{selectedIds.length === 1 ? "" : "s"} selected — mix and match any combination of majors and minors.
        </p>
      )}
    </div>
  );
}