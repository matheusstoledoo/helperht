import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Apple, Flame, ChevronDown, ChevronUp, Clock, Check, Pill, TrendingUp, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { format, parseISO, format as formatDate, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface NutritionPlan {
  id: string;
  professional_name: string | null;
  professional_registry: string | null;
  start_date: string | null;
  end_date: string | null;
  total_calories: number | null;
  protein_grams: number | null;
  protein_percent: number | null;
  carbs_grams: number | null;
  carbs_percent: number | null;
  fat_grams: number | null;
  fat_percent: number | null;
  meals: any[];
  supplements: any[];
  restrictions: string[] | null;
  observations: string | null;
  status: string | null;
  created_at: string;
}

export default function ProfPatientNutrition() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [mealLogs, setMealLogs] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [profSpecialty, setProfSpecialty] = useState("");
  const [recDimension, setRecDimension] = useState("");
  const [recText, setRecText] = useState("");
  const [recPriority, setRecPriority] = useState("normal");
  const [recVisible, setRecVisible] = useState(true);
  const [savingRec, setSavingRec] = useState(false);

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
      const [patientRes, plansRes, mealLogsRes, recsRes, profRes] = await Promise.all([
        supabase.from("patients").select("user_id, users(name)").eq("id", id).maybeSingle(),
        supabase.from("nutrition_plans").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("meal_logs").select("*").eq("patient_id", id)
          .gte("log_date", subDays(new Date(), 30).toISOString().split("T")[0])
          .order("log_date", { ascending: true }),
        supabase.from("professional_recommendations").select("*").eq("patient_id", id)
          .in("specialty", ["nutricionista", "geral"])
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("users").select("specialty").eq("id", user!.id).maybeSingle(),
      ]);
      if (patientRes.data?.users) setPatientName((patientRes.data.users as any).name || "Paciente");
      if (plansRes.data) setPlans(plansRes.data as unknown as NutritionPlan[]);
      setMealLogs(mealLogsRes.data || []);
      setRecommendations(recsRes.data || []);
      setProfSpecialty((profRes.data as any)?.specialty || "");
      setLoading(false);
    };
    fetchData();
  }, [id, user, isProfessional, isAdmin]);

  const activePlan = plans.find((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status !== "active");

  const handleSaveRec = async () => {
    if (!recDimension || recText.trim().length < 10) return;
    setSavingRec(true);
    const { error } = await supabase.from("professional_recommendations").insert({
      professional_id: user!.id,
      patient_id: id,
      specialty: profSpecialty || "nutricionista",
      dimension: recDimension,
      recommendation: recText.trim(),
      priority: recPriority,
      visible_to_patient: recVisible,
    });
    setSavingRec(false);
    if (!error) {
      toast.success("Orientação salva com sucesso");
      setRecDimension(""); setRecText(""); setRecPriority("normal"); setRecVisible(true);
      const { data } = await supabase
        .from("professional_recommendations")
        .select("*")
        .eq("patient_id", id)
        .in("specialty", ["nutricionista", "geral"])
        .order("created_at", { ascending: false })
        .limit(20);
      setRecommendations(data || []);
    }
  };

  const adherenceData = (() => {
    if (!activePlan || !Array.isArray(activePlan.meals) || activePlan.meals.length === 0) return [];
    const totalMealsPerDay = activePlan.meals.length;
    const byDate: Record<string, number> = {};
    mealLogs.forEach((log: any) => {
      byDate[log.log_date] = (byDate[log.log_date] || 0) + 1;
    });
    return Object.entries(byDate).map(([date, count]) => ({
      date: formatDate(parseISO(date), "dd/MM"),
      pct: Math.round((count / totalMealsPerDay) * 100),
    })).slice(-14);
  })();

  const avgAdherence = adherenceData.length > 0
    ? Math.round(adherenceData.reduce((sum, d) => sum + d.pct, 0) / adherenceData.length)
    : null;

  if (authLoading || roleLoading || loading) return <FullPageLoading />;

  const renderMacros = (plan: NutritionPlan) => {
    if (!plan.total_calories && !plan.protein_grams) return null;
    const macros = [
      { label: "Proteínas", grams: plan.protein_grams, percent: plan.protein_percent, color: "bg-red-500" },
      { label: "Carboidratos", grams: plan.carbs_grams, percent: plan.carbs_percent, color: "bg-amber-500" },
      { label: "Gorduras", grams: plan.fat_grams, percent: plan.fat_percent, color: "bg-blue-500" },
    ];
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" /> Macronutrientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.total_calories && (
            <div className="text-center">
              <span className="text-3xl font-bold text-foreground">{plan.total_calories}</span>
              <span className="text-sm text-muted-foreground ml-1">kcal / dia</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {macros.map((m) => m.grams ? (
              <div key={m.label} className="text-center space-y-1">
                <div className={`h-2 rounded-full ${m.color} mx-auto w-full`} />
                <p className="text-sm font-medium">{m.grams}g</p>
                <p className="text-xs text-muted-foreground">{m.label} {m.percent ? `(${m.percent}%)` : ""}</p>
              </div>
            ) : null)}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMeals = (plan: NutritionPlan) => {
    const meals: any[] = Array.isArray(plan.meals) ? plan.meals : [];
    if (meals.length === 0) return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Apple className="h-4 w-4 text-green-500" /> Refeições
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meals.map((meal: any, i: number) => {
            const key = `${plan.id}-${i}`;
            const expanded = expandedMeals[key];
            return (
              <div key={key} className="border rounded-lg">
                <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => setExpandedMeals(prev => ({ ...prev, [key]: !prev[key] }))}>
                  <div>
                    <p className="text-sm font-medium">{meal.name || `Refeição ${i + 1}`}</p>
                    {meal.time && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {meal.time}</p>}
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expanded && meal.foods?.length > 0 && (
                  <div className="px-3 pb-3">
                    <ul className="space-y-1 ml-4">
                      {meal.foods.map((food: string, fi: number) => <li key={fi} className="text-sm text-muted-foreground">• {food}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderPlanCard = (plan: NutritionPlan, isActive: boolean) => (
    <div key={plan.id} className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Ativo" : "Encerrado"}</Badge>
            {plan.start_date && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(plan.start_date), "dd/MM/yyyy", { locale: ptBR })}
                {plan.end_date && ` — ${format(new Date(plan.end_date), "dd/MM/yyyy", { locale: ptBR })}`}
              </span>
            )}
          </div>
          {plan.professional_name && <p className="text-sm font-medium">{plan.professional_name}</p>}
          {plan.observations && <p className="text-sm text-muted-foreground mt-2">{plan.observations}</p>}
          {plan.restrictions && plan.restrictions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {plan.restrictions.map((r, i) => <Badge key={i} variant="outline" className="text-xs">{r}</Badge>)}
            </div>
          )}
        </CardContent>
      </Card>
      {isActive && renderMacros(plan)}
      {isActive && renderMeals(plan)}
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
            <BreadcrumbItem><BreadcrumbPage>Nutrição</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Nutrição</h1>
        <p className="text-sm text-muted-foreground">Planos alimentares de {patientName}</p>
      </header>

      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Apple className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum plano alimentar registrado</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="plan">
            <TabsList className="w-full">
              <TabsTrigger value="plan" className="flex-1">Plano Alimentar</TabsTrigger>
              <TabsTrigger value="adherence" className="flex-1">Aderência & Orientações</TabsTrigger>
            </TabsList>

            <TabsContent value="plan" className="space-y-6 mt-4">
              {activePlan && renderPlanCard(activePlan, true)}
              {pastPlans.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Planos anteriores</h3>
                  {pastPlans.map((plan) => renderPlanCard(plan, false))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="adherence" className="space-y-6 mt-4">
              {/* Painel de aderência */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Aderência ao plano — últimos 14 dias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {adherenceData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum registro de refeições encontrado. O paciente ainda não marcou refeições cumpridas.
                    </p>
                  ) : (
                    <>
                      <div className="text-center mb-4">
                        <span className="text-3xl font-bold text-foreground">{avgAdherence}%</span>
                        <p className="text-xs text-muted-foreground">média de aderência</p>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={adherenceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <Tooltip formatter={(v: any) => `${v}%`} />
                          <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Histórico de orientações */}
              {recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Orientações anteriores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="border-l-2 border-primary/40 pl-3 py-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{rec.dimension?.replace(/_/g, " ")}</Badge>
                          {rec.priority === "urgente" && (
                            <Badge className="text-xs bg-red-50 text-red-800">urgente</Badge>
                          )}
                          {rec.priority === "atencao" && (
                            <Badge className="text-xs bg-amber-50 text-amber-800">atenção</Badge>
                          )}
                          {!rec.visible_to_patient && (
                            <Badge variant="secondary" className="text-xs">interna</Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground">{rec.recommendation}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(parseISO(rec.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Campo de nova orientação */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Nova orientação para {patientName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Dimensão</Label>
                    <Select value={recDimension} onValueChange={setRecDimension}>
                      <SelectTrigger><SelectValue placeholder="Selecione uma dimensão" /></SelectTrigger>
                      <SelectContent>
                        {([
                          ["adesao_plano", "Adesão ao plano"],
                          ["macronutrientes", "Macronutrientes"],
                          ["horarios_refeicao", "Horários das refeições"],
                          ["hidratacao", "Hidratação"],
                          ["suplementacao", "Suplementação"],
                          ["restricoes", "Restrições alimentares"],
                          ["pre_treino", "Nutrição pré-treino"],
                          ["pos_treino", "Nutrição pós-treino"],
                          ["outro", "Outro"],
                        ] as [string, string][]).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Orientação</Label>
                    <Textarea
                      value={recText}
                      onChange={(e) => setRecText(e.target.value)}
                      placeholder="Descreva sua orientação nutricional..."
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">{recText.length}/500</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Prioridade</Label>
                    <div className="flex gap-2">
                      {([["normal", "Normal"], ["atencao", "Atenção"], ["urgente", "Urgente"]] as [string, string][]).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRecPriority(val)}
                          className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                            recPriority === val
                              ? val === "urgente"
                                ? "bg-red-50 border-red-400 text-red-800"
                                : val === "atencao"
                                ? "bg-amber-50 border-amber-400 text-amber-800"
                                : "bg-primary/10 border-primary text-primary"
                              : "border-border text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Visível ao paciente</Label>
                    <Switch checked={recVisible} onCheckedChange={setRecVisible} />
                  </div>

                  <button
                    onClick={handleSaveRec}
                    disabled={savingRec || !recDimension || recText.trim().length < 10}
                    className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {savingRec ? "Salvando..." : "Salvar orientação"}
                  </button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
