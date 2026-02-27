import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Plus, X, Check, Clock, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface WorkoutLoggerProps {
  userId: string;
  patientId: string | null;
}

interface WorkoutLog {
  id: string;
  workout_type: string;
  duration_minutes: number | null;
  rpe: number | null;
  notes: string | null;
  log_date: string;
  created_at: string;
}

const WORKOUT_TYPES = [
  { value: "musculacao", label: "Musculação" },
  { value: "corrida", label: "Corrida" },
  { value: "ciclismo", label: "Ciclismo" },
  { value: "natacao", label: "Natação" },
  { value: "funcional", label: "Funcional" },
  { value: "yoga", label: "Yoga / Pilates" },
  { value: "outro", label: "Outro" },
];

export default function WorkoutLogger({ userId, patientId }: WorkoutLoggerProps) {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [workoutType, setWorkoutType] = useState("musculacao");
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState([5]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLogs = async () => {
    // We'll store workout logs in clinical_events with event_type = 'workout_log'
    const { data } = await supabase
      .from("clinical_events")
      .select("*")
      .eq("event_type", "workout_log")
      .order("recorded_at", { ascending: false })
      .limit(30);

    if (data) {
      setLogs(
        data.map((d) => ({
          id: d.id,
          workout_type: (d.structured_payload as any)?.workout_type || "outro",
          duration_minutes: (d.structured_payload as any)?.duration_minutes || null,
          rpe: (d.structured_payload as any)?.rpe || null,
          notes: (d.structured_payload as any)?.notes || null,
          log_date: d.recorded_at.slice(0, 10),
          created_at: d.created_at,
        }))
      );
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userId]);

  const handleSave = async () => {
    if (!patientId) {
      toast.error("Dados do paciente não encontrados");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("clinical_events").insert({
      patient_id: patientId,
      event_type: "workout_log",
      source: "patient",
      structured_payload: {
        workout_type: workoutType,
        duration_minutes: duration ? parseInt(duration) : null,
        rpe: rpe[0],
        notes: notes.trim() || null,
      },
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar treino");
      return;
    }
    toast.success("Treino registrado! 💪");
    setWorkoutType("musculacao");
    setDuration("");
    setRpe([5]);
    setNotes("");
    setShowForm(false);
    fetchLogs();
  };

  const typeLabel = (v: string) => WORKOUT_TYPES.find((t) => t.value === v)?.label || v;

  const rpeColor = (v: number) => {
    if (v <= 3) return "text-green-600";
    if (v <= 6) return "text-amber-600";
    return "text-red-600";
  };

  const grouped = logs.reduce<Record<string, WorkoutLog[]>>((acc, l) => {
    if (!acc[l.log_date]) acc[l.log_date] = [];
    acc[l.log_date].push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-blue-500" />
          Registro de Treinos
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? "Cancelar" : "Registrar"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Modalidade</Label>
                <Select value={workoutType} onValueChange={setWorkoutType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKOUT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input type="number" placeholder="Ex: 60" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Esforço percebido (RPE): <span className={`font-bold ${rpeColor(rpe[0])}`}>{rpe[0]}/10</span></Label>
              <Slider value={rpe} onValueChange={setRpe} min={1} max={10} step={1} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Leve</span>
                <span>Moderado</span>
                <span>Máximo</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Como foi o treino? Alguma dor ou desconforto?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar treino"}
            </Button>
          </CardContent>
        </Card>
      )}

      {logs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhum treino registrado</p>
            <p className="text-sm text-muted-foreground mt-1">Registre seus treinos para acompanhar sua evolução</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {format(new Date(date + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{typeLabel(item.workout_type)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.duration_minutes && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {item.duration_minutes}min
                            </span>
                          )}
                          {item.rpe && (
                            <span className={`flex items-center gap-0.5 font-medium ${rpeColor(item.rpe)}`}>
                              <Flame className="h-3 w-3" /> RPE {item.rpe}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground mt-2 ml-11">{item.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
