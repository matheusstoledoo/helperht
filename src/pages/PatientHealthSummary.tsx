import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Apple,
  Dumbbell,
  Sparkles,
  RefreshCw,
  Info,
  Link2,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface LabMarkerSummary {
  marker_name: string;
  latestValue: number | null;
  previousValue: number | null;
  unit: string | null;
  status: string | null;
  latestDate: string;
  previousDate: string | null;
  variationPercent: number | null;
  reference_min: number | null;
  reference_max: number | null;
}

interface AIInsight {
  category: string;
  title: string;
  description: string;
  priority: "info" | "attention" | "positive";
}

interface AIInsightsData {
  summary: string;
  insights: AIInsight[];
}

const SPORT_LABELS: Record<string, string> = {
  musculacao: "Musculação",
  corrida: "Corrida",
  ciclismo: "Ciclismo",
  natacao: "Natação",
  triatlo: "Triátlo",
  funcional: "Funcional",
  outro: "Outro",
};

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "exames": return <Activity className="h-3.5 w-3.5" />;
    case "nutricao": return <Apple className="h-3.5 w-3.5" />;
    case "treino": return <Dumbbell className="h-3.5 w-3.5" />;
    case "conexao": return <Link2 className="h-3.5 w-3.5" />;
    case "atencao": return <AlertTriangle className="h-3.5 w-3.5" />;
    case "positivo": return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "medicacao": return <Heart className="h-3.5 w-3.5" />;
    case "meta": return <CheckCircle2 className="h-3.5 w-3.5" />;
    default: return <Info className="h-3.5 w-3.5" />;
  }
};

const categoryLabel = (cat: string) => {
  switch (cat) {
    case "exames": return "Exames";
    case "nutricao": return "Nutrição";
    case "treino": return "Treino";
    case "conexao": return "Conexão";
    case "estilo_de_vida": return "Estilo de vida";
    case "atencao": return "Atenção";
    case "positivo": return "Positivo";
    case "medicacao": return "Medicação";
    case "meta": return "Meta";
    default: return cat;
  }
};

const priorityStyles = (priority: string) => {
  switch (priority) {
    case "attention": return "border-amber-500/30 bg-amber-50 dark:bg-amber-950/20";
    case "positive": return "border-green-500/30 bg-green-50 dark:bg-green-950/20";
    default: return "border-border bg-card";
  }
};

const priorityIcon = (priority: string) => {
  switch (priority) {
    case "attention": return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case "positive": return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    default: return <Info className="h-4 w-4 text-primary shrink-0" />;
  }
};

