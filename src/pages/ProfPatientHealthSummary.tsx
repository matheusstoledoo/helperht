import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Heart, Activity, FlaskConical, AlertTriangle, CheckCircle2, Info,
  Target, Sparkles, Apple, Pill, GitMerge, FileText, ArrowRight,
  TrendingDown, TrendingUp, Dumbbell, Shield, Smile, Zap,
  Calendar as CalendarIcon, RefreshCw, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ───────── Tipos ─────────

interface Marcador {
  nome: string;
  valor: string;
  unidade: string;
  status: "normal" | "atenção" | "alterado";
  acao?: string;
}

interface AnaliseCompleta {
  score: number;
  resumo_geral: string;
  marcadores: Marcador[];
  prioridades: string[];
  proximos_passos: string;
}

interface DocRow {
  id: string;
  file_name: string;
  created_at: string;
  analise_completa: AnaliseCompleta | null;
}

type GoalType =
  | "longevidade" | "performance_aerobica" | "performance_forca"
  | "perda_de_peso" | "ganho_de_massa" | "saude_metabolica"
  | "saude_cardiovascular" | "bem_estar_geral";

type GoalPriority = "primario" | "secundario";
type GoalStatus = "ativo" | "pausado" | "concluido" | "cancelado";

interface PatientGoal {
  id: string;
  goal: GoalType;
  priority: GoalPriority;
  status: GoalStatus;
  target_date: string | null;
  target_metrics: Record<string, number> | null;
  baseline_snapshot: Record<string, any> | null;
  notes: string | null;
  created_at: string;
}

interface MainMarker {
  name: string;
  value: string;
  status: "normal" | "attention" | "altered";
}

interface Insight {
  category: string;
  title: string;
  description: string;
  priority: "info" | "attention" | "positive";
}

interface HealthData {
  score: number;
  score_label: string;
  summary: string;
  main_markers: MainMarker[];
  priorities: string[];
  insights: Insight[];
  domain_scores?: Record<string, number>;
  domain_details?: Record<string, string>;
}

// ───────── Configs ─────────

const GOAL_CONFIG: Record<GoalType, { label: string; icon: any; color: string }> = {
  longevidade: { label: "Longevidade", icon: Heart, color: "text-rose-600 bg-rose-500/10" },
  performance_aerobica: { label: "Performance Aeróbica", icon: Zap, color: "text-sky-600 bg-sky-500/10" },
  performance_forca: { label: "Performance e Força", icon: Dumbbell, color: "text-orange-600 bg-orange-500/10" },
  perda_de_peso: { label: "Perda de Peso", icon: TrendingDown, color: "text-emerald-600 bg-emerald-500/10" },
  ganho_de_massa: { label: "Ganho de Massa", icon: TrendingUp, color: "text-amber-600 bg-amber-500/10" },
  saude_metabolica: { label: "Saúde Metabólica", icon: Activity, color: "text-purple-600 bg-purple-500/10" },
  saude_cardiovascular: { label: "Saúde Cardiovascular", icon: Shield, color: "text-red-600 bg-red-500/10" },
  bem_estar_geral: { label: "Bem-estar Geral", icon: Smile, color: "text-teal-600 bg-teal-500/10" },
};

const GOAL_METRICS: Record<string, { key: string; label: string; unit: string }[]> = {
  longevidade: [
    { key: "pcr", label: "PCR", unit: "mg/L" },
    { key: "pressao_sistolica", label: "Pressão Sistólica", unit: "mmHg" },
    { key: "vo2max", label: "VO2max estimado", unit: "ml/kg/min" },
  ],
  saude_cardiovascular: [
    { key: "pcr", label: "PCR", unit: "mg/L" },
    { key: "pressao_sistolica", label: "Pressão Sistólica", unit: "mmHg" },
    { key: "vo2max", label: "VO2max estimado", unit: "ml/kg/min" },
  ],
  performance_aerobica: [
    { key: "vo2max", label: "VO2max", unit: "ml/kg/min" },
    { key: "pace_alvo", label: "Pace alvo", unit: "min/km" },
    { key: "fc_repouso", label: "FC repouso", unit: "bpm" },
  ],
  performance_forca: [
    { key: "peso_corporal", label: "Peso corporal", unit: "kg" },
    { key: "gordura_corporal", label: "% gordura corporal", unit: "%" },
  ],
  ganho_de_massa: [
    { key: "peso_corporal", label: "Peso corporal", unit: "kg" },
    { key: "gordura_corporal", label: "% gordura corporal", unit: "%" },
  ],
  perda_de_peso: [
    { key: "peso_alvo", label: "Peso alvo", unit: "kg" },
    { key: "gordura_alvo", label: "% gordura corporal alvo", unit: "%" },
  ],
  saude_metabolica: [
    { key: "glicose_jejum", label: "Glicose jejum", unit: "mg/dL" },
    { key: "hba1c", label: "HbA1c", unit: "%" },
    { key: "triglicerideos", label: "Triglicerídeos", unit: "mg/dL" },
  ],
  bem_estar_geral: [],
};

const STATUS_CONFIG: Record<GoalStatus, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" },
  pausado: { label: "Pausado", className: "bg-muted text-muted-foreground" },
  concluido: { label: "Concluído", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" },
};

// ───────── Helpers visuais ─────────

function scoreColorResumo(score: number) {
  if (score <= 40) return "hsl(0 84% 60%)";
  if (score <= 70) return "hsl(45 93% 47%)";
  if (score <= 89) return "hsl(142 71% 45%)";
  return "hsl(142 76% 36%)";
}

function scoreLabelResumo(score: number) {
  if (score <= 40) return "Precisa de atenção";
  if (score <= 70) return "Regular";
  if (score <= 89) return "Bom — com pontos de atenção";
  return "Ótimo";
}

function statusDotClass(status: string) {
  if (status === "normal") return "bg-green-500";
  if (status === "atenção") return "bg-amber-500";
  return "bg-destructive";
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "alterado") return "destructive";
  if (status === "atenção") return "secondary";
  return "outline";
}

function ScoreCircleResumo({ score }: { score: number }) {
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColorResumo(score);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="text-2xl font-bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

function scoreColorInsights(score: number) {
  if (score >= 80) return "hsl(142 71% 45%)";
  if (score >= 60) return "hsl(45 93% 47%)";
  if (score >= 40) return "hsl(25 95% 53%)";
  return "hsl(0 84% 60%)";
}

function ScoreCircleInsights({ score }: { score: number }) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = scoreColorInsights(score);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="text-3xl font-bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

function markerStatusClasses(status: string) {
  switch ((status || "").toLowerCase()) {
    case "normal": case "ok": case "good":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
    case "attention": case "atencao": case "atenção": case "borderline": case "limítrofe": case "limitrofe":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "altered": case "alterado": case "high": case "alto": case "elevado":
    case "low": case "baixo": case "critical": case "crítico": case "critico":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function markerStatusLabel(status: string) {
  switch ((status || "").toLowerCase()) {
    case "normal": case "ok": case "good": return "Normal";
    case "attention": case "atencao": case "atenção": case "borderline": return "Atenção";
    case "limítrofe": case "limitrofe": return "Limítrofe";
    case "altered": case "alterado": return "Alterado";
    case "high": case "alto": case "elevado": return "Elevado";
    case "low": case "baixo": return "Baixo";
    case "critical": case "crítico": case "critico": return "Crítico";
    default: return status;
  }
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "exames": return <FlaskConical className="h-4 w-4" />;
    case "nutricao": return <Apple className="h-4 w-4" />;
    case "treino": return <Activity className="h-4 w-4" />;
    case "medicacao": return <Pill className="h-4 w-4" />;
    case "atencao": return <AlertTriangle className="h-4 w-4" />;
    case "positivo": return <CheckCircle2 className="h-4 w-4" />;
    case "conexao": return <GitMerge className="h-4 w-4" />;
    case "meta": return <Target className="h-4 w-4" />;
    case "estilo_de_vida": return <Heart className="h-4 w-4" />;
    default: return <Info className="h-4 w-4" />;
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
    case "attention": return "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20";
    case "positive": return "border-green-500/40 bg-green-50 dark:bg-green-950/20";
    default: return "border-border bg-card";
  }
};

const priorityBadge = (priority: string) => {
  switch (priority) {
    case "attention":
      return <Badge variant="outline" className="text-xs gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"><AlertTriangle className="h-3 w-3" />Atenção</Badge>;
    case "positive":
      return <Badge variant="outline" className="text-xs gap-1 border-green-500/40 text-green-700 dark:text-green-400 bg-green-500/10"><CheckCircle2 className="h-3 w-3" />Positivo</Badge>;
    default:
      return <Badge variant="outline" className="text-xs gap-1"><Info className="h-3 w-3" />Info</Badge>;
  }
};

// ───────── Componente principal ─────────

export default function ProfPatientHealthSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();

  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "objetivos" ? "objetivos" : "resumo";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [patientName, setPatientName] = useState("");
  const [patientUserId, setPatientUserId] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<string[] | null>(null);
  const [bloodType, setBloodType] = useState<string | null>(null);

  // Resumo de Saúde (do paciente — análise dos exames)
  const [analise, setAnalise] = useState<AnaliseCompleta | null>(null);
  const [allDocs, setAllDocs] = useState<DocRow[]>([]);
  const [loadingResumo, setLoadingResumo] = useState(true);

  // Objetivos & Insights (somente leitura)
  const [goals, setGoals] = useState<PatientGoal[]>([]);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [insightTs, setInsightTs] = useState<number | null>(null);
  const [loadingGoals, setLoadingGoals] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) navigate("/dashboard");
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams(value === "objetivos" ? { tab: "objetivos" } : {});
  };

  // ── Buscar dados do paciente + análise dos exames ──
  const fetchPatientAndResumo = useCallback(async () => {
    if (!id) return;
    setLoadingResumo(true);

    const { data: patient } = await supabase
      .from("patients")
      .select("id, user_id, allergies, blood_type, users(name)")
      .eq("id", id)
      .maybeSingle();

    if (patient) {
      setAllergies(patient.allergies);
      setBloodType(patient.blood_type);
      setPatientName(((patient.users as any)?.name) || "Paciente");
      setPatientUserId(patient.user_id);
    }

    const [latestRes, allRes] = await Promise.all([
      supabase
        .from("documents")
        .select("id, file_name, created_at, analise_completa")
        .eq("patient_id", id)
        .eq("category", "exame_laboratorial")
        .not("analise_completa", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("id, file_name, created_at, analise_completa")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (latestRes.data?.analise_completa) {
      setAnalise(latestRes.data.analise_completa as unknown as AnaliseCompleta);
    } else {
      setAnalise(null);
    }
    setAllDocs((allRes.data || []) as unknown as DocRow[]);
    setLoadingResumo(false);
  }, [id]);

  useEffect(() => {
    if (id && user && (isProfessional || isAdmin)) {
      fetchPatientAndResumo();
    }
  }, [id, user, isProfessional, isAdmin, fetchPatientAndResumo]);

  // ── Buscar Objetivos & último Insight salvo ──
  const fetchGoalsAndInsights = useCallback(async () => {
    if (!id) return;
    setLoadingGoals(true);

    // Goals usa patient_id = patients.id
    const goalsRes = await supabase
      .from("patient_goals")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false });

    if (goalsRes.data) setGoals(goalsRes.data as unknown as PatientGoal[]);

    // patient_insights.patient_id = auth.uid() do paciente — buscar via user_id
    if (patientUserId) {
      const { data: cachedInsight } = await supabase
        .from("patient_insights")
        .select("content, created_at")
        .eq("patient_id", patientUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedInsight?.content) {
        try {
          const parsed = JSON.parse(cachedInsight.content) as HealthData;
          setHealthData(parsed);
          setInsightTs(new Date(cachedInsight.created_at).getTime());
        } catch { /* não é JSON */ }
      }
    }

    setLoadingGoals(false);
  }, [id, patientUserId]);

  useEffect(() => {
    if (id && user && (isProfessional || isAdmin) && patientUserId) {
      fetchGoalsAndInsights();
    }
  }, [id, user, isProfessional, isAdmin, patientUserId, fetchGoalsAndInsights]);

  const calculateProgress = (goal: PatientGoal): number | null => {
    if (!goal.target_metrics || !goal.baseline_snapshot?.lab_results) return null;
    const metrics = GOAL_METRICS[goal.goal] || [];
    if (metrics.length === 0) return null;
    let improved = 0;
    metrics.forEach((m) => { if (goal.target_metrics?.[m.key] != null) improved += 0.5; });
    return Math.min(Math.round((improved / metrics.length) * 100), 100);
  };

  if (authLoading || roleLoading) return <FullPageLoading />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dashboard">Página inicial</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href={`/prof/paciente/${id}`}>{patientName}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Saúde & Objetivos</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Saúde & Objetivos</h1>
        <p className="text-sm text-muted-foreground">Visão integrada da saúde de {patientName || "paciente"}</p>
      </header>

      <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {(bloodType || (allergies && allergies.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2">
            {bloodType && <Badge variant="outline" className="gap-1"><Heart className="h-3 w-3 text-destructive" /> {bloodType}</Badge>}
            {allergies?.map((a, i) => <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>)}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="resumo" className="flex-1 gap-1.5">
              <Heart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resumo de Saúde</span>
              <span className="sm:hidden">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="objetivos" className="flex-1 gap-1.5">
              <Target className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Objetivos & Insights</span>
              <span className="sm:hidden">Objetivos</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══ TAB: RESUMO DE SAÚDE ═══ */}
          <TabsContent value="resumo" className="space-y-4 mt-4">
            {loadingResumo ? (
              <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : !analise ? (
              <Card>
                <CardContent className="p-8 text-center space-y-3">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium">Nenhum exame analisado ainda</p>
                  <Button onClick={() => navigate(`/prof/paciente/${id}/documentos`)} className="gap-1">
                    Ir para Exames <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Score Card */}
                <Card>
                  <CardContent className="p-5 flex items-center gap-5">
                    <ScoreCircleResumo score={analise.score} />
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-foreground">{scoreLabelResumo(analise.score)}</p>
                      <p className="text-sm text-muted-foreground mt-1">{analise.resumo_geral}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Marcadores */}
                {analise.marcadores?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Marcadores do último exame</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {analise.marcadores.map((m, i) => (
                        <div key={i} className="py-2.5 border-b last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`h-2 w-2 rounded-full shrink-0 ${statusDotClass(m.status)}`} />
                              <span className="text-sm font-medium truncate">{m.nome}</span>
                              <span className="text-xs text-muted-foreground">{m.valor} {m.unidade}</span>
                            </div>
                            <Badge variant={statusBadgeVariant(m.status)} className="text-xs capitalize">
                              {m.status}
                            </Badge>
                          </div>
                          {m.status !== "normal" && m.acao && (
                            <p className="text-xs text-muted-foreground mt-1 ml-4">
                              Conduta sugerida: {m.acao}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Prioridades */}
                {analise.prioridades?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Prioridades clínicas
                    </h3>
                    <div className="grid gap-2">
                      {analise.prioridades.slice(0, 3).map((p, i) => (
                        <Card key={i}>
                          <CardContent className="p-4 flex items-start gap-3">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-sm text-foreground">{p}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Próximos passos */}
                {analise.proximos_passos && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Próximos passos
                    </h3>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">{analise.proximos_passos}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Histórico */}
                {allDocs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">Histórico de exames</h3>
                    <div className="grid gap-2">
                      {allDocs.map((doc) => (
                        <Card key={doc.id}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(doc.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            {doc.analise_completa && (
                              <Badge variant="outline" className="text-xs gap-1 shrink-0">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                Analisado
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" onClick={() => navigate(`/prof/paciente/${id}/graficos-exames`)} className="w-full gap-1">
                  Ver gráficos detalhados <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg border border-muted bg-muted/30">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Análise gerada por IA com base nos exames do paciente. Não substitui sua avaliação clínica.
              </p>
            </div>
          </TabsContent>

          {/* ═══ TAB: OBJETIVOS & INSIGHTS ═══ */}
          <TabsContent value="objetivos" className="space-y-6 mt-4">
            {loadingGoals ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>))}
              </div>
            ) : (
              <>
                {/* Score & resumo do último insight */}
                {healthData ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <ScoreCircleInsights score={healthData.score ?? 0} />
                        <div className="min-w-0 flex-1 text-center sm:text-left">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Score de saúde do paciente</p>
                          <p className="text-xl font-semibold text-foreground mt-1" style={{ color: scoreColorInsights(healthData.score ?? 0) }}>
                            {healthData.score_label || "—"}
                          </p>
                          {healthData.summary && (
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{healthData.summary}</p>
                          )}
                          {insightTs && (
                            <p className="text-[11px] text-muted-foreground mt-2">
                              Análise gerada em {format(new Date(insightTs), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center space-y-2">
                      <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        O paciente ainda não gerou uma análise de IA.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Marcadores principais */}
                {healthData?.main_markers?.length ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-primary" /> Marcadores principais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {healthData.main_markers.map((m, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.value}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs shrink-0 ${markerStatusClasses(m.status)}`}>
                            {markerStatusLabel(m.status)}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Prioridades do insight */}
                {healthData?.priorities?.length ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Prioridades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {healthData.priorities.slice(0, 3).map((p, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{i + 1}</span>
                            <span className="text-sm text-foreground leading-relaxed">{p}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Insights de IA */}
                {healthData?.insights?.length ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Insights de IA
                    </h3>
                    {healthData.insights.map((insight, i) => (
                      <Card key={i} className={`border ${priorityStyles(insight.priority)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center shrink-0 text-primary">
                              {categoryIcon(insight.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                                {priorityBadge(insight.priority)}
                              </div>
                              <Badge variant="outline" className="text-xs gap-1 mb-2">
                                {categoryIcon(insight.category)} {categoryLabel(insight.category)}
                              </Badge>
                              <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null}

                {/* Objetivos do paciente */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Objetivos do paciente
                  </h3>
                  {goals.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                        <Target className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">O paciente ainda não definiu objetivos.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {goals.map((goal) => {
                        const config = GOAL_CONFIG[goal.goal];
                        const IconComp = config?.icon || Target;
                        const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ativo;
                        const progress = calculateProgress(goal);
                        const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;

                        return (
                          <Card key={goal.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-xl ${config?.color || "bg-muted text-muted-foreground"}`}>
                                    <IconComp className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base font-semibold">{config?.label || goal.goal}</CardTitle>
                                    <span className="text-xs text-muted-foreground">{goal.priority === "primario" ? "Principal" : "Secundário"}</span>
                                  </div>
                                </div>
                                <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {goal.target_metrics && Object.keys(goal.target_metrics).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(goal.target_metrics).map(([key, val]) => {
                                    const metricDef = (GOAL_METRICS[goal.goal] || []).find((m) => m.key === key);
                                    return (<Badge key={key} variant="outline" className="text-xs">{metricDef?.label || key}: {val} {metricDef?.unit || ""}</Badge>);
                                  })}
                                </div>
                              )}
                              {goal.status === "ativo" && progress !== null && (
                                <div className="space-y-1 border-t pt-2">
                                  <div className="flex justify-between text-xs text-muted-foreground"><span>Progresso</span><span>{progress}%</span></div>
                                  <Progress value={progress} className="h-2" />
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                {goal.target_date && (<div className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /><span>Meta: {format(new Date(goal.target_date), "dd/MM/yyyy", { locale: ptBR })}</span></div>)}
                                {daysLeft !== null && daysLeft >= 0 && (<span className="font-medium">{daysLeft === 0 ? "Hoje!" : `${daysLeft} dias restantes`}</span>)}
                                {daysLeft !== null && daysLeft < 0 && (<span className="text-destructive font-medium">Vencido há {Math.abs(daysLeft)} dias</span>)}
                              </div>
                              {goal.notes && (<p className="text-xs text-muted-foreground italic border-t pt-2">"{goal.notes}"</p>)}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg border border-muted bg-muted/30">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Visualização somente leitura. Apenas o paciente pode editar seus próprios objetivos.
                  </p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
