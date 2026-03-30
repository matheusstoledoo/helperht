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
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface Insight {
  type: "warning" | "improvement" | "stable" | "attention";
  title: string;
  description: string;
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

export default function PatientHealthSummary() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [markers, setMarkers] = useState<LabMarkerSummary[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [allergies, setAllergies] = useState<string[] | null>(null);
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState<any>(null);
  const [trainingSummary, setTrainingSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

      // Generate insights
      const newInsights: Insight[] = [];
      const abnormal = summaries.filter(m => m.status === "high" || m.status === "low");
      const worsened = summaries.filter(m => {
        if (m.variationPercent == null) return false;
        return (m.status === "high" || m.status === "low") && Math.abs(m.variationPercent) > 10;
      });
      const improved = summaries.filter(m => {
        if (m.variationPercent == null || !m.previousValue) return false;
        return m.status === "normal" && m.variationPercent !== 0;
      });

      if (abnormal.length === 0 && summaries.length > 0) {
        newInsights.push({
          type: "stable",
          title: "Todos os marcadores dentro da normalidade",
          description: "Seus resultados recentes estão dentro das faixas de referência.",
        });
      }

      for (const m of worsened.slice(0, 3)) {
        newInsights.push({
          type: "warning",
          title: `${m.marker_name} ${m.status === "high" ? "elevado" : "baixo"}`,
          description: `Variação de ${m.variationPercent! > 0 ? "+" : ""}${m.variationPercent}% em relação ao exame anterior${m.latestValue != null ? ` (${m.latestValue} ${m.unit || ""})` : ""}.`,
        });
      }

      for (const m of improved.slice(0, 2)) {
        newInsights.push({
          type: "improvement",
          title: `${m.marker_name} normalizado`,
          description: `Valor atual ${m.latestValue} ${m.unit || ""} — voltou à faixa normal.`,
        });
      }

      if (abnormal.length > 0 && worsened.length === 0) {
        newInsights.push({
          type: "attention",
          title: `${abnormal.length} marcador${abnormal.length > 1 ? "es" : ""} fora da faixa`,
          description: abnormal.map(m => m.marker_name).join(", "),
        });
      }

      setInsights(newInsights);
      setLoading(false);
    };

    fetchData();
  }, [user]);

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

  const insightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "warning": return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
      case "attention": return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case "improvement": return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
      case "stable": return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    }
  };

  const insightBg = (type: Insight["type"]) => {
    switch (type) {
      case "warning": return "border-destructive/30 bg-destructive/5";
      case "attention": return "border-amber-500/30 bg-amber-50 dark:bg-amber-950/20";
      case "improvement": return "border-green-500/30 bg-green-50 dark:bg-green-950/20";
      case "stable": return "border-green-500/30 bg-green-50 dark:bg-green-950/20";
    }
  };

  return (
    <PatientLayout
      title="Resumo de Saúde"
      subtitle="Variações nos seus exames e insights"
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

            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Insights
                </h3>
                {insights.map((insight, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${insightBg(insight.type)}`}>
                    {insightIcon(insight.type)}
                    <div>
                      <p className="text-sm font-medium text-foreground">{insight.title}</p>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
