import { useState, useEffect } from "react";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Pill,
  TestTube,
  Route,
  Plus,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Calendar,
  Stethoscope,
  Apple,
  Dumbbell,
  Heart,
  FlaskConical,
  Activity,
  Target,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatFrequency } from "@/lib/utils";
import { PatientTrailsSection } from "@/components/trails/PatientTrailsSection";
import { PatientTrailResponsesTimeline } from "@/components/trails/PatientTrailResponsesTimeline";

interface PatientData {
  id: string;
  user_id: string;
  birthdate: string;
  users: {
    name: string;
    email: string | null;
    cpf: string | null;
  } | null;
}

interface ConsultationData {
  id: string;
  consultation_date: string;
  chief_complaint: string | null;
  assessment: string | null;
  plan: string | null;
  notes: string | null;
  physical_examination: string | null;
  follow_up_date: string | null;
}

interface DiagnosisData {
  id: string;
  name: string;
  status: string;
  justification: string | null;
  public_notes: string | null;
  private_notes: string | null;
}

interface TreatmentData {
  id: string;
  name: string;
  status: string;
  dosage: string | null;
  frequency: string | null;
  description: string | null;
  public_notes: string | null;
  private_notes: string | null;
}

const ProfessionalPatientView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [consultations, setConsultations] = useState<ConsultationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [diagnosisCount, setDiagnosisCount] = useState(0);
  const [treatmentCount, setTreatmentCount] = useState(0);
  const [examDocumentCount, setExamDocumentCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [nutritionCount, setNutritionCount] = useState(0);
  const [trainingCount, setTrainingCount] = useState(0);
  const [labResultCount, setLabResultCount] = useState(0);
  const [lastVitals, setLastVitals] = useState<string>("Nenhum registro");
  const [microExpanded, setMicroExpanded] = useState<Set<string>>(new Set());
  const [macroExpanded, setMacroExpanded] = useState<Set<string>>(new Set());

  const [consultationDiagnoses, setConsultationDiagnoses] = useState<Record<string, DiagnosisData[]>>({});
  const [consultationTreatments, setConsultationTreatments] = useState<Record<string, TreatmentData[]>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select(`
            id,
            user_id,
            birthdate,
            users (
              name,
              email,
              cpf
            )
          `)
          .eq("id", id)
          .maybeSingle();

        if (patientError) throw patientError;
        setPatient(patientData);

        const { data: consultationData } = await supabase
          .from("consultations")
          .select("*")
          .eq("patient_id", id)
          .order("consultation_date", { ascending: false });

        setConsultations(consultationData || []);

        const patientUserId = (patientData as any)?.user_id;

        const [diagnosesRes, treatmentsRes, examsRes, documentsRes, goalsRes, nutritionRes, trainingRes, labRes, vitalsRes] = await Promise.all([
          supabase.from("diagnoses").select("id", { count: "exact" }).eq("patient_id", id).eq("status", "active"),
          supabase.from("treatments").select("id", { count: "exact" }).eq("patient_id", id).eq("status", "active"),
          supabase.from("exams").select("id", { count: "exact" }).eq("patient_id", id),
          supabase.from("documents").select("id", { count: "exact" }).eq("patient_id", id),
          supabase.from("goals").select("id", { count: "exact" }).eq("patient_id", id).eq("status", "active"),
          supabase.from("nutrition_plans").select("id", { count: "exact" }).eq("patient_id", id),
          supabase.from("training_plans").select("id", { count: "exact" }).eq("patient_id", id),
          supabase.from("lab_results").select("id", { count: "exact" }).eq("patient_id", id),
          supabase.from("vital_signs").select("*").eq("patient_id", id).eq("type", "pressao").order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        // Fallback por user_id quando patient_id não retorna dados
        let labCount = labRes.count || 0;
        let docCount = documentsRes.count || 0;
        if (patientUserId) {
          if (labCount === 0) {
            const fb = await supabase.from("lab_results").select("id", { count: "exact" }).eq("user_id", patientUserId);
            labCount = fb.count || 0;
          }
          if (docCount === 0) {
            const fb = await supabase.from("documents").select("id", { count: "exact" }).eq("uploaded_by", patientUserId);
            docCount = fb.count || 0;
          }
        }

        setDiagnosisCount(diagnosesRes.count || 0);
        setTreatmentCount(treatmentsRes.count || 0);
        setExamDocumentCount((examsRes.count || 0) + docCount);
        setGoalCount(goalsRes.count || 0);
        setNutritionCount(nutritionRes.count || 0);
        setTrainingCount(trainingRes.count || 0);
        setLabResultCount(labCount);
        if (vitalsRes.data && vitalsRes.data.systolic) {
          setLastVitals(`Último: ${vitalsRes.data.systolic}/${vitalsRes.data.diastolic} mmHg · ${format(new Date(vitalsRes.data.recorded_at), "dd/MM/yyyy", { locale: ptBR })}`);
        }

        if (consultationData && consultationData.length > 0) {
          const consultationIds = consultationData.map(c => c.id);
          
          const [diagnosesData, treatmentsData] = await Promise.all([
            supabase.from("diagnoses").select("id, name, status, consultation_id, justification, public_notes, private_notes").in("consultation_id", consultationIds),
            supabase.from("treatments").select("id, name, status, dosage, frequency, description, consultation_id, public_notes, private_notes").in("consultation_id", consultationIds),
          ]);

          const diagByConsult: Record<string, DiagnosisData[]> = {};
          const treatByConsult: Record<string, TreatmentData[]> = {};
          
          (diagnosesData.data || []).forEach((d: any) => {
            if (!diagByConsult[d.consultation_id]) diagByConsult[d.consultation_id] = [];
            diagByConsult[d.consultation_id].push(d);
          });
          
          (treatmentsData.data || []).forEach((t: any) => {
            if (!treatByConsult[t.consultation_id]) treatByConsult[t.consultation_id] = [];
            treatByConsult[t.consultation_id].push(t);
          });

          setConsultationDiagnoses(diagByConsult);
          setConsultationTreatments(treatByConsult);
        }

      } catch (error) {
        console.error("Error fetching patient:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do paciente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && (isProfessional || isAdmin)) {
      fetchPatientData();
    }
  }, [id, user, isProfessional, isAdmin, toast]);

  const formatCpf = (cpf: string | null) => {
    if (!cpf) return "Não informado";
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const toggleMicroExpand = (consultationId: string) => {
    setMicroExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(consultationId)) {
        newSet.delete(consultationId);
      } else {
        newSet.add(consultationId);
      }
      return newSet;
    });
  };

  const toggleMacroExpand = (consultationId: string) => {
    setMacroExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(consultationId)) {
        newSet.delete(consultationId);
      } else {
        newSet.add(consultationId);
      }
      return newSet;
    });
  };

  const basePath = `/prof/paciente/${id}`;
  const lastConsultation = consultations[0];
  const previousConsultations = consultations.slice(1);

  if (authLoading || roleLoading || isLoading) {
    return <FullPageLoading />;
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Paciente não encontrado</p>
          <Button onClick={() => navigate("/dashboard")}>Voltar ao painel</Button>
        </div>
      </div>
    );
  }

  const renderConsultationFull = (consultation: ConsultationData) => {
    const diagnoses = consultationDiagnoses[consultation.id] || [];
    const treatments = consultationTreatments[consultation.id] || [];

    return (
      <div className="space-y-4 sm:space-y-6">
        {consultation.plan && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Eye className="h-4 w-4" />
              Anotações para o paciente
            </div>
            <p className="text-sm whitespace-pre-wrap">{consultation.plan}</p>
          </div>
        )}

        {diagnoses.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Diagnósticos</p>
            <div className="space-y-2 sm:space-y-3">
              {diagnoses.map(d => (
                <div key={d.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={d.status === "active" ? "default" : "secondary"}>
                      {d.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {d.status === "active" ? "Ativo" : d.status === "resolved" ? "Resolvido" : "Em observação"}
                    </span>
                  </div>
                  {d.justification && (
                    <div>
                      <p className="text-xs text-muted-foreground">Justificativa:</p>
                      <p className="text-sm">{d.justification}</p>
                    </div>
                  )}
                  {d.public_notes && (
                    <div className="flex items-start gap-1">
                      <Eye className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Notas públicas:</p>
                        <p className="text-sm">{d.public_notes}</p>
                      </div>
                    </div>
                  )}
                  {d.private_notes && (
                    <div className="flex items-start gap-1">
                      <EyeOff className="h-3 w-3 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Notas privadas:</p>
                        <p className="text-sm">{d.private_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {treatments.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Tratamentos</p>
            <div className="space-y-2 sm:space-y-3">
              {treatments.map(t => (
                <div key={t.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={t.status === "active" ? "default" : "secondary"}>
                      {t.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t.status === "active" ? "Ativo" : t.status === "completed" ? "Concluído" : t.status === "discontinued" ? "Descontinuado" : "Pendente"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-sm">
                    {t.dosage && <span><strong>Dosagem:</strong> {t.dosage}</span>}
                    {t.frequency && <span><strong>Frequência:</strong> {formatFrequency(t.frequency)}</span>}
                  </div>
                  {t.description && (
                    <div>
                      <p className="text-xs text-muted-foreground">Descrição:</p>
                      <p className="text-sm">{t.description}</p>
                    </div>
                  )}
                  {t.public_notes && (
                    <div className="flex items-start gap-1">
                      <Eye className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Notas públicas:</p>
                        <p className="text-sm">{t.public_notes}</p>
                      </div>
                    </div>
                  )}
                  {t.private_notes && (
                    <div className="flex items-start gap-1">
                      <EyeOff className="h-3 w-3 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Notas privadas:</p>
                        <p className="text-sm">{t.private_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {consultation.notes && (
          <div className="border-t pt-4 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
              <EyeOff className="h-4 w-4" />
              Anotações privadas (apenas profissional)
            </div>
            <p className="text-sm whitespace-pre-wrap">{consultation.notes}</p>
          </div>
        )}

        {consultation.follow_up_date && (
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Retorno agendado</p>
            <p className="text-sm">{format(new Date(consultation.follow_up_date), "dd/MM/yyyy", { locale: ptBR })}</p>
          </div>
        )}
      </div>
    );
  };

  const renderConsultationMicro = (consultation: ConsultationData) => {
    const diagnoses = consultationDiagnoses[consultation.id] || [];
    const treatments = consultationTreatments[consultation.id] || [];

    return (
      <div className="space-y-2 text-sm">
        {diagnoses.length > 0 && (
          <div>
            <span className="font-medium">Diagnósticos: </span>
            <span className="text-muted-foreground">{diagnoses.map(d => d.name).join(", ")}</span>
          </div>
        )}
        {treatments.length > 0 && (
          <div>
            <span className="font-medium">Tratamentos: </span>
            <span className="text-muted-foreground">{treatments.map(t => `${t.name}${t.dosage ? ` (${t.dosage})` : ""}${t.frequency ? ` — ${formatFrequency(t.frequency)}` : ""}`).join(", ")}</span>
          </div>
        )}
        {consultation.plan && (
          <div>
            <span className="font-medium">Anotações paciente: </span>
            <span className="text-muted-foreground">Sim</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-3 sm:mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">
                Página inicial
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Página do paciente</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {patient.users?.name || "Paciente"}
            </h1>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-4 mt-1 sm:mt-2 text-sm text-muted-foreground">
              <span>CPF: {formatCpf(patient.users?.cpf || null)}</span>
              {lastConsultation && (
                <span>
                  Último acompanhamento: {formatDistanceToNow(new Date(lastConsultation.consultation_date), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              )}
            </div>
          </div>
          <Button 
            onClick={() => navigate(`/consultation?patient=${id}`)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Acompanhamento
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          {/* Shortcuts — ordenados por relevância clínica */}
          <div>
            <h3 className="text-lg font-semibold mb-3 sm:mb-4">Atalhos</h3>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Resumo de Saúde */}
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`${basePath}/resumo`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Resumo de Saúde</p>
                      <p className="text-xs text-muted-foreground">Visão geral</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              {/* 2. Diagnósticos */}
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`${basePath}/diagnosticos`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Diagnósticos</p>
                      <p className="text-xs text-muted-foreground">{diagnosisCount} ativos</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              {/* 3. Tratamentos */}
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`${basePath}/tratamentos`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Pill className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Tratamentos</p>
                      <p className="text-xs text-muted-foreground">{treatmentCount} ativos</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              {/* 4. Exames / Documentos */}
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`${basePath}/documentos`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TestTube className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Exames/Documentos</p>
                      <p className="text-xs text-muted-foreground">{examDocumentCount} registrados</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              {/* 5. Sinais Vitais */}
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`${basePath}/sinais-vitais`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Sinais Vitais</p>
                      <p className="text-xs text-muted-foreground">{lastVitals}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              {/* 6. Treinos */}
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`${basePath}/treinos`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Treinos</p>
                      <p className="text-xs text-muted-foreground">{trainingCount} plano{trainingCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              {/* 7. Nutrição */}
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`${basePath}/nutricao`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Apple className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Nutrição</p>
                      <p className="text-xs text-muted-foreground">{nutritionCount} plano{nutritionCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              {/* 8. Objetivos & Insights */}
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`${basePath}/resumo`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Objetivos & Insights</p>
                      <p className="text-xs text-muted-foreground">{goalCount} ativo{goalCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Trails Section */}
          <PatientTrailsSection 
            patientId={id || ""}
            patientName={patient?.users?.name || "Paciente"}
          />

          {/* Trail Responses */}
          <PatientTrailResponsesTimeline patientId={id || ""} />

          {/* Last Consultation */}
          {lastConsultation ? (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Último acompanhamento
                  <Badge variant="outline" className="ml-0 sm:ml-2">
                    {format(new Date(lastConsultation.consultation_date), "dd/MM/yyyy", { locale: ptBR })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderConsultationFull(lastConsultation)}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>Nenhuma consulta registrada para este paciente.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate(`/consultation?patient=${id}`)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar primeira consulta
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Previous Consultations */}
          {previousConsultations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Acompanhamentos anteriores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {previousConsultations.map((consultation) => {
                  const isMicroOpen = microExpanded.has(consultation.id);
                  const isMacroOpen = macroExpanded.has(consultation.id);

                  return (
                    <div key={consultation.id} className="border rounded-lg">
                      <div 
                        className="p-3 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => toggleMicroExpand(consultation.id)}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="text-sm font-medium whitespace-nowrap">
                            {format(new Date(consultation.consultation_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <p className="text-sm text-muted-foreground truncate hidden sm:block max-w-md">
                            {consultation.notes || consultation.chief_complaint || "Sem notas"}
                          </p>
                        </div>
                        {isMicroOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>

                      {isMicroOpen && !isMacroOpen && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t pt-3">
                          {renderConsultationMicro(consultation)}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMacroExpand(consultation.id);
                            }}
                          >
                            Ver consulta completa
                          </Button>
                        </div>
                      )}

                      {isMacroOpen && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t pt-3">
                          {renderConsultationFull(consultation)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMacroExpand(consultation.id);
                            }}
                          >
                            Recolher
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfessionalPatientView;
