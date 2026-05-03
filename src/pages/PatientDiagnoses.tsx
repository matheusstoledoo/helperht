import { useState, useEffect, useCallback, useMemo } from "react";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ClipboardList,
  Calendar,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Lock,
  Eye,
  Home,
  ArrowLeft,
} from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DiagnosisData {
  id: string;
  name: string;
  icd_code: string | null;
  status: "active" | "resolved" | "under_observation";
  severity: string | null;
  diagnosed_date: string;
  resolved_date: string | null;
  explanation_text: string | null;
  public_notes: string | null;
  private_notes: string | null;
  created_at: string;
  updated_at: string;
  consultation_id: string | null;
  consultation_date?: string;
  professional_name?: string;
  professional_id?: string;
}

interface PatientData {
  id: string;
  users: {
    name: string;
  } | null;
}

interface Professional {
  id: string;
  name: string;
}

// Mock data for demonstration
const mockProfessionals: Professional[] = [
  { id: "prof-1", name: "Dr. Carlos Mendes" },
  { id: "prof-2", name: "Dra. Ana Silva" },
  { id: "prof-3", name: "Dr. Roberto Almeida" },
];

const mockDiagnoses: DiagnosisData[] = [
  {
    id: "diag-1",
    name: "Hipertensão Arterial Sistêmica",
    icd_code: "I10",
    status: "active",
    severity: "moderada",
    diagnosed_date: "2024-12-20",
    resolved_date: null,
    explanation_text: null,
    public_notes: "Paciente apresenta pressão arterial elevada consistente. Iniciar tratamento medicamentoso e orientar mudanças no estilo de vida, incluindo redução de sal e exercícios físicos regulares.",
    private_notes: "Histórico familiar positivo. Avaliar função renal na próxima consulta.",
    created_at: "2024-12-20T10:00:00Z",
    updated_at: "2024-12-20T10:00:00Z",
    consultation_id: "cons-1",
    consultation_date: "2024-12-20T10:00:00Z",
    professional_name: "Dr. Carlos Mendes",
    professional_id: "prof-1",
  },
  {
    id: "diag-2",
    name: "Diabetes Mellitus Tipo 2",
    icd_code: "E11",
    status: "active",
    severity: "leve",
    diagnosed_date: "2024-12-15",
    resolved_date: null,
    explanation_text: null,
    public_notes: "Glicemia de jejum alterada. Orientado dieta hipocalórica e atividade física. Retorno em 30 dias para reavaliação com novos exames laboratoriais.",
    private_notes: null,
    created_at: "2024-12-15T14:30:00Z",
    updated_at: "2024-12-15T14:30:00Z",
    consultation_id: "cons-2",
    consultation_date: "2024-12-15T14:30:00Z",
    professional_name: "Dra. Ana Silva",
    professional_id: "prof-2",
  },
  {
    id: "diag-3",
    name: "Transtorno de Ansiedade Generalizada",
    icd_code: "F41.1",
    status: "active",
    severity: "moderada",
    diagnosed_date: "2024-12-10",
    resolved_date: null,
    explanation_text: null,
    public_notes: "Paciente refere sintomas de ansiedade há 6 meses. Encaminhado para psicoterapia cognitivo-comportamental. Avaliar necessidade de medicação no seguimento.",
    private_notes: "Investigar possíveis gatilhos no ambiente de trabalho.",
    created_at: "2024-12-10T09:00:00Z",
    updated_at: "2024-12-10T09:00:00Z",
    consultation_id: "cons-3",
    consultation_date: "2024-12-10T09:00:00Z",
    professional_name: "Dr. Roberto Almeida",
    professional_id: "prof-3",
  },
  {
    id: "diag-4",
    name: "Lombalgia Crônica",
    icd_code: "M54.5",
    status: "active",
    severity: "leve",
    diagnosed_date: "2024-11-28",
    resolved_date: null,
    explanation_text: null,
    public_notes: "Dor lombar persistente há 3 meses. Prescritos exercícios de fortalecimento e alongamento. Orientado sobre postura adequada no trabalho.",
    private_notes: null,
    created_at: "2024-11-28T16:00:00Z",
    updated_at: "2024-11-28T16:00:00Z",
    consultation_id: "cons-4",
    consultation_date: "2024-11-28T16:00:00Z",
    professional_name: "Dr. Carlos Mendes",
    professional_id: "prof-1",
  },
  {
    id: "diag-5",
    name: "Rinite Alérgica",
    icd_code: "J30.4",
    status: "active",
    severity: "leve",
    diagnosed_date: "2024-10-15",
    resolved_date: null,
    explanation_text: null,
    public_notes: "Sintomas nasais recorrentes, principalmente pela manhã. Prescrito anti-histamínico e spray nasal. Orientado sobre controle ambiental.",
    private_notes: "Considerar testes alérgicos se não houver melhora.",
    created_at: "2024-10-15T11:00:00Z",
    updated_at: "2024-10-15T11:00:00Z",
    consultation_id: "cons-5",
    consultation_date: "2024-10-15T11:00:00Z",
    professional_name: "Dra. Ana Silva",
    professional_id: "prof-2",
  },
];

