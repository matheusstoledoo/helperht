import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import FitParser from "fit-file-parser";
import { differenceInDays, format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Dumbbell,
  Flame,
  Loader2,
  MapPin,
  Plus,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import ManualTrainingPlanForm from "./ManualTrainingPlanForm";

interface TrainingHubProps {
  userId: string;
  patientId: string | null;
  onBackfillGps?: () => void | Promise<void>;
  backfillingGps?: boolean;
  hasGarminWithoutGps?: boolean;
}

interface TrainingPlan {
  id: string;
  professional_name: string | null;
  sport: string | null;
  start_date: string | null;
  end_date: string | null;
  frequency_per_week: number | null;
  sessions: any[];
  periodization_notes: string | null;
  observations: string | null;
  status: string | null;
}

interface Session {
  name: string;
  day?: string;
  exercises?: Exercise[];
  notes?: string;
  duration?: string;
  intensity?: string;
}

interface Exercise {
  name: string;
  sets?: number | string;
  reps?: number | string;
  load?: string;
  rest?: string;
  notes?: string;
}

interface ParsedRow {
  activity_name: string | null;
  sport: string;
  activity_date: string;
  duration_minutes: number | null;
  planned_duration_minutes: number | null;
  distance_km: number | null;
  tss: number | null;
  intensity_factor: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  elevation_gain_m: number | null;
  avg_pace_min_km: number | null;
  notes: string | null;
  perceived_effort: number | null;
  compliance_pct: number | null;
  srpe: number | null;
  feeling_score?: number | null;
  workout_steps?: any;
  raw_data?: any;
}

const SPORT_LABELS: Record<string, string> = {
  musculacao: "Musculação",
  corrida: "Corrida",
  ciclismo: "Ciclismo",
  natacao: "Natação",
  triatlo: "Triátlo",
  funcional: "Funcional",
  crossfit: "CrossFit",
  yoga: "Yoga",
  pilates: "Pilates",
  luta: "Lutas / Artes Marciais",
  esporte_coletivo: "Esporte Coletivo",
  outro: "Outro",
};

const WORKOUT_TYPES = [
  { value: "musculacao", label: "Musculação" },
  { value: "corrida", label: "Corrida" },
  { value: "ciclismo", label: "Ciclismo" },
  { value: "natacao", label: "Natação" },
  { value: "funcional", label: "Funcional" },
  { value: "yoga", label: "Yoga / Pilates" },
  { value: "outro", label: "Outro" },
];

const SPORT_MAP: Record<string, string> = {
  run: "corrida",
  ride: "ciclismo",
  cycling: "ciclismo",
  bike: "ciclismo",
  swim: "natacao",
  strength: "musculacao",
};

const pick = (row: any, keys: string[]): string | undefined => {
  for (const k of keys) {
    const lower = k.toLowerCase();
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase().trim() === lower) {
        const val = row[rk];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return String(val).trim();
        }
      }
    }
  }
  return undefined;
};

const parseNum = (v?: string): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

const parseInteger = (v?: string): number | null => {
  const n = parseNum(v);
  return n === null ? null : Math.round(n);
};

