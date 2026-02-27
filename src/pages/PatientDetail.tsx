import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRealtimeTimeline } from "@/hooks/useRealtimeTimeline";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Download, User, Calendar, Phone, Mail, Sparkles, LogOut, Info, Activity, Stethoscope, FlaskConical, FileText } from "lucide-react";
import { Timeline } from "@/components/timeline/Timeline";
import { TimelineFilters } from "@/components/timeline/TimelineFilters";
import { TimelineEvent, EventType } from "@/components/timeline/TimelineCard";
import { RealClinicalSummary } from "@/components/clinical/RealClinicalSummary";
import { Documents } from "@/components/documents/Documents";
import { DiagnosisForm } from "@/components/diagnosis/DiagnosisForm";
import { TreatmentForm } from "@/components/treatment/TreatmentForm";
import { RoleBadge } from "@/components/RoleBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuickActionButton } from "@/components/professional/QuickActionButton";
import { RiskIndicator } from "@/components/professional/RiskIndicator";
import { NewBadge } from "@/components/professional/NewBadge";
import { PatientDashboard } from "@/components/patient/PatientDashboard";
import { FullPageLoading } from "@/components/ui/loading-spinner";

// Mock data - será substituído por dados reais
const MOCK_PATIENT = {
  id: "1",
  name: "Maria Silva Santos",
  dateOfBirth: "1985-03-15",
  phone: "+55 11 98765-4321",
  email: "maria.silva@email.com",
  currentDiagnoses: [
    "Diabetes Mellitus Tipo 2 (E11.9)",
    "Hipertensão Essencial (I10)",
  ],
  activeMedications: [
    "Metformina 850mg - 2x/dia",
    "Losartana 50mg - 1x/dia",
  ],
  recentExams: [
    { name: "HbA1c", value: "7.2%", date: "2025-11-15", status: "normal" },
    { name: "Pressão Arterial", value: "130/85 mmHg", date: "2025-11-20", status: "limítrofe" },
  ],
};

const MOCK_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "1",
    type: "consultation",
    date: "2025-11-20T10:00:00",
    title: "Consulta de Acompanhamento de Rotina",
    summary: "Paciente relata melhora no controle glicêmico. Discutida adesão à dieta e rotina de exercícios.",
    details: "Paciente tem seguido o plano alimentar com boa adesão. Relata caminhar 30 minutos diariamente. Sem episódios de hipoglicemia no último mês. Pressão arterial permanece levemente elevada. Reforçada importância da redução de sódio.\n\nPlano:\n- Continuar medicações atuais\n- Agendar exame de HbA1c em 3 meses\n- Retornar para acompanhamento em 3 meses",
    professional: "Dra. Ana Costa",
    evidenceGrade: "A",
    tags: ["Diabetes", "Hipertensão", "Acompanhamento"],
  },
  {
    id: "2",
    type: "exam_result",
    date: "2025-11-15T14:30:00",
    title: "Resultado do Exame HbA1c",
    summary: "HbA1c: 7.2% (meta <7.0%). Leve melhora em relação ao anterior de 7.5%.",
    details: "Resultados Laboratoriais:\n- HbA1c: 7.2% (Anterior: 7.5%)\n- Glicemia de Jejum: 135 mg/dL\n- Colesterol Total: 195 mg/dL\n- LDL: 115 mg/dL\n- HDL: 52 mg/dL\n- Triglicerídeos: 140 mg/dL\n\nInterpretação: Controle glicêmico mostrando melhora mas ainda não na meta. Continuar terapia atual com modificações do estilo de vida.",
    professional: "Laboratório Central",
    evidenceGrade: "A",
    tags: ["Resultados Laboratoriais", "Diabetes", "HbA1c"],
  },
  {
    id: "3",
    type: "treatment_modify",
    date: "2025-10-05T11:15:00",
    title: "Ajuste de Medicação - Aumento da Dose de Metformina",
    summary: "Aumentada Metformina de 500mg para 850mg duas vezes ao dia devido a controle glicêmico abaixo do ideal.",
    details: "Justificativa: HbA1c permanece acima da meta (7.5%) apesar da boa adesão à dose de 500mg. Paciente tolera dose atual bem sem efeitos colaterais gastrointestinais.\n\nAnterior: Metformina 500mg 2x/dia\nNovo: Metformina 850mg 2x/dia\n\nMonitoramento:\n- Monitorar sintomas gastrointestinais\n- Verificar HbA1c em 6-8 semanas\n- Paciente orientado a tomar com as refeições",
    professional: "Dra. Ana Costa",
    evidenceGrade: "A",
    tags: ["Medicação", "Diabetes", "Ajuste de Tratamento"],
  },
  {
    id: "4",
    type: "diagnosis_update",
    date: "2025-09-12T09:30:00",
    title: "Atualização de Diagnóstico de Hipertensão - Estágio 1",
    summary: "Leituras consistentes de pressão arterial elevada confirmaram Hipertensão Estágio 1. Iniciado tratamento farmacológico.",
    details: "Leituras de pressão arterial em 3 consultas:\n- Consulta 1: 142/88 mmHg\n- Consulta 2: 138/90 mmHg\n- Consulta 3: 145/92 mmHg\n\nDiagnóstico: Hipertensão Essencial (Primária), Estágio 1 (CID-10: I10)\n\nPlano de Tratamento:\n- Iniciada Losartana 50mg diariamente\n- Modificações do estilo de vida: dieta DASH, sódio <2g/dia, exercícios regulares\n- Monitoramento domiciliar da pressão arterial\n- Acompanhamento em 4 semanas",
    professional: "Dra. Ana Costa",
    evidenceGrade: "A",
    tags: ["Hipertensão", "Novo Diagnóstico", "Cardiovascular"],
  },
  {
    id: "5",
    type: "exam_request",
    date: "2025-09-12T09:45:00",
    title: "Solicitados Exames de Perfil Lipídico e Função Renal",
    summary: "Solicitado painel metabólico abrangente e perfil lipídico para avaliação de risco cardiovascular.",
    details: "Exames solicitados:\n- Perfil Lipídico (Colesterol Total, LDL, HDL, Triglicerídeos)\n- Painel Metabólico Abrangente\n- Creatinina e TFG\n- Exame de Urina\n\nIndicação: Avaliação basal para hipertensão recém-diagnosticada e gerenciamento contínuo do diabetes. Monitoramento de complicações e estratificação de risco cardiovascular.",
    professional: "Dra. Ana Costa",
    tags: ["Solicitação de Exame", "Cardiovascular", "Diabetes"],
  },
  {
    id: "6",
    type: "diagnosis_new",
    date: "2025-07-15T14:00:00",
    title: "Diagnóstico de Diabetes Mellitus Tipo 2",
    summary: "Novo diagnóstico de Diabetes Tipo 2 baseado em glicemia de jejum e HbA1c elevados.",
    details: "Critérios Diagnósticos Atendidos:\n- Glicemia de Jejum: 156 mg/dL (normal <100 mg/dL)\n- HbA1c: 8.1% (normal <5.7%)\n- Glicemia aleatória: 215 mg/dL com sintomas de poliúria\n\nDiagnóstico: Diabetes Mellitus Tipo 2 (CID-10: E11.9)\n\nManejo Inicial:\n- Metformina 500mg duas vezes ao dia\n- Educação sobre diabetes agendada\n- Encaminhamento para nutricionista\n- Monitoramento domiciliar de glicemia\n- Acompanhamento em 4 semanas",
    professional: "Dra. Ana Costa",
    evidenceGrade: "A",
    tags: ["Diabetes", "Novo Diagnóstico", "Metabólico"],
  },
];

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [selectedType, setSelectedType] = useState<EventType | "all">("all");
  const [dateRange, setDateRange] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [realPatientId, setRealPatientId] = useState<string>("");
  
  // Get user role for permission checks
  const { role, loading: roleLoading, canEdit, isPatient } = useUserRole();

  // Fetch real patient UUID from database
  useEffect(() => {
    const fetchPatient = async () => {
      if (!id) return;
      
      const { data: patients, error } = await supabase
        .from("patients")
        .select("id")
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching patient:", error);
        return;
      }

      if (patients) {
        setRealPatientId(patients.id);
      }
    };

    fetchPatient();
  }, [id]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Real-time data sync
  const handleDataChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useRealtimeTimeline({
    patientId: id || "",
    onDataChange: handleDataChange,
  });

  // Filter timeline events
  const filteredEvents = MOCK_TIMELINE_EVENTS.filter((event) => {
    const typeMatch = selectedType === "all" || event.type === selectedType;
    
    // Date filtering logic
    let dateMatch = true;
    if (dateRange !== "all") {
      const eventDate = new Date(event.date);
      const now = new Date();
      const daysAgo = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateRange) {
        case "week":
          dateMatch = daysAgo <= 7;
          break;
        case "month":
          dateMatch = daysAgo <= 30;
          break;
        case "quarter":
          dateMatch = daysAgo <= 90;
          break;
        case "year":
          dateMatch = daysAgo <= 365;
          break;
      }
    }
    
    return typeMatch && dateMatch;
  });

  if (authLoading || roleLoading) {
    return <FullPageLoading />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {MOCK_PATIENT.name}
                  <RoleBadge role={role} />
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  ID do Paciente: {id}
                  {isPatient && " • Seu Registro de Saúde"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button 
                variant="outline"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Professional Quick Actions Bar */}
        {canEdit && (
          <div className="mb-8 p-6 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 rounded-xl border border-border/50 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-accent" />
                  Ações Rápidas
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione informações clínicas rapidamente
                </p>
              </div>
              <NewBadge size="md" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickActionButton
                icon={Activity}
                label="Diagnóstico"
                onClick={() => setShowDiagnosisForm(true)}
                variant="diagnosis"
              />
              <QuickActionButton
                icon={Stethoscope}
                label="Tratamento"
                onClick={() => setShowTreatmentForm(true)}
                variant="treatment"
              />
              <QuickActionButton
                icon={FlaskConical}
                label="Exame"
                onClick={() => navigate(`/exams/${id}`)}
                variant="exam"
              />
              <QuickActionButton
                icon={FileText}
                label="Nota Clínica"
                onClick={() => navigate("/consultation")}
                variant="note"
              />
            </div>
          </div>
        )}

        {/* Risk Indicators Section - Only for Professionals */}
        {canEdit && (
          <div className="mb-8 space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-lg font-bold text-foreground">Indicadores de Risco</h2>
            <div className="grid gap-4">
              <RiskIndicator
                level="high"
                title="Controle Glicêmico Subótimo"
                description="HbA1c de 7.2% está acima da meta de <7.0%. Considerar ajuste no tratamento ou reforço nas orientações de estilo de vida."
                timestamp="Atualizado há 5 dias"
              />
              <RiskIndicator
                level="medium"
                title="Pressão Arterial Limítrofe"
                description="Últimas medições mostram PA consistentemente em 130/85 mmHg. Monitorar de perto e reforçar importância da restrição de sódio."
                timestamp="Atualizado há 4 dias"
              />
            </div>
          </div>
        )}

        {/* Patient View Notice */}
        {isPatient && (
          <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 animate-fade-in">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 dark:text-blue-200">
              Você está visualizando seu registro de saúde. Pode ver todas as informações clínicas, 
              enviar documentos e ler explicações geradas por IA. Entre em contato com seu profissional 
              de saúde para fazer alterações em diagnósticos ou tratamentos.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList>
            <TabsTrigger value="timeline">Linha do Tempo Clínica</TabsTrigger>
            <TabsTrigger value="summary">Resumo Atual</TabsTrigger>
            <TabsTrigger value="exams">Exames e Resultados</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Filtrar Linha do Tempo</CardTitle>
                <CardDescription>
                  Filtrar eventos por tipo e período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimelineFilters
                  selectedType={selectedType}
                  onTypeChange={(type) => setSelectedType(type as EventType | "all")}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </CardContent>
            </Card>

            {/* Timeline */}
            <Timeline 
              events={filteredEvents}
              isEditable={canEdit}
              emptyMessage="Nenhum evento encontrado com os filtros aplicados"
            />
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6" key={`summary-${refreshKey}`}>
            {isPatient ? (
              /* Patient-specific dashboard with simplified UX */
              <PatientDashboard patientId={id || ""} />
            ) : (
              /* Professional view with clinical summary */
              <>
                <RealClinicalSummary patientId={id || ""} canEdit={canEdit} key={`clinical-${refreshKey}`} />

            {/* Patient Info & Recent Exams */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Patient Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Paciente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nome Completo</p>
                      <p className="font-medium">{MOCK_PATIENT.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                      <p className="font-medium">{MOCK_PATIENT.dateOfBirth}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{MOCK_PATIENT.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                      <p className="font-medium">{MOCK_PATIENT.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Exams */}
              <Card>
                <CardHeader>
                  <CardTitle>Resultados de Exames Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {MOCK_PATIENT.recentExams.map((exam, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{exam.name}</p>
                          <p className="text-sm text-muted-foreground">{exam.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{exam.value}</p>
                          <p className="text-xs text-muted-foreground">{exam.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
              </>
            )}
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams">
            <Card>
              <CardHeader>
                <CardTitle>Exames e Resultados Laboratoriais</CardTitle>
                <CardDescription>
                  Histórico completo de solicitações de exames e resultados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Interface de gerenciamento de exames será implementada aqui
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Documents 
              patientId={id || ""} 
              userRole={role === "professional" ? "professional" : "patient"}
              userName={role === "professional" ? "Dr. Ana Costa" : "Patient"} 
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Forms - Only for Professionals */}
      {canEdit && realPatientId && (
        <>
          <DiagnosisForm 
            open={showDiagnosisForm}
            onOpenChange={setShowDiagnosisForm}
            patientId={realPatientId}
          />

          <TreatmentForm 
            open={showTreatmentForm}
            onOpenChange={setShowTreatmentForm}
            patientId={realPatientId}
          />
        </>
      )}
    </div>
  );
};

export default PatientDetail;
