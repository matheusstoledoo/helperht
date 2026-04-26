import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualTrainingPlanFormProps {
  userId: string;
  patientId: string | null;
  onSaved: () => void;
  onCancel: () => void;
  editingPlan?: any;
}

interface ExerciseInput {
  name: string;
  sets: string;
  reps: string;
  load: string;
  rest: string;
  notes: string;
}

interface SessionInput {
  name: string;
  day: string;
  duration: string;
  intensity: string;
  exercises: ExerciseInput[];
  notes: string;
  expanded: boolean;
}

const SPORT_OPTIONS = [
  { value: "musculacao", label: "Musculação" },
  { value: "corrida", label: "Corrida" },
  { value: "ciclismo", label: "Ciclismo" },
  { value: "natacao", label: "Natação" },
  { value: "triatlo", label: "Triátlo" },
  { value: "funcional", label: "Funcional" },
  { value: "crossfit", label: "CrossFit" },
  { value: "yoga", label: "Yoga" },
  { value: "pilates", label: "Pilates" },
  { value: "luta", label: "Lutas / Artes Marciais" },
  { value: "esporte_coletivo", label: "Esporte Coletivo" },
  { value: "outro", label: "Outro" },
];

const DAY_OPTIONS = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo",
];

const emptyExercise = (): ExerciseInput => ({
  name: "", sets: "", reps: "", load: "", rest: "", notes: "",
});

const emptySession = (index: number): SessionInput => ({
  name: `Treino ${String.fromCharCode(65 + index)}`,
  day: "",
  duration: "",
  intensity: "",
  exercises: [emptyExercise()],
  notes: "",
  expanded: true,
});

