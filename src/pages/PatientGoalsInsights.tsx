import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PatientLayout from "@/components/patient/PatientLayout";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Target, Plus, Calendar as CalendarIcon, Heart, Zap, Dumbbell,
  TrendingDown, TrendingUp, Activity, Shield, Smile, Edit, Archive,
  Sparkles, AlertTriangle, CheckCircle2, Info, Apple, Link2,
  RefreshCw, MessageCircle, FileText, ArrowRight, FlaskConical, Loader2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DifyChatTab } from "@/components/chat/DifyChatTab";

// ── Goal types & config ──

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

// ── Insight types & helpers ──

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

function scoreColor(score: number) {
  if (score <= 40) return "hsl(0 84% 60%)";
  if (score <= 70) return "hsl(45 93% 47%)";
  if (score <= 89) return "hsl(142 71% 45%)";
  return "hsl(142 76% 36%)";
}

function scoreLabel(score: number) {
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

function ScoreCircle({ score }: { score: number }) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="text-xl font-bold" fill={color}>{score}</text>
    </svg>
  );
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "exames": return <Activity className="h-4 w-4" />;
    case "nutricao": return <Apple className="h-4 w-4" />;
    case "treino": return <Dumbbell className="h-4 w-4" />;
    case "conexao": return <Link2 className="h-4 w-4" />;
    case "atencao": return <AlertTriangle className="h-4 w-4" />;
    case "positivo": return <CheckCircle2 className="h-4 w-4" />;
    case "medicacao": return <Heart className="h-4 w-4" />;
    case "meta": return <Target className="h-4 w-4" />;
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

// ── Main component ──

export default function PatientGoalsInsights() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "insights" ? "insights" :
    tabParam === "objetivos" ? "objetivos" :
    "resumo";
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Goals state ──
  const [goals, setGoals] = useState<PatientGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formGoal, setFormGoal] = useState<GoalType | "">("");
  const [formPriority, setFormPriority] = useState<GoalPriority>("primario");
  const [formTargetDate, setFormTargetDate] = useState<Date | undefined>();
  const [formNotes, setFormNotes] = useState("");
  const [formMetrics, setFormMetrics] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Insights state ──
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsGenerated, setInsightsGenerated] = useState(false);

  // ── Health Summary state ──
  const [analise, setAnalise] = useState<AnaliseCompleta | null>(null);
  const [pendingDocs, setPendingDocs] = useState<DocRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });
  const [reanalyzing, setReanalyzing] = useState(false);
  const [latestDocId, setLatestDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // ── Goals logic ──
  const fetchGoals = async () => {
    if (!user) return;
    setGoalsLoading(true);
    const { data: patientData } = await supabase
      .from("patients").select("id").eq("user_id", user.id).single();
    if (!patientData) { setGoalsLoading(false); return; }
    setPatientId(patientData.id);

    const { data, error } = await supabase
      .from("patient_goals").select("*").eq("patient_id", patientData.id)
      .order("created_at", { ascending: false });
    if (!error && data) setGoals(data as unknown as PatientGoal[]);
    setGoalsLoading(false);
  };

  // ── Health Summary fetch ──
  const fetchSummaryData = useCallback(async () => {
    if (!user) return;
    setSummaryLoading(true);
    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle();
    if (!patient?.id) { setSummaryLoading(false); return; }

    const [latestRes, pendingRes] = await Promise.all([
      supabase.from("documents").select("id, file_name, created_at, analise_completa")
        .eq("patient_id", patient.id).eq("category", "exame_laboratorial")
        .not("analise_completa", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("documents").select("id, file_name, created_at, analise_completa")
        .eq("patient_id", patient.id).eq("category", "exame_laboratorial")
        .is("analise_completa", null).order("created_at", { ascending: false }),
    ]);

    if (latestRes.data?.analise_completa) {
      setAnalise(latestRes.data.analise_completa as unknown as AnaliseCompleta);
      setLatestDocId(latestRes.data.id);
    } else { setAnalise(null); setLatestDocId(null); }
    setPendingDocs((pendingRes.data || []) as unknown as DocRow[]);
    setSummaryLoading(false);
  }, [user]);

  const handleAnalyzeAll = async () => {
    if (!user || pendingDocs.length === 0) return;
    setAnalyzing(true);
    setAnalyzeProgress({ current: 0, total: pendingDocs.length });
    let successCount = 0;
    let skippedCount = 0;
    for (let i = 0; i < pendingDocs.length; i++) {
      setAnalyzeProgress({ current: i + 1, total: pendingDocs.length });
      const { count } = await supabase.from("lab_results").select("id", { count: "exact", head: true }).eq("document_id", pendingDocs[i].id).eq("user_id", user.id);
      if (!count || count === 0) { skippedCount++; continue; }
      const { error } = await supabase.functions.invoke("analyze-lab", { body: { document_id: pendingDocs[i].id, user_id: user.id } });
      if (!error) successCount++;
    }
    setAnalyzing(false);
    await fetchSummaryData();
    if (skippedCount > 0 && successCount === 0) {
      toast({ title: "Extração pendente", description: "Processe os documentos primeiro em Exames e Documentos.", variant: "destructive" });
    } else if (successCount > 0) {
      toast({ title: `${successCount} exame${successCount > 1 ? "s" : ""} analisado${successCount > 1 ? "s" : ""} com sucesso!` });
    }
  };

  const handleReanalyze = async () => {
    if (!user || !latestDocId) return;
    setReanalyzing(true);
    const { error } = await supabase.functions.invoke("analyze-lab", { body: { document_id: latestDocId, user_id: user.id } });
    if (error) toast({ title: "Erro ao reanalisar", variant: "destructive" });
    else toast({ title: "Reanálise concluída!" });
    setReanalyzing(false);
    await fetchSummaryData();
  };

  useEffect(() => { if (user) { fetchGoals(); fetchSummaryData(); } }, [user]);

  const buildBaselineSnapshot = async (): Promise<Record<string, any>> => {
    if (!user || !patientId) return {};
    const [labRes, patientRes, trainingRes] = await Promise.all([
      supabase.from("lab_results").select("marker_name, value, unit, collection_date")
        .eq("user_id", user.id).order("collection_date", { ascending: false }).limit(20),
      supabase.from("patients").select("weight, height").eq("id", patientId).single(),
      supabase.from("training_plans").select("sport, strava_details, start_date")
        .eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1),
    ]);
    const snapshot: Record<string, any> = { captured_at: new Date().toISOString() };
    const labs = labRes.data || [];
    const uniqueLabs: Record<string, any> = {};
    labs.forEach((l: any) => { if (!uniqueLabs[l.marker_name]) uniqueLabs[l.marker_name] = { value: l.value, unit: l.unit, date: l.collection_date }; });
    snapshot.lab_results = uniqueLabs;
    const p = patientRes.data as any;
    if (p) { snapshot.weight = p.weight || null; snapshot.height = p.height || null; if (p.weight && p.height) { const hm = p.height / 100; snapshot.bmi = parseFloat((p.weight / (hm * hm)).toFixed(1)); } }
    const training = (trainingRes.data || [])[0];
    if (training) { const strava = training.strava_details as any; const la = strava?.activities?.[0]; snapshot.last_training = { sport: training.sport, date: la?.start_date_local?.split("T")[0] || training.start_date, avg_hr: la?.average_heartrate || null }; }
    return snapshot;
  };

  const handleSave = async () => {
    if (!formGoal || !patientId) return;
    setSaving(true);
    try {
      const baseline = await buildBaselineSnapshot();
      const targetMetrics: Record<string, number> = {};
      Object.entries(formMetrics).forEach(([k, v]) => { const n = parseFloat(v); if (!isNaN(n)) targetMetrics[k] = n; });
      const payload = {
        patient_id: patientId, goal: formGoal as GoalType, priority: formPriority,
        status: "ativo" as GoalStatus,
        target_date: formTargetDate ? format(formTargetDate, "yyyy-MM-dd") : null,
        target_metrics: Object.keys(targetMetrics).length > 0 ? targetMetrics : null,
        baseline_snapshot: baseline, notes: formNotes.trim() || null,
      };
      let error: any;
      if (editingId) { ({ error } = await supabase.from("patient_goals").update(payload).eq("id", editingId)); }
      else { ({ error } = await supabase.from("patient_goals").insert(payload)); }
      if (error) throw error;
      toast({ title: editingId ? "Objetivo atualizado!" : "Objetivo criado!", description: "Seu objetivo de saúde foi salvo com sucesso." });
      resetForm(); setShowModal(false); fetchGoals();
    } catch (e: any) { console.error(e); toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from("patient_goals").update({ status: "cancelado" }).eq("id", id);
    if (!error) { toast({ title: "Objetivo arquivado" }); fetchGoals(); }
  };

  const openEdit = (goal: PatientGoal) => {
    setEditingId(goal.id); setFormGoal(goal.goal); setFormPriority(goal.priority);
    setFormTargetDate(goal.target_date ? new Date(goal.target_date) : undefined);
    setFormNotes(goal.notes || "");
    const metrics: Record<string, string> = {};
    if (goal.target_metrics) Object.entries(goal.target_metrics).forEach(([k, v]) => { metrics[k] = String(v); });
    setFormMetrics(metrics); setShowModal(true);
  };

  const resetForm = () => { setEditingId(null); setFormGoal(""); setFormPriority("primario"); setFormTargetDate(undefined); setFormNotes(""); setFormMetrics({}); };

  const calculateProgress = (goal: PatientGoal): number | null => {
    if (!goal.target_metrics || !goal.baseline_snapshot?.lab_results) return null;
    const metrics = GOAL_METRICS[goal.goal] || [];
    if (metrics.length === 0) return null;
    let improved = 0;
    metrics.forEach((m) => { if (goal.target_metrics?.[m.key] != null) improved += 0.5; });
    return Math.min(Math.round((improved / metrics.length) * 100), 100);
  };

  const currentMetrics = useMemo(() => !formGoal ? [] : GOAL_METRICS[formGoal] || [], [formGoal]);

  // ── Insights logic ──
  const generateInsights = async () => {
    if (!user) { sonnerToast.error("Você precisa estar logado para gerar insights."); return; }
    setInsightsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-health-insights");
      if (error) throw error;
      if (result?.error) { sonnerToast.error(result.error); return; }
      setInsightsData(result as InsightsData);
      setInsightsGenerated(true);
    } catch (e: any) {
      const message = e?.message || "Erro ao gerar insights. Tente novamente.";
      sonnerToast.error(typeof message === "string" ? message : "Erro ao gerar insights.");
    } finally { setInsightsLoading(false); }
  };

  // ── Render ──
  return (
    <PatientLayout
      title="Objetivos & Insights"
      subtitle="Defina metas e receba análises inteligentes"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Objetivos & Insights" />}
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
        {authLoading ? (
          <Card><CardContent className="p-8 text-center"><RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">Carregando...</p></CardContent></Card>
        ) : (
          <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="resumo" className="flex-1 gap-1.5">
                <Heart className="h-3.5 w-3.5" /> Resumo de saúde
              </TabsTrigger>
              <TabsTrigger value="objetivos" className="flex-1 gap-1.5">
                <Target className="h-3.5 w-3.5" /> Meus objetivos
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex-1 gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Insights de IA
              </TabsTrigger>
            </TabsList>

            {/* ═══ TAB: RESUMO DE SAÚDE ═══ */}
            <TabsContent value="resumo" className="space-y-4 mt-4">
              {/* Pending docs banner */}
              {!summaryLoading && pendingDocs.length > 0 && (
                <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <FlaskConical className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                          {pendingDocs.length} exame{pendingDocs.length > 1 ? "s" : ""} aguardando análise
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {pendingDocs.slice(0, 3).map((doc) => (
                            <li key={doc.id} className="text-xs text-amber-700 dark:text-amber-400 truncate">• {doc.file_name}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Button onClick={handleAnalyzeAll} disabled={analyzing} className="w-full gap-2" size="sm">
                      {analyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analisando {analyzeProgress.current}/{analyzeProgress.total}...</>) : (<><FlaskConical className="h-4 w-4" />Analisar agora</>)}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {summaryLoading ? (
                <Card><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ) : analise ? (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <ScoreCircle score={analise.score} />
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-foreground">{scoreLabel(analise.score)}</p>
                        <p className="text-sm text-muted-foreground mt-1">{analise.resumo_geral}</p>
                      </div>
                    </div>
                    {analise.marcadores?.length > 0 && (
                      <div className="border-t pt-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Marcadores principais</p>
                        {analise.marcadores.filter(m => m.status !== "normal").slice(0, 4).map((m, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${statusDotClass(m.status)}`} />
                              <span className="font-medium">{m.nome}</span>
                              <span className="text-xs text-muted-foreground">{m.valor} {m.unidade}</span>
                            </div>
                            <Badge variant={statusBadgeVariant(m.status)} className="text-xs capitalize">{m.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {analise.prioridades?.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" /> Prioridades</p>
                        <ul className="space-y-1">
                          {analise.prioridades.slice(0, 3).map((p, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{i + 1}</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={reanalyzing} className="gap-1.5">
                        {reanalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Reanalisar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/pac/resumo")} className="gap-1.5">
                        Ver completo <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Nenhum exame analisado ainda</p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/pac/documentos")} className="gap-1">
                      Ir para Exames <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ═══ TAB: OBJETIVOS ═══ */}
            <TabsContent value="objetivos" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Meus Objetivos</h2>
                <Button onClick={() => { resetForm(); setShowModal(true); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Definir novo objetivo
                </Button>
              </div>

              {goalsLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>))}
                </div>
              ) : goals.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum objetivo definido</h3>
                    <p className="text-muted-foreground max-w-sm mb-4">Defina seus objetivos de saúde para acompanhar seu progresso e receber insights personalizados.</p>
                    <Button onClick={() => { resetForm(); setShowModal(true); }} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" /> Criar primeiro objetivo
                    </Button>
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
                      <Card key={goal.id} className="overflow-hidden transition-all hover:shadow-md">
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
                          {progress !== null && (
                            <div className="space-y-1">
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
                          {goal.status === "ativo" && (
                            <div className="flex gap-2 pt-1">
                              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => openEdit(goal)}><Edit className="h-3 w-3" /> Editar</Button>
                              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => handleArchive(goal.id)}><Archive className="h-3 w-3" /> Arquivar</Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ═══ TAB: INSIGHTS ═══ */}
            <TabsContent value="insights" className="space-y-4 mt-4">
              {!insightsGenerated ? (
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
                    <Button onClick={generateInsights} disabled={insightsLoading} size="lg" className="gap-2">
                      {insightsLoading ? (<><RefreshCw className="h-4 w-4 animate-spin" />Analisando seus dados...</>) : (<><Sparkles className="h-4 w-4" />Gerar insights</>)}
                    </Button>
                    <p className="text-xs text-muted-foreground">Os insights são educativos e não substituem a orientação médica.</p>
                  </CardContent>
                </Card>
              ) : insightsData ? (
                <>
                  {insightsData.summary && (
                    <Card><CardContent className="p-4"><div className="flex items-start gap-3"><Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" /><p className="text-sm text-foreground leading-relaxed">{insightsData.summary}</p></div></CardContent></Card>
                  )}
                  {insightsData.insights.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground">Seus insights</h3>
                      {insightsData.insights.map((insight, i) => (
                        <Card key={i} className={`border ${priorityStyles(insight.priority)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {priorityIcon(insight.priority)}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                                  <Badge variant="outline" className="text-xs gap-1 shrink-0">{categoryIcon(insight.category)}{categoryLabel(insight.category)}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{insight.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card><CardContent className="p-6 text-center"><p className="text-muted-foreground">Nenhum insight gerado no momento.</p></CardContent></Card>
                  )}
                  <Button variant="outline" onClick={generateInsights} disabled={insightsLoading} className="w-full gap-2">
                    {insightsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Gerar novos insights
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">⚕️ Estes insights são gerados por inteligência artificial e têm caráter informativo. Sempre consulte seus profissionais de saúde para decisões clínicas.</p>
                </>
              ) : null}
            </TabsContent>
          </Tabs>
          </>
        )}
      </div>

      {/* ═══ GOAL MODAL ═══ */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) resetForm(); setShowModal(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Objetivo" : "Novo Objetivo de Saúde"}</DialogTitle>
            <DialogDescription>Defina seu objetivo e as métricas que deseja alcançar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Objetivo *</label>
              <Select value={formGoal} onValueChange={(v) => { setFormGoal(v as GoalType); setFormMetrics({}); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger>
                <SelectContent>{Object.entries(GOAL_CONFIG).map(([key, cfg]) => (<SelectItem key={key} value={key}>{cfg.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={formPriority} onValueChange={(v) => setFormPriority(v as GoalPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primario">Principal</SelectItem>
                  <SelectItem value="secundario">Secundário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data alvo</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`w-full justify-start text-left font-normal ${!formTargetDate ? "text-muted-foreground" : ""}`}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formTargetDate ? format(formTargetDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formTargetDate} onSelect={setFormTargetDate} disabled={(date) => date < new Date()} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            {currentMetrics.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Métricas alvo (opcional)</label>
                {currentMetrics.map((m) => (
                  <div key={m.key} className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground w-40 shrink-0">{m.label}</label>
                    <Input type="number" step="any" placeholder={m.unit} value={formMetrics[m.key] || ""} onChange={(e) => setFormMetrics((prev) => ({ ...prev, [m.key]: e.target.value }))} className="max-w-32" />
                    <span className="text-xs text-muted-foreground">{m.unit}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea placeholder="Anotações sobre seu objetivo..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formGoal || saving}>{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar objetivo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PatientLayout>
  );
}
