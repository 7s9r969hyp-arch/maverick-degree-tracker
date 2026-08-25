import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap, Sparkles } from "lucide-react";
import MajorSelector from "@/components/major/MajorSelector";
import TranscriptManager from "@/components/transcript/TranscriptManager";
import ProgressOverview from "@/components/progress/ProgressOverview";
import RequirementProgress from "@/components/progress/RequirementProgress";
import RemainingSummary from "@/components/progress/RemainingSummary";
import { analyzeProgress } from "@/lib/degreeUtils";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [majors, setMajors] = useState([]);
  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [requirements, setRequirements] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [loadingMajors, setLoadingMajors] = useState(true);
  const [loadingReqs, setLoadingReqs] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.Major.list("name", 100);
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
    if (!selectedMajorId) {
      setRequirements([]);
      return;
    }
    setLoadingReqs(true);
    (async () => {
      try {
        const data = await base44.entities.Requirement.filter({ major_id: selectedMajorId }, "category", 500);
        setRequirements(data);
      } catch (e) {
        toast({ variant: "destructive", title: "Could not load requirements." });
        setRequirements([]);
      } finally {
        setLoadingReqs(false);
      }
    })();
  }, [selectedMajorId]);

  const analysis = useMemo(
    () => analyzeProgress(requirements, transcript),
    [requirements, transcript]
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
        <div className="mb-8">
          {loadingMajors ? (
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          ) : (
            <MajorSelector
              majors={majors}
              selectedMajorId={selectedMajorId}
              onSelect={setSelectedMajorId}
            />
          )}
        </div>

        {selectedMajorId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <ProgressOverview analysis={analysis} />
              </section>

              <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    What's left
                  </h2>
                </div>
                <RemainingSummary analysis={analysis} />
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
                  <RequirementProgress categories={analysis.categories} />
                )}
              </section>
            </div>

            <aside className="lg:col-span-1">
              <section className="rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-24">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  My transcript
                </h2>
                <TranscriptManager
                  courses={transcript}
                  onAdd={addCourse}
                  onBulkAdd={bulkAdd}
                  onDelete={deleteCourse}
                />
              </section>
            </aside>
          </div>
        )}

        {!selectedMajorId && !loadingMajors && (
          <div className="text-center py-20">
            <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Select a major above to start auditing your degree progress.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}