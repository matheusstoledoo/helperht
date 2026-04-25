import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Apple,
  Flame,
  Droplets,
  Plus,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  Pill,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FloatingUploadButton } from "@/components/documents/FloatingUploadButton";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import SupplementsLog from "@/components/nutrition/SupplementsLog";
import ManualNutritionPlanForm from "@/components/nutrition/ManualNutritionPlanForm";

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
  recommended_foods: string[] | null;
  avoided_foods: string[] | null;
  observations: string | null;
  status: string | null;
  created_at: string;
}

interface Meal {
  name: string;
  time?: string;
  foods?: string[];
  notes?: string;
}

export default function PatientNutrition() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null);
  const [mealLogs, setMealLogs] = useState<any[]>([]);
  const [nutritionRecs, setNutritionRecs] = useState<any[]>([]);
  const [togglingMeal, setTogglingMeal] = useState<string | null>(null);
  const [mealToDelete, setMealToDelete] = useState<{ planId: string; index: number; name: string } | null>(null);
  const [deletingMeal, setDeletingMeal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [patientRes, userRes, plansRes, mealLogsRes, recsRes] = await Promise.all([
        supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
        supabase
          .from("nutrition_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("meal_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("log_date", today),
        supabase
          .from("professional_recommendations")
          .select("*")
          .eq("visible_to_patient", true)
          .in("specialty", ["nutricionista", "geral"])
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (patientRes.data) setPatientId(patientRes.data.id);
      if (userRes.data) setUserName(userRes.data.name);
      if (plansRes.data) setPlans(plansRes.data as unknown as NutritionPlan[]);
      setMealLogs(mealLogsRes.data || []);
      const patientIdVal = patientRes.data?.id || null;
      const recs = (recsRes.data || []).filter((r: any) =>
        patientIdVal ? r.patient_id === patientIdVal : true
      );
      setNutritionRecs(recs);
      setLoading(false);
    };
    fetchData();
  }, [user, authLoading]);

  const activePlan = plans.find((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status !== "active");

  const toggleMeal = (mealKey: string) => {
    setExpandedMeals((prev) => ({ ...prev, [mealKey]: !prev[mealKey] }));
  };

  const toggleMealCompleted = async (
    mealKey: string,
    planId: string,
    mealIndex: number,
    mealName: string
  ) => {
    if (!user) return;
    setTogglingMeal(mealKey);
    const today = new Date().toISOString().split('T')[0];
    const existing = mealLogs.find(
      (l) => l.nutrition_plan_id === planId && l.meal_index === mealIndex && l.log_date === today
    );

    if (existing) {
      await supabase.from("meal_logs").delete().eq("id", existing.id);
      setMealLogs((prev) => prev.filter((l) => l.id !== existing.id));
    } else {
      const { data: newLog } = await supabase
        .from("meal_logs")
        .insert({
          user_id: user.id,
          patient_id: patientId ?? null,
          nutrition_plan_id: planId,
          log_date: today,
          meal_index: mealIndex,
          meal_name: mealName,
          completed: true,
          source: "manual",
        })
        .select()
        .single();
      if (newLog) setMealLogs((prev) => [...prev, newLog]);
    }
    setTogglingMeal(null);
  };

  const isMealCompleted = (planId: string, mealIndex: number): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return mealLogs.some(
      (l) => l.nutrition_plan_id === planId && l.meal_index === mealIndex && l.log_date === today
    );
  };

  const handleDeleteMeal = async () => {
    if (!mealToDelete) return;
    setDeletingMeal(true);
    const plan = plans.find((p) => p.id === mealToDelete.planId);
    if (!plan) {
      setDeletingMeal(false);
      setMealToDelete(null);
      return;
    }
    const currentMeals: Meal[] = Array.isArray(plan.meals) ? plan.meals : [];
    const updatedMeals = currentMeals.filter((_, i) => i !== mealToDelete.index);

    const { error } = await supabase
      .from("nutrition_plans")
      .update({ meals: updatedMeals as any })
      .eq("id", mealToDelete.planId);

    if (error) {
      toast({ title: "Erro ao excluir refeição", description: error.message, variant: "destructive" });
      setDeletingMeal(false);
      return;
    }

    await supabase
      .from("meal_logs")
      .delete()
      .eq("nutrition_plan_id", mealToDelete.planId)
      .eq("meal_index", mealToDelete.index);

    setPlans((prev) =>
      prev.map((p) => (p.id === mealToDelete.planId ? { ...p, meals: updatedMeals } : p))
    );
    setMealLogs((prev) =>
      prev.filter(
        (l) => !(l.nutrition_plan_id === mealToDelete.planId && l.meal_index === mealToDelete.index)
      )
    );

    toast({ title: "Refeição excluída com sucesso!" });
    setDeletingMeal(false);
    setMealToDelete(null);
  };

  const renderMacros = (plan: NutritionPlan) => {
    if (!plan.total_calories && !plan.protein_grams && !plan.carbs_grams && !plan.fat_grams) return null;
    const macros = [
      { label: "Proteínas", grams: plan.protein_grams, percent: plan.protein_percent, color: "bg-red-500" },
      { label: "Carboidratos", grams: plan.carbs_grams, percent: plan.carbs_percent, color: "bg-amber-500" },
      { label: "Gorduras", grams: plan.fat_grams, percent: plan.fat_percent, color: "bg-blue-500" },
    ];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Macronutrientes
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
            {macros.map((m) =>
              m.grams ? (
                <div key={m.label} className="text-center space-y-1">
                  <div className={`h-2 rounded-full ${m.color} mx-auto w-full`} />
                  <p className="text-sm font-medium">{m.grams}g</p>
                  <p className="text-xs text-muted-foreground">
                    {m.label} {m.percent ? `(${m.percent}%)` : ""}
                  </p>
                </div>
              ) : null
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMeals = (plan: NutritionPlan) => {
    const meals: Meal[] = Array.isArray(plan.meals) ? plan.meals : [];
    if (meals.length === 0) return null;

    const completedCount = meals.filter((_, i) => isMealCompleted(plan.id, i)).length;
    const progressPct = meals.length > 0 ? Math.round((completedCount / meals.length) * 100) : 0;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Apple className="h-4 w-4 text-green-500" />
              Refeições de hoje
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/{meals.length} cumpridas
            </span>
          </CardTitle>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div
              className="bg-primary rounded-full h-1.5 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {meals.map((meal, i) => {
            const mealKey = `${plan.id}-${i}`;
            const expanded = expandedMeals[mealKey];
            const completed = isMealCompleted(plan.id, i);
            const toggling = togglingMeal === mealKey;

            return (
              <div
                key={mealKey}
                className={`border rounded-lg transition-colors ${completed ? "bg-muted/50 border-primary/30" : ""}`}
              >
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => toggleMeal(mealKey)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await toggleMealCompleted(mealKey, plan.id, i, meal.name || `Refeição ${i + 1}`);
                      }}
                      disabled={toggling}
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        completed ? "bg-primary border-primary" : "border-muted-foreground/30"
                      } ${toggling ? "opacity-50" : ""}`}
                    >
                      {completed && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>
                    <div>
                      <p className={`text-sm font-medium ${completed ? "line-through text-muted-foreground" : ""}`}>
                        {meal.name || `Refeição ${i + 1}`}
                      </p>
                      {meal.time && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {meal.time}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMealToDelete({
                          planId: plan.id,
                          index: i,
                          name: meal.name || `Refeição ${i + 1}`,
                        });
                      }}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Excluir refeição"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {expanded && meal.foods && meal.foods.length > 0 && (
                  <div className="px-3 pb-3 pt-0">
                    <ul className="space-y-1 ml-8">
                      {meal.foods.map((food: string, fi: number) => (
                        <li key={fi} className="text-sm text-muted-foreground">
                          • {food}
                        </li>
                      ))}
                    </ul>
                    {meal.notes && <p className="text-xs text-muted-foreground mt-2 ml-8 italic">{meal.notes}</p>}
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
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Ativo" : "Encerrado"}
                </Badge>
                {plan.start_date && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(plan.start_date), "dd/MM/yyyy", { locale: ptBR })}
                    {plan.end_date && ` — ${format(new Date(plan.end_date), "dd/MM/yyyy", { locale: ptBR })}`}
                  </span>
                )}
              </div>
              {plan.professional_name && (
                <p className="text-sm text-foreground font-medium">{plan.professional_name}</p>
              )}
              {plan.professional_registry && (
                <p className="text-xs text-muted-foreground">{plan.professional_registry}</p>
              )}
            </div>
          </div>
          {plan.observations && <p className="text-sm text-muted-foreground mt-3">{plan.observations}</p>}
          {plan.restrictions && plan.restrictions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {plan.restrictions.map((r, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {isActive && renderMacros(plan)}
      {isActive && renderMeals(plan)}
    </div>
  );

  return (
    <PatientLayout
      title="Nutrição"
      subtitle="Seu plano alimentar e suplementação"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Nutrição" />}
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <Tabs defaultValue="plan">
            <TabsList className="w-full">
              <TabsTrigger value="plan" className="flex-1">Plano Alimentar</TabsTrigger>
              <TabsTrigger value="supplements" className="flex-1">Suplementação</TabsTrigger>
            </TabsList>

            <TabsContent value="plan" className="space-y-4 mt-4">
              {editingPlan ? (
                <ManualNutritionPlanForm
                  userId={user!.id}
                  patientId={patientId}
                  editingPlan={editingPlan}
                  onSaved={() => { setEditingPlan(null); window.location.reload(); }}
                  onCancel={() => setEditingPlan(null)}
                />
              ) : showCreateForm ? (
                <ManualNutritionPlanForm
                  userId={user!.id}
                  patientId={patientId}
                  onSaved={() => { setShowCreateForm(false); window.location.reload(); }}
                  onCancel={() => setShowCreateForm(false)}
                />
              ) : activePlan ? (
                <>
                  {renderPlanCard(activePlan, true)}
                  {nutritionRecs.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Apple className="h-4 w-4 text-teal-600" />
                          Orientações da nutricionista
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {nutritionRecs.map((rec, i) => (
                          <div key={i} className="border-l-2 border-teal-500 pl-3 py-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs bg-teal-50 text-teal-800 border-teal-200">
                                {rec.dimension?.replace(/_/g, " ")}
                              </Badge>
                              {rec.priority === "urgente" && (
                                <Badge className="text-xs bg-red-50 text-red-800">urgente</Badge>
                              )}
                              {rec.priority === "atencao" && (
                                <Badge className="text-xs bg-amber-50 text-amber-800">atenção</Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground">{rec.recommendation}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(rec.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="ghost"
                      className="w-full"
                      size="sm"
                      onClick={() => setEditingPlan(activePlan)}
                    >
                      Editar plano
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setEditingPlan(null);
                        setShowCreateForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Criar novo plano
                    </Button>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Apple className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nenhum plano alimentar ativo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Crie seu plano alimentar ou faça upload de uma prescrição
                    </p>
                    <Button className="mt-4" onClick={() => { setEditingPlan(null); setShowCreateForm(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Criar plano alimentar
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

            <TabsContent value="supplements" className="mt-4">
              {user ? (
                <SupplementsLog userId={user.id} patientId={patientId} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Pill className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Faça login para registrar suplementação</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {user && patientId && (
        <FloatingUploadButton patientId={patientId} userId={user.id} userRole="patient" userName={userName} categoryHint="prescricao_nutricional" />
      )}
    </PatientLayout>
  );
}
