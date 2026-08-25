import React from "react";
import { GraduationCap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MajorSelector({ majors, selectedMajorId, onSelect }) {
  const selected = majors.find((m) => m.id === selectedMajorId);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Select a major
      </label>
      <Select value={selectedMajorId || ""} onValueChange={onSelect}>
        <SelectTrigger className="h-12 bg-background">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Choose a major to audit" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {majors.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name} ({m.degree_type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected?.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {selected.description}
        </p>
      )}
    </div>
  );
}