import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Trophy, Dumbbell, LayoutTemplate, Check, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { markDataUpdated } from "@/lib/healthDataEvents";

interface StrengthWorkoutLoggerProps {
  userId: string;
  patientId: string | null;
  onSaved?: () => void;
}

interface SetEntry {
  id: string;
  weight: string;
  reps: string;
  rest: string;
  feel: number | null;
  pain: number;
  isPR?: boolean;
}

interface ExerciseEntry {
  id: string;
  name: string;
  sets: SetEntry[];
}

interface Template {
  id: string;
  name: string;
  exercises: any;
}

const FEEL_EMOJIS = [
  { value: 1, emoji: "😫" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "💪" },
];

const newSet = (): SetEntry => ({
  id: crypto.randomUUID(),
  weight: "",
  reps: "",
  rest: "",
  feel: null,
  pain: 0,
});

const newExercise = (name = ""): ExerciseEntry => ({
  id: crypto.randomUUID(),
  name,
  sets: [newSet()],
});

export default function StrengthWorkoutLogger({ userId, patientId, onSaved }: StrengthWorkoutLoggerProps) {
  const startedAtRef = useRef<number>(Date.now());
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [exerciseInput, setExerciseInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allExerciseNames, setAllExerciseNames] = useState<string[]>([]);
  const [prMap, setPrMap] = useState<Record<string, number>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [overallRpe, setOverallRpe] = useState([7]);
  const [notes, setNotes] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);

  // Carregar nomes distintos para autocomplete e PRs
  useEffect(() => {
    (async () => {
      const { data: setsData } = await supabase
        .from("workout_sets")
        .select("exercise_name")
        .eq("user_id", userId)
        .limit(1000);
      if (setsData) {
        const names = Array.from(new Set(setsData.map((s: any) => s.exercise_name).filter(Boolean)));
        setAllExerciseNames(names);
      }

      const { data: prData } = await supabase
        .from("personal_records")
        .select("exercise_name, one_rep_max")
        .eq("user_id", userId);
      if (prData) {
        const map: Record<string, number> = {};
        prData.forEach((p: any) => {
          const v = Number(p.one_rep_max) || 0;
          if (!map[p.exercise_name] || v > map[p.exercise_name]) map[p.exercise_name] = v;
        });
        setPrMap(map);
      }

      const { data: tplData } = await supabase
        .from("workout_templates")
        .select("id, name, exercises")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (tplData) setTemplates(tplData as Template[]);
    })();
  }, [userId]);

  useEffect(() => {
    const q = exerciseInput.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    setSuggestions(allExerciseNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 5));
  }, [exerciseInput, allExerciseNames]);

  const addExercise = (name?: string) => {
    const finalName = (name ?? exerciseInput).trim();
    if (!finalName) return;
    setExercises((prev) => [...prev, newExercise(finalName)]);
    setExerciseInput("");
    setSuggestions([]);
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const addSet = (exId: string) => {
    setExercises((prev) => prev.map((e) => (e.id === exId ? { ...e, sets: [...e.sets, newSet()] } : e)));
  };

  const removeSet = (exId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === exId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e)),
    );
  };

  const updateSet = (exId: string, setId: string, patch: Partial<SetEntry>) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exId) return e;
        return {
          ...e,
          sets: e.sets.map((s) => {
            if (s.id !== setId) return s;
            const next = { ...s, ...patch };
            const w = parseFloat(next.weight);
            const r = parseInt(next.reps);
            if (!isNaN(w) && !isNaN(r) && r > 0) {
              const orm = w * (1 + r / 30);
              const currentPR = prMap[e.name] ?? 0;
              next.isPR = orm > currentPR;
            } else {
              next.isPR = false;
            }
            return next;
          }),
        };
      }),
    );
  };

  const applyTemplate = (tpl: Template) => {
    const items = Array.isArray(tpl.exercises) ? tpl.exercises : [];
    const mapped = items
      .map((it: any) => {
        const name = typeof it === "string" ? it : it?.name;
        return name ? newExercise(String(name)) : null;
      })
      .filter(Boolean) as ExerciseEntry[];
    setExercises((prev) => [...prev, ...mapped]);
    setTemplateSheetOpen(false);
  };

  const handleFinalize = async () => {
    if (exercises.length === 0) {
      toast.error("Adicione pelo menos um exercício");
      return;
    }
    setSaving(true);
    const durationMin = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000));
    const today = new Date().toISOString().split("T")[0];

    const { data: logData, error: logError } = await supabase
      .from("workout_logs")
      .insert({
        user_id: userId,
        patient_id: patientId,
        sport: "musculacao",
        source: "manual",
        activity_date: today,
        duration_minutes: durationMin,
        perceived_effort: overallRpe[0],
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (logError || !logData) {
      setSaving(false);
      toast.error("Erro ao salvar treino");
      return;
    }

    const logId = logData.id;
    const setRows: any[] = [];
    const prRows: any[] = [];
    const prSeenForExercise: Record<string, number> = {};

    exercises.forEach((ex) => {
      ex.sets.forEach((s, idx) => {
        const w = parseFloat(s.weight);
        const r = parseInt(s.reps);
        setRows.push({
          workout_log_id: logId,
          user_id: userId,
          patient_id: patientId,
          exercise_name: ex.name,
          set_number: idx + 1,
          load_kg: isNaN(w) ? null : w,
          reps: isNaN(r) ? null : r,
          rest_seconds: s.rest ? parseInt(s.rest) : null,
          exercise_feel: s.feel,
          exercise_pain: s.pain,
        });

        if (!isNaN(w) && !isNaN(r) && r > 0) {
          const orm = w * (1 + r / 30);
          const currentPR = prMap[ex.name] ?? 0;
          const bestThisSession = prSeenForExercise[ex.name] ?? 0;
          if (orm > currentPR && orm > bestThisSession) {
            prSeenForExercise[ex.name] = orm;
          }
        }
      });

      const bestOrm = prSeenForExercise[ex.name];
      if (bestOrm) {
        // pegar a série que gerou esse PR (a maior orm)
        let bestSet: SetEntry | null = null;
        let bestVal = 0;
        ex.sets.forEach((s) => {
          const w = parseFloat(s.weight);
          const r = parseInt(s.reps);
          if (!isNaN(w) && !isNaN(r) && r > 0) {
            const orm = w * (1 + r / 30);
            if (orm > bestVal) {
              bestVal = orm;
              bestSet = s;
            }
          }
        });
        if (bestSet) {
          prRows.push({
            user_id: userId,
            exercise_name: ex.name,
            weight_kg: parseFloat(bestSet.weight),
            reps: parseInt(bestSet.reps),
            one_rep_max: bestVal,
            workout_log_id: logId,
            recorded_at: today,
          });
        }
      }
    });

    if (setRows.length > 0) {
      const { error: setsError } = await supabase.from("workout_sets").insert(setRows);
      if (setsError) console.error("Erro ao salvar séries:", setsError);
    }

    if (prRows.length > 0) {
      const { error: prError } = await supabase.from("personal_records").insert(prRows);
      if (prError) console.error("Erro ao salvar PRs:", prError);
    }

    // Streaks
    const { data: streakData } = await supabase
      .from("training_streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const todayDate = new Date(today + "T12:00:00");
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (streakData) {
      let current = streakData.current_streak ?? 0;
      const last = streakData.last_workout_date;
      if (last === today) {
        // já registrado hoje, mantém
      } else if (last === yesterdayStr) {
        current += 1;
      } else {
        current = 1;
      }
      const longest = Math.max(streakData.longest_streak ?? 0, current);
      await supabase
        .from("training_streaks")
        .update({
          current_streak: current,
          longest_streak: longest,
          last_workout_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", streakData.id);
    } else {
      await supabase.from("training_streaks").insert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_workout_date: today,
      });
    }

    if (saveAsTemplate && templateName.trim()) {
      await supabase.from("workout_templates").insert({
        user_id: userId,
        patient_id: patientId,
        name: templateName.trim(),
        exercises: exercises.map((e) => ({ name: e.name })),
      });
    }

    setSaving(false);
    markDataUpdated();
    toast.success("Treino registrado! 💪");
    setExercises([]);
    setShowFinalize(false);
    setNotes("");
    setOverallRpe([7]);
    setSaveAsTemplate(false);
    setTemplateName("");
    startedAtRef.current = Date.now();
    onSaved?.();
  };

  const totalSets = useMemo(() => exercises.reduce((acc, e) => acc + e.sets.length, 0), [exercises]);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-blue-500" />
          Treino de Musculação
        </h3>
        <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <LayoutTemplate className="h-4 w-4 mr-1" />
              Usar template
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Templates de treino</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum template salvo ainda</p>
              ) : (
                templates.map((tpl) => (
                  <Card key={tpl.id} className="cursor-pointer hover:bg-accent" onClick={() => applyTemplate(tpl)}>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(tpl.exercises) ? tpl.exercises.length : 0} exercícios
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Adicionar exercício */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <Label>Adicionar exercício</Label>
          <div className="relative flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Ex: Supino reto"
                value={exerciseInput}
                onChange={(e) => setExerciseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExercise();
                  }
                }}
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => addExercise(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => addExercise()} disabled={!exerciseInput.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de exercícios */}
      {exercises.map((ex) => (
        <Card key={ex.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{ex.name}</p>
              <Button size="sm" variant="ghost" onClick={() => removeExercise(ex.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {ex.sets.map((s, idx) => (
                <div key={s.id} className="space-y-2 rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-8">#{idx + 1}</span>
                    <Input
                      type="number"
                      placeholder="kg"
                      value={s.weight}
                      onChange={(e) => updateSet(ex.id, s.id, { weight: e.target.value })}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      placeholder="reps"
                      value={s.reps}
                      onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value })}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      placeholder="desc(s)"
                      value={s.rest}
                      onChange={(e) => updateSet(ex.id, s.id, { rest: e.target.value })}
                      className="h-9"
                    />
                    {s.isPR && (
                      <Badge className="bg-amber-500 hover:bg-amber-500 text-white shrink-0">
                        <Trophy className="h-3 w-3 mr-1" />
                        PR!
                      </Badge>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeSet(ex.id, s.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 pl-10">
                    <div className="flex gap-1">
                      {FEEL_EMOJIS.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => updateSet(ex.id, s.id, { feel: f.value })}
                          className={`text-lg w-8 h-8 rounded ${s.feel === f.value ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-accent"}`}
                        >
                          {f.emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 pl-10 pr-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Dor/desconforto</Label>
                      <span className="text-xs font-medium">{s.pain}/10</span>
                    </div>
                    <Slider
                      value={[s.pain]}
                      onValueChange={(v) => updateSet(ex.id, s.id, { pain: v[0] })}
                      min={0}
                      max={10}
                      step={1}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button size="sm" variant="outline" className="w-full" onClick={() => addSet(ex.id)}>
              <Plus className="h-3 w-3 mr-1" /> Série
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Finalizar */}
      {exercises.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-20">
          <div className="max-w-2xl mx-auto space-y-3">
            {showFinalize && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>RPE geral: <span className="font-bold">{overallRpe[0]}/10</span></Label>
                    <Slider value={overallRpe} onValueChange={setOverallRpe} min={1} max={10} step={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notas (opcional)</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="save-template"
                      checked={saveAsTemplate}
                      onCheckedChange={(v) => setSaveAsTemplate(!!v)}
                    />
                    <Label htmlFor="save-template" className="text-sm">Salvar como template</Label>
                  </div>
                  {saveAsTemplate && (
                    <Input
                      placeholder="Nome do template"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  )}
                </CardContent>
              </Card>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFinalize(false)}
                className={showFinalize ? "" : "hidden"}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={saving}
                onClick={() => {
                  if (!showFinalize) setShowFinalize(true);
                  else handleFinalize();
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : showFinalize ? "Confirmar" : `Finalizar treino (${totalSets} séries)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