export default function ManualTrainingPlanForm({ userId, patientId, onSaved, onCancel, editingPlan }: ManualTrainingPlanFormProps) {
  const isEditing = !!editingPlan;

  const initialSessions: SessionInput[] = (() => {
    const raw = Array.isArray(editingPlan?.sessions) ? editingPlan.sessions : [];
    if (raw.length === 0) return [emptySession(0)];
    return raw.map((s: any, idx: number) => ({
      name: s?.name ?? `Treino ${String.fromCharCode(65 + idx)}`,
      day: s?.day ?? "",
      duration: s?.duration ? String(s.duration) : "",
      intensity: s?.intensity ?? "",
      notes: s?.notes ?? "",
      exercises: Array.isArray(s?.exercises) && s.exercises.length > 0
        ? s.exercises.map((e: any) => ({
            name: e?.name ?? "",
            sets: e?.sets != null ? String(e.sets) : "",
            reps: e?.reps != null ? String(e.reps) : "",
            load: e?.load != null ? String(e.load) : "",
            rest: e?.rest != null ? String(e.rest) : "",
            notes: e?.notes ?? "",
          }))
        : [emptyExercise()],
      expanded: false,
    }));
  })();

  const [sport, setSport] = useState<string>(editingPlan?.sport ?? "musculacao");
  const [frequency, setFrequency] = useState<string>(
    editingPlan?.frequency_per_week ? String(editingPlan.frequency_per_week) : ""
  );
  const [observations, setObservations] = useState<string>(editingPlan?.observations ?? "");
  const [sessions, setSessions] = useState<SessionInput[]>(initialSessions);
  const [saving, setSaving] = useState(false);

  const updateSession = (idx: number, patch: Partial<SessionInput>) => {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const addSession = () => {
    setSessions(prev => [...prev, emptySession(prev.length)]);
  };

  const removeSession = (idx: number) => {
    setSessions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (sIdx: number, eIdx: number, patch: Partial<ExerciseInput>) => {
    setSessions(prev => prev.map((s, si) => si === sIdx ? {
      ...s,
      exercises: s.exercises.map((ex, ei) => ei === eIdx ? { ...ex, ...patch } : ex),
    } : s));
  };

  const addExercise = (sIdx: number) => {
    setSessions(prev => prev.map((s, si) => si === sIdx ? {
      ...s, exercises: [...s.exercises, emptyExercise()],
    } : s));
  };

  const removeExercise = (sIdx: number, eIdx: number) => {
    setSessions(prev => prev.map((s, si) => si === sIdx ? {
      ...s, exercises: s.exercises.filter((_, ei) => ei !== eIdx),
    } : s));
  };

  const handleSave = async () => {
    const validSessions = sessions.filter(s => s.exercises.some(e => e.name.trim()));
    if (validSessions.length === 0) {
      toast.error("Adicione pelo menos um exercício");
      return;
    }

    setSaving(true);
    const sessionsPayload = validSessions.map(s => ({
      name: s.name,
      day: s.day || undefined,
      duration: s.duration || undefined,
      intensity: s.intensity || undefined,
      notes: s.notes || undefined,
      exercises: s.exercises.filter(e => e.name.trim()).map(e => ({
        name: e.name,
        sets: e.sets ? parseInt(e.sets) : undefined,
        reps: e.reps || undefined,
        load: e.load || undefined,
        rest: e.rest || undefined,
        notes: e.notes || undefined,
      })),
    }));

    const { error } = isEditing
      ? await supabase
          .from("training_plans")
          .update({
            sport,
            frequency_per_week: frequency ? parseInt(frequency) : null,
            observations: observations.trim() || null,
            sessions: sessionsPayload,
          })
          .eq("id", editingPlan.id)
      : await supabase.from("training_plans").insert({
          user_id: userId,
          patient_id: patientId,
          sport,
          frequency_per_week: frequency ? parseInt(frequency) : null,
          observations: observations.trim() || null,
          sessions: sessionsPayload,
          status: "active",
          start_date: new Date().toISOString().slice(0, 10),
        });

    setSaving(false);
    if (error) {
      toast.error(isEditing ? "Erro ao atualizar plano de treino" : "Erro ao salvar plano de treino");
      return;
    }
    toast.success(isEditing ? "Plano atualizado! 💪" : "Plano de treino criado! 💪");
    onSaved();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              {isEditing ? "Editar Plano de Treino" : "Novo Plano de Treino"}
            </h3>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Modalidade</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPORT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequência (x/semana)</Label>
              <Input type="number" placeholder="Ex: 4" value={frequency} onChange={e => setFrequency(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações gerais</Label>
            <Textarea placeholder="Ex: Foco em hipertrofia de membros superiores..." value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {sessions.map((session, sIdx) => (
        <Card key={sIdx}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-sm font-medium"
                onClick={() => updateSession(sIdx, { expanded: !session.expanded })}
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {String.fromCharCode(65 + sIdx)}
                </div>
                {session.name || `Treino ${String.fromCharCode(65 + sIdx)}`}
                {session.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {sessions.length > 1 && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSession(sIdx)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {session.expanded && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome da sessão</Label>
                    <Input placeholder="Ex: Peito e Tríceps" value={session.name} onChange={e => updateSession(sIdx, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dia</Label>
                    <Select value={session.day} onValueChange={v => updateSession(sIdx, { day: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {DAY_OPTIONS.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Exercícios</Label>
                  {session.exercises.map((ex, eIdx) => (
                    <div key={eIdx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono w-5">{eIdx + 1}.</span>
                        <Input
                          placeholder="Nome do exercício"
                          value={ex.name}
                          onChange={e => updateExercise(sIdx, eIdx, { name: e.target.value })}
                          className="flex-1"
                        />
                        {session.exercises.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeExercise(sIdx, eIdx)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 ml-7">
                        <Input placeholder="Séries" value={ex.sets} onChange={e => updateExercise(sIdx, eIdx, { sets: e.target.value })} className="text-xs" />
                        <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(sIdx, eIdx, { reps: e.target.value })} className="text-xs" />
                        <Input placeholder="Carga" value={ex.load} onChange={e => updateExercise(sIdx, eIdx, { load: e.target.value })} className="text-xs" />
                        <Input placeholder="Descanso" value={ex.rest} onChange={e => updateExercise(sIdx, eIdx, { rest: e.target.value })} className="text-xs" />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => addExercise(sIdx)}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar exercício
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={addSession}>
        <Plus className="h-4 w-4 mr-1" /> Adicionar sessão de treino
      </Button>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Salvando..." : "Criar plano de treino"}
      </Button>
    </div>
  );
}
