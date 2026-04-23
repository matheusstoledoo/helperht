import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dumbbell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  Flame,
  TrendingUp,
  Plus,
  Trophy,
  MessageSquare,
  Star,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FloatingUploadButton } from "@/components/documents/FloatingUploadButton";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import WorkoutLogger from "@/components/training/WorkoutLogger";
import ManualTrainingPlanForm from "@/components/training/ManualTrainingPlanForm";
import TrainingPeaksImport from "@/components/training/TrainingPeaksImport";

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

export default function PatientTraining() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Calendar & Recovery state
  const [raceEvents, setRaceEvents] = useState<any[]>([]);
  const [workoutLogsCalendar, setWorkoutLogsCalendar] = useState<any[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [todayRecovery, setTodayRecovery] = useState<any | null>(null);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  // Race form
  const [raceName, setRaceName] = useState("");
  const [raceSport, setRaceSport] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [raceDistance, setRaceDistance] = useState("");
  const [raceType, setRaceType] = useState("competicao");
  const [raceLocation, setRaceLocation] = useState("");
  const [raceGoal, setRaceGoal] = useState("");
  const [racePlannedTss, setRacePlannedTss] = useState("");
  // Recovery form
  const [recHrv, setRecHrv] = useState("");
  const [recHr, setRecHr] = useState("");
  const [recSleepHours, setRecSleepHours] = useState("");
  const [recSleepQuality, setRecSleepQuality] = useState(0);
  const [recDisposition, setRecDisposition] = useState(50);
  const [recEnergy, setRecEnergy] = useState(50);
  const [recMuscle, setRecMuscle] = useState(50);
  const [recJoint, setRecJoint] = useState(50);
  const [recStress, setRecStress] = useState(0);
  const [recNotes, setRecNotes] = useState("");
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [savingRace, setSavingRace] = useState(false);
  // Timeline state
  const [timePeriod, setTimePeriod] = useState<'4s' | '1m' | '3m'>('4s');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [extendedLogs, setExtendedLogs] = useState<any[]>([]);
  const [loadingExtended, setLoadingExtended] = useState(false);

  useEffect(() => {
    if (timePeriod !== '3m' || !user || extendedLogs.length > 0) return;
    const fetchExtended = async () => {
      setLoadingExtended(true);
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('activity_date', subDays(new Date(), 90).toISOString().split('T')[0])
        .order('activity_date', { ascending: true });
      setExtendedLogs(data || []);
      setLoadingExtended(false);
    };
    fetchExtended();
  }, [timePeriod, user, extendedLogs.length]);

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
    return `${mins}:${secs.toString().padStart(2, '0')} min/km`;
  };

  const feelingEmoji = (val: number | null | undefined): string | null => {
    if (val == null) return null;
    const map: Record<number, string> = { 1: '😫', 2: '😕', 3: '😐', 4: '🙂', 5: '💪' };
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
    const days = timePeriod === '3m' ? 90 : timePeriod === '1m' ? 30 : 28;
    const weeks: { start: Date; end: Date; key: string }[] = [];
    const now = new Date();
    for (let w = 0; w < Math.ceil(days / 7); w++) {
      const end = subDays(now, w * 7);
      const start = subDays(now, w * 7 + 6);
      weeks.push({
        start,
        end,
        key: format(start, 'yyyy-MM-dd'),
      });
    }
    return weeks.reverse();
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString().split('T')[0];

      const [patientRes, userRes, plansRes, racesRes, wLogsRes, rLogsRes, recsRes] = await Promise.all([
        supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
        supabase
          .from("training_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("race_events").select("*")
          .eq("user_id", user.id).eq("status", "scheduled")
          .order("event_date", { ascending: true }),
        supabase.from("workout_logs").select("*")
          .eq("user_id", user.id)
          .gte("activity_date", thirtyDaysAgo)
          .order("activity_date", { ascending: true }),
        supabase.from("recovery_logs").select("*")
          .eq("user_id", user.id)
          .gte("log_date", fourteenDaysAgo)
          .order("log_date", { ascending: true }),
        supabase.from("professional_recommendations")
          .select("*")
          .eq("visible_to_patient", true)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (patientRes.data) setPatientId(patientRes.data.id);
      if (userRes.data) setUserName(userRes.data.name);
      if (plansRes.data) setPlans(plansRes.data as unknown as TrainingPlan[]);
      setRaceEvents(racesRes.data || []);
      setWorkoutLogsCalendar(wLogsRes.data || []);
      setRecoveryLogs(rLogsRes.data || []);
      setRecommendations(recsRes.data || []);
      const todayLog = (rLogsRes.data || []).find((r: any) => r.log_date === today);
      setTodayRecovery(todayLog || null);
      setLoading(false);
    };
    fetchData();
  }, [user, authLoading]);

  const handleSaveRace = async () => {
    if (!raceName || !raceSport || !raceDate) return;
    setSavingRace(true);
    await supabase.from("race_events").insert({
      user_id: user!.id,
      patient_id: patientId ?? null,
      name: raceName,
      sport: raceSport,
      event_date: raceDate,
      distance_km: raceDistance ? parseFloat(raceDistance) : null,
      event_type: raceType,
      location: raceLocation || null,
      goal: raceGoal || null,
      planned_tss: racePlannedTss ? parseInt(racePlannedTss) : null,
    });
    setSavingRace(false);
    setShowRaceForm(false);
    setRaceName(""); setRaceSport(""); setRaceDate("");
    setRaceDistance(""); setRaceLocation(""); setRaceGoal(""); setRacePlannedTss("");
    const { data } = await supabase.from("race_events").select("*")
      .eq("user_id", user!.id).eq("status", "scheduled")
      .order("event_date", { ascending: true });
    setRaceEvents(data || []);
  };

  const handleSaveRecovery = async () => {
    setSavingRecovery(true);
    const today = new Date().toISOString().split('T')[0];
    await supabase.from("recovery_logs").insert({
      user_id: user!.id,
      patient_id: patientId ?? null,
      log_date: today,
      hrv_rmssd: recHrv ? parseFloat(recHrv) : null,
      resting_heart_rate: recHr ? parseInt(recHr) : null,
      sleep_hours: recSleepHours ? parseFloat(recSleepHours) : null,
      sleep_quality: recSleepQuality || null,
      disposition_score: recDisposition,
      energy_score: recEnergy,
      muscle_score: recMuscle,
      joint_score: recJoint,
      stress_score: recStress || null,
      free_notes: recNotes.trim() || null,
      source: 'manual',
    });
    setSavingRecovery(false);
    setShowRecoveryForm(false);
    const { data } = await supabase.from("recovery_logs").select("*")
      .eq("user_id", user!.id)
      .gte("log_date", subDays(new Date(), 14).toISOString().split('T')[0])
      .order("log_date", { ascending: true });
    setRecoveryLogs(data || []);
    const todayLog = (data || []).find((r: any) => r.log_date === today);
    setTodayRecovery(todayLog || null);
  };

  const sportColor = (sport: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      corrida: { bg: "#FAECE7", text: "#712B13" },
      ciclismo: { bg: "#E6F1FB", text: "#0C447C" },
      natacao: { bg: "#E1F5EE", text: "#085041" },
      triatlo: { bg: "#EEEDFE", text: "#3C3489" },
      trail: { bg: "#EAF3DE", text: "#27500A" },
    };
    return map[sport] || { bg: "#F1EFE8", text: "#444441" };
  };

  const daysLeft = (dateStr: string) => differenceInDays(parseISO(dateStr), new Date());

  const daysLeftBadge = (days: number) => {
    if (days > 30) return { bg: "#EAF3DE", text: "#27500A", label: `${days} dias` };
    if (days >= 8) return { bg: "#FAEEDA", text: "#633806", label: `${days} dias` };
    return { bg: "#FCEBEB", text: "#791F1F", label: `${days} dias` };
  };

  const scoreColor = (val: number) => {
    if (val >= 70) return "bg-green-100 text-green-800";
    if (val >= 40) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  };

  const specialtyColor = (specialty: string) => {
    const map: Record<string, string> = {
      "médico": "bg-blue-100 text-blue-800",
      "fisioterapeuta": "bg-green-100 text-green-800",
      "educador físico": "bg-orange-100 text-orange-800",
      "nutricionista": "bg-teal-100 text-teal-800",
      "psicólogo": "bg-purple-100 text-purple-800",
    };
    return map[specialty] || "bg-gray-100 text-gray-700";
  };

  const activePlan = plans.find((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status !== "active");

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

  return (
    <PatientLayout
      title="Treinos"
      subtitle="Seus planos de treino e registros"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Treinos" />}
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <Tabs defaultValue="plan">
            <TabsList className="w-full">
              <TabsTrigger value="plan" className="flex-1">Plano de Treino</TabsTrigger>
              <TabsTrigger value="log" className="flex-1">Registrar Treino</TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1">Calendário & Recuperação</TabsTrigger>
            </TabsList>

            <TabsContent value="plan" className="space-y-4 mt-4">
              {showCreateForm && user ? (
                <ManualTrainingPlanForm
                  userId={user.id}
                  patientId={patientId}
                  onSaved={() => { setShowCreateForm(false); window.location.reload(); }}
                  onCancel={() => setShowCreateForm(false)}
                />
              ) : activePlan ? (
                <>
                  {renderPlanCard(activePlan, true)}
                  <Button variant="outline" className="w-full" onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Criar novo plano
                  </Button>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nenhum plano de treino ativo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Crie seu plano de treino ou faça upload de uma prescrição
                    </p>
                    <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Criar plano de treino
                    </Button>
                  </CardContent>
                </Card>
              )}

              {pastPlans.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Planos anteriores</h3>
                  {pastPlans.map((plan) => renderPlanCard(plan, false))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="log" className="mt-4">
              {user ? (
                <WorkoutLogger userId={user.id} patientId={patientId} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Faça login para registrar treinos</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6 mt-4">
              {/* Seção A — Próximas Provas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-600" />
                    Próximas provas
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => setShowRaceForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>

                {raceEvents.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Trophy className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma prova agendada</p>
                    </CardContent>
                  </Card>
                ) : (
                  raceEvents.map((event) => {
                    const days = daysLeft(event.event_date);
                    const badge = daysLeftBadge(days);
                    const sc = sportColor(event.sport);
                    return (
                      <Card key={event.id}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="font-medium">{event.name}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: sc.bg, color: sc.text }}
                                >
                                  {event.sport}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(event.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </span>
                                {event.distance_km && (
                                  <span className="text-xs text-muted-foreground">
                                    {event.distance_km} km
                                  </span>
                                )}
                              </div>
                              {event.location && (
                                <p className="text-xs text-muted-foreground">{event.location}</p>
                              )}
                              {event.goal && (
                                <p className="text-xs italic text-muted-foreground">🎯 {event.goal}</p>
                              )}
                            </div>
                            <span
                              className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap"
                              style={{ backgroundColor: badge.bg, color: badge.text }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Seção B — Linha do Tempo */}
              <div className="space-y-3">
                <h3 className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Linha do tempo — últimas 4 semanas
                </h3>
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {[0, 1, 2, 3].map(w => ({
                      start: subDays(new Date(), (w + 1) * 7),
                      end: subDays(new Date(), w * 7),
                    })).reverse().map((week, idx) => {
                      const weekLogs = workoutLogsCalendar.filter((l) => {
                        const d = parseISO(l.activity_date);
                        return d >= week.start && d < week.end;
                      });
                      const totalTss = weekLogs.reduce((s, l) => s + (l.tss || 0), 0);
                      const totalSrpe = weekLogs.reduce((s, l) => s + (l.srpe || 0), 0);
                      const useTss = totalTss > 0;
                      const upcomingRace = raceEvents.find((r) => {
                        const d = parseISO(r.event_date);
                        return d >= week.end && differenceInDays(d, week.end) <= 7;
                      });
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">
                              Sem {format(week.start, "dd/MM", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {useTss ? `TSS ${totalTss.toFixed(0)}` : totalSrpe > 0 ? `sRPE ${totalSrpe}` : "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 min-h-[24px]">
                            {weekLogs.length === 0 ? (
                              <div className="text-xs text-muted-foreground italic">Sem treinos</div>
                            ) : weekLogs.map((log) => {
                              const sc = sportColor(log.sport);
                              const size = Math.max(8, Math.min(20, ((log.tss ?? log.srpe ?? 20) / 150) * 20));
                              return (
                                <div
                                  key={log.id}
                                  className="rounded-full border-2"
                                  style={{
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    backgroundColor: sc.bg,
                                    borderColor: sc.text,
                                  }}
                                  title={`${log.sport} — ${log.activity_date}`}
                                />
                              );
                            })}
                            {upcomingRace && (
                              <div className="ml-auto flex items-center gap-1 text-xs text-amber-700">
                                <Trophy className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">{upcomingRace.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Seção C — Diário de Recuperação */}
              <div className="space-y-3">
                <h3 className="text-base font-medium">Como você está hoje?</h3>
                {todayRecovery && !showRecoveryForm ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`px-3 py-2 rounded-lg text-sm flex justify-between ${scoreColor(todayRecovery.disposition_score || 0)}`}>
                          <span>Disposição</span>
                          <span className="font-bold">{todayRecovery.disposition_score ?? "—"}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-lg text-sm flex justify-between ${scoreColor(todayRecovery.energy_score || 0)}`}>
                          <span>Energia</span>
                          <span className="font-bold">{todayRecovery.energy_score ?? "—"}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-lg text-sm flex justify-between ${scoreColor(todayRecovery.muscle_score || 0)}`}>
                          <span>Músculos</span>
                          <span className="font-bold">{todayRecovery.muscle_score ?? "—"}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-lg text-sm flex justify-between ${scoreColor(todayRecovery.joint_score || 0)}`}>
                          <span>Articulações</span>
                          <span className="font-bold">{todayRecovery.joint_score ?? "—"}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setRecHrv(todayRecovery.hrv_rmssd ?? "");
                          setRecHr(todayRecovery.resting_heart_rate ?? "");
                          setRecSleepHours(todayRecovery.sleep_hours ?? "");
                          setRecSleepQuality(todayRecovery.sleep_quality ?? 0);
                          setRecDisposition(todayRecovery.disposition_score ?? 50);
                          setRecEnergy(todayRecovery.energy_score ?? 50);
                          setRecMuscle(todayRecovery.muscle_score ?? 50);
                          setRecJoint(todayRecovery.joint_score ?? 50);
                          setRecStress(todayRecovery.stress_score ?? 0);
                          setRecNotes(todayRecovery.free_notes ?? "");
                          setShowRecoveryForm(true);
                          setTodayRecovery(null);
                        }}
                      >
                        Editar registro
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>HRV matinal (RMSSD)</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 58 ms"
                            value={recHrv}
                            onChange={(e) => setRecHrv(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>FC de repouso</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 52 bpm"
                            value={recHr}
                            onChange={(e) => setRecHr(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Horas dormidas</Label>
                          <Input
                            type="number"
                            min={0}
                            max={12}
                            step={0.5}
                            value={recSleepHours}
                            onChange={(e) => setRecSleepHours(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Qualidade do sono</Label>
                          <div className="flex gap-1 pt-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setRecSleepQuality(s)}
                                aria-label={`${s} estrelas`}
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    s <= recSleepQuality
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/40"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Disposição</span>
                          <span className="font-bold">{recDisposition}</span>
                        </Label>
                        <Slider value={[recDisposition]} onValueChange={(v) => setRecDisposition(v[0])} min={0} max={100} step={1} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Energia</span>
                          <span className="font-bold">{recEnergy}</span>
                        </Label>
                        <Slider value={[recEnergy]} onValueChange={(v) => setRecEnergy(v[0])} min={0} max={100} step={1} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Músculos</span>
                          <span className="font-bold">{recMuscle}</span>
                        </Label>
                        <Slider value={[recMuscle]} onValueChange={(v) => setRecMuscle(v[0])} min={0} max={100} step={1} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Articulações</span>
                          <span className="font-bold">{recJoint}</span>
                        </Label>
                        <Slider value={[recJoint]} onValueChange={(v) => setRecJoint(v[0])} min={0} max={100} step={1} />
                      </div>

                      <div className="space-y-2">
                        <Label>Humor / estresse</Label>
                        <div className="flex gap-2">
                          {[
                            { v: 1, e: "😔" },
                            { v: 2, e: "😐" },
                            { v: 3, e: "🙂" },
                            { v: 4, e: "😊" },
                            { v: 5, e: "😄" },
                          ].map((m) => (
                            <button
                              key={m.v}
                              type="button"
                              onClick={() => setRecStress(m.v)}
                              className={`flex-1 text-2xl py-2 rounded-md border-2 transition-colors ${
                                recStress === m.v
                                  ? "border-teal-600 bg-teal-50"
                                  : "border-border hover:border-muted-foreground/40"
                              }`}
                            >
                              {m.e}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Notas</Label>
                        <Textarea
                          placeholder="Como você está se sentindo hoje?"
                          value={recNotes}
                          onChange={(e) => setRecNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={handleSaveRecovery}
                        disabled={savingRecovery}
                        className="w-full"
                      >
                        {savingRecovery ? "Salvando..." : "Salvar registro do dia"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Seção D — Importar Training Peaks */}
              {user && (
                <TrainingPeaksImport
                  userId={user.id}
                  patientId={patientId}
                  onImported={async () => {
                    const { data } = await supabase.from("workout_logs").select("*")
                      .eq("user_id", user!.id)
                      .gte("activity_date", subDays(new Date(), 30).toISOString().split('T')[0])
                      .order("activity_date", { ascending: true });
                    setWorkoutLogsCalendar(data || []);
                  }}
                />
              )}

              {/* Seção E — Recomendações dos Profissionais */}
              <div className="space-y-3">
                <h3 className="text-base font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  Recomendações dos profissionais
                </h3>
                {recommendations.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma recomendação de profissionais ainda
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  Object.entries(
                    recommendations.reduce<Record<string, any[]>>((acc, r) => {
                      if (!acc[r.specialty]) acc[r.specialty] = [];
                      acc[r.specialty].push(r);
                      return acc;
                    }, {})
                  ).map(([specialty, items]) => (
                    <Card key={specialty}>
                      <CardContent className="p-4 space-y-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${specialtyColor(specialty)}`}>
                          {specialty}
                        </span>
                        <div className="space-y-3">
                          {items.map((rec) => (
                            <div key={rec.id} className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                {rec.dimension}
                              </p>
                              <p className="text-sm">{rec.recommendation}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(rec.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {user && patientId && (
        <FloatingUploadButton patientId={patientId} userId={user.id} userRole="patient" userName={userName} />
      )}

      {/* Race form Sheet */}
      <Sheet open={showRaceForm} onOpenChange={setShowRaceForm}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Adicionar prova</SheetTitle>
            <SheetDescription>Cadastre uma competição, treino especial ou teste de performance.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da prova *</Label>
              <Input value={raceName} onChange={(e) => setRaceName(e.target.value)} placeholder="Ex: Maratona de São Paulo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Esporte *</Label>
                <Select value={raceSport} onValueChange={setRaceSport}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrida">Corrida</SelectItem>
                    <SelectItem value="ciclismo">Ciclismo</SelectItem>
                    <SelectItem value="natacao">Natação</SelectItem>
                    <SelectItem value="triatlo">Triátlo</SelectItem>
                    <SelectItem value="trail">Trail Running</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Distância (km)</Label>
                <Input type="number" step="0.1" value={raceDistance} onChange={(e) => setRaceDistance(e.target.value)} placeholder="42.2" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={raceType} onValueChange={setRaceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="competicao">Competição</SelectItem>
                    <SelectItem value="treino_especial">Treino especial</SelectItem>
                    <SelectItem value="teste_performance">Teste de performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Local</Label>
              <Input value={raceLocation} onChange={(e) => setRaceLocation(e.target.value)} placeholder="Cidade / Estado" />
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Input value={raceGoal} onChange={(e) => setRaceGoal(e.target.value)} placeholder="Ex: terminar em menos de 4h" />
            </div>
            <div className="space-y-1.5">
              <Label>TSS planejado</Label>
              <Input type="number" value={racePlannedTss} onChange={(e) => setRacePlannedTss(e.target.value)} placeholder="Ex: 250" />
            </div>
            <Button onClick={handleSaveRace} disabled={savingRace || !raceName || !raceSport || !raceDate} className="w-full">
              {savingRace ? "Salvando..." : "Salvar prova"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PatientLayout>
  );
}