export default function PatientHealthSummary() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [markers, setMarkers] = useState<LabMarkerSummary[]>([]);
  const [allergies, setAllergies] = useState<string[] | null>(null);
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState<any>(null);
  const [trainingSummary, setTrainingSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<AIInsightsData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const [patientRes, labRes, nutritionRes, trainingRes] = await Promise.all([
        supabase.from("patients").select("id, allergies, blood_type").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("lab_results")
          .select("marker_name, value, unit, status, collection_date, reference_min, reference_max")
          .eq("user_id", user.id)
          .order("collection_date", { ascending: false })
          .limit(200),
        supabase
          .from("nutrition_plans")
          .select("total_calories, protein_grams, carbs_grams, fat_grams, restrictions, supplements, observations, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("training_plans")
          .select("sport, frequency_per_week, observations, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (patientRes.data) {
        setAllergies(patientRes.data.allergies);
        setBloodType(patientRes.data.blood_type);
      }

      if (nutritionRes.data?.[0]) setNutritionSummary(nutritionRes.data[0]);
      if (trainingRes.data?.[0]) setTrainingSummary(trainingRes.data[0]);

      const labs = (labRes.data || []) as {
        marker_name: string;
        value: number | null;
        unit: string | null;
        status: string | null;
        collection_date: string;
        reference_min: number | null;
        reference_max: number | null;
      }[];

      const grouped: Record<string, typeof labs> = {};
      for (const r of labs) {
        if (!grouped[r.marker_name]) grouped[r.marker_name] = [];
        if (grouped[r.marker_name].length < 2) grouped[r.marker_name].push(r);
      }

      const summaries: LabMarkerSummary[] = Object.entries(grouped).map(([name, readings]) => {
        const latest = readings[0];
        const previous = readings.length > 1 ? readings[1] : null;
        let variationPercent: number | null = null;
        if (latest.value != null && previous?.value != null && previous.value !== 0) {
          variationPercent = Math.round(((latest.value - previous.value) / Math.abs(previous.value)) * 100);
        }
        return {
          marker_name: name,
          latestValue: latest.value,
          previousValue: previous?.value ?? null,
          unit: latest.unit,
          status: latest.status,
          latestDate: latest.collection_date,
          previousDate: previous?.collection_date ?? null,
          variationPercent,
          reference_min: latest.reference_min,
          reference_max: latest.reference_max,
        };
      });

      summaries.sort((a, b) => {
        const aAbnormal = a.status === "high" || a.status === "low" ? 0 : 1;
        const bAbnormal = b.status === "high" || b.status === "low" ? 0 : 1;
        if (aAbnormal !== bAbnormal) return aAbnormal - bAbnormal;
        return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
      });

      setMarkers(summaries);
      setLoading(false);
    };

    fetchData();
  }, [user, authLoading]);

  const generateAIInsights = async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-health-insights");
      if (error) throw error;
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setAiInsights(result as AIInsightsData);
      setAiGenerated(true);
    } catch (e: any) {
      toast.error("Erro ao gerar insights. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const variationBadge = (m: LabMarkerSummary) => {
    if (m.variationPercent == null) return null;
    const isUp = m.variationPercent > 0;
    const abs = Math.abs(m.variationPercent);
    if (abs === 0) return null;

    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        m.status === "high" || m.status === "low"
          ? "text-destructive"
          : abs > 15
          ? "text-amber-600"
          : "text-green-600"
      }`}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isUp ? "+" : ""}{m.variationPercent}%
      </span>
    );
  };

  const statusBadge = (status: string | null) => {
    if (status === "high") return <Badge variant="destructive" className="text-xs">Alto</Badge>;
    if (status === "low") return <Badge className="text-xs bg-amber-500 hover:bg-amber-600">Baixo</Badge>;
    return null;
  };

  return (
    <PatientLayout
      title="Resumo de Saúde"
      subtitle="Visão integrada da sua saúde"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Resumo de Saúde" />}
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <>
            {/* Patient info bar */}
            {(bloodType || (allergies && allergies.length > 0)) && (
              <div className="flex flex-wrap items-center gap-2">
                {bloodType && (
                  <Badge variant="outline" className="gap-1">
                    <Heart className="h-3 w-3 text-destructive" /> {bloodType}
                  </Badge>
                )}
                {allergies?.map((a, i) => (
                  <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                ))}
              </div>
            )}

            {/* Nutrition & Training summary cards */}
            {(nutritionSummary || trainingSummary) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nutritionSummary && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pac/nutricao")}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Apple className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Nutrição Ativa</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {nutritionSummary.total_calories && (
                          <span>{nutritionSummary.total_calories} kcal/dia</span>
                        )}
                        {nutritionSummary.protein_grams && (
                          <span>Proteína: {nutritionSummary.protein_grams}g</span>
                        )}
                        {nutritionSummary.carbs_grams && (
                          <span>Carbs: {nutritionSummary.carbs_grams}g</span>
                        )}
                        {nutritionSummary.fat_grams && (
                          <span>Gordura: {nutritionSummary.fat_grams}g</span>
                        )}
                      </div>
                      {nutritionSummary.restrictions?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {nutritionSummary.restrictions.slice(0, 3).map((r: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {trainingSummary && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pac/treinos")}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Treino Ativo</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {trainingSummary.sport && (
                          <span className="block">{SPORT_LABELS[trainingSummary.sport] || trainingSummary.sport}</span>
                        )}
                        {trainingSummary.frequency_per_week && (
                          <span className="block">{trainingSummary.frequency_per_week}x por semana</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* AI Insights Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Insights Integrados de IA
              </h3>

              {!aiGenerated ? (
                <Card>
                  <CardContent className="p-6 text-center space-y-3">
                    <Sparkles className="h-10 w-10 mx-auto text-primary/50" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Análise integrada de saúde</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nossa IA analisa seus exames, diagnósticos, tratamentos, nutrição e treinos para gerar insights personalizados.
                      </p>
                    </div>
                    <Button onClick={generateAIInsights} disabled={aiLoading} size="sm" className="gap-2">
                      {aiLoading ? (
                        <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analisando...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5" /> Gerar insights</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : aiInsights ? (
                <>
                  {aiInsights.summary && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground leading-relaxed">{aiInsights.summary}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {aiInsights.insights.map((insight, i) => (
                    <Card key={i} className={`border ${priorityStyles(insight.priority)}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {priorityIcon(insight.priority)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="text-sm font-medium text-foreground">{insight.title}</p>
                              <Badge variant="outline" className="text-xs gap-1 shrink-0">
                                {categoryIcon(insight.category)}
                                {categoryLabel(insight.category)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{insight.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="ghost" size="sm" onClick={generateAIInsights} disabled={aiLoading} className="w-full gap-1 text-xs">
                    {aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Atualizar insights
                  </Button>
                </>
              ) : null}
            </div>

            {/* Lab markers */}
            {markers.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Marcadores Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {markers.map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${
                            m.status === "high" ? "bg-destructive" :
                            m.status === "low" ? "bg-amber-500" :
                            "bg-green-500"
                          }`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{m.marker_name}</span>
                              {statusBadge(m.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(m.latestDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                              {m.previousDate && (
                                <span> • anterior: {m.previousValue ?? "—"} {m.unit || ""}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-foreground">
                            {m.latestValue ?? "—"} <span className="text-xs font-normal text-muted-foreground">{m.unit || ""}</span>
                          </span>
                          {variationBadge(m)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-3 gap-1" onClick={() => navigate("/pac/exames-lab")}>
                    Ver gráficos detalhados <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ) : !nutritionSummary && !trainingSummary ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum dado de saúde encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Faça upload de exames ou registre informações clínicas
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </PatientLayout>
  );
}
