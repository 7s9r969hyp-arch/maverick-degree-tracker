import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap, Sparkles, CalendarPlus } from "lucide-react";
import ProgramSelector from "@/components/major/ProgramSelector";
import TranscriptManager from "@/components/transcript/TranscriptManager";
import PlannedCourseManager from "@/components/transcript/PlannedCourseManager";
import ProgressOverview from "@/components/progress/ProgressOverview";
import RequirementProgress from "@/components/progress/RequirementProgress";
import RemainingSummary from "@/components/progress/RemainingSummary";
import { analyzeProgress } from "@/lib/degreeUtils";
import { mnsuCourseCatalog } from "@/lib/mnsuCatalog";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [majors, setMajors] = useState([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState([]);
  const [genEdRequirements, setGenEdRequirements] = useState([]);
  const [programRequirements, setProgramRequirements] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [plannedCourses, setPlannedCourses] = useState([]);
  const [courseCatalog, setCourseCatalog] = useState({});
  const [catalogRequirements, setCatalogRequirements] = useState([]);
  const [loadingMajors, setLoadingMajors] = useState(true);
  const [loadingReqs, setLoadingReqs] = useState(false);

  const selectablePrograms = majors.filter((m) => m.degree_type !== "General Education");
  const genEdMajor = majors.find((m) => m.degree_type === "General Education");

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.Major.list("name", 500);
        setMajors(data);
      } catch (e) {
        toast({ variant: "destructive", title: "Could not load majors catalog." });
      } finally {
        setLoadingMajors(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setTranscript([]);
      try {
        const data = await base44.entities.TranscriptCourse.list("-created_date", 500);
        setTranscript(data);
      } catch (e) {
        // ignore - may be empty
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.PlannedCourse.list("-created_date", 500);
        setPlannedCourses(data);
      } catch (e) {
        // ignore - may be empty
      }
    })();
  }, []);

  // Build a course catalog from all requirements (for course selection dropdowns)
  useEffect(() => {
    (async () => {
      try {
        const allReqs = await base44.entities.Requirement.list("category", 2000);
        setCatalogRequirements(allReqs);
        const catalog = {};
        // Start with the full MNSU catalog (all GE courses from the academic catalog)
        Object.keys(mnsuCourseCatalog).forEach((dept) => {
          catalog[dept] = mnsuCourseCatalog[dept].map((c) => ({ ...c }));
        });
        // Merge in any requirement-specific courses not already in the catalog
        allReqs.forEach((r) => {
          if (!r.course_code) return;
          const match = r.course_code.match(/^([A-Za-z]+)\s*(\d+.*)$/);
          if (!match) return;
          const dept = match[1].toUpperCase();
          const code = `${dept} ${match[2]}`;
          if (!catalog[dept]) catalog[dept] = [];
          if (!catalog[dept].some((c) => c.code === code)) {
            catalog[dept].push({ code, name: r.course_name || "", credits: r.credits || null });
          }
        });
        Object.keys(catalog).forEach((dept) => {
          catalog[dept].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
        });
        setCourseCatalog(catalog);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Always load General Education requirements (university-wide)
  useEffect(() => {
    if (!genEdMajor) return;
    (async () => {
      try {
        const reqs = await base44.entities.Requirement.filter({ major_id: genEdMajor.id }, "category", 2000);
        setGenEdRequirements(reqs);
      } catch (e) {
        // ignore
      }
    })();
  }, [genEdMajor]);

  // Load selected program requirements
  useEffect(() => {
    if (selectedProgramIds.length === 0) {
      setProgramRequirements([]);
      return;
    }
    setLoadingReqs(true);
    (async () => {
      try {
        const reqArrays = await Promise.all(
          selectedProgramIds.map((pid) =>
            base44.entities.Requirement.filter({ major_id: pid }, "category", 500)
          )
        );
        const combined = [];
        selectedProgramIds.forEach((pid, i) => {
          const program = majors.find((m) => m.id === pid);
          const prefix = program ? program.name : "Program";
          reqArrays[i].forEach((r) => {
            combined.push({ ...r, category: `${prefix} — ${r.category}` });
          });
        });
        setProgramRequirements(combined);
      } catch (e) {
        toast({ variant: "destructive", title: "Could not load requirements." });
        setProgramRequirements([]);
      } finally {
        setLoadingReqs(false);
      }
    })();
  }, [selectedProgramIds, majors]);

  const allRequirements = useMemo(
    () => [...genEdRequirements, ...programRequirements],
    [genEdRequirements, programRequirements]
  );

  const overallAnalysis = useMemo(
    () => analyzeProgress(allRequirements, transcript, plannedCourses),
    [allRequirements, transcript, plannedCourses]
  );

  const perProgramAnalyses = useMemo(
    () =>
      selectedProgramIds.map((pid) => {
        const program = majors.find((m) => m.id === pid);
        const reqs = programRequirements.filter((r) =>
          program ? r.category.startsWith(program.name + " —") : false
        );
        return { program, analysis: analyzeProgress(reqs, transcript, plannedCourses) };
      }),
    [selectedProgramIds, majors, programRequirements, transcript, plannedCourses]
  );

  const programProgressMap = useMemo(
    () => {
      const map = {};
      majors.filter((m) => m.degree_type !== "General Education").forEach((p) => {
        const reqs = catalogRequirements.filter((r) => r.major_id === p.id);
        map[p.id] = reqs.length > 0 ? analyzeProgress(reqs, transcript, plannedCourses) : null;
      });
      return map;
    },
    [majors, catalogRequirements, transcript, plannedCourses]
  );

  const addCourse = async (course) => {
    try {
      const created = await base44.entities.TranscriptCourse.create(course);
      setTranscript((t) => [created, ...t]);
    } catch (e) {
      toast({ variant: "destructive", title: "Could not add course." });
    }
  };

  const bulkAdd = async (courses) => {
    try {
      const created = await base44.entities.TranscriptCourse.bulkCreate(courses);
      setTranscript((t) => [...created, ...t]);
      toast({ title: `Imported ${created.length} courses.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Could not import courses." });
    }
  };

  const deleteCourse = async (id) => {
    try {
      await base44.entities.TranscriptCourse.delete(id);
      setTranscript((t) => t.filter((c) => c.id !== id));
    } catch (e) {
      toast({ variant: "destructive", title: "Could not delete course." });
    }
  };

  const clearAllCourses = async () => {
    try {
      await Promise.all(transcript.map((c) => base44.entities.TranscriptCourse.delete(c.id)));
      setTranscript([]);
      toast({ title: "Transcript cleared." });
    } catch (e) {
      toast({ variant: "destructive", title: "Could not clear transcript." });
    }
  };

  const addPlannedCourse = async (course) => {
    try {
      const created = await base44.entities.PlannedCourse.create(course);
      setPlannedCourses((p) => [created, ...p]);
    } catch (e) {
      toast({ variant: "destructive", title: "Could not add planned course." });
    }
  };

  const deletePlannedCourse = async (id) => {
    try {
      await base44.entities.PlannedCourse.delete(id);
      setPlannedCourses((p) => p.filter((c) => c.id !== id));
    } catch (e) {
      toast({ variant: "destructive", title: "Could not delete planned course." });
    }
  };

  const clearAllPlanned = async () => {
    try {
      await Promise.all(plannedCourses.map((c) => base44.entities.PlannedCourse.delete(c.id)));
      setPlannedCourses([]);
      toast({ title: "Planned courses cleared." });
    } catch (e) {
      toast({ variant: "destructive", title: "Could not clear planned courses." });
    }
  };

  const hasSelection = selectedProgramIds.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Maverick Degree Audit</h1>
            <p className="text-xs text-muted-foreground">Minnesota State University, Mankato</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Major progress tracker
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Programs
            </h2>
            {loadingMajors ? (
              <div className="h-12 animate-pulse rounded-lg bg-muted" />
            ) : (
              <ProgramSelector
                programs={selectablePrograms}
                selectedIds={selectedProgramIds}
                programProgress={programProgressMap}
                onToggle={(id) =>
                  setSelectedProgramIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                  )
                }
              />
            )}
          </section>

          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                My transcript
              </h2>
              <TranscriptManager
                courses={transcript}
                courseCatalog={courseCatalog}
                onAdd={addCourse}
                onBulkAdd={bulkAdd}
                onDelete={deleteCourse}
                onClearAll={clearAllCourses}
              />
            </section>
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                <CalendarPlus className="h-3.5 w-3.5 text-violet-500" />
                Planned courses
              </h2>
              <PlannedCourseManager
                courses={plannedCourses}
                courseCatalog={courseCatalog}
                onAdd={addPlannedCourse}
                onDelete={deletePlannedCourse}
                onClearAll={clearAllPlanned}
              />
            </section>
          </div>
        </div>

        {hasSelection ? (
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <ProgressOverview overallAnalysis={overallAnalysis} perProgramAnalyses={perProgramAnalyses} />
            </section>

            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  What's left
                </h2>
              </div>
              <RemainingSummary analysis={overallAnalysis} />
            </section>

            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Requirement breakdown
              </h2>
              {loadingReqs ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                <RequirementProgress categories={overallAnalysis.categories} />
              )}
            </section>
          </div>
        ) : (
          !loadingMajors && (
            <div className="text-center py-20">
              <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Select programs to start auditing your degree progress.
              </p>
            </div>
          )
        )}
      </main>
    </div>
  );
}