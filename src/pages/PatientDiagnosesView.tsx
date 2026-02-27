import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  ClipboardList,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  Filter,
  Lightbulb,
  FileText,
} from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import PatientLayout from "@/components/patient/PatientLayout";
import { useQuery } from "@tanstack/react-query";

interface Diagnosis {
  id: string;
  name: string;
  icd_code: string | null;
  diagnosed_date: string;
  public_notes: string | null;
  explanation_text: string | null;
  consultation_id: string | null;
  professional_id: string | null;
  professional_name: string | null;
  created_at: string;
}

interface Professional {
  id: string;
  name: string;
}

const PatientDiagnosesView = () => {
  const { user } = useAuth();
  const { professionalId } = useParams<{ professionalId?: string }>();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Get professional name if filtering by professional
  const { data: filterProfessional } = useQuery({
    queryKey: ['professional-name', professionalId],
    queryFn: async () => {
      if (!professionalId) return null;
      const { data } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', professionalId)
        .maybeSingle();
      return data;
    },
    enabled: !!professionalId,
  });

  // Filters - initialize professionalFilter based on URL param
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [diseaseFilter, setDiseaseFilter] = useState<string>("all");

  // Set professional filter when URL param changes
  useEffect(() => {
    if (professionalId) {
      setProfessionalFilter(professionalId);
    }
  }, [professionalId]);

  useEffect(() => {
    const fetchDiagnoses = async () => {
      if (!user) return;

      try {
        // Get patient ID
        const { data: patient } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!patient) {
          setLoading(false);
          return;
        }

        // Fetch all diagnoses with consultation info to get professional
        const { data: diagnosesData, error: diagnosesError } = await supabase
          .from("diagnoses")
          .select(`
            *,
            consultations (
              professional_id,
              users!consultations_professional_id_fkey (
                id,
                name
              )
            )
          `)
          .eq("patient_id", patient.id)
          .order("diagnosed_date", { ascending: false });

        if (diagnosesError) {
          console.error("Error fetching diagnoses:", diagnosesError);
          setLoading(false);
          return;
        }

        // Process diagnoses to include professional info
        const processedDiagnoses: Diagnosis[] = (diagnosesData || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          icd_code: d.icd_code,
          diagnosed_date: d.diagnosed_date,
          public_notes: d.public_notes,
          explanation_text: d.explanation_text,
          consultation_id: d.consultation_id,
          professional_id: d.consultations?.professional_id || null,
          professional_name: d.consultations?.users?.name || null,
          created_at: d.created_at,
        }));

        setDiagnoses(processedDiagnoses);

        // Extract unique professionals
        const uniqueProfessionals = new Map<string, string>();
        processedDiagnoses.forEach((d) => {
          if (d.professional_id && d.professional_name) {
            uniqueProfessionals.set(d.professional_id, d.professional_name);
          }
        });
        setProfessionals(
          Array.from(uniqueProfessionals.entries()).map(([id, name]) => ({ id, name }))
        );
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnoses();
  }, [user]);

  // Get unique disease names for filter
  const uniqueDiseases = useMemo(() => {
    const diseases = new Set(diagnoses.map((d) => d.name));
    return Array.from(diseases).sort();
  }, [diagnoses]);

  // Apply filters
  const filteredDiagnoses = useMemo(() => {
    let filtered = [...diagnoses];

    // Filter by professional
    if (professionalFilter !== "all") {
      filtered = filtered.filter((d) => d.professional_id === professionalFilter);
    }

    // Filter by disease
    if (diseaseFilter !== "all") {
      filtered = filtered.filter((d) => d.name === diseaseFilter);
    }

    // Filter by period
    if (periodFilter !== "all") {
      const now = new Date();
      let cutoffDate: Date;

      switch (periodFilter) {
        case "week":
          cutoffDate = subDays(now, 7);
          break;
        case "month":
          cutoffDate = subMonths(now, 1);
          break;
        case "quarter":
          cutoffDate = subMonths(now, 3);
          break;
        case "year":
          cutoffDate = subYears(now, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter((d) => isAfter(parseISO(d.diagnosed_date), cutoffDate));
    }

    return filtered;
  }, [diagnoses, professionalFilter, periodFilter, diseaseFilter]);

  const toggleExpanded = (id: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const breadcrumbContent = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/pac/dashboard">Página inicial</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {professionalId && filterProfessional ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/pac/profissionais">Profissionais</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/pac/profissional/${professionalId}`}>{filterProfessional.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Diagnósticos</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>Diagnósticos</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <PatientLayout 
      title="Meus Diagnósticos" 
      subtitle="Histórico de todos os seus diagnósticos"
      breadcrumb={breadcrumbContent}
    >
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filtros</span>
            </div>
            <div className={`grid grid-cols-1 gap-3 ${professionalId ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {/* Professional filter - only show when not filtering by professional from URL */}
              {!professionalId && (
                <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                  <SelectItem value="year">Último ano</SelectItem>
                </SelectContent>
              </Select>

              <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Diagnóstico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os diagnósticos</SelectItem>
                  {uniqueDiseases.map((disease) => (
                    <SelectItem key={disease} value={disease}>
                      {disease}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDiagnoses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {diagnoses.length === 0
                  ? "Nenhum diagnóstico registrado"
                  : "Nenhum diagnóstico encontrado com os filtros selecionados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            {/* Timeline cards */}
            <div className="space-y-4">
              {filteredDiagnoses.map((diagnosis, index) => {
                const isExpanded = expandedCards.has(diagnosis.id);

                return (
                  <div
                    key={diagnosis.id}
                    className="relative pl-12 animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-sm" />

                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(diagnosis.id)}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <CollapsibleTrigger asChild>
                            <div className="cursor-pointer">
                              {/* Diagnosis name - highlighted */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <ClipboardList className="h-5 w-5 text-primary" />
                                  <h3 className="font-bold text-lg text-foreground">
                                    {diagnosis.name}
                                  </h3>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>

                              {/* Registration date */}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(diagnosis.diagnosed_date)}</span>
                              </div>

                              {/* ICD code */}
                              {diagnosis.icd_code && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <FileText className="h-4 w-4" />
                                  <span className="font-medium">CID: {diagnosis.icd_code}</span>
                                </div>
                              )}

                              {/* Professional */}
                              {diagnosis.professional_name && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <User className="h-4 w-4" />
                                  <span>{diagnosis.professional_name}</span>
                                </div>
                              )}
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="mt-4 pt-4 border-t border-border space-y-3">
                              {/* Professional notes */}
                              {diagnosis.public_notes && (
                                <Alert className="bg-muted/50 border-muted">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <AlertDescription className="text-foreground">
                                    <span className="font-medium block mb-1">
                                      Anotações do profissional:
                                    </span>
                                    {diagnosis.public_notes}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Simplified explanation */}
                              {diagnosis.explanation_text && (
                                <Alert className="bg-primary/5 border-primary/20">
                                  <Lightbulb className="h-4 w-4 text-primary" />
                                  <AlertDescription className="text-foreground">
                                    <span className="font-medium block mb-1">
                                      Explicação simplificada:
                                    </span>
                                    {diagnosis.explanation_text}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {!diagnosis.public_notes && !diagnosis.explanation_text && (
                                <p className="text-sm text-muted-foreground italic">
                                  Nenhuma anotação disponível para este diagnóstico.
                                </p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </CardContent>
                      </Card>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
};

export default PatientDiagnosesView;
