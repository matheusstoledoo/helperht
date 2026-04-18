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
  RefreshCw, FlaskConical, Pill, GitMerge, Loader2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

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

// ── Health insights (unified data from edge function) ──

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
}

function scoreColor(score: number) {
  if (score >= 80) return "hsl(142 71% 45%)"; // verde
  if (score >= 60) return "hsl(45 93% 47%)";  // amarelo
  if (score >= 40) return "hsl(25 95% 53%)";  // laranja
  return "hsl(0 84% 60%)";                     // vermelho
}

function ScoreCircle({ score }: { score: number }) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = scoreColor(score);
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
  switch (status) {
    case "normal":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
    case "attention":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "altered":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function markerStatusLabel(status: string) {
  switch (status) {
    case "normal": return "Normal";
    case "attention": return "Atenção";
    case "altered": return "Alterado";
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

  // ── Unified health data state (single source for Resumo + Insights) ──
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // ── Single edge function call powering Resumo + Insights ──
  const fetchHealthData = useCallback(async () => {
    if (!user) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-health-insights");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setHealthData(data as HealthData);
    } catch (e: any) {
      const msg = e?.message || "Erro ao gerar análise de saúde.";
      setHealthError(typeof msg === "string" ? msg : "Erro ao gerar análise.");
      sonnerToast.error(typeof msg === "string" ? msg : "Erro ao gerar análise.");
    } finally {
      setHealthLoading(false);
    }
  }, [user]);

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

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchHealthData();
    }
  }, [user, fetchHealthData]);

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
      toast({ title: editingId ? "Objetivo atualizado!" : "Objetivo criado!", description: "Reanalisando seus dados..." });
      resetForm(); setShowModal(false);
      await fetchGoals();
      // Re-run unified analysis since the goal changed
      fetchHealthData();
    } catch (e: any) { console.error(e); toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from("patient_goals").update({ status: "cancelado" }).eq("id", id);
    if (!error) {
      toast({ title: "Objetivo arquivado" });
      await fetchGoals();
      fetchHealthData();
    }
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

  // ── Loading skeleton shared by Resumo + Insights ──
  const HealthLoadingSkeleton = () => (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-28 w-28 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );

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
              {healthLoading ? (
                <HealthLoadingSkeleton />
              ) : healthError && !healthData ? (
                <Card>
                  <CardContent className="p-8 text-center space-y-3">
                    <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
                    <p className="text-sm text-muted-foreground">{healthError}</p>
                    <Button onClick={fetchHealthData} variant="outline" className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Tentar novamente
                    </Button>
                  </CardContent>
                </Card>
              ) : healthData ? (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <ScoreCircle score={healthData.score ?? 0} />
                        <div className="min-w-0 flex-1 text-center sm:text-left">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Score de saúde</p>
                          <p className="text-xl font-semibold text-foreground mt-1" style={{ color: scoreColor(healthData.score ?? 0) }}>
                            {healthData.score_label || "—"}
                          </p>
                          {healthData.summary && (
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{healthData.summary}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {healthData.main_markers?.length > 0 && (
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
                  )}

                  {healthData.priorities?.length > 0 && (
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
                  )}

                  <Button variant="outline" onClick={fetchHealthData} disabled={healthLoading} className="w-full gap-2">
                    {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Reanalisar
                  </Button>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center space-y-3">
                    <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Sem dados disponíveis ainda.</p>
                    <Button onClick={fetchHealthData} variant="outline" className="gap-2">
                      <Sparkles className="h-4 w-4" /> Gerar análise
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
              {healthLoading ? (
                <HealthLoadingSkeleton />
              ) : healthError && !healthData ? (
                <Card>
                  <CardContent className="p-8 text-center space-y-3">
                    <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
                    <p className="text-sm text-muted-foreground">{healthError}</p>
                    <Button onClick={fetchHealthData} variant="outline" className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Tentar novamente
                    </Button>
                  </CardContent>
                </Card>
              ) : healthData && healthData.insights?.length > 0 ? (
                <>
                  <div className="space-y-3">
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
                  <Button variant="outline" onClick={fetchHealthData} disabled={healthLoading} className="w-full gap-2">
                    {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Gerar novos insights
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    ⚕️ Estes insights são gerados por inteligência artificial e têm caráter informativo. Sempre consulte seus profissionais de saúde para decisões clínicas.
                  </p>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center space-y-3">
                    <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Nenhum insight disponível ainda.</p>
                    <Button onClick={fetchHealthData} variant="outline" className="gap-2">
                      <Sparkles className="h-4 w-4" /> Gerar insights
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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
