import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, FileText, MessageSquare, MapPin } from "lucide-react";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import ActivityAnalysisCharts, {
  formatPace,
} from "@/components/training/ActivityAnalysisCharts";
import ActivityMap from "@/components/training/ActivityMap";

const DIMENSION_OPTIONS: [string, string][] = [
  ["carga_treino", "Carga de treino"],
  ["recuperacao_muscular", "Recuperação muscular"],
  ["recuperacao_articular", "Recuperação articular"],
  ["sono", "Sono"],
  ["nutricao", "Nutrição"],
  ["hidratacao", "Hidratação"],
  ["saude_cardiovascular", "Saúde cardiovascular"],
  ["saude_mental", "Saúde mental"],
  ["retorno_treino", "Retorno ao treino"],
  ["periodizacao", "Periodização"],
  ["outro", "Outro"],
];

const DIMENSION_LABEL: Record<string, string> = Object.fromEntries(
  DIMENSION_OPTIONS
);

const PRIORITY_LABEL: Record<string, string> = {
  normal: "Normal",
  atencao: "Atenção",
  urgente: "Urgente",
};

const PRIORITY_BADGE: Record<string, string> = {
  normal: "bg-primary/10 text-primary border-primary/30",
  atencao: "bg-amber-50 text-amber-800 border-amber-300",
  urgente: "bg-red-50 text-red-800 border-red-300",
};

export default function ProfActivityAnalysis() {
  const { patientId, id } = useParams<{ patientId: string; id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();

  const [log, setLog] = useState<any>(null);
  const [laps, setLaps] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [patientName, setPatientName] = useState<string>("");
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [profSpecialty, setProfSpecialty] = useState<string>("");
  const [linkedRecs, setLinkedRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form de nova observação
  const [recDimension, setRecDimension] = useState<string>("");
  const [recText, setRecText] = useState<string>("");
  const [recPriority, setRecPriority] = useState<string>("normal");
  const [recVisible, setRecVisible] = useState<boolean>(true);
  const [savingRec, setSavingRec] = useState<boolean>(false);

  // Auth guards
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) navigate("/dashboard");
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!id || !patientId || !user || (!isProfessional && !isAdmin)) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);

      const [
        linkRes,
        patientRes,
        logRes,
        lapsRes,
        recordsRes,
        recsRes,
        profRes,
      ] = await Promise.all([
        supabase
          .from("professional_patient_links")
          .select("id")
          .eq("professional_id", user.id)
          .eq("patient_id", patientId)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("patients")
          .select("user_id, users(name)")
          .eq("id", patientId)
          .maybeSingle(),
        supabase.from("workout_logs").select("*").eq("id", id).maybeSingle(),
        (supabase.from("workout_laps" as any) as any)
          .select("*")
          .eq("workout_log_id", id)
          .order("lap_index"),
        (supabase.from("workout_records" as any) as any)
          .select("*")
          .eq("workout_log_id", id)
          .order("elapsed_seconds"),
        supabase
          .from("professional_recommendations")
          .select("*")
          .eq("workout_log_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("users")
          .select("specialty")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const access =
        !!linkRes.data || isAdmin === true;
      setHasAccess(access);

      if (patientRes.data?.users) {
        setPatientName((patientRes.data.users as any).name || "Paciente");
      }
      setLog(logRes.data);
      setLaps(lapsRes.data || []);
      setRecords(recordsRes.data || []);
      setLinkedRecs(recsRes.data || []);
      setProfSpecialty((profRes.data as any)?.specialty || "");
      setLoading(false);
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [id, patientId, user, isProfessional, isAdmin]);

  const handleSaveRec = async () => {
    if (!recDimension || recText.trim().length < 10) {
      toast.error("Selecione a dimensão e escreva pelo menos 10 caracteres.");
      return;
    }
    setSavingRec(true);
    const { error } = await supabase
      .from("professional_recommendations")
      .insert({
        professional_id: user!.id,
        patient_id: patientId!,
        specialty: profSpecialty || "geral",
        dimension: recDimension,
        recommendation: recText.trim(),
        priority: recPriority,
        visible_to_patient: recVisible,
        workout_log_id: id!,
      });
    setSavingRec(false);
    if (error) {
      toast.error("Erro ao salvar observação.");
      return;
    }
    toast.success("Observação salva com sucesso.");
    setRecDimension("");
    setRecText("");
    setRecPriority("normal");
    setRecVisible(true);
    // refresh
    const { data } = await supabase
      .from("professional_recommendations")
      .select("*")
      .eq("workout_log_id", id!)
      .order("created_at", { ascending: false });
    setLinkedRecs(data || []);
  };

  if (authLoading || roleLoading || loading) return <FullPageLoading />;

  // Header reutilizável
  const Header = ({ activityTitle }: { activityTitle: string }) => (
    <header className="border-b bg-card px-4 sm:px-6 py-4">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Página inicial</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/prof/paciente/${patientId}`}>
              {patientName || "Paciente"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/prof/paciente/${patientId}/treinos`}>
              Treinos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{activityTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {activityTitle}
          </h1>
          {log?.activity_date && (
            <p className="text-sm text-muted-foreground capitalize">
              {format(parseISO(log.activity_date), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/prof/paciente/${patientId}/treinos`)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para treinos
        </Button>
      </div>
    </header>
  );

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header activityTitle="Sem acesso" />
        <main className="p-4 sm:p-6 max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Você não tem vínculo ativo com este paciente.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="min-h-screen bg-background">
        <Header activityTitle="Atividade não encontrada" />
        <main className="p-4 sm:p-6 max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Atividade não encontrada.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const title = log.activity_name || log.sport || "Atividade";

  const summary = [
    {
      label: "Distância",
      value: log.distance_km != null ? `${log.distance_km} km` : "—",
    },
    {
      label: "Duração",
      value:
        log.duration_minutes != null ? `${log.duration_minutes} min` : "—",
    },
    {
      label: "Pace médio",
      value: log.avg_pace_min_km
        ? `${formatPace(Number(log.avg_pace_min_km))} min/km`
        : "—",
    },
    {
      label: "FC média",
      value: log.avg_heart_rate != null ? `${log.avg_heart_rate} bpm` : "—",
    },
    {
      label: "FC máxima",
      value: log.max_heart_rate != null ? `${log.max_heart_rate} bpm` : "—",
    },
    {
      label: log.tss != null ? "TSS" : "sRPE",
      value:
        log.tss != null
          ? `${log.tss}`
          : log.srpe != null
          ? `${log.srpe}`
          : "—",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header activityTitle={title} />
      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
        {/* Card de resumo */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {summary.map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card de contexto clínico — apenas se houver observações vinculadas */}
        {linkedRecs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Observações clínicas vinculadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedRecs.map((rec) => (
                <div
                  key={rec.id}
                  className="border rounded-lg p-3 space-y-1.5"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={PRIORITY_BADGE[rec.priority || "normal"]}
                    >
                      {PRIORITY_LABEL[rec.priority || "normal"]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {DIMENSION_LABEL[rec.dimension] || rec.dimension}
                    </Badge>
                    {rec.specialty && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {rec.specialty}
                      </Badge>
                    )}
                    {rec.visible_to_patient === false && (
                      <Badge variant="outline" className="text-xs">
                        Privada
                      </Badge>
                    )}
                    {rec.created_at && (
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {format(parseISO(rec.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {rec.recommendation}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Gráficos compartilhados */}
        <ActivityAnalysisCharts laps={laps} records={records} />

        {/* Form para nova observação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Deixar observação sobre esta atividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Dimensão</Label>
              <Select value={recDimension} onValueChange={setRecDimension}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma dimensão" />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSION_OPTIONS.map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea
                value={recText}
                onChange={(e) => setRecText(e.target.value)}
                placeholder="Descreva sua observação sobre esta atividade..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {recText.length}/500
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <div className="flex gap-2">
                {(
                  [
                    ["normal", "Normal"],
                    ["atencao", "Atenção"],
                    ["urgente", "Urgente"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRecPriority(val)}
                    className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                      recPriority === val
                        ? val === "urgente"
                          ? "bg-red-50 border-red-400 text-red-800"
                          : val === "atencao"
                          ? "bg-amber-50 border-amber-400 text-amber-800"
                          : "bg-primary/10 border-primary text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Visível ao paciente</Label>
              <Switch
                checked={recVisible}
                onCheckedChange={setRecVisible}
              />
            </div>

            <button
              onClick={handleSaveRec}
              disabled={
                savingRec || !recDimension || recText.trim().length < 10
              }
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {savingRec ? "Salvando..." : "Salvar observação"}
            </button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
