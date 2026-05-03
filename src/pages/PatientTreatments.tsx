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
  Pill,
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

interface TreatmentData {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  description: string | null;
  explanation_text: string | null;
  public_notes: string | null;
  private_notes: string | null;
  status: "active" | "completed" | "discontinued" | "pending";
  start_date: string;
  end_date: string | null;
  prescribed_by: string | null;
  diagnosis_id: string | null;
  consultation_id: string | null;
  created_at: string;
  updated_at: string;
  professional_name?: string;
  professional_id?: string;
  diagnosis_name?: string;
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

const mockTreatments: TreatmentData[] = [
  {
    id: "treat-1",
    name: "Losartana",
    dosage: "50mg",
    frequency: "1 comprimido ao dia, pela manhã",
    description: "Anti-hipertensivo para controle da pressão arterial",
    explanation_text: null,
    public_notes: "Tomar sempre no mesmo horário, de preferência pela manhã. Evitar consumo excessivo de sal. Monitorar pressão arterial semanalmente.",
    private_notes: "Avaliar aumento da dose para 100mg se PA não normalizar em 30 dias.",
    status: "active",
    start_date: "2024-12-20",
    end_date: null,
    prescribed_by: "prof-1",
    diagnosis_id: "diag-1",
    consultation_id: "cons-1",
    created_at: "2024-12-20T10:00:00Z",
    updated_at: "2024-12-20T10:00:00Z",
    professional_name: "Dr. Carlos Mendes",
    professional_id: "prof-1",
    diagnosis_name: "Hipertensão Arterial Sistêmica",
  },
  {
    id: "treat-2",
    name: "Metformina",
    dosage: "500mg",
    frequency: "1 comprimido 2x ao dia, após almoço e jantar",
    description: "Hipoglicemiante oral para controle da glicemia",
    explanation_text: null,
    public_notes: "Tomar após as refeições principais para evitar desconforto gástrico. Manter dieta equilibrada e atividade física regular.",
    private_notes: null,
    status: "active",
    start_date: "2024-12-15",
    end_date: null,
    prescribed_by: "prof-2",
    diagnosis_id: "diag-2",
    consultation_id: "cons-2",
    created_at: "2024-12-15T14:30:00Z",
    updated_at: "2024-12-15T14:30:00Z",
    professional_name: "Dra. Ana Silva",
    professional_id: "prof-2",
    diagnosis_name: "Diabetes Mellitus Tipo 2",
  },
  {
    id: "treat-3",
    name: "Psicoterapia Cognitivo-Comportamental",
    dosage: null,
    frequency: "Sessões semanais de 50 minutos",
    description: "Terapia para manejo da ansiedade",
    explanation_text: null,
    public_notes: "Comparecer às sessões semanais. Praticar técnicas de relaxamento ensinadas em casa. Manter diário de sintomas.",
    private_notes: "Paciente apresenta boa adesão. Investigar gatilhos no ambiente de trabalho.",
    status: "active",
    start_date: "2024-12-10",
    end_date: null,
    prescribed_by: "prof-3",
    diagnosis_id: "diag-3",
    consultation_id: "cons-3",
    created_at: "2024-12-10T09:00:00Z",
    updated_at: "2024-12-10T09:00:00Z",
    professional_name: "Dr. Roberto Almeida",
    professional_id: "prof-3",
    diagnosis_name: "Transtorno de Ansiedade Generalizada",
  },
  {
    id: "treat-4",
    name: "Fisioterapia",
    dosage: null,
    frequency: "2 sessões por semana",
    description: "Fortalecimento e alongamento da musculatura lombar",
    explanation_text: null,
    public_notes: "Realizar exercícios de alongamento em casa diariamente. Corrigir postura durante o trabalho. Evitar carregar peso excessivo.",
    private_notes: null,
    status: "active",
    start_date: "2024-11-28",
    end_date: null,
    prescribed_by: "prof-1",
    diagnosis_id: "diag-4",
    consultation_id: "cons-4",
    created_at: "2024-11-28T16:00:00Z",
    updated_at: "2024-11-28T16:00:00Z",
    professional_name: "Dr. Carlos Mendes",
    professional_id: "prof-1",
    diagnosis_name: "Lombalgia Crônica",
  },
  {
    id: "treat-5",
    name: "Loratadina",
    dosage: "10mg",
    frequency: "1 comprimido ao dia",
    description: "Anti-histamínico para controle da rinite alérgica",
    explanation_text: null,
    public_notes: "Tomar preferencialmente à noite. Manter ambiente limpo e livre de poeira. Usar capas anti-ácaros no travesseiro e colchão.",
    private_notes: "Se não houver melhora em 2 semanas, considerar spray nasal de corticóide.",
    status: "active",
    start_date: "2024-10-15",
    end_date: null,
    prescribed_by: "prof-2",
    diagnosis_id: "diag-5",
    consultation_id: "cons-5",
    created_at: "2024-10-15T11:00:00Z",
    updated_at: "2024-10-15T11:00:00Z",
    professional_name: "Dra. Ana Silva",
    professional_id: "prof-2",
    diagnosis_name: "Rinite Alérgica",
  },
];

const PatientTreatments = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [treatments, setTreatments] = useState<TreatmentData[]>([]);
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