const parseGarminRow = (row: any): ParsedRow => {
  const mapSport = (type: string): string => {
    const t = (type || "").toLowerCase();
    if (t.includes("running") || t.includes("run")) return "corrida";
    if (t.includes("cycling") || t.includes("ride") || t.includes("bike")) return "ciclismo";
    if (t.includes("swimming") || t.includes("swim")) return "natacao";
    if (t.includes("strength") || t.includes("gym")) return "musculacao";
    if (t.includes("trail")) return "corrida";
    if (t.includes("triathlon")) return "triatlo";
    return "outro";
  };

  const parseTime = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    const clean = dateStr.split(" ")[0];
    if (clean.includes("-")) return clean.slice(0, 10);
    const parts = clean.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    return new Date().toISOString().split("T")[0];
  };

  const distRaw = parseFloat(row["Distance"] || row["Distância"] || "0");
  const distKm = distRaw > 1000 ? distRaw / 1000 : distRaw;
  const durationMin = parseTime(row["Time"] || row["Tempo"] || row["Duration"] || "");
  const perceived = parseInt(row["RPE"] || "") || null;

  return {
    activity_name: row["Title"] || row["Título"] || row["Activity Name"] || null,
    sport: mapSport(row["Activity Type"] || row["Tipo de Atividade"] || ""),
    activity_date: parseDate(row["Date"] || row["Data"] || row["Start Time"] || ""),
    duration_minutes: durationMin,
    planned_duration_minutes: null,
    distance_km: Number.isNaN(distKm) || distKm === 0 ? null : Math.round(distKm * 100) / 100,
    tss: parseNum(row["Training Stress Score"] || row["TSS"] || ""),
    intensity_factor: parseNum(row["Intensity Factor"] || row["IF"] || ""),
    avg_heart_rate: parseInteger(row["Avg HR"] || row["FC Média"] || row["Average HR"] || ""),
    max_heart_rate: parseInteger(row["Max HR"] || row["FC Máx"] || row["Maximum HR"] || ""),
    calories: parseInteger(row["Calories"] || row["Calorias"] || ""),
    elevation_gain_m: parseNum(row["Total Ascent"] || row["Subida Total"] || ""),
    avg_pace_min_km: null,
    notes: pick(row, ["Notes", "Workout Description", "Descrição"]) || null,
    perceived_effort: perceived,
    compliance_pct: null,
    srpe: durationMin && perceived ? durationMin * perceived : null,
  };
};

const parseTrainingPeaksRow = (row: any): ParsedRow => {
  const mapSport = (type: string): string => {
    const t = (type || "").toLowerCase().trim();
    if (t === "run") return "corrida";
    if (t === "ride" || t === "cycling") return "ciclismo";
    if (t === "swim") return "natacao";
    if (t === "strength") return "musculacao";
    if (t === "triathlon") return "triatlo";
    return "outro";
  };

  const plannedHours = parseFloat(row["PlannedDuration"] || "");
  const actualHours = parseFloat(row["TimeTotalInHours"] || "");
  const plannedMin = !Number.isNaN(plannedHours) ? Math.round(plannedHours * 60) : null;
  const actualMin = !Number.isNaN(actualHours) && actualHours > 0 ? Math.round(actualHours * 60) : null;
  const durationMin = actualMin ?? plannedMin;

  const distMeters = parseFloat(row["DistanceInMeters"] || "");
  const distKm = !Number.isNaN(distMeters) && distMeters > 0 ? Math.round(distMeters) / 1000 : null;

  const velMs = parseFloat(row["VelocityAverage"] || "");
  const paceMinKm = !Number.isNaN(velMs) && velMs > 0 ? Math.round((1000 / (velMs * 60)) * 100) / 100 : null;

  const tss = parseFloat(row["TSS"] || "");
  const intensityFactor = parseFloat(row["IF"] || "");
  const hrAvg = parseInt(row["HeartRateAverage"] || "");
  const hrMax = parseInt(row["HeartRateMax"] || "");
  const rpe = parseInt(row["Rpe"] || "");
  const feeling = parseInt(row["Feeling"] || "");
  const srpe = durationMin && !Number.isNaN(rpe) && rpe > 0 ? durationMin * rpe : null;

  const hrZones: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) {
    const val = parseFloat(row[`HRZone${i}Minutes`] || "");
    if (!Number.isNaN(val) && val > 0) hrZones[`zone_${i}_minutes`] = val;
  }

  return {
    activity_name: row["Title"] || null,
    sport: mapSport(row["WorkoutType"] || ""),
    activity_date: row["WorkoutDay"] || new Date().toISOString().split("T")[0],
    duration_minutes: durationMin,
    planned_duration_minutes: plannedMin,
    distance_km: distKm,
    avg_pace_min_km: paceMinKm,
    avg_heart_rate: !Number.isNaN(hrAvg) && hrAvg > 0 ? hrAvg : null,
    max_heart_rate: !Number.isNaN(hrMax) && hrMax > 0 ? hrMax : null,
    tss: !Number.isNaN(tss) && tss > 0 ? tss : null,
    intensity_factor: !Number.isNaN(intensityFactor) && intensityFactor > 0 ? intensityFactor : null,
    perceived_effort: !Number.isNaN(rpe) && rpe > 0 ? rpe : null,
    feeling_score: !Number.isNaN(feeling) && feeling > 0 ? Math.min(5, Math.round(feeling / 2)) : null,
    srpe,
    notes: [row["AthleteComments"], row["CoachComments"]].filter(Boolean).join("\n\n").trim() || null,
    workout_steps: row["WorkoutDescription"] ? { description: row["WorkoutDescription"] } : null,
    raw_data: Object.keys(hrZones).length > 0 ? hrZones : null,
    calories: null,
    elevation_gain_m: null,
    compliance_pct: null,
  };
};

