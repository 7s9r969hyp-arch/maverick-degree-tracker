import React, { useState, useRef } from "react";
import { Plus, Trash2, ClipboardPaste, Upload, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function TranscriptManager({ courses, courseCatalog, onAdd, onBulkAdd, onDelete }) {
  const [form, setForm] = useState({ dept: "", courseNumber: "", course_name: "", credits: "", grade: "", term: "", status: "completed" });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteInProgress, setPasteInProgress] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const departments = Object.keys(courseCatalog || {}).sort();
  const courseOptions = form.dept ? courseCatalog[form.dept] || [] : [];

  const handleTranscriptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke("parseTranscript", { file_url });
      const courses = response.data?.courses || [];
      if (courses.length > 0) {
        await onBulkAdd(courses);
      }
    } catch (err) {
      // onBulkAdd handles toast; silently ignore upload errors here
    } finally {
      setUploading(false);
    }
  };

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
      grade: form.grade.trim(),
      term: form.term.trim(),
      status: form.status,
    });
    setForm({ dept: "", courseNumber: "", course_name: "", credits: "", grade: "", term: "", status: "completed" });
  };

  const handlePaste = () => {
    const lines = pasteText.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((line) => {
      const parts = line.split(/\t|\||,{2,}|\s{2,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 1) {
        return {
          course_code: parts[0],
          course_name: parts[1] || "",
          credits: parts[2] ? Number(parts[2]) || null : null,
          grade: parts[3] || "",
          term: parts[4] || "",
          status: pasteInProgress ? "in_progress" : "completed",
        };
      }
      return null;
    }).filter(Boolean);
    onBulkAdd(parsed);
    setPasteText("");
    setPasteInProgress(false);
    setPasteOpen(false);
  };

  const completedCourses = courses.filter((c) => (c.status || "completed") === "completed");
  const inProgressCourses = courses.filter((c) => c.status === "in_progress");

  const renderCourseRow = (c) => (
    <div
      key={c.id}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-background px-3 py-2",
        c.status === "in_progress" && "border-blue-200 bg-blue-50/50"
      )}
    >
      {c.status === "in_progress" && <Clock className="h-3 w-3 text-blue-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{c.course_code}</span>
          {c.grade && (
            <span className="text-xs text-muted-foreground">{c.grade}</span>
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
  );

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Department</Label>
          <select
            value={form.dept}
            onChange={(e) => selectDept(e.target.value)}
            className={selectClass}
          >
            <option value="">Select dept</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
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
            <option value="">Select course</option>
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
            placeholder="4"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grade</Label>
          <Input
            value={form.grade}
            onChange={(e) => setField("grade", e.target.value)}
            placeholder="A"
          />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={form.status === "in_progress"}
              onChange={(e) => setField("status", e.target.checked ? "in_progress" : "completed")}
              className="rounded border-input"
            />
            <Clock className="h-3 w-3 text-blue-500" />
            Currently in progress
          </label>
        </div>
        <div className="col-span-2 flex gap-2">
          <Button type="submit" className="flex-1" disabled={!form.courseNumber}>
            <Plus className="h-4 w-4 mr-1" /> Add course
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            title="Upload transcript or DARS PDF"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleTranscriptUpload}
          />
          <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <ClipboardPaste className="h-4 w-4 mr-1" /> Paste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Paste transcript courses</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                One course per line. Format: <code>Code | Name | Credits | Grade | Term</code>
              </p>
              <Textarea
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"CIS 121 | Introduction to Programming | 4 | A | Fall 2024\nMATH 121 | Calculus I | 4 | B+ | Fall 2024"}
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={pasteInProgress}
                  onChange={(e) => setPasteInProgress(e.target.checked)}
                  className="rounded border-input"
                />
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                Mark all as in progress
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPasteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePaste} disabled={!pasteText.trim()}>
                  Import courses
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </form>

      <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
        {courses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No courses added yet. Add courses you've completed or are taking to see what's left.
          </p>
        )}
        {inProgressCourses.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-blue-500">
              <Clock className="h-3 w-3" /> In progress ({inProgressCourses.length})
            </div>
            {inProgressCourses.map(renderCourseRow)}
          </div>
        )}
        {completedCourses.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {inProgressCourses.length > 0 && (
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Completed ({completedCourses.length})
              </div>
            )}
            {completedCourses.map(renderCourseRow)}
          </div>
        )}
      </div>
    </div>
  );
}