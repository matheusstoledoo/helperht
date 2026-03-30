import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Calendar, ChevronRight, Search } from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Professional {
  id: string;
  name: string;
  specialty: string | null;
  lastConsultation: string | null;
}

const PatientProfessionals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");

  useEffect(() => {
    const fetchProfessionals = async () => {
      if (authLoading) return;
      if (!user) { setLoading(false); return; }

      try {
        // Get patient ID
        const { data: patient } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!patient) {
          setLoading(false);
          return;
        }

        // Get all consultations for this patient with professional info
        const { data: consultations, error } = await supabase
          .from('consultations')
          .select(`
            professional_id,
            consultation_date,
            users!consultations_professional_id_fkey (
              id,
              name,
              specialty
            )
          `)
          .eq('patient_id', patient.id)
          .order('consultation_date', { ascending: false });

        if (error) {
          console.error('Error fetching consultations:', error);
          setLoading(false);
          return;
        }

        // Group by professional and get the last consultation
        const professionalsMap = new Map<string, Professional>();

        consultations?.forEach((consultation: any) => {
          const profId = consultation.professional_id;
          const profUser = consultation.users;

          if (profUser && !professionalsMap.has(profId)) {
            professionalsMap.set(profId, {
              id: profId,
              name: profUser.name,
              specialty: profUser.specialty || null,
              lastConsultation: consultation.consultation_date,
            });
          }
        });

        setProfessionals(Array.from(professionalsMap.values()));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, [user, authLoading]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sem registro";
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Get unique specialties for filter
  const specialties = [...new Set(professionals.map(p => p.specialty).filter(Boolean))] as string[];

  // Filter professionals
  const filteredProfessionals = professionals.filter((professional) => {
    const matchesSearch = professional.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = specialtyFilter === "all" || professional.specialty === specialtyFilter;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <PatientLayout title="" subtitle="" breadcrumb={<PatientBreadcrumb currentPage="Profissionais" />}>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do profissional"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Filtrar por especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as especialidades</SelectItem>
              {specialties.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Professionals List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {professionals.length === 0 
                  ? "Nenhum profissional encontrado"
                  : "Nenhum profissional corresponde aos filtros aplicados"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProfessionals.map((professional) => (
              <Card
                key={professional.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground text-lg">
                          {professional.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {professional.specialty || "Especialidade não informada"}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Última consulta: {formatDate(professional.lastConsultation)}</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/pac/profissional/${professional.id}`)}
                    >
                      Ver acompanhamento
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results count */}
        {!loading && filteredProfessionals.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {filteredProfessionals.length} profissional{filteredProfessionals.length !== 1 ? "is" : ""} encontrado{filteredProfessionals.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </PatientLayout>
  );
};

export default PatientProfessionals;
