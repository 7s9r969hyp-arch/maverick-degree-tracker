import React, { useState } from "react";
import { Plus, Trash2, CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function PlannedCourseManager({ courses, courseCatalog, onAdd, onDelete, onClearAll }) {
  const [form, setForm] = useState({ dept: "", courseNumber: "", course_name: "", credits: "", term: "" });

  const departments = Object.keys(courseCatalog || {}).sort();
  const courseOptions = form.dept ? (courseCatalog[form.dept] || []) : [];

  const groupedDepts = departments.reduce((acc, d) => {
    const letter = d[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(d);
    return acc;
  }, {});
  const deptLetters = Object.keys(groupedDepts).sort();

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const selectDept = (dept) => {
    setForm((f) => ({ ...f, dept, courseNumber: "", course_name: "", credits: "" }));
  };

  const selectCourse = (code) => {
    const course = courseOptions.find((c) => c.code === code);
    setForm((f) => ({
      ...f,
      courseNumber: code,
      course_name: course?.name || "",
      credits: course?.credits != null ? String(course.credits) : "",
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.courseNumber) return;
    onAdd({
      course_code: form.courseNumber,
      course_name: form.course_name.trim(),
      credits: form.credits ? Number(form.credits) : null,
      term: form.term.trim(),
    });
    setForm({ dept: "", courseNumber: "", course_name: "", credits: "", term: "" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-violet-500" />
        Add courses you're considering to see if they'll complete your requirements.
      </div>
      <form onSubmit={submit} className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Department</Label>
          <select
            value={form.dept}
            onChange={(e) => selectDept(e.target.value)}
            className={selectClass}
          >
            <option value="">Select department</option>
            {deptLetters.map((letter) => (
              <optgroup key={letter} label={letter}>
                {groupedDepts[letter].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Course</Label>
          <select
            value={form.courseNumber}
            onChange={(e) => selectCourse(e.target.value)}
            className={selectClass}
            disabled={!form.dept}
          >
            <option value="">Select course{courseOptions.length > 0 ? ` (${courseOptions.length})` : ""}</option>
            {courseOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}{c.name ? ` — ${c.name}` : ""}{c.credits ? ` (${c.credits} cr)` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Course name</Label>
          <Input
            value={form.course_name}
            onChange={(e) => setField("course_name", e.target.value)}
            placeholder="Auto-filled from catalog"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Credits</Label>
          <Input
            type="number"
            value={form.credits}
            onChange={(e) => setField("credits", e.target.value)}
            placeholder="3"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Planned term</Label>
          <Input
            value={form.term}
            onChange={(e) => setField("term", e.target.value)}
            placeholder="Spring 2027"
          />
        </div>
        <div className="col-span-2">
          <Button type="submit" className="w-full" disabled={!form.courseNumber}>
            <Plus className="h-4 w-4 mr-1" /> Plan course
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{courses.length} planned course{courses.length === 1 ? "" : "s"}</span>
        {courses.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (window.confirm("Remove all planned courses?")) onClearAll();
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
        {courses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No planned courses yet. Add courses you're considering to project your completion.
          </p>
        )}
        {courses.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-2"
          >
            <CalendarPlus className="h-3.5 w-3.5 text-violet-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{c.course_code}</span>
                {c.term && (
                  <span className="text-xs text-violet-600">{c.term}</span>
                )}
              </div>
              {c.course_name && (
                <p className="text-xs text-muted-foreground truncate">{c.course_name}</p>
              )}
            </div>
            {c.credits != null && (
              <span className="text-xs text-muted-foreground">{c.credits} cr</span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(c.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}