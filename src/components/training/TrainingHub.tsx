import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ManualTrainingPlanForm from "@/components/training/ManualTrainingPlanForm";
import TrainingPeaksImport from "@/components/training/TrainingPeaksImport";
import WorkoutLogger from "@/components/training/WorkoutLogger";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Flame,
  Plus,
  TrendingUp,
} from "lucide-react";

interface TrainingHubProps {
  userId: string;
  patientId: string | null;
}

interface TrainingPlan {
  id: string;
  professional_name: string | null;
  professional_registry: string | null;
  sport: string | null;
  start_date: string | null;
  end_date: string | null;
  frequency_per_week: number | null;
  sessions: any[];
  periodization_notes: string | null;
  observations: string | null;
  status: string | null;
  created_at: string;
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

export default function TrainingHub({ userId, patientId }: TrainingHubProps) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [workoutLogsCalendar, setWorkoutLogsCalendar] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<"4s" | "1m" | "3m">("4s");
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [extendedLogs, setExtendedLogs] = useState<any[]>([]);
  const [loadingExtended, setLoadingExtended] = useState(false);

  const fetchTrainingData = async () => {
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];

    const [plansRes, wLogsRes] = await Promise.all([
      supabase
        .from("training_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("activity_date", thirtyDaysAgo)
        .order("activity_date", { ascending: true }),
    ]);

    if (plansRes.data) setPlans(plansRes.data as TrainingPlan[]);
    setWorkoutLogsCalendar(wLogsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrainingData();
  }, [userId]);

  useEffect(() => {
    if (timePeriod !== "3m" || extendedLogs.length > 0) return;

    const fetchExtended = async () => {
      setLoadingExtended(true);
      const { data } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("activity_date", subDays(new Date(), 90).toISOString().split("T")[0])
        .order("activity_date", { ascending: true });
      setExtendedLogs(data || []);
      setLoadingExtended(false);
    };

    fetchExtended();
  }, [timePeriod, userId, extendedLogs.length]);

  const sportBadgeClass = (sport: string): string => {
    const map: Record<string, string> = {
      corrida: "bg-orange-100 text-orange-800 border-orange-200",
      ciclismo: "bg-blue-100 text-blue-800 border-blue-200",
      musculacao: "bg-purple-100 text-purple-800 border-purple-200",
      natacao: "bg-cyan-100 text-cyan-800 border-cyan-200",
      triatlo: "bg-indigo-100 text-indigo-800 border-indigo-200",
    };
    return map[sport] || "bg-muted text-muted-foreground border-border";
  };

  const formatPace = (pace: number | null | undefined): string | null => {
    if (pace == null || isNaN(pace) || pace <= 0) return null;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")} min/km`;
  };

  const feelingEmoji = (val: number | null | undefined): string | null => {
    if (val == null) return null;
    const map: Record<number, string> = { 1: "😫", 2: "😕", 3: "😐", 4: "🙂", 5: "💪" };
    return map[val] || null;
  };

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

