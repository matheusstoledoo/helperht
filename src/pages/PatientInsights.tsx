import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  Apple,
  Activity,
  Heart,
  RefreshCw,
  Link2,
  Dumbbell,
  MessageCircle,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { DifyChatTab } from "@/components/chat/DifyChatTab";
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
      const { data: result, error } = await supabase.functions.invoke("generate-health-insights");
      if (error) throw error;
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setData(result as InsightsData);
      setGenerated(true);
    } catch (e: any) {
      const message = e?.message || "Erro ao gerar insights. Tente novamente.";
      toast.error(typeof message === 'string' ? message : "Erro ao gerar insights.");
    } finally {
      setLoading(false);
    }
  };

  const searchEvidence = async () => {
    if (!user) {
      toast.error("Você precisa estar logado.");
      return;
    }
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      toast.error("Digite uma pergunta com pelo menos 3 caracteres.");
      return;
    }
    setSearchLoading(true);
    setEvidenceResult(null);
    try {
      const { data: result, error } = await supabase.functions.invoke("search-health-evidence", {
        body: { query: searchQuery.trim() },
      });
      if (error) throw error;
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const parsed = result as EvidenceResult;
      setEvidenceResult(parsed);
      setSearchHistory(prev => [{ query: searchQuery.trim(), result: parsed }, ...prev.slice(0, 4)]);
    } catch (e: any) {
      const message = e?.message || "Erro na pesquisa. Tente novamente.";
      toast.error(typeof message === 'string' ? message : "Erro na pesquisa.");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <PatientLayout
      title="Insights de Saúde"
      subtitle="Análises inteligentes e pesquisa baseada em evidências"
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
        ) : (
          <Tabs defaultValue="insights">
            <TabsList className="w-full">
              <TabsTrigger value="insights" className="flex-1 gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Insights
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 gap-1">
                <MessageCircle className="h-3.5 w-3.5" /> Chat
              </TabsTrigger>
            </TabsList>

            {/* === INSIGHTS TAB === */}
            <TabsContent value="insights" className="space-y-4 mt-4">
              {!generated ? (
                <Card>
                  <CardContent className="p-8 text-center space-y-4">
                    <Sparkles className="h-12 w-12 mx-auto text-primary/60" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Insights personalizados</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Nossa IA analisa seus exames, diagnósticos, tratamentos, nutrição e treinos para gerar
                        observações conectadas e relevantes para sua saúde.
                      </p>
                    </div>
                    <Button onClick={generateInsights} disabled={loading} size="lg" className="gap-2">
                      {loading ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" />Analisando seus dados...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" />Gerar insights</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Os insights são educativos e não substituem a orientação médica.
                    </p>
                  </CardContent>
                </Card>
              ) : data ? (
                <>
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

                  {data.insights.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground">Seus insights</h3>
                      {data.insights.map((insight, i) => (
                        <Card key={i} className={`border ${priorityStyles(insight.priority)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {priorityIcon(insight.priority)}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            </TabsContent>

            {/* === CHAT TAB === */}
            <TabsContent value="chat" className="space-y-4 mt-4">
              <DifyChatTab userId={user?.id || "anonymous"} />
            </TabsContent>

          </Tabs>
        )}
      </div>
    </PatientLayout>
  );
}
