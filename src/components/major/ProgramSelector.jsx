import React, { useState, useMemo } from "react";
import { GraduationCap, Layers, Award, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function ProgramSelector({ programs, selectedIds, onToggle }) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const majors = useMemo(() =>
    programs
      .filter((p) => p.degree_type !== "Minor" && p.degree_type !== "Certificate" && p.degree_type !== "General Education")
      .sort((a, b) => a.name.localeCompare(b.name)),
    [programs]
  );

  const minors = useMemo(() =>
    programs
      .filter((p) => p.degree_type === "Minor")
      .sort((a, b) => a.name.localeCompare(b.name)),
    [programs]
  );

  const certificates = useMemo(() =>
    programs
      .filter((p) => p.degree_type === "Certificate")
      .sort((a, b) => a.name.localeCompare(b.name)),
    [programs]
  );

  const filteredMajors = search
    ? majors.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : majors;
  const filteredMinors = search
    ? minors.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : minors;
  const filteredCerts = search
    ? certificates.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : certificates;

  const renderGroup = (label, icon, list, defaultLimit = 12) => {
    if (list.length === 0) return null;
    const visible = showAll || search ? list : list.slice(0, defaultLimit);
    const hasMore = !showAll && !search && list.length > defaultLimit;

    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          {icon}
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label} <span className="text-muted-foreground/60">({list.length})</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {visible.map((m) => {
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
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-3 w-3" /> Show all
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="pl-9"
        />
      </div>
      {renderGroup("Majors", <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />, filteredMajors)}
      {renderGroup("Minors", <Layers className="h-3.5 w-3.5 text-muted-foreground" />, filteredMinors)}
      {renderGroup("Certificates", <Award className="h-3.5 w-3.5 text-muted-foreground" />, filteredCerts)}
      {showAll && !search && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-3 w-3" /> Show less
        </button>
      )}
      {selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} program{selectedIds.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}