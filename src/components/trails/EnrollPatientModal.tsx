import { useState, useMemo } from "react";
import { ArrowLeft, Calendar, Clock, Loader2, Plus, Route } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TrailWizard } from "./TrailWizard";
import {
  TRAIL_LIBRARY,
  CATEGORY_META,
  type TrailLibraryItem,
  type TrailLibraryCategory,
} from "@/config/trailLibrary";

interface EnrollPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

interface CustomTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  category: string;
}

interface SelectedTemplate {
  slug: string;
  name: string;
  description: string;
  duration_weeks: number;
  category: string;
  isCustom: boolean;
  existingId?: string; // template_id em track_templates se já existir
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export const EnrollPatientModal = ({
  open,
  onOpenChange,
  patientId,
  patientName,
}: EnrollPatientModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<SelectedTemplate | null>(null);
  const [startDate, setStartDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  // Trilhas customizadas do profissional
  const { data: customTemplates = [] } = useQuery<CustomTemplate[]>({
    queryKey: ["track-templates", "mine", user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("track_templates")
        .select("id, slug, name, description, duration_weeks, category")
        .eq("is_system", false)
        .eq("created_by", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomTemplate[];
    },
  });

  // Trilhas (care_trails) criadas pelo profissional
  const { data: myCareTrails = [] } = useQuery<
    { id: string; name: string; description: string | null; duration_days: number; clinical_condition: string | null }[]
  >({
    queryKey: ["care-trails", "mine", user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_trails")
        .select("id, name, description, duration_days, clinical_condition")
        .eq("professional_id", user!.id)
        .eq("is_template", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Slugs já existentes no banco (para resolver template_id da biblioteca quando já tiver sido seedada)
  const librarySlugs = useMemo(() => TRAIL_LIBRARY.map((t) => t.slug), []);
  const { data: existingLibraryRows = [] } = useQuery<{ id: string; slug: string }[]>({
    queryKey: ["track-templates", "library-existing"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("track_templates")
        .select("id, slug")
        .in("slug", librarySlugs);
      if (error) throw error;
      return data ?? [];
    },
  });

  const existingMap = useMemo(() => {
    const m = new Map<string, string>();
    existingLibraryRows.forEach((r) => m.set(r.slug, r.id));
    return m;
  }, [existingLibraryRows]);

  const grouped = useMemo(() => {
    const g: Record<TrailLibraryCategory, TrailLibraryItem[]> = {
      clinica: [],
      composicao_corporal: [],
      performance: [],
    };
    TRAIL_LIBRARY.forEach((t) => g[t.category].push(t));
    return g;
  }, []);

  const enroll = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selected) throw new Error("Dados incompletos");

      // 1. Garantir track_template
      let templateId = selected.existingId ?? null;
      if (!templateId) {
        const { data: tpl, error: tplErr } = await supabase
          .from("track_templates")
          .insert({
            slug: selected.slug,
            name: selected.name,
            description: selected.description,
            duration_weeks: selected.duration_weeks,
            category: selected.category,
            is_system: !selected.isCustom,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (tplErr) throw tplErr;
        templateId = tpl.id;
      }

      // 2. Criar care_trails (status=active) baseada no template
      const durationDays = selected.duration_weeks * 7;
      const { data: trail, error: trailErr } = await supabase
        .from("care_trails")
        .insert({
          professional_id: user.id,
          name: selected.name,
          description: selected.description,
          duration_days: durationDays,
          status: "active",
          is_template: false,
          activated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (trailErr) throw trailErr;

      // 3. Inserir enrollment
      const start = new Date(startDate);
      const expectedEnd = new Date(start);
      expectedEnd.setDate(expectedEnd.getDate() + durationDays);

      const { data: enrollment, error: enrErr } = await supabase
        .from("trail_enrollments")
        .insert({
          trail_id: trail.id,
          template_id: templateId,
          patient_id: patientId,
          enrolled_by: user.id,
          status: "active",
          started_at: start.toISOString(),
          expected_end_date: expectedEnd.toISOString().slice(0, 10),
          custom_notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (enrErr) throw enrErr;
      return enrollment;
    },
    onSuccess: () => {
      toast.success("Paciente vinculado à trilha!");
      queryClient.invalidateQueries({ queryKey: ["patient-enrollments", patientId] });
      queryClient.invalidateQueries({ queryKey: ["trail-enrollments"] });
      handleClose();
    },
    onError: (err: any) => {
      console.error("[Enroll] erro:", err);
      toast.error("Erro ao vincular: " + (err.message ?? "desconhecido"));
    },
  });

  const handleClose = () => {
    setSelected(null);
    setStartDate(todayISO());
    setNotes("");
    onOpenChange(false);
  };

  const selectLibrary = (item: TrailLibraryItem) => {
    setSelected({
      slug: item.slug,
      name: item.name,
      description: item.description,
      duration_weeks: item.duration_weeks,
      category: item.category,
      isCustom: false,
      existingId: existingMap.get(item.slug),
    });
  };

  const selectCustom = (tpl: CustomTemplate) => {
    setSelected({
      slug: tpl.slug,
      name: tpl.name,
      description: tpl.description ?? "",
      duration_weeks: tpl.duration_weeks ?? 12,
      category: tpl.category,
      isCustom: true,
      existingId: tpl.id,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {selected ? "Confirmar vínculo" : "Biblioteca de Trilhas"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `Vincular "${selected.name}" a ${patientName}`
                : `Escolha uma trilha científica para ${patientName}`}
            </DialogDescription>
          </DialogHeader>

          {!selected ? (
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-6">
                {(Object.keys(grouped) as TrailLibraryCategory[]).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  return (
                    <section key={cat}>
                      <h3 className={`text-sm font-semibold mb-2 ${meta.textClass}`}>
                        {meta.label}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {grouped[cat].map((item) => (
                          <button
                            key={item.slug}
                            onClick={() => selectLibrary(item)}
                            className={`text-left rounded-lg border p-3 transition-colors ${meta.bgClass} ${meta.borderClass}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`font-medium text-sm ${meta.textClass}`}>
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              </div>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                {item.duration_weeks}sem
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}

                {/* Minhas trilhas */}
                <section>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                    Minhas trilhas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => selectCustom(tpl)}
                        className="text-left rounded-lg border bg-muted/40 hover:bg-muted p-3 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm flex items-center gap-1">
                              <Route className="h-3 w-3" />
                              {tpl.name}
                            </p>
                            {tpl.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {tpl.description}
                              </p>
                            )}
                          </div>
                          {tpl.duration_weeks && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                              <Clock className="h-3 w-3" />
                              {tpl.duration_weeks}sem
                            </span>
                          )}
                        </div>
                      </button>
                    ))}

                    <button
                      onClick={() => setWizardOpen(true)}
                      className="text-left rounded-lg border border-dashed p-3 hover:bg-accent/40 transition-colors flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      Criar nova trilha
                    </button>
                  </div>
                </section>

                {/* Minhas Trilhas (care_trails do profissional) */}
                {myCareTrails.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold mb-2 text-foreground">
                      Minhas Trilhas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {myCareTrails.map((ct) => {
                        const weeks = Math.max(1, Math.round((ct.duration_days || 0) / 7));
                        return (
                          <button
                            key={ct.id}
                            onClick={() =>
                              setSelected({
                                slug: `care-trail-${ct.id}`,
                                name: ct.name,
                                description: ct.description ?? "",
                                duration_weeks: weeks,
                                category: ct.clinical_condition ?? "custom",
                                isCustom: true,
                              })
                            }
                            className="text-left rounded-lg border bg-muted/40 hover:bg-muted p-3 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm flex items-center gap-1">
                                  <Route className="h-3 w-3" />
                                  {ct.name}
                                </p>
                                {ct.clinical_condition && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {ct.clinical_condition}
                                  </p>
                                )}
                              </div>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                {weeks}sem
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="font-medium">{selected.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3" />
                  Duração: {selected.duration_weeks} semanas
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Data de início
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas sobre essa inscrição..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => enroll.mutate()}
                  disabled={enroll.isPending || !startDate}
                >
                  {enroll.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vinculando...
                    </>
                  ) : (
                    "Vincular ao paciente"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TrailWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        trail={null}
        onSuccess={() => {
          setWizardOpen(false);
          queryClient.invalidateQueries({ queryKey: ["track-templates", "mine"] });
        }}
      />
    </>
  );
};
