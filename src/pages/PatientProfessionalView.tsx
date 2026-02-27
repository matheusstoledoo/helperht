import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PatientLayout from "@/components/patient/PatientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { 
  Stethoscope, 
  Pill, 
  FileText, 
  ChevronRight,
  ChevronDown,
  Eye,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

interface TreatmentData {
  id: string;
  name: string;
  status: string;
  dosage: string | null;
  frequency: string | null;
  description: string | null;
  public_notes: string | null;
}

const PatientProfessionalView = () => {
  const { id: professionalId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Track expanded consultations (micro and macro)
  const [microExpanded, setMicroExpanded] = useState<Set<string>>(new Set());
  const [macroExpanded, setMacroExpanded] = useState<Set<string>>(new Set());

  // Store diagnoses and treatments for each consultation
  const [consultationDiagnoses, setConsultationDiagnoses] = useState<Record<string, DiagnosisData[]>>({});
  const [consultationTreatments, setConsultationTreatments] = useState<Record<string, TreatmentData[]>>({});

  // Get patient data
  const { data: patient } = useQuery({
    queryKey: ['patient-by-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get professional data
  const { data: professional, isLoading: loadingProfessional } = useQuery({
    queryKey: ['professional', professionalId],
    queryFn: async () => {
      if (!professionalId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, specialty, profession')
        .eq('id', professionalId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
  });

  // Get consultations with this professional
  const { data: consultations = [], isLoading: loadingConsultations } = useQuery({
    queryKey: ['patient-consultations', patient?.id, professionalId],
    queryFn: async () => {
      if (!patient?.id || !professionalId) return [];
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('professional_id', professionalId)
        .order('consultation_date', { ascending: false });
      if (error) throw error;
      return data as ConsultationData[];
    },
    enabled: !!patient?.id && !!professionalId,
  });

  // Get counts for this professional
  const { data: counts } = useQuery({
    queryKey: ['patient-professional-counts', patient?.id, professionalId],
    queryFn: async () => {
      if (!patient?.id || !professionalId) return { diagnoses: 0, treatments: 0, exams: 0 };
      
      // Get consultations IDs for this professional
      const { data: consultationIds } = await supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('professional_id', professionalId);

      const ids = consultationIds?.map(c => c.id) || [];
      
      if (ids.length === 0) return { diagnoses: 0, treatments: 0, exams: 0 };

      const [diagnosesRes, treatmentsRes, examsRes] = await Promise.all([
        supabase.from('diagnoses').select('id', { count: 'exact' }).in('consultation_id', ids),
        supabase.from('treatments').select('id', { count: 'exact' }).in('consultation_id', ids),
        supabase.from('exams').select('id', { count: 'exact' }).eq('requested_by', professionalId),
      ]);

      return {
        diagnoses: diagnosesRes.count || 0,
        treatments: treatmentsRes.count || 0,
        exams: examsRes.count || 0,
      };
    },
    enabled: !!patient?.id && !!professionalId,
  });

  // Fetch diagnoses and treatments for each consultation
  useEffect(() => {
    const fetchConsultationDetails = async () => {
      if (!consultations || consultations.length === 0) return;

      const consultationIds = consultations.map(c => c.id);

      const [diagnosesData, treatmentsData] = await Promise.all([
        supabase.from('diagnoses').select('id, name, status, consultation_id, justification, public_notes').in('consultation_id', consultationIds),
        supabase.from('treatments').select('id, name, status, dosage, frequency, description, consultation_id, public_notes').in('consultation_id', consultationIds),
      ]);

      // Group by consultation_id
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
    };

    fetchConsultationDetails();
  }, [consultations]);

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

  const lastConsultation = consultations[0];
  const previousConsultations = consultations.slice(1);

  // Render full consultation content (for patient - only public notes)
  const renderConsultationFull = (consultation: ConsultationData) => {
    const diagnoses = consultationDiagnoses[consultation.id] || [];
    const treatments = consultationTreatments[consultation.id] || [];

    return (
      <div className="space-y-6">
        {/* Orientações para o paciente (campo plan da consulta) */}
        {consultation.plan && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Eye className="h-4 w-4" />
              Orientações do profissional
            </div>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">{consultation.plan}</p>
          </div>
        )}

        {/* Diagnósticos */}
        {diagnoses.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Diagnósticos
            </p>
            <div className="space-y-3">
              {diagnoses.map(d => (
                <div key={d.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
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
                      <Eye className="h-3 w-3 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Observações:</p>
                        <p className="text-sm">{d.public_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tratamentos */}
        {treatments.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Tratamentos
            </p>
            <div className="space-y-3">
              {treatments.map(t => (
                <div key={t.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === "active" ? "default" : "secondary"}>
                      {t.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t.status === "active" ? "Ativo" : t.status === "completed" ? "Concluído" : t.status === "discontinued" ? "Descontinuado" : "Pendente"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {t.dosage && <span><strong>Dosagem:</strong> {t.dosage}</span>}
                    {t.frequency && <span><strong>Frequência:</strong> {t.frequency}</span>}
                  </div>
                  {t.description && (
                    <div>
                      <p className="text-xs text-muted-foreground">Descrição:</p>
                      <p className="text-sm">{t.description}</p>
                    </div>
                  )}
                  {t.public_notes && (
                    <div className="flex items-start gap-1">
                      <Eye className="h-3 w-3 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Observações:</p>
                        <p className="text-sm">{t.public_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retorno */}
        {consultation.follow_up_date && (
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Retorno agendado
            </p>
            <p className="text-sm">{format(new Date(consultation.follow_up_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
        )}
      </div>
    );
  };

  // Render micro expansion (summary)
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
            <span className="text-muted-foreground">{treatments.map(t => `${t.name}${t.dosage ? ` (${t.dosage})` : ""}`).join(", ")}</span>
          </div>
        )}
        {consultation.plan && (
          <div>
            <span className="font-medium">Orientações: </span>
            <span className="text-muted-foreground">Disponível</span>
          </div>
        )}
      </div>
    );
  };

  if (loadingProfessional || loadingConsultations) {
    return (
      <PatientLayout title="" subtitle="">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PatientLayout>
    );
  }

  if (!professional) {
    return (
      <PatientLayout title="" subtitle="">
        <div className="max-w-4xl mx-auto p-4">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Profissional não encontrado.</p>
              <Button variant="link" onClick={() => navigate('/pac/profissionais')} className="mt-4">
                Voltar para profissionais
              </Button>
            </CardContent>
          </Card>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout title="" subtitle="">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Breadcrumbs as Header */}
        <div className="border-b bg-card -mx-4 -mt-4 px-4 py-4 mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/pac/dashboard" className="text-muted-foreground hover:text-foreground">
                    Página inicial
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/pac/profissionais" className="text-muted-foreground hover:text-foreground">
                    Profissionais
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">{professional.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Professional Info */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{professional.name}</h1>
            <p className="text-muted-foreground">
              {professional.specialty || professional.profession || "Especialidade não informada"}
            </p>
          </div>
        </div>

        {/* Quick Access Cards - Top */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/pac/profissional/${professionalId}/diagnosticos`)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <Stethoscope className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Diagnósticos</p>
                <p className="text-sm text-muted-foreground">{counts?.diagnoses || 0} registros</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/pac/profissional/${professionalId}/tratamentos`)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <Pill className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Tratamentos</p>
                <p className="text-sm text-muted-foreground">{counts?.treatments || 0} registros</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/pac/profissional/${professionalId}/exames`)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="bg-purple-50 p-3 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Exames/Documentos</p>
                <p className="text-sm text-muted-foreground">{counts?.exams || 0} registros</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consultations Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Consultas</h2>

          {consultations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Nenhuma consulta registrada com este profissional.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Last Consultation - Full Display */}
              {lastConsultation && (
                <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="secondary" className="mb-2">Última consulta</Badge>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(lastConsultation.consultation_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(lastConsultation.consultation_date), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Full consultation display by default */}
                    {renderConsultationFull(lastConsultation)}
                  </CardContent>
                </Card>
              )}

              {/* Previous Consultations - Collapsible Cards */}
              {previousConsultations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Consultas anteriores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {previousConsultations.map((consultation) => (
                      <Collapsible key={consultation.id} open={microExpanded.has(consultation.id)}>
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleMicroExpand(consultation.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">
                                    {format(new Date(consultation.consultation_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(new Date(consultation.consultation_date), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </p>
                                </div>
                              </div>
                              {microExpanded.has(consultation.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="px-4 pb-4 border-t pt-4">
                              {/* Micro summary */}
                              {renderConsultationMicro(consultation)}

                              {/* Macro expansion */}
                              <Collapsible open={macroExpanded.has(consultation.id)}>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-4"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMacroExpand(consultation.id);
                                    }}
                                  >
                                    {macroExpanded.has(consultation.id) ? (
                                      <>
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                        Recolher consulta
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver consulta completa
                                      </>
                                    )}
                                  </Button>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="mt-4">
                                  {renderConsultationFull(consultation)}
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientProfessionalView;