const PatientDiagnoses = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [diagnoses, setDiagnoses] = useState<DiagnosisData[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);

  // Filters
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role !== null && !isProfessional && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  const fetchDiagnosesData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Fetch patient data
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, users (name)")
        .eq("id", id)
        .maybeSingle();

      setPatient(patientData);

      // Fetch diagnoses with consultation info to get professional and consultation date
      const { data: diagnosesData, error } = await supabase
        .from("diagnoses")
        .select(`
          *,
          consultations (
            professional_id,
            consultation_date
          )
        `)
        .eq("patient_id", id)
        .order("diagnosed_date", { ascending: false });

      if (error) throw error;

      // If no real data, use mock data for demonstration
      if (!diagnosesData || diagnosesData.length === 0) {
        setUseMockData(true);
        setDiagnoses(mockDiagnoses);
        setProfessionals(mockProfessionals);
        setIsLoading(false);
        return;
      }

      // Collect unique professional IDs
      const professionalIds = new Set<string>();
      (diagnosesData || []).forEach((d) => {
        if (d.consultations?.professional_id) {
          professionalIds.add(d.consultations.professional_id);
        }
      });

      // Fetch all professional names at once
      const professionalsMap: Record<string, string> = {};
      if (professionalIds.size > 0) {
        const { data: professionalsData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", Array.from(professionalIds));

        (professionalsData || []).forEach((p) => {
          professionalsMap[p.id] = p.name;
        });

        // Set professionals list for filter
        setProfessionals(
          (professionalsData || []).map((p) => ({ id: p.id, name: p.name }))
        );
      }

      // Map diagnoses with professional info
      const diagnosesWithProfessional = (diagnosesData || []).map((d) => {
        const professionalId = d.consultations?.professional_id;
        const professionalName = professionalId
          ? professionalsMap[professionalId] || "Profissional não identificado"
          : "Profissional não identificado";

        return {
          ...d,
          professional_name: professionalName,
          professional_id: professionalId,
          consultation_date: d.consultations?.consultation_date,
        };
      });

      setDiagnoses(diagnosesWithProfessional);
    } catch (error) {
      console.error("Error fetching diagnoses:", error);
      // Use mock data on error for demonstration
      setUseMockData(true);
      setDiagnoses(mockDiagnoses);
      setProfessionals(mockProfessionals);
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (user && (isProfessional || isAdmin)) {
      fetchDiagnosesData();
    }
  }, [user, isProfessional, isAdmin, fetchDiagnosesData]);

  // Get professionals for filter based on mock or real data
  const availableProfessionals = useMemo(() => {
    return useMockData ? mockProfessionals : professionals;
  }, [useMockData, professionals]);

  // Apply filters
  const filteredDiagnoses = useMemo(() => {
    let filtered = [...diagnoses];

    // Filter by professional
    if (professionalFilter !== "all") {
      filtered = filtered.filter((d) => d.professional_id === professionalFilter);
    }

    // Filter by period
    if (periodFilter !== "all") {
      const now = new Date();
      let cutoffDate: Date;

      switch (periodFilter) {
        case "7days":
          cutoffDate = subDays(now, 7);
          break;
        case "14days":
          cutoffDate = subDays(now, 14);
          break;
        case "1month":
          cutoffDate = subMonths(now, 1);
          break;
        case "6months":
          cutoffDate = subMonths(now, 6);
          break;
        case "1year":
          cutoffDate = subYears(now, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter((d) => isAfter(parseISO(d.diagnosed_date), cutoffDate));
    }

    return filtered;
  }, [diagnoses, professionalFilter, periodFilter]);

  const toggleExpanded = (diagnosisId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(diagnosisId)) {
        newSet.delete(diagnosisId);
      } else {
        newSet.add(diagnosisId);
      }
      return newSet;
    });
  };

  const formatShortDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const isOtherProfessional = (diagnosis: DiagnosisData) => {
    // For mock data, simulate that prof-1 is the current user
    if (useMockData) {
      return diagnosis.professional_id !== "prof-1";
    }
    return diagnosis.professional_id && user && diagnosis.professional_id !== user.id;
  };

  const basePath = `/prof/paciente/${id}`;
  const patientName = useMockData ? "Teste" : (patient?.users?.name || "Paciente");

  if (authLoading || roleLoading || isLoading) {
    return <FullPageLoading />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="border-b bg-card px-6 py-4">
        {/* Back button and Breadcrumbs */}
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard" className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    Página inicial
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={basePath}>
                    {patientName}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Diagnósticos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Title and Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Diagnósticos</h1>
            {useMockData && (
              <Badge variant="outline" className="text-xs">
                Dados de exemplo
              </Badge>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <UserCircle className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Todos os profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os profissionais</SelectItem>
                {availableProfessionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="7days">7 dias</SelectItem>
                <SelectItem value="14days">14 dias</SelectItem>
                <SelectItem value="1month">1 mês</SelectItem>
                <SelectItem value="6months">6 meses</SelectItem>
                <SelectItem value="1year">1 ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Timeline Content */}
      <main className="p-6">
        <div className="max-w-3xl mx-auto">
          {filteredDiagnoses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum diagnóstico encontrado.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              {/* Timeline events */}
              <div className="space-y-6 pl-6">
                {filteredDiagnoses.map((diagnosis, index) => {
                  const isExpanded = expandedCards.has(diagnosis.id);
                  const otherProfessional = isOtherProfessional(diagnosis);

                  return (
                    <div
                      key={diagnosis.id}
                      className="relative animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-6 w-3 h-3 rounded-full border-4 border-background bg-primary -translate-x-1/2" />

                      {/* Diagnosis Card */}
                      <Card className="ml-8 transition-shadow hover:shadow-md">
                        <CardContent className="p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2.5 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 shrink-0">
                                <ClipboardList className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* Diagnosis name */}
                                <h3 className="font-semibold text-foreground text-lg leading-tight">
                                  {diagnosis.name}
                                </h3>

                                {/* ICD Code */}
                                {diagnosis.icd_code && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    CID: {diagnosis.icd_code}
                                  </p>
                                )}

                                {/* Other professional badge */}
                                {otherProfessional && (
                                  <Badge variant="secondary" className="text-xs mt-2">
                                    <UserCircle className="w-3 h-3 mr-1" />
                                    Registrado por outro profissional
                                  </Badge>
                                )}

                                {/* Dates */}
                                <div className="text-sm text-muted-foreground mt-3 space-y-1">
                                  {diagnosis.consultation_date && (
                                    <p className="flex items-center gap-2">
                                      <span className="text-muted-foreground/70">Data da consulta:</span>
                                      <span className="font-medium">{formatShortDate(diagnosis.consultation_date)}</span>
                                    </p>
                                  )}
                                  <p className="flex items-center gap-2">
                                    <span className="text-muted-foreground/70">Data do diagnóstico:</span>
                                    <span className="font-medium">{formatShortDate(diagnosis.diagnosed_date)}</span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(diagnosis.id)}
                              className="shrink-0 text-primary hover:text-primary/80"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  Fechar
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  Ver detalhes
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="mt-5 pt-5 border-t border-border space-y-4">
                              {/* Professional name at the end */}
                              <div className="text-sm text-muted-foreground pt-3 border-t border-border">
                                <p>
                                  <span className="text-muted-foreground/70">Registrado por:</span>{" "}
                                  <span className="font-medium text-foreground">{diagnosis.professional_name}</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientDiagnoses;