  const fetchTreatmentsData = useCallback(async () => {
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

      // Fetch treatments
      const { data: treatmentsData, error } = await supabase
        .from("treatments")
        .select(`
          *,
          diagnoses (name)
        `)
        .eq("patient_id", id)
        .order("start_date", { ascending: false });

      if (error) throw error;

      // If no real data, use mock data for demonstration
      if (!treatmentsData || treatmentsData.length === 0) {
        setUseMockData(true);
        setTreatments(mockTreatments);
        setProfessionals(mockProfessionals);
        setIsLoading(false);
        return;
      }

      // Collect unique professional IDs
      const professionalIds = new Set<string>();
      (treatmentsData || []).forEach((t) => {
        if (t.prescribed_by) {
          professionalIds.add(t.prescribed_by);
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

      // Map treatments with professional info
      const treatmentsWithProfessional = (treatmentsData || []).map((t) => {
        const professionalId = t.prescribed_by;
        const professionalName = professionalId
          ? professionalsMap[professionalId] || "Profissional não identificado"
          : "Profissional não identificado";

        return {
          ...t,
          professional_name: professionalName,
          professional_id: professionalId,
          diagnosis_name: t.diagnoses?.name,
        };
      });

      setTreatments(treatmentsWithProfessional);
    } catch (error) {
      console.error("Error fetching treatments:", error);
      // Use mock data on error for demonstration
      setUseMockData(true);
      setTreatments(mockTreatments);
      setProfessionals(mockProfessionals);
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (user && (isProfessional || isAdmin)) {
      fetchTreatmentsData();
    }
  }, [user, isProfessional, isAdmin, fetchTreatmentsData]);

  // Get professionals for filter based on mock or real data
  const availableProfessionals = useMemo(() => {
    return useMockData ? mockProfessionals : professionals;
  }, [useMockData, professionals]);

  // Apply filters
  const filteredTreatments = useMemo(() => {
    let filtered = [...treatments];

    // Filter by professional
    if (professionalFilter !== "all") {
      filtered = filtered.filter((t) => t.professional_id === professionalFilter);
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

      filtered = filtered.filter((t) => isAfter(parseISO(t.start_date), cutoffDate));
    }

    return filtered;
  }, [treatments, professionalFilter, periodFilter]);

  const toggleExpanded = (treatmentId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(treatmentId)) {
        newSet.delete(treatmentId);
      } else {
        newSet.add(treatmentId);
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

  const isOtherProfessional = (treatment: TreatmentData) => {
    // For mock data, simulate that prof-1 is the current user
    if (useMockData) {
      return treatment.professional_id !== "prof-1";
    }
    return treatment.professional_id && user && treatment.professional_id !== user.id;
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
                <BreadcrumbPage>Tratamentos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Title and Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Tratamentos</h1>
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
          {filteredTreatments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Pill className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum tratamento encontrado.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              {/* Timeline events */}
              <div className="space-y-6 pl-6">
                {filteredTreatments.map((treatment, index) => {
                  const isExpanded = expandedCards.has(treatment.id);
                  const otherProfessional = isOtherProfessional(treatment);

                  return (
                    <div
                      key={treatment.id}
                      className="relative animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-6 w-3 h-3 rounded-full border-4 border-background bg-primary -translate-x-1/2" />

                      {/* Treatment Card */}
                      <Card className="ml-8 transition-shadow hover:shadow-md">
                        <CardContent className="p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 shrink-0">
                                <Pill className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* Treatment name */}
                                <h3 className="font-semibold text-foreground text-lg leading-tight">
                                  {treatment.name}
                                </h3>

                                {/* Dosage */}
                                {treatment.dosage && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    <span className="font-medium">Dose:</span> {treatment.dosage}
                                  </p>
                                )}

                                {/* Frequency */}
                                {treatment.frequency && (
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    <span className="font-medium">Frequência:</span> {treatment.frequency}
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
                                  <p className="flex items-center gap-2">
                                    <span className="text-muted-foreground/70">Data do registro:</span>
                                    <span className="font-medium">{formatShortDate(treatment.created_at)}</span>
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <span className="text-muted-foreground/70">Início do tratamento:</span>
                                    <span className="font-medium">{formatShortDate(treatment.start_date)}</span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(treatment.id)}
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
                              {/* Public Notes - Orientations visible to all */}
                              <div className="bg-muted/50 rounded-lg p-4">
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <Eye className="h-4 w-4 text-primary" />
                                  Orientações ao paciente
                                </h4>
                                {treatment.public_notes || treatment.explanation_text ? (
                                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                    {treatment.public_notes || treatment.explanation_text}
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">
                                    Nenhuma orientação registrada.
                                  </p>
                                )}
                              </div>

                              {/* Professional name at the end */}
                              <div className="text-sm text-muted-foreground pt-3 border-t border-border">
                                <p>
                                  <span className="text-muted-foreground/70">Registrado por:</span>{" "}
                                  <span className="font-medium text-foreground">{treatment.professional_name}</span>
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

export default PatientTreatments;
