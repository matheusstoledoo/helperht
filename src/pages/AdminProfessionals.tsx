import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  X,
  UserCog,
  Calendar,
  Clock,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Professional {
  id: string;
  name: string;
  email: string | null;
  profession: string | null;
  specialty: string | null;
  created_at: string;
  consultations_count: number;
  // Mock data for usage analytics
  avg_sessions_week: number;
  main_features: string[];
}

// Mock usage data (would come from analytics in production)
const mockUsageData: Record<string, { sessions: number; features: string[] }> = {};
const features = ["Timeline", "Diagnósticos", "Tratamentos", "Exames", "PDF", "Documentos"];

const getRandomUsageData = (id: string) => {
  if (!mockUsageData[id]) {
    mockUsageData[id] = {
      sessions: Math.floor(Math.random() * 15) + 1,
      features: features.slice(0, Math.floor(Math.random() * 4) + 2),
    };
  }
  return mockUsageData[id];
};

const AdminProfessionals = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [professionFilter, setProfessionFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");

  // Fetch professionals
  const { data: professionals, isLoading } = useQuery({
    queryKey: ["admin-professionals"],
    queryFn: async () => {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, name, email, profession, specialty, created_at")
        .eq("role", "professional")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get consultation counts for each professional
      const professionalsWithData = await Promise.all(
        (users || []).map(async (user) => {
          const { count } = await supabase
            .from("consultations")
            .select("*", { count: "exact", head: true })
            .eq("professional_id", user.id);

          const usageData = getRandomUsageData(user.id);

          return {
            ...user,
            consultations_count: count || 0,
            avg_sessions_week: usageData.sessions,
            main_features: usageData.features,
          } as Professional;
        })
      );

      return professionalsWithData;
    },
  });

  // Get unique professions and specialties for filters
  const { professions, specialties } = useMemo(() => {
    if (!professionals) return { professions: [], specialties: [] };

    const profs = new Set<string>();
    const specs = new Set<string>();

    professionals.forEach((p) => {
      if (p.profession) profs.add(p.profession);
      if (p.specialty) specs.add(p.specialty);
    });

    return {
      professions: Array.from(profs),
      specialties: Array.from(specs),
    };
  }, [professionals]);

  // Filter professionals
  const filteredProfessionals = useMemo(() => {
    if (!professionals) return [];

    return professionals.filter((prof) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = prof.name.toLowerCase().includes(search);
        const matchesEmail = prof.email?.toLowerCase().includes(search);
        if (!matchesName && !matchesEmail) return false;
      }

      // Profession filter
      if (professionFilter !== "all" && prof.profession !== professionFilter) {
        return false;
      }

      // Specialty filter
      if (specialtyFilter !== "all" && prof.specialty !== specialtyFilter) {
        return false;
      }

      return true;
    });
  }, [professionals, searchTerm, professionFilter, specialtyFilter]);

  const hasActiveFilters =
    searchTerm || professionFilter !== "all" || specialtyFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setProfessionFilter("all");
    setSpecialtyFilter("all");
  };

  return (
    <AdminLayout
      title="Profissionais"
      subtitle="Gerenciamento de profissionais de saúde"
    >
      <div className="p-6 space-y-6">
        {/* Stats Card */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Profissionais
              </CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {professionals?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Profissões Cadastradas
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{professions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Especialidades
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{specialties.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Profession Filter */}
              <Select value={professionFilter} onValueChange={setProfessionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Profissão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as profissões</SelectItem>
                  {professions.map((prof) => (
                    <SelectItem key={prof} value={prof}>
                      {prof}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Specialty Filter */}
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as especialidades</SelectItem>
                  {specialties.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Professionals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Lista de Profissionais
              {filteredProfessionals.length > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
                  ({filteredProfessionals.length} resultado
                  {filteredProfessionals.length !== 1 ? "s" : ""})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="text-center py-12">
                <UserCog className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {hasActiveFilters
                    ? "Nenhum profissional encontrado"
                    : "Nenhum profissional cadastrado"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Tente ajustar os filtros de busca."
                    : "Os profissionais aparecerão aqui quando cadastrados."}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Profissão</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead>Sessões/Semana</TableHead>
                      <TableHead>Funcionalidades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfessionals.map((prof) => (
                      <TableRow key={prof.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{prof.name}</p>
                            {prof.email && (
                              <p className="text-xs text-muted-foreground">
                                {prof.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {prof.profession || (
                            <span className="text-muted-foreground">
                              Não informada
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {prof.specialty || (
                            <span className="text-muted-foreground">
                              Não informada
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(prof.created_at), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{prof.avg_sessions_week}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {prof.main_features.slice(0, 3).map((feature) => (
                              <Badge
                                key={feature}
                                variant="secondary"
                                className="text-xs"
                              >
                                {feature}
                              </Badge>
                            ))}
                            {prof.main_features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{prof.main_features.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProfessionals;
