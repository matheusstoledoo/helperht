import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dumbbell, Calendar, ChevronDown, ChevronUp, Clock, Flame, TrendingUp, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TrainingHub from "@/components/training/TrainingHub";
import PerformanceEvolution from "@/components/training/PerformanceEvolution";

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
  created_at: string;
}

const SPORT_LABELS: Record<string, string> = {
  musculacao: "Musculação", corrida: "Corrida", ciclismo: "Ciclismo",
  natacao: "Natação", funcional: "Funcional", outro: "Outro",
};

export default function ProfPatientTraining() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientUserId, setPatientUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) navigate("/dashboard");
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!id || !user || (!isProfessional && !isAdmin)) return;
    const fetchData = async () => {
      setLoading(true);
      const [patientRes, plansRes] = await Promise.all([
        supabase.from("patients").select("user_id, users(name)").eq("id", id).maybeSingle(),
        supabase.from("training_plans").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      ]);

      if (patientRes.data?.users) setPatientName((patientRes.data.users as any).name || "Paciente");
      if ((patientRes.data as any)?.user_id) setPatientUserId((patientRes.data as any).user_id);
      if (plansRes.data) setPlans(plansRes.data as unknown as TrainingPlan[]);
      setLoading(false);
    };
    fetchData();
  }, [id, user, isProfessional, isAdmin]);

  const activePlan = plans.find((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status !== "active");

  if (authLoading || roleLoading || loading) return <FullPageLoading />;

  const renderSessions = (plan: TrainingPlan) => {
    const sessions: any[] = Array.isArray(plan.sessions) ? plan.sessions : [];
    if (sessions.length === 0) return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" /> Sessões de Treino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((session: any, i: number) => {
            const key = `${plan.id}-${i}`;
            const expanded = expandedSessions[key];
            return (
              <div key={key} className="border rounded-lg">
                <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => setExpandedSessions(prev => ({ ...prev, [key]: !prev[key] }))}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.name || `Treino ${String.fromCharCode(65 + i)}`}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.day && <span>{session.day}</span>}
                        {session.duration && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {session.duration}</span>}
                        {session.intensity && <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" /> {session.intensity}</span>}
                      </div>
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expanded && session.exercises?.length > 0 && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="border-t pt-2" />
                    {session.exercises.map((ex: any, ei: number) => (
                      <div key={ei} className="flex items-start justify-between py-1">
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground font-mono w-5 shrink-0 pt-0.5">{ei + 1}.</span>
                          <div>
                            <p className="text-sm">{ex.name}</p>
                            {ex.notes && <p className="text-xs text-muted-foreground italic">{ex.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          {ex.sets && <Badge variant="outline" className="text-xs">{ex.sets}x{ex.reps || "?"}</Badge>}
                          {ex.load && <span>{ex.load}</span>}
                        </div>
                      </div>
                    ))}
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
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Ativo" : "Encerrado"}</Badge>
            {plan.sport && <Badge variant="outline" className="text-xs">{SPORT_LABELS[plan.sport] || plan.sport}</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {plan.start_date && <span>{format(new Date(plan.start_date), "dd/MM/yyyy", { locale: ptBR })}{plan.end_date && ` — ${format(new Date(plan.end_date), "dd/MM/yyyy", { locale: ptBR })}`}</span>}
            {plan.frequency_per_week && <span>• {plan.frequency_per_week}x/semana</span>}
          </div>
          {plan.professional_name && <p className="text-sm font-medium mt-1">{plan.professional_name}</p>}
          {plan.observations && <p className="text-sm text-muted-foreground mt-2">{plan.observations}</p>}
          {plan.periodization_notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />{plan.periodization_notes}
            </div>
          )}
        </CardContent>
      </Card>
      {isActive && renderSessions(plan)}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dashboard">Página inicial</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href={`/prof/paciente/${id}`}>{patientName}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Treinos</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Treinos</h1>
        <p className="text-sm text-muted-foreground">Plano, atividades e evolução de {patientName}</p>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Tabs defaultValue="plan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plan">Plano de Treino</TabsTrigger>
            <TabsTrigger value="activities">
              <Activity className="h-4 w-4 mr-1" /> Atividades
            </TabsTrigger>
            <TabsTrigger value="evolution">
              <TrendingUp className="h-4 w-4 mr-1" /> Evolução
            </TabsTrigger>
          </TabsList>

          {/* ABA 1 — Plano de Treino */}
          <TabsContent value="plan" className="space-y-6">
            {plans.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum plano de treino registrado</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {activePlan && renderPlanCard(activePlan, true)}
                {pastPlans.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Planos anteriores</h3>
                    {pastPlans.map((plan) => renderPlanCard(plan, false))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ABA 2 — Atividades (somente leitura) */}
          <TabsContent value="activities">
            {patientUserId ? (
              <TrainingHub
                userId={patientUserId}
                patientId={id ?? null}
                readOnly
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Não foi possível identificar o usuário do paciente.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ABA 3 — Evolução */}
          <TabsContent value="evolution">
            {patientUserId ? (
              <PerformanceEvolution userId={patientUserId} patientId={id ?? undefined} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Não foi possível identificar o usuário do paciente.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
