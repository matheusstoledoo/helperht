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
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
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
  const [completedMeals, setCompletedMeals] = useState<Record<string, boolean>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      const [patientRes, userRes, plansRes] = await Promise.all([
        supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
        supabase
          .from("nutrition_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (patientRes.data) setPatientId(patientRes.data.id);
      if (userRes.data) setUserName(userRes.data.name);
      if (plansRes.data) setPlans(plansRes.data as unknown as NutritionPlan[]);
      setLoading(false);
    };
    fetchData();
  }, [user, authLoading]);

  const activePlan = plans.find((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status !== "active");

  const toggleMeal = (mealKey: string) => {
    setExpandedMeals((prev) => ({ ...prev, [mealKey]: !prev[mealKey] }));
  };

  const toggleMealCompleted = (mealKey: string) => {
    setCompletedMeals((prev) => ({ ...prev, [mealKey]: !prev[mealKey] }));
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

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Apple className="h-4 w-4 text-green-500" />
            Refeições
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meals.map((meal, i) => {
            const key = `${plan.id}-${i}`;
            const expanded = expandedMeals[key];
            const completed = completedMeals[key];

            return (
              <div
                key={key}
                className={`border rounded-lg transition-colors ${completed ? "bg-muted/50 border-primary/30" : ""}`}
              >
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => toggleMeal(key)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMealCompleted(key);
                      }}
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        completed ? "bg-primary border-primary" : "border-muted-foreground/30"
                      }`}
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
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
              {showCreateForm ? (
                <ManualNutritionPlanForm
                  userId={user!.id}
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
                    <Apple className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nenhum plano alimentar ativo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Crie seu plano alimentar ou faça upload de uma prescrição
                    </p>
                    <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
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
        <FloatingUploadButton patientId={patientId} userId={user.id} userRole="patient" userName={userName} />
      )}
    </PatientLayout>
  );
}
