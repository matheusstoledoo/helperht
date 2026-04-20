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
          </Tabs>
        )}
      </div>

      {user && patientId && (
        <FloatingUploadButton patientId={patientId} userId={user.id} userRole="patient" userName={userName} />
      )}
    </PatientLayout>
  );
}
