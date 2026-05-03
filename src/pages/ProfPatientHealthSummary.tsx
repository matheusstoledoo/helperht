import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Heart, Activity, Sparkles, Target, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "resumo" | "objetivos" | "insights";

export default function ProfPatientHealthSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const [tab, setTab] = useState<Tab>("resumo");
  const [patientName, setPatientName] = useState("");
  const [allergies, setAllergies] = useState<string[] | null>(null);
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [scoreLabel, setScoreLabel] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [mainMarkers, setMainMarkers] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [insightDate, setInsightDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (!roleLoading && role !== null && !isProfessional && !isAdmin) navigate("/dashboard"); }, [isProfessional, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!id || !user || (!isProfessional && !isAdmin)) return;
    const fetchData = async () => {
      setLoading(true);
      const [patientRes, insightRes, goalsRes] = await Promise.all([
        supabase.from("patients").select("id, allergies, blood_type, users(name)").eq("id", id).maybeSingle(),
        supabase.from("patient_insights").select("content, priority_score, created_at").eq("patient_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("patient_goals").select("goal, priority, status, target_date").eq("patient_id", id).eq("status", "ativo"),
      ]);

      if (patientRes.data) {
        setPatientName((patientRes.data.users as any)?.name || "Paciente");
        setAllergies(patientRes.data.allergies);
        setBloodType(patientRes.data.blood_type);
      }

      if (insightRes.data) {
        setInsightDate(insightRes.data.created_at);
        try {
          const parsed = JSON.parse(insightRes.data.content);
          setScore(parsed.score ?? insightRes.data.priority_score ?? null);
          setScoreLabel(parsed.score_label ?? null);
          setSummary(parsed.summary ?? null);
          setMainMarkers(parsed.main_markers ?? []);
          setAiInsights(parsed.insights ?? []);
        } catch {
          setScore(insightRes.data.priority_score ?? null);
        }
      }

      setGoals(goalsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id, user, isProfessional, isAdmin]);

  if (authLoading || roleLoading || loading) return <FullPageLoading />;

  const scoreColor = score == null ? "text-muted-foreground" : score >= 85 ? "text-green-600" : score >= 70 ? "text-blue-600" : score >= 55 ? "text-amber-500" : "text-destructive";
  const scoreBg = score == null ? "stroke-muted" : score >= 85 ? "stroke-green-500" : score >= 70 ? "stroke-blue-500" : score >= 55 ? "stroke-amber-400" : "stroke-destructive";
  const circumference = 2 * Math.PI * 54;
  const dash = score != null ? (score / 100) * circumference : 0;

  const GOAL_LABELS: Record<string, string> = {
    longevidade: "Longevidade", performance_aerobica: "Performance Aeróbica",
    performance_forca: "Performance e Força", perda_de_peso: "Perda de Peso",
    ganho_de_massa: "Ganho de Massa", saude_metabolica: "Saúde Metabólica",
    saude_cardiovascular: "Saúde Cardiovascular", bem_estar_geral: "Bem-estar Geral",
  };

  const insightPriority = (p: string) => {
    if (p === "attention") return "border-amber-400/40 bg-amber-50 dark:bg-amber-950/20";
    if (p === "positive") return "border-green-400/40 bg-green-50 dark:bg-green-950/20";
    return "border-border bg-muted/30";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dashboard">Página inicial</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href={`/prof/paciente/${id}`}>{patientName}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Saúde e Objetivos</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold">Saúde e Objetivos</h1>
        <p className="text-sm text-muted-foreground">Visão integrada da saúde de {patientName}</p>
      </header>

      <main className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        {(bloodType || (allergies && allergies.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {bloodType && <Badge variant="outline" className="gap-1"><Heart className="h-3 w-3 text-destructive" />{bloodType}</Badge>}
            {allergies?.map((a, i) => <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>)}
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          {(["resumo", "objetivos", "insights"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} type="button"
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "resumo" ? "♡ Resumo" : t === "objetivos" ? "◎ Objetivos" : "✦ Insights"}
            </button>
          ))}
        </div>

        {/* Resumo */}
        {tab === "resumo" && (
          <div className="space-y-4">
            {score != null ? (
              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <div className="relative inline-flex items-center justify-center">
                    <svg width="128" height="128" className="-rotate-90">
                      <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                      <circle cx="64" cy="64" r="54" fill="none" strokeWidth="10" strokeLinecap="round"
                        className={scoreBg} strokeDasharray={circumference} strokeDashoffset={circumference - dash} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
                    </svg>
                    <span className={`absolute text-3xl font-bold ${scoreColor}`}>{score}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Score de Saúde</p>
                    {scoreLabel && <p className={`text-lg font-bold ${scoreColor}`}>{scoreLabel}</p>}
                    {insightDate && <p className="text-xs text-muted-foreground mt-1">Gerado em {format(new Date(insightDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
                  </div>
                  {summary && <p className="text-sm text-muted-foreground text-center leading-relaxed">{summary}</p>}
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">O paciente ainda não gerou uma análise de saúde.</CardContent></Card>
            )}

            {mainMarkers.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Marcadores principais</p>
                  {mainMarkers.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div>
                        <span className="font-medium">{m.name}</span>
                        <p className="text-xs text-muted-foreground">{m.value}</p>
                      </div>
                      <Badge variant={m.status === "altered" ? "destructive" : m.status === "attention" ? "outline" : "outline"}
                        className={m.status === "normal" ? "border-green-500 text-green-600" : m.status === "attention" ? "border-amber-500 text-amber-600" : ""}>
                        {m.status === "normal" ? "Normal" : m.status === "attention" ? "Atenção" : "Alterado"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="text-xs text-muted-foreground text-center p-3 rounded-lg border bg-muted/20">
              ⓘ Análise gerada por IA com base nos dados do paciente. Não substitui sua avaliação clínica.
            </div>
          </div>
        )}

        {/* Objetivos */}
        {tab === "objetivos" && (
          <div className="space-y-4">
            {aiInsights.filter((i: any) => i.category === "meta").length > 0 && (
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-3 flex items-center gap-1"><Sparkles className="h-3 w-3" />Análise de IA sobre os objetivos</p>
                {aiInsights.filter((i: any) => i.category === "meta").map((insight: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border mb-2 ${insightPriority(insight.priority)}`}>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                ))}
              </CardContent></Card>
            )}
            {goals.length > 0 ? (
              <Card><CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Objetivos do paciente</p>
                {goals.map((g: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{GOAL_LABELS[g.goal] || g.goal}</p>
                      <p className="text-xs text-muted-foreground">{g.priority === "primario" ? "Principal" : "Secundário"}</p>
                    </div>
                    <Badge variant="outline" className="border-green-500 text-green-600 text-xs">Ativo</Badge>
                  </div>
                ))}
              </CardContent></Card>
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Paciente não possui objetivos cadastrados.</CardContent></Card>
            )}
            <div className="text-xs text-muted-foreground text-center p-3 rounded-lg border bg-muted/20">
              ⓘ Visualização somente leitura. Apenas o paciente pode editar seus próprios objetivos.
            </div>
          </div>
        )}

        {/* Insights */}
        {tab === "insights" && (
          <div className="space-y-3">
            {insightDate && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />Insights gerados em {format(new Date(insightDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            {aiInsights.length > 0 ? aiInsights.map((insight: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg border space-y-2 ${insightPriority(insight.priority)}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {insight.priority === "alert" && (
                      <Badge variant="destructive" className="text-xs">⚠ Alerta</Badge>
                    )}
                    {insight.priority === "attention" && (
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Atenção</Badge>
                    )}
                    {insight.priority === "positive" && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-600">Positivo</Badge>
                    )}
                    {insight.priority === "info" && (
                      <Badge variant="secondary" className="text-xs">Info</Badge>
                    )}
                    {insight.category && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {insight.category.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                {(insight.clinical_basis || insight.performance_data || insight.reasoning || insight.evidence) && (
                  <details className="group">
                    <summary className="text-xs text-primary cursor-pointer hover:underline list-none flex items-center gap-1 mt-1">
                      <span className="group-open:hidden">▸ Ver raciocínio clínico</span>
                      <span className="hidden group-open:inline">▾ Ocultar</span>
                    </summary>
                    <div className="mt-2 space-y-2 border-t pt-2">
                      {insight.clinical_basis && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Base clínica</p>
                          <p className="text-xs text-foreground mt-0.5">{insight.clinical_basis}</p>
                        </div>
                      )}
                      {insight.performance_data && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dados de performance</p>
                          <p className="text-xs text-foreground mt-0.5">{insight.performance_data}</p>
                        </div>
                      )}
                      {insight.reasoning && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Raciocínio integrado</p>
                          <p className="text-xs text-foreground mt-0.5">{insight.reasoning}</p>
                        </div>
                      )}
                      {insight.evidence && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evidência científica</p>
                          <p className="text-xs text-muted-foreground italic mt-0.5">{insight.evidence}</p>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">O paciente ainda não gerou uma análise de IA.</CardContent></Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
