import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Search,
  Send,
  Link2,
  Dumbbell,
  ShieldCheck,
  BookOpen,
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

interface EvidenceResult {
  answer: string;
  confidence: "high" | "medium" | "low";
  sources_note: string;
  disclaimer: string;
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "exames": return <Activity className="h-4 w-4" />;
    case "nutricao": return <Apple className="h-4 w-4" />;
    case "treino": return <Dumbbell className="h-4 w-4" />;
    case "conexao": return <Link2 className="h-4 w-4" />;
    case "atencao": return <AlertTriangle className="h-4 w-4" />;
    case "positivo": return <CheckCircle2 className="h-4 w-4" />;
    default: return <Heart className="h-4 w-4" />;
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

const confidenceBadge = (level: string) => {
  switch (level) {
    case "high": return <Badge variant="outline" className="text-xs gap-1 text-green-700 border-green-300"><ShieldCheck className="h-3 w-3" />Alta confiança</Badge>;
    case "medium": return <Badge variant="outline" className="text-xs gap-1 text-amber-700 border-amber-300"><ShieldCheck className="h-3 w-3" />Confiança moderada</Badge>;
    default: return <Badge variant="outline" className="text-xs gap-1 text-muted-foreground"><ShieldCheck className="h-3 w-3" />Baixa confiança</Badge>;
  }
};

export default function PatientInsights() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Evidence search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [evidenceResult, setEvidenceResult] = useState<EvidenceResult | null>(null);
  const [searchHistory, setSearchHistory] = useState<{ query: string; result: EvidenceResult }[]>([]);

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
              <TabsTrigger value="evidence" className="flex-1 gap-1">
                <BookOpen className="h-3.5 w-3.5" /> Pesquisar
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

            {/* === EVIDENCE SEARCH TAB === */}
            <TabsContent value="evidence" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Pesquisa de Saúde Baseada em Evidências</h3>
                      <p className="text-xs text-muted-foreground">
                        Faça perguntas sobre saúde e receba respostas fundamentadas em evidências científicas, adaptadas para fácil compreensão.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ex: Quais alimentos ajudam a reduzir o colesterol? / O que é resistência à insulina? / Exercícios recomendados para hipertensão..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      rows={2}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          searchEvidence();
                        }
                      }}
                    />
                  </div>
                  <Button onClick={searchEvidence} disabled={searchLoading || !searchQuery.trim()} className="w-full gap-2">
                    {searchLoading ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" />Pesquisando...</>
                    ) : (
                      <><Search className="h-4 w-4" />Pesquisar</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Evidence result */}
              {evidenceResult && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-foreground">Resposta</h4>
                      {confidenceBadge(evidenceResult.confidence)}
                    </div>
                    
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {evidenceResult.answer}
                    </div>

                    {evidenceResult.sources_note && (
                      <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{evidenceResult.sources_note}</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground italic border-t pt-2">
                      ⚕️ {evidenceResult.disclaimer || "Consulte sempre seu profissional de saúde para decisões clínicas."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Search history */}
              {searchHistory.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Pesquisas recentes</h4>
                  {searchHistory.slice(1).map((item, i) => (
                    <button
                      key={i}
                      className="w-full text-left p-2 rounded border bg-card hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSearchQuery(item.query);
                        setEvidenceResult(item.result);
                      }}
                    >
                      <p className="text-xs font-medium text-foreground truncate">{item.query}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.result.answer.slice(0, 80)}...
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PatientLayout>
  );
}
