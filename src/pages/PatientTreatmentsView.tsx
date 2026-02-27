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
  Pill,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  Filter,
  Lightbulb,
  FileText,
  Clock,
} from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import PatientLayout from "@/components/patient/PatientLayout";
import { useQuery } from "@tanstack/react-query";

interface Treatment {
  id: string;
  name: string;
  description: string | null;
  dosage: string | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
  public_notes: string | null;
  explanation_text: string | null;
  diagnosis_id: string | null;
  diagnosis_name: string | null;
  professional_id: string | null;
  professional_name: string | null;
  created_at: string;
}

interface Professional {
  id: string;
  name: string;
}

const PatientTreatmentsView = () => {
  const { user } = useAuth();
  const { professionalId } = useParams<{ professionalId?: string }>();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
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
    const fetchTreatments = async () => {
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

        // Fetch all treatments with consultation and diagnosis info
        const { data: treatmentsData, error: treatmentsError } = await supabase
          .from("treatments")
          .select(`
            *,
            consultations (
              professional_id,
              users!consultations_professional_id_fkey (
                id,
                name
              )
            ),
            diagnoses (
              id,
              name
            )
          `)
          .eq("patient_id", patient.id)
          .order("start_date", { ascending: false });

        if (treatmentsError) {
          console.error("Error fetching treatments:", treatmentsError);
          setLoading(false);
          return;
        }

        // Process treatments to include professional and diagnosis info
        const processedTreatments: Treatment[] = (treatmentsData || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          dosage: t.dosage,
          frequency: t.frequency,
          start_date: t.start_date,
          end_date: t.end_date,
          public_notes: t.public_notes,
          explanation_text: t.explanation_text,
          diagnosis_id: t.diagnosis_id,
          diagnosis_name: t.diagnoses?.name || null,
          professional_id: t.consultations?.professional_id || null,
          professional_name: t.consultations?.users?.name || null,
          created_at: t.created_at,
        }));

        setTreatments(processedTreatments);

        // Extract unique professionals
        const uniqueProfessionals = new Map<string, string>();
        processedTreatments.forEach((t) => {
          if (t.professional_id && t.professional_name) {
            uniqueProfessionals.set(t.professional_id, t.professional_name);
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

    fetchTreatments();
  }, [user]);

  // Get unique disease names for filter
  const uniqueDiseases = useMemo(() => {
    const diseases = new Set(treatments.filter((t) => t.diagnosis_name).map((t) => t.diagnosis_name!));
    return Array.from(diseases).sort();
  }, [treatments]);

  // Apply filters
  const filteredTreatments = useMemo(() => {
    let filtered = [...treatments];

    // Filter by professional
    if (professionalFilter !== "all") {
      filtered = filtered.filter((t) => t.professional_id === professionalFilter);
    }

    // Filter by disease
    if (diseaseFilter !== "all") {
      filtered = filtered.filter((t) => t.diagnosis_name === diseaseFilter);
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

      filtered = filtered.filter((t) => isAfter(parseISO(t.start_date), cutoffDate));
    }

    return filtered;
  }, [treatments, professionalFilter, periodFilter, diseaseFilter]);

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

  // Build posology string
  const getPosology = (treatment: Treatment) => {
    const parts: string[] = [];
    if (treatment.dosage) parts.push(treatment.dosage);
    if (treatment.frequency) parts.push(treatment.frequency);
    if (treatment.end_date) {
      const startDate = parseISO(treatment.start_date);
      const endDate = parseISO(treatment.end_date);
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        parts.push(`${diffDays} dias`);
      }
    }
    return parts.length > 0 ? parts.join(" • ") : null;
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
              <BreadcrumbPage>Tratamentos</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>Tratamentos</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <PatientLayout 
      title="Meus Tratamentos" 
      subtitle="Acompanhe todos os seus tratamentos"
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
        ) : filteredTreatments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {treatments.length === 0
                  ? "Nenhum tratamento registrado"
                  : "Nenhum tratamento encontrado com os filtros selecionados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            {/* Timeline cards */}
            <div className="space-y-4">
              {filteredTreatments.map((treatment, index) => {
                const isExpanded = expandedCards.has(treatment.id);
                const posology = getPosology(treatment);

                return (
                  <div
                    key={treatment.id}
                    className="relative pl-12 animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-sm" />

                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(treatment.id)}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <CollapsibleTrigger asChild>
                            <div className="cursor-pointer">
                              {/* Treatment name - highlighted */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Pill className="h-5 w-5 text-primary" />
                                  <h3 className="font-bold text-lg text-foreground">
                                    {treatment.name}
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
                                <span>{formatDate(treatment.start_date)}</span>
                              </div>

                              {/* Posology */}
                              {posology && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{posology}</span>
                                </div>
                              )}

                              {/* Professional */}
                              {treatment.professional_name && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <User className="h-4 w-4" />
                                  <span>{treatment.professional_name}</span>
                                </div>
                              )}
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="mt-4 pt-4 border-t border-border space-y-3">
                              {/* Description */}
                              {treatment.description && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Descrição: </span>
                                  {treatment.description}
                                </div>
                              )}

                              {/* Professional notes */}
                              {treatment.public_notes && (
                                <Alert className="bg-muted/50 border-muted">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <AlertDescription className="text-foreground">
                                    <span className="font-medium block mb-1">
                                      Anotações do profissional:
                                    </span>
                                    {treatment.public_notes}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Simplified explanation */}
                              {treatment.explanation_text && (
                                <Alert className="bg-primary/5 border-primary/20">
                                  <Lightbulb className="h-4 w-4 text-primary" />
                                  <AlertDescription className="text-foreground">
                                    <span className="font-medium block mb-1">
                                      Explicação simplificada:
                                    </span>
                                    {treatment.explanation_text}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Related diagnosis */}
                              {treatment.diagnosis_name && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Diagnóstico relacionado: </span>
                                  {treatment.diagnosis_name}
                                </div>
                              )}

                              {!treatment.public_notes && !treatment.explanation_text && !treatment.description && (
                                <p className="text-sm text-muted-foreground italic">
                                  Nenhuma anotação disponível para este tratamento.
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

export default PatientTreatmentsView;