const parseGarminFit = (file: File): Promise<ParsedRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const parser = new (FitParser as any)({
        force: true,
        speedUnit: "km/h",
        lengthUnit: "km",
        temperatureUnit: "celsius",
        elapsedRecordField: true,
        mode: "both",
      });

      parser.parse(buffer, (err: any, data: any) => {
        if (err) {
          reject(err);
          return;
        }

        const sessions = data.sessions || data.activity?.sessions || [];
        const rows: ParsedRow[] = sessions.map((s: any) => {
          const name = (s.sport_profile_name || s.sport || "").toLowerCase();
          const sport = name.includes("run") || name.includes("corrid")
            ? "corrida"
            : name.includes("bike") || name.includes("ride") || name.includes("cicl")
              ? "ciclismo"
              : name.includes("swim") || name.includes("nat")
                ? "natacao"
                : name.includes("strength") || name.includes("força") || name.includes("gym")
                  ? "musculacao"
                  : name.includes("triathl")
                    ? "triatlo"
                    : "outro";

          const startTime = new Date(s.start_time);
          const activityDate = !Number.isNaN(startTime.getTime())
            ? startTime.toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];

          const durationMin = s.total_timer_time ? Math.round(s.total_timer_time / 60) : null;
          const distanceKm = s.total_distance ? Math.round((s.total_distance / 1000) * 100) / 100 : null;
          const pace = distanceKm && durationMin ? Math.round((durationMin / distanceKm) * 100) / 100 : null;

          return {
            activity_name: s.event ? `${SPORT_LABELS[sport] || "Atividade"} ${s.event}` : null,
            sport,
            activity_date: activityDate,
            duration_minutes: durationMin,
            planned_duration_minutes: null,
            distance_km: distanceKm,
            tss: s.training_stress_score ?? null,
            intensity_factor: s.intensity_factor ?? null,
            avg_heart_rate: s.avg_heart_rate ?? null,
            max_heart_rate: s.max_heart_rate ?? null,
            calories: s.total_calories ?? null,
            elevation_gain_m: s.total_ascent ?? null,
            avg_pace_min_km: pace,
            notes: null,
            perceived_effort: null,
            compliance_pct: null,
            srpe: null,
          };
        });

        resolve(rows.filter((row) => row.activity_date));
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

export default function TrainingHub({ userId, patientId, onBackfillGps, backfillingGps, hasGarminWithoutGps }: TrainingHubProps) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [timePeriod, setTimePeriod] = useState<"4s" | "1m" | "3m">("4s");
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [showSessions, setShowSessions] = useState(false);
  const [importTab, setImportTab] = useState<"menu" | "trainingpeaks" | "garmin" | "manual">("menu");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parsingFile, setParsingFile] = useState(false);
  const [importingRows, setImportingRows] = useState(false);
  const [workoutType, setWorkoutType] = useState("musculacao");
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState([5]);
  const [notes, setNotes] = useState("");
  const [savingWorkout, setSavingWorkout] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const days = timePeriod === "3m" ? 90 : timePeriod === "1m" ? 30 : 28;
    const [plansRes, logsRes] = await Promise.all([
      supabase
        .from("training_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("activity_date", subDays(new Date(), days).toISOString().split("T")[0])
        .order("activity_date", { ascending: true }),
    ]);

    setPlans(plansRes.data || []);
    const filtered = (logsRes.data || []).filter(
      (l: any) => !(l.source === "strava" && !l.distance_km && !l.avg_heart_rate),
    );
    setWorkoutLogs(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId, timePeriod]);

  useEffect(() => {
    if (!showImportSheet) {
      setImportTab("menu");
      setParsedRows([]);
      setParsingFile(false);
      setImportingRows(false);
    }
  }, [showImportSheet]);

  const toggleWeek = (key: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleActivity = (id: string) => {
    setExpandedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSession = (key: string) => {
    setExpandedSessions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sportBadgeClass = (sport: string): string => {
    const map: Record<string, string> = {
      corrida: "bg-muted text-foreground border-border",
      ciclismo: "bg-muted text-foreground border-border",
      musculacao: "bg-muted text-foreground border-border",
      natacao: "bg-muted text-foreground border-border",
      triatlo: "bg-muted text-foreground border-border",
    };
    return map[sport] || "bg-muted text-muted-foreground border-border";
  };

  const formatPace = (pace: number | null | undefined): string | null => {
    if (pace == null || Number.isNaN(pace) || pace <= 0) return null;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")} min/km`;
  };

  const feelingEmoji = (val: number | null | undefined): string | null => {
    if (val == null) return null;
    const map: Record<number, string> = { 1: "😫", 2: "😕", 3: "😐", 4: "🙂", 5: "💪" };
    return map[val] || null;
  };

  const getWeeks = () => {
    const days = timePeriod === "3m" ? 90 : timePeriod === "1m" ? 30 : 28;
    const weeks: { start: Date; end: Date; key: string }[] = [];
    const now = new Date();
    for (let w = 0; w < Math.ceil(days / 7); w++) {
      const end = subDays(now, w * 7);
      const start = subDays(now, w * 7 + 6);
      weeks.push({
        start,
        end,
        key: format(start, "yyyy-MM-dd"),
      });
    }
    return weeks.reverse();
  };

  const renderSessions = (plan: TrainingPlan) => {
    const sessions: Session[] = Array.isArray(plan.sessions) ? plan.sessions : [];
    if (sessions.length === 0) return null;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Sessões do plano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((session, i) => {
            const key = `${plan.id}-${i}`;
            const expanded = expandedSessions[key];

            return (
              <div key={key} className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => toggleSession(key)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.name || `Treino ${String.fromCharCode(65 + i)}`}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.day && <span>{session.day}</span>}
                        {session.duration && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {session.duration}
                          </span>
                        )}
                        {session.intensity && (
                          <span className="flex items-center gap-0.5">
                            <Flame className="h-3 w-3" /> {session.intensity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expanded && session.exercises && session.exercises.length > 0 && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="border-t pt-2" />
                    {session.exercises.map((ex, ei) => (
                      <div key={ei} className="flex items-start justify-between py-1 gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground font-mono w-5 shrink-0 pt-0.5">{ei + 1}.</span>
                          <div>
                            <p className="text-sm">{ex.name}</p>
                            {ex.notes && <p className="text-xs text-muted-foreground italic">{ex.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 flex-wrap justify-end">
                          {ex.sets && (
                            <Badge variant="outline" className="text-xs">
                              {ex.sets}x{ex.reps || "?"}
                            </Badge>
                          )}
                          {ex.load && <span>{ex.load}</span>}
                          {ex.rest && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {ex.rest}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {session.notes && <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">{session.notes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setParsingFile(true);

    const isGarmin = importTab === "garmin";
    const isFit = file.name.toLowerCase().endsWith(".fit");

    try {
      if (isFit && isGarmin) {
        const parsed = await parseGarminFit(file);
        setParsedRows(parsed);
        toast.success(`${parsed.length} atividade${parsed.length === 1 ? "" : "s"} carregada${parsed.length === 1 ? "" : "s"}`);
      } else {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const resultData = results.data as any[];
            const parsed = resultData
              .filter((row) => Object.values(row).some((v) => v !== "" && v !== null && v !== undefined))
              .map((row) => (isGarmin ? parseGarminRow(row) : parseTrainingPeaksRow(row)))
              .filter((row) => row.activity_date);
            setParsedRows(parsed);
            if (parsed.length === 0) toast.error("Nenhuma atividade encontrada no arquivo");
            else toast.success(`${parsed.length} atividades carregadas`);
            setParsingFile(false);
          },
          error: () => {
            toast.error("Erro ao processar o arquivo");
            setParsingFile(false);
          },
        });
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    } catch {
      toast.error("Erro ao ler o arquivo enviado");
    }

    if (fileRef.current) fileRef.current.value = "";
    setParsingFile(false);
  };

  const handleImportRows = async () => {
    if (parsedRows.length === 0) {
      toast.error("Carregue um arquivo antes de importar");
      return;
    }

    setImportingRows(true);
    const source = importTab === "garmin" ? "garmin" : "training_peaks";
    const payload = parsedRows.map((row) => ({
      ...row,
      user_id: userId,
      patient_id: patientId,
      source,
    }));

    const { error } = await supabase.from("workout_logs").insert(payload as any);
    setImportingRows(false);

    if (error) {
      toast.error("Erro ao importar atividades");
      return;
    }

    toast.success("Atividades importadas com sucesso");
    setShowImportSheet(false);
    await fetchData();
  };

  const handleSaveWorkout = async () => {
    setSavingWorkout(true);
    const { error } = await supabase.from("workout_logs").insert({
      user_id: userId,
      patient_id: patientId ?? null,
      activity_date: new Date().toISOString().split("T")[0],
      sport: workoutType,
      duration_minutes: duration ? parseInt(duration, 10) : null,
      perceived_effort: rpe[0],
      srpe: duration ? parseInt(duration, 10) * rpe[0] : null,
      notes: notes.trim() || null,
      source: "manual",
    });
    setSavingWorkout(false);

    if (error) {
      toast.error("Erro ao salvar treino");
      return;
    }

    toast.success("Treino registrado! 💪");
    setWorkoutType("musculacao");
    setDuration("");
    setRpe([5]);
    setNotes("");
    setShowImportSheet(false);
    await fetchData();
  };

  const activePlan = plans.find((p) => p.status === "active");

  return (
    <div className="space-y-6 mt-4">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-base font-medium flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Plano ativo
          </h3>
          {!showCreateForm && activePlan && (
            <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Novo plano
            </Button>
          )}
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : editingPlan ? (
          <ManualTrainingPlanForm
            userId={userId}
            patientId={patientId}
            editingPlan={editingPlan}
            onSaved={async () => {
              setEditingPlan(null);
              await fetchData();
            }}
            onCancel={() => setEditingPlan(null)}
          />
        ) : showCreateForm ? (
          <ManualTrainingPlanForm
            userId={userId}
            patientId={patientId}
            onSaved={async () => {
              setShowCreateForm(false);
              await fetchData();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : activePlan ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge>Ativo</Badge>
                      {activePlan.sport && (
                        <Badge variant="outline">{SPORT_LABELS[activePlan.sport] || activePlan.sport}</Badge>
                      )}
                      {activePlan.frequency_per_week && (
                        <Badge variant="outline">{activePlan.frequency_per_week}x/semana</Badge>
                      )}
                    </div>
                    {activePlan.professional_name && (
                      <p className="text-sm font-medium">{activePlan.professional_name}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {activePlan.start_date && (
                        <span>
                          {format(new Date(activePlan.start_date), "dd/MM/yyyy", { locale: ptBR })}
                          {activePlan.end_date && ` — ${format(new Date(activePlan.end_date), "dd/MM/yyyy", { locale: ptBR })}`}
                        </span>
                      )}
                    </div>
                    {activePlan.observations && <p className="text-sm text-muted-foreground">{activePlan.observations}</p>}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShowSessions((prev) => !prev)}>
                      {showSessions ? "Ocultar sessões" : "Ver sessões"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingPlan(activePlan)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
                {activePlan.periodization_notes && (
                  <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    {activePlan.periodization_notes}
                  </div>
                )}
              </CardContent>
            </Card>
            {showDeleteConfirm && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-destructive mb-3">
                    Tem certeza que deseja excluir o plano ativo?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        const { error } = await supabase
                          .from("training_plans")
                          .delete()
                          .eq("id", activePlan.id);
                        setShowDeleteConfirm(false);
                        if (error) {
                          toast.error("Erro ao excluir plano");
                          return;
                        }
                        await fetchData();
                        toast.success("Plano excluído");
                      }}
                    >
                      Confirmar exclusão
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {showSessions && renderSessions(activePlan)}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum plano de treino ativo</p>
              <Button variant="outline" onClick={() => setShowCreateForm(true)}>
                Criar plano
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-base font-medium">Linha do tempo</h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5 flex-1 sm:flex-none">
              {([
                { v: "4s", label: "4 sem" },
                { v: "1m", label: "1 mês" },
                { v: "3m", label: "3 meses" },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setTimePeriod(opt.v)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    timePeriod === opt.v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Button className="w-full sm:w-auto" onClick={() => setShowImportSheet(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar atividade
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : workoutLogs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada neste período</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {getWeeks().map((week) => {
              const weekLogs = workoutLogs.filter((l) => {
                const d = parseISO(l.activity_date);
                return d >= week.start && d <= new Date(week.end.getTime() + 86399999);
              });
              const isExpanded = expandedWeeks.has(week.key);
              const totalKm = weekLogs.reduce((s, l) => s + (l.distance_km || 0), 0);
              const totalTss = weekLogs.reduce((s, l) => s + (l.tss || 0), 0);
              const totalSrpe = weekLogs.reduce((s, l) => s + (l.srpe || 0), 0);
              const sportCounts: Record<string, number> = {};
              weekLogs.forEach((l) => {
                const sp = l.sport || "outro";
                sportCounts[sp] = (sportCounts[sp] || 0) + 1;
              });
              const weekLabel = `Sem ${format(week.start, "dd/MM", { locale: ptBR })} – ${format(week.end, "dd/MM", { locale: ptBR })}`;

              if (weekLogs.length === 0) {
                return (
                  <Card key={week.key} className="bg-muted/20">
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{weekLabel}</span>
                      <span className="text-xs text-muted-foreground italic">Sem treinos</span>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card key={week.key}>
                  <button
                    onClick={() => toggleWeek(week.key)}
                    className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
                    type="button"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronUp className="h-4 w-4 rotate-90 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm font-semibold">{weekLabel}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{weekLogs.length} ativ.</span>
                      {totalKm > 0 && <span>{totalKm.toFixed(1)} km</span>}
                      {totalTss > 0 ? <span>TSS {totalTss.toFixed(0)}</span> : totalSrpe > 0 ? <span>sRPE {totalSrpe.toFixed(0)}</span> : null}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {Object.entries(sportCounts).map(([sp, count]) => (
                        <Badge key={sp} variant="outline" className={`text-[10px] px-1.5 py-0 ${sportBadgeClass(sp)}`}>
                          {SPORT_LABELS[sp] || sp} ×{count}
                        </Badge>
                      ))}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t bg-muted/10">
                      <div className="sm:hidden flex items-center gap-3 text-xs text-muted-foreground pt-2">
                        <span>{weekLogs.length} ativ.</span>
                        {totalKm > 0 && <span>{totalKm.toFixed(1)} km</span>}
                        {totalTss > 0 ? <span>TSS {totalTss.toFixed(0)}</span> : totalSrpe > 0 ? <span>sRPE {totalSrpe.toFixed(0)}</span> : null}
                      </div>
                      {weekLogs
                        .slice()
                        .sort((a, b) => (a.activity_date > b.activity_date ? 1 : -1))
                        .map((log) => {
                          const isActExpanded = expandedActivities.has(log.id);
                          const dateLabel = format(parseISO(log.activity_date), "EEE dd/MM", { locale: ptBR });
                          const sportLabel = SPORT_LABELS[log.sport] || log.sport;
                          const title = log.activity_name || sportLabel;

                          const detailRows: { label: string; value: string }[] = [];
                          if (log.distance_km != null) detailRows.push({ label: "Distância", value: `${log.distance_km} km` });
                          if (log.duration_minutes != null) detailRows.push({ label: "Duração", value: `${log.duration_minutes} min` });
                          if (log.planned_duration_minutes != null) detailRows.push({ label: "Duração planejada", value: `${log.planned_duration_minutes} min` });
                          const paceStr = formatPace(log.avg_pace_min_km);
                          if (paceStr) detailRows.push({ label: "Pace médio", value: paceStr });
                          if (log.avg_heart_rate != null) detailRows.push({ label: "FC média", value: `${log.avg_heart_rate} bpm` });
                          if (log.max_heart_rate != null) detailRows.push({ label: "FC máxima", value: `${log.max_heart_rate} bpm` });
                          if (log.tss != null) detailRows.push({ label: "TSS", value: `${log.tss}` });
                          if (log.planned_tss != null) detailRows.push({ label: "TSS planejado", value: `${log.planned_tss}` });
                          if (log.intensity_factor != null) detailRows.push({ label: "IF", value: parseFloat(log.intensity_factor).toFixed(2) });
                          if (log.perceived_effort != null) detailRows.push({ label: "RPE", value: `${log.perceived_effort}/10` });
                          const fEmoji = feelingEmoji(log.feeling_score);
                          if (fEmoji) detailRows.push({ label: "Como se sentiu", value: `${fEmoji} (${log.feeling_score}/5)` });
                          if (log.compliance_percent != null) detailRows.push({ label: "Compliance", value: `${log.compliance_percent}%` });

                          const hrZones: { zone: string; minutes: number }[] = [];
                          if (log.raw_data && typeof log.raw_data === "object") {
                            Object.entries(log.raw_data).forEach(([k, v]) => {
                              const m = k.match(/^zone_(\d+)_minutes$/);
                              if (m && typeof v === "number" && v > 0) {
                                hrZones.push({ zone: `Zona ${m[1]}`, minutes: v });
                              }
                            });
                            hrZones.sort((a, b) => a.zone.localeCompare(b.zone));
                          }
                          const maxZone = hrZones.reduce((m, z) => Math.max(m, z.minutes), 0);
                          const description = log.workout_steps?.description as string | undefined;

                          return (
                            <div key={log.id} className="border rounded-lg bg-background">
                              <button
                                onClick={() => toggleActivity(log.id)}
                                className="w-full p-2.5 flex items-center gap-2 text-left hover:bg-muted/40 transition-colors rounded-lg"
                                type="button"
                              >
                                {isActExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronUp className="h-3.5 w-3.5 rotate-90 text-muted-foreground shrink-0" />
                                )}
                                <span className="text-xs text-muted-foreground w-16 shrink-0 capitalize">{dateLabel}</span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${sportBadgeClass(log.sport)}`}>
                                  {sportLabel}
                                </Badge>
                                <span className="text-sm font-medium truncate flex-1">{title}</span>
                                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                                  {log.distance_km != null && <span>{log.distance_km} km</span>}
                                  {log.duration_minutes != null && <span>{log.duration_minutes}min</span>}
                                  {log.tss != null ? <span>TSS {log.tss}</span> : log.srpe != null ? <span>sRPE {log.srpe}</span> : null}
                                  {log.perceived_effort != null && <span>RPE {log.perceived_effort}</span>}
                                </div>
                              </button>

                              {isActExpanded && (
                                <div className="px-3 pb-3 pt-1 space-y-3 border-t">
                                  {(log.source === "garmin" || log.tss != null) && (
                                    <div className="flex justify-end pt-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-primary hover:text-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/pac/atividade/${log.id}`);
                                        }}
                                      >
                                        Ver análise →
                                      </Button>
                                    </div>
                                  )}
                                  {detailRows.length > 0 && (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2">
                                      {detailRows.map((r) => (
                                        <div key={r.label} className="flex justify-between text-xs gap-3">
                                          <span className="text-muted-foreground">{r.label}</span>
                                          <span className="font-medium text-right">{r.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {description && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Descrição do treino</p>
                                      <p className="text-xs italic text-muted-foreground whitespace-pre-wrap">{description}</p>
                                    </div>
                                  )}

                                  {log.notes && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Observações</p>
                                      <p className="text-xs whitespace-pre-wrap">{log.notes}</p>
                                    </div>
                                  )}

                                  {hrZones.length > 0 && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium text-muted-foreground">Zonas de FC</p>
                                      <div className="space-y-1">
                                        {hrZones.map((z) => (
                                          <div key={z.zone} className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground w-12 shrink-0">{z.zone}</span>
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                              <div className="h-full bg-primary/70 rounded-full" style={{ width: `${maxZone > 0 ? (z.minutes / maxZone) * 100 : 0}%` }} />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">{z.minutes} min</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Sheet open={showImportSheet} onOpenChange={setShowImportSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Adicionar atividade</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {importTab !== "menu" && (
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setImportTab("menu")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}

            {importTab === "menu" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Escolha como adicionar sua atividade</p>
                </div>

                <button
                  type="button"
                  onClick={() => setImportTab("trainingpeaks")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Training Peaks</p>
                    <p className="text-sm text-muted-foreground">Importar CSV exportado do app</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportTab("garmin")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Garmin · Coros · Polar · Suunto</p>
                    <p className="text-sm text-muted-foreground">Importar arquivo .FIT ou CSV do Garmin</p>
                  </div>
                </button>

                <div className="w-full flex items-center gap-3 p-4 rounded-lg border bg-muted/20 opacity-70 text-left">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">Strava</p>
                      <Badge variant="secondary">Em desenvolvimento</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Em breve disponível</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setImportTab("manual")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Registrar manualmente</p>
                    <p className="text-sm text-muted-foreground">Preencher dados do treino</p>
                  </div>
                </button>

                {hasGarminWithoutGps && onBackfillGps && (
                  <div className="border-t pt-3 mt-2">
                    <button
                      type="button"
                      onClick={() => onBackfillGps()}
                      disabled={backfillingGps}
                      className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {backfillingGps ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> Extraindo GPS...
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3 w-3" /> Extrair GPS de atividades anteriores
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : importTab === "manual" ? (
              <div className="space-y-4">
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

                <div className="space-y-2">
                  <Label>
                    Esforço percebido (RPE): <span className="font-bold">{rpe[0]}/10</span>
                  </Label>
                  <Slider value={rpe} onValueChange={setRpe} min={1} max={10} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Leve</span>
                    <span>Moderado</span>
                    <span>Máximo</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Como foi o treino? Alguma dor ou desconforto?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button onClick={handleSaveWorkout} disabled={savingWorkout} className="w-full">
                  {savingWorkout ? "Salvando..." : "Salvar treino"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{importTab === "garmin" ? "Upload do arquivo (.FIT ou .CSV)" : "Upload do CSV"}</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {importTab === "garmin"
                        ? "Selecione o arquivo .FIT ou .CSV exportado do Garmin Connect"
                        : "Selecione o arquivo .CSV exportado do Training Peaks"}
                    </p>
                    <Input
                      ref={fileRef}
                      type="file"
                      accept={importTab === "garmin" ? ".csv,.fit" : ".csv"}
                      onChange={(e) => handleFile(e.target.files?.[0])}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                </div>

                {importTab === "trainingpeaks" && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const ok = window.confirm(
                          "Deseja realmente excluir todas as atividades importadas anteriormente do Training Peaks? Esta ação não pode ser desfeita."
                        );
                        if (!ok) return;
                        const { error } = await supabase
                          .from("workout_logs")
                          .delete()
                          .eq("user_id", userId)
                          .eq("source", "training_peaks");
                        if (error) {
                          toast.error("Erro ao limpar importações anteriores");
                          return;
                        }
                        toast.success("Importações anteriores removidas");
                        setParsedRows([]);
                        await fetchData();
                      }}
                      className="text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/5"
                    >
                      Limpar atividades importadas anteriormente
                    </Button>
                  </div>
                )}

                {parsingFile && <Skeleton className="h-24 w-full" />}

                {!parsingFile && parsedRows.length > 0 && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-medium">{parsedRows.length} atividades prontas para importar</p>
                            <p className="text-sm text-muted-foreground">
                              {importTab === "garmin" ? "Origem: Garmin Connect" : "Origem: Training Peaks"}
                            </p>
                          </div>
                          <Button onClick={handleImportRows} disabled={importingRows}>
                            {importingRows ? "Importando..." : "Importar atividades"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-2">
                      {parsedRows.slice(0, 12).map((row, index) => (
                        <Card key={`${row.activity_date}-${row.activity_name}-${index}`}>
                          <CardContent className="p-3 flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline">{SPORT_LABELS[row.sport] || row.sport}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(row.activity_date), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-sm font-medium truncate">{row.activity_name || SPORT_LABELS[row.sport] || "Atividade"}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                {row.duration_minutes != null && <span>{row.duration_minutes} min</span>}
                                {row.distance_km != null && <span>{row.distance_km} km</span>}
                                {row.avg_heart_rate != null && <span>FC {row.avg_heart_rate} bpm</span>}
                                {row.tss != null ? <span>TSS {row.tss}</span> : row.srpe != null ? <span>sRPE {row.srpe}</span> : null}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {parsedRows.length > 12 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Mostrando 12 de {parsedRows.length} atividades carregadas.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
