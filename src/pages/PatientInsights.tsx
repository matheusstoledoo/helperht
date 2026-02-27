import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  Apple,
  Activity,
  Heart,
  RefreshCw,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { toast } from "sonner";

interface Insight {
  category: string;
  title: string;
  description: string;
  priority: "info" | "attention" | "positive";
}

interface InsightsData {
  summary: string;
  insights: Insight[];
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "exames": return <Activity className="h-4 w-4" />;
    case "nutricao": return <Apple className="h-4 w-4" />;
    case "atencao": return <AlertTriangle className="h-4 w-4" />;
    case "positivo": return <CheckCircle2 className="h-4 w-4" />;
    default: return <Heart className="h-4 w-4" />;
  }
};

const categoryLabel = (cat: string) => {
  switch (cat) {
    case "exames": return "Exames";
    case "nutricao": return "Nutrição";
    case "estilo_de_vida": return "Estilo de vida";
    case "atencao": return "Atenção";
    case "positivo": return "Positivo";
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

export default function PatientInsights() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateInsights = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para gerar insights.");
      return;
    }
    setLoading(true);
    try {
      console.log("[Insights] Calling generate-health-insights...");
      const { data: result, error } = await supabase.functions.invoke("generate-health-insights");
      console.log("[Insights] Response:", { result, error });
      if (error) {
        console.error("[Insights] Function error:", error);
        throw error;
      }
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setData(result as InsightsData);
      setGenerated(true);
    } catch (e: any) {
      console.error("[Insights] Error:", e);
      const message = e?.message || e?.context?.body || "Erro ao gerar insights. Tente novamente.";
      toast.error(typeof message === 'string' ? message : "Erro ao gerar insights. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PatientLayout
      title="Insights de Saúde"
      subtitle="Análises inteligentes dos seus dados"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Insights de IA" />}
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
        {authLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
            </CardContent>
          </Card>
        ) : !generated ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Sparkles className="h-12 w-12 mx-auto text-primary/60" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Insights personalizados</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Nossa IA analisa seus exames, diagnósticos e tratamentos para gerar
                  observações e dicas relevantes para sua saúde.
                </p>
              </div>
              <Button onClick={generateInsights} disabled={loading} size="lg" className="gap-2">
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analisando seus dados...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar insights
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Os insights são educativos e não substituem a orientação médica.
              </p>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Summary */}
            {data.summary && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Insights */}
            {data.insights.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Seus insights</h3>
                {data.insights.map((insight, i) => (
                  <Card key={i} className={`border ${priorityStyles(insight.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {priorityIcon(insight.priority)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground">{insight.title}</p>
                            <Badge variant="outline" className="text-xs gap-1 shrink-0">
                              {categoryIcon(insight.category)}
                              {categoryLabel(insight.category)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Nenhum insight gerado no momento.</p>
                </CardContent>
              </Card>
            )}

            {/* Regenerate */}
            <Button variant="outline" onClick={generateInsights} disabled={loading} className="w-full gap-2">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Gerar novos insights
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              ⚕️ Estes insights são gerados por inteligência artificial e têm caráter informativo.
              Sempre consulte seus profissionais de saúde para decisões clínicas.
            </p>
          </>
        ) : null}
      </div>
    </PatientLayout>
  );
}
