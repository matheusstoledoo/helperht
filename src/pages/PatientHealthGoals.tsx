import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PatientLayout from "@/components/patient/PatientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  Heart,
  Zap,
  Dumbbell,
  TrendingDown,
  TrendingUp,
  Activity,
  Shield,
  Smile,
  Edit,
  Archive,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type GoalType =
  | "longevidade"
  | "performance_aerobica"
  | "performance_forca"
  | "perda_de_peso"
  | "ganho_de_massa"
  | "saude_metabolica"
  | "saude_cardiovascular"
  | "bem_estar_geral";

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

export default function PatientHealthGoals() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [goals, setGoals] = useState<PatientGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formGoal, setFormGoal] = useState<GoalType | "">("");
  const [formPriority, setFormPriority] = useState<GoalPriority>("primario");
  const [formTargetDate, setFormTargetDate] = useState<Date | undefined>();
  const [formNotes, setFormNotes] = useState("");
  const [formMetrics, setFormMetrics] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);

    const { data: patientData } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!patientData) { setLoading(false); return; }
    setPatientId(patientData.id);

    const { data, error } = await supabase
      .from("patient_goals")
      .select("*")
      .eq("patient_id", patientData.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setGoals(data as unknown as PatientGoal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const buildBaselineSnapshot = async (): Promise<Record<string, any>> => {
    if (!user || !patientId) return {};

    const [labRes, patientRes, trainingRes] = await Promise.all([
      supabase.from("lab_results")
        .select("marker_name, value, unit, collection_date")
        .eq("user_id", user.id)
        .order("collection_date", { ascending: false })
        .limit(20),
      supabase.from("patients")
        .select("weight, height")
        .eq("id", patientId)
        .single(),
      supabase.from("training_plans")
        .select("sport, strava_details, start_date")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const snapshot: Record<string, any> = {
      captured_at: new Date().toISOString(),
    };

    const labs = labRes.data || [];
    const uniqueLabs: Record<string, any> = {};
    labs.forEach((l: any) => {
      if (!uniqueLabs[l.marker_name]) {
        uniqueLabs[l.marker_name] = { value: l.value, unit: l.unit, date: l.collection_date };
      }
    });
    snapshot.lab_results = uniqueLabs;

    const p = patientRes.data as any;
    if (p) {
      snapshot.weight = p.weight || null;
      snapshot.height = p.height || null;
      if (p.weight && p.height) {
        const hm = p.height / 100;
        snapshot.bmi = parseFloat((p.weight / (hm * hm)).toFixed(1));
      }
    }

    const training = (trainingRes.data || [])[0];
    if (training) {
      const strava = training.strava_details as any;
      const lastActivity = strava?.activities?.[0];
      snapshot.last_training = {
        sport: training.sport,
        date: lastActivity?.start_date_local?.split("T")[0] || training.start_date,
        avg_hr: lastActivity?.average_heartrate || null,
      };
    }

    return snapshot;
  };

  const handleSave = async () => {
    if (!formGoal || !patientId) return;
    setSaving(true);

    try {
      const baseline = await buildBaselineSnapshot();

      const targetMetrics: Record<string, number> = {};
      Object.entries(formMetrics).forEach(([k, v]) => {
        const num = parseFloat(v);
        if (!isNaN(num)) targetMetrics[k] = num;
      });

      const payload = {
        patient_id: patientId,
        goal: formGoal as GoalType,
        priority: formPriority,
        status: "ativo" as GoalStatus,
        target_date: formTargetDate ? format(formTargetDate, "yyyy-MM-dd") : null,
        target_metrics: Object.keys(targetMetrics).length > 0 ? targetMetrics : null,
        baseline_snapshot: baseline,
        notes: formNotes.trim() || null,
      };

      let error: any;
      if (editingId) {
        ({ error } = await supabase.from("patient_goals").update(payload).eq("id", editingId));
      } else {
        ({ error } = await supabase.from("patient_goals").insert(payload));
      }

      if (error) throw error;

      toast({ title: editingId ? "Objetivo atualizado!" : "Objetivo criado!", description: "Seu objetivo de saúde foi salvo com sucesso." });
      resetForm();
      setShowModal(false);
      fetchGoals();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from("patient_goals").update({ status: "cancelado" }).eq("id", id);
    if (!error) {
      toast({ title: "Objetivo arquivado" });
      fetchGoals();
    }
  };

  const openEdit = (goal: PatientGoal) => {
    setEditingId(goal.id);
    setFormGoal(goal.goal);
    setFormPriority(goal.priority);
    setFormTargetDate(goal.target_date ? new Date(goal.target_date) : undefined);
    setFormNotes(goal.notes || "");
    const metrics: Record<string, string> = {};
    if (goal.target_metrics) {
      Object.entries(goal.target_metrics).forEach(([k, v]) => {
        metrics[k] = String(v);
      });
    }
    setFormMetrics(metrics);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormGoal("");
    setFormPriority("primario");
    setFormTargetDate(undefined);
    setFormNotes("");
    setFormMetrics({});
  };

  const calculateProgress = (goal: PatientGoal): number | null => {
    if (!goal.target_metrics || !goal.baseline_snapshot?.lab_results) return null;
    const metrics = GOAL_METRICS[goal.goal] || [];
    if (metrics.length === 0) return null;
    let improved = 0;
    metrics.forEach((m) => {
      if (goal.target_metrics?.[m.key] != null) improved += 0.5;
    });
    return Math.min(Math.round((improved / metrics.length) * 100), 100);
  };

  const currentMetrics = useMemo(() => {
    if (!formGoal) return [];
    return GOAL_METRICS[formGoal] || [];
  }, [formGoal]);

  const breadcrumb = (
    <nav className="flex items-center gap-2 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/pac/dashboard")}
        className="gap-1 text-muted-foreground hover:text-foreground hover:bg-primary hover:text-primary-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Página Inicial
      </Button>
      <span className="text-muted-foreground">/</span>
      <span className="font-medium text-foreground">Objetivos de Saúde</span>
    </nav>
  );

  return (
    <PatientLayout
      title="Objetivos de Saúde"
      subtitle="Defina e acompanhe seus objetivos de saúde"
      breadcrumb={breadcrumb}
    >
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Meus Objetivos</h2>
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Definir novo objetivo
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum objetivo definido</h3>
              <p className="text-muted-foreground max-w-sm mb-4">
                Defina seus objetivos de saúde para acompanhar seu progresso e receber insights personalizados.
              </p>
              <Button onClick={() => { resetForm(); setShowModal(true); }} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeiro objetivo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => {
              const config = GOAL_CONFIG[goal.goal];
              const IconComponent = config?.icon || Target;
              const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ativo;
              const progress = calculateProgress(goal);
              const daysLeft = goal.target_date
                ? differenceInDays(new Date(goal.target_date), new Date())
                : null;

              return (
                <Card key={goal.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${config?.color || "bg-muted text-muted-foreground"}`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">
                            {config?.label || goal.goal}
                          </CardTitle>
                          <span className="text-xs text-muted-foreground">
                            {goal.priority === "primario" ? "Principal" : "Secundário"}
                          </span>
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
                          return (
                            <Badge key={key} variant="outline" className="text-xs">
                              {metricDef?.label || key}: {val} {metricDef?.unit || ""}
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {progress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {goal.target_date && (
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span>Meta: {format(new Date(goal.target_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      )}
                      {daysLeft !== null && daysLeft >= 0 && (
                        <span className="font-medium">
                          {daysLeft === 0 ? "Hoje!" : `${daysLeft} dias restantes`}
                        </span>
                      )}
                      {daysLeft !== null && daysLeft < 0 && (
                        <span className="text-destructive font-medium">Vencido há {Math.abs(daysLeft)} dias</span>
                      )}
                    </div>

                    {goal.notes && (
                      <p className="text-xs text-muted-foreground italic border-t pt-2">
                        "{goal.notes}"
                      </p>
                    )}

                    {goal.status === "ativo" && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => openEdit(goal)}>
                          <Edit className="h-3 w-3" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => handleArchive(goal.id)}>
                          <Archive className="h-3 w-3" /> Arquivar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) { resetForm(); } setShowModal(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Objetivo" : "Novo Objetivo de Saúde"}</DialogTitle>
            <DialogDescription>Defina seu objetivo e as métricas que deseja alcançar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Objetivo *</label>
              <Select value={formGoal} onValueChange={(v) => { setFormGoal(v as GoalType); setFormMetrics({}); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={formPriority} onValueChange={(v) => setFormPriority(v as GoalPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                  <Calendar
                    mode="single"
                    selected={formTargetDate}
                    onSelect={setFormTargetDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {currentMetrics.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Métricas alvo (opcional)</label>
                {currentMetrics.map((m) => (
                  <div key={m.key} className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground w-40 shrink-0">{m.label}</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder={m.unit}
                      value={formMetrics[m.key] || ""}
                      onChange={(e) => setFormMetrics((prev) => ({ ...prev, [m.key]: e.target.value }))}
                      className="max-w-32"
                    />
                    <span className="text-xs text-muted-foreground">{m.unit}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                placeholder="Anotações sobre seu objetivo..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formGoal || saving}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar objetivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PatientLayout>
  );
}