  const toggleSession = (key: string) => {
    setExpandedSessions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSessions = (plan: TrainingPlan) => {
    const sessions: Session[] = Array.isArray(plan.sessions) ? plan.sessions : [];
    if (sessions.length === 0) return null;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            Sessões de Treino
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
                      <div key={ei} className="flex items-start justify-between py-1">
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground font-mono w-5 shrink-0 pt-0.5">
                            {ei + 1}.
                          </span>
                          <div>
                            <p className="text-sm">{ex.name}</p>
                            {ex.notes && <p className="text-xs text-muted-foreground italic">{ex.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          {ex.sets && <Badge variant="outline" className="text-xs">{ex.sets}x{ex.reps || "?"}</Badge>}
                          {ex.load && <span>{ex.load}</span>}
                          {ex.rest && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{ex.rest}</span>}
                        </div>
                      </div>
                    ))}
                    {session.notes && (
                      <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">{session.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderPlanCard = (plan: TrainingPlan, isActive: boolean) => (
    <div key={plan.id} className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Ativo" : "Encerrado"}
                </Badge>
                {plan.sport && (
                  <Badge variant="outline" className="text-xs">
                    {SPORT_LABELS[plan.sport] || plan.sport}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {plan.start_date && (
                  <span>
                    {format(new Date(plan.start_date), "dd/MM/yyyy", { locale: ptBR })}
                    {plan.end_date && ` — ${format(new Date(plan.end_date), "dd/MM/yyyy", { locale: ptBR })}`}
                  </span>
                )}
                {plan.frequency_per_week && <span>• {plan.frequency_per_week}x/semana</span>}
              </div>
              {plan.professional_name && (
                <p className="text-sm text-foreground font-medium mt-1">{plan.professional_name}</p>
              )}
            </div>
          </div>
          {plan.observations && <p className="text-sm text-muted-foreground mt-3">{plan.observations}</p>}
          {plan.periodization_notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              {plan.periodization_notes}
            </div>
          )}
        </CardContent>
      </Card>
      {isActive && renderSessions(plan)}
    </div>
  );

  const activePlan = plans.find((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status !== "active");

  return (
    <div className="space-y-6 mt-4">
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-base font-medium flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                Plano de treino
              </h3>
              {!showCreateForm && (
                <Button variant="outline" onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {activePlan ? "Criar novo plano" : "Criar plano de treino"}
                </Button>
              )}
            </div>

            {showCreateForm ? (
              <ManualTrainingPlanForm
                userId={userId}
                patientId={patientId}
                onSaved={async () => {
                  setShowCreateForm(false);
                  await fetchTrainingData();
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            ) : activePlan ? (
              <>
                {renderPlanCard(activePlan, true)}
                {pastPlans.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Planos anteriores</h4>
                    {pastPlans.map((plan) => renderPlanCard(plan, false))}
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum plano de treino ativo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie seu plano de treino ou faça upload de uma prescrição
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-base font-medium flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-blue-500" />
              Registrar treino
            </h3>
            <WorkoutLogger userId={userId} patientId={patientId} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Linha do tempo
              </h3>
              <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5">
                {([
                  { v: "4s", label: "4 semanas" },
                  { v: "1m", label: "1 mês" },
                  { v: "3m", label: "3 meses" },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setTimePeriod(opt.v)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      timePeriod === opt.v
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const logsToShow = timePeriod === "3m" ? extendedLogs : workoutLogsCalendar;

              if (timePeriod === "3m" && loadingExtended) {
                return (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      Carregando atividades...
                    </CardContent>
                  </Card>
                );
              }

              if (logsToShow.length === 0) {
                return (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma atividade registrada neste período
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              const weeks = getWeeks();

              return (
                <div className="space-y-2">
                  {weeks.map((week) => {
                    const weekLogs = logsToShow.filter((l) => {
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
                            {totalTss > 0 ? (
                              <span>TSS {totalTss.toFixed(0)}</span>
                            ) : totalSrpe > 0 ? (
                              <span>sRPE {totalSrpe.toFixed(0)}</span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {Object.entries(sportCounts).map(([sp, count]) => (
                              <Badge
                                key={sp}
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${sportBadgeClass(sp)}`}
                              >
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
                              {totalTss > 0 ? (
                                <span>TSS {totalTss.toFixed(0)}</span>
                              ) : totalSrpe > 0 ? (
                                <span>sRPE {totalSrpe.toFixed(0)}</span>
                              ) : null}
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
                                    >
                                      {isActExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      ) : (
                                        <ChevronUp className="h-3.5 w-3.5 rotate-90 text-muted-foreground shrink-0" />
                                      )}
                                      <span className="text-xs text-muted-foreground w-16 shrink-0 capitalize">{dateLabel}</span>
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] px-1.5 py-0 shrink-0 ${sportBadgeClass(log.sport)}`}
                                      >
                                        {sportLabel}
                                      </Badge>
                                      <span className="text-sm font-medium truncate flex-1">{title}</span>
                                      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                                        {log.distance_km != null && <span>{log.distance_km} km</span>}
                                        {log.duration_minutes != null && <span>{log.duration_minutes}min</span>}
                                        {log.tss != null ? (
                                          <span>TSS {log.tss}</span>
                                        ) : log.srpe != null ? (
                                          <span>sRPE {log.srpe}</span>
                                        ) : null}
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
                                              <div key={r.label} className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{r.label}</span>
                                                <span className="font-medium">{r.value}</span>
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
                                                    <div
                                                      className="h-full bg-blue-500/70 rounded-full"
                                                      style={{ width: `${maxZone > 0 ? (z.minutes / maxZone) * 100 : 0}%` }}
                                                    />
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
              );
            })()}
          </section>

          <section className="space-y-4">
            <TrainingPeaksImport
              userId={userId}
              patientId={patientId}
              onImported={async () => {
                await fetchTrainingData();
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}
