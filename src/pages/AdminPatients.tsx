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
  Users,
  UserCog,
  Calendar,
  Activity,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Patient {
  id: string;
  user_id: string;
  name: string;
  cpf: string | null;
  created_at: string;
  professionals_count: number;
  // Mock data for usage analytics
  access_frequency: string;
  main_features: string[];
}

// Mock usage data (would come from analytics in production)
const mockUsageData: Record<string, { frequency: string; features: string[] }> = {};
const features = ["Timeline", "Documentos", "Pendências", "Diagnósticos", "Tratamentos", "Profissionais"];
const frequencies = ["Diário", "Semanal", "Quinzenal", "Mensal", "Esporádico"];

const getRandomUsageData = (id: string) => {
  if (!mockUsageData[id]) {
    mockUsageData[id] = {
      frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
      features: features.slice(0, Math.floor(Math.random() * 4) + 2),
    };
  }
  return mockUsageData[id];
};

// Mask CPF: show first 3 and last 2 digits
const maskCPF = (cpf: string | null): string => {
  if (!cpf) return "Não informado";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return "***.***.***-**";
  return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(-2)}`;
};

const AdminPatients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");

  // Fetch patients with user data
  const { data: patients, isLoading } = useQuery({
    queryKey: ["admin-patients"],
    queryFn: async () => {
      const { data: patientsData, error } = await supabase
        .from("patients")
        .select(`
          id,
          user_id,
          created_at,
          user:users!patients_user_id_fkey(name, cpf)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get professionals count for each patient
      const patientsWithData = await Promise.all(
        (patientsData || []).map(async (patient) => {
          // Count unique professionals from consultations
          const { data: consultations } = await supabase
            .from("consultations")
            .select("professional_id")
            .eq("patient_id", patient.id);

          const uniqueProfessionals = new Set(
            consultations?.map((c) => c.professional_id) || []
          );

          const usageData = getRandomUsageData(patient.id);

          return {
            id: patient.id,
            user_id: patient.user_id,
            name: patient.user?.name || "Nome não disponível",
            cpf: patient.user?.cpf || null,
            created_at: patient.created_at,
            professionals_count: uniqueProfessionals.size,
            access_frequency: usageData.frequency,
            main_features: usageData.features,
          } as Patient;
        })
      );

      return patientsWithData;
    },
  });

  // Filter patients
  const filteredPatients = useMemo(() => {
    if (!patients) return [];

    return patients.filter((patient) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = patient.name.toLowerCase().includes(search);
        const matchesCPF = patient.cpf?.includes(search);
        if (!matchesName && !matchesCPF) return false;
      }

      // Frequency filter
      if (frequencyFilter !== "all" && patient.access_frequency !== frequencyFilter) {
        return false;
      }

      return true;
    });
  }, [patients, searchTerm, frequencyFilter]);

  const hasActiveFilters = searchTerm || frequencyFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setFrequencyFilter("all");
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredPatients.length) return;

    const headers = ["Nome", "CPF", "Profissionais Vinculados", "Frequência de Acesso", "Data de Cadastro", "Funcionalidades"];
    const rows = filteredPatients.map((p) => [
      p.name,
      maskCPF(p.cpf),
      p.professionals_count.toString(),
      p.access_frequency,
      format(new Date(p.created_at), "dd/MM/yyyy"),
      p.main_features.join("; "),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pacientes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!patients) return { total: 0, withProfessionals: 0, avgProfessionals: 0 };

    const withProf = patients.filter((p) => p.professionals_count > 0).length;
    const totalProf = patients.reduce((acc, p) => acc + p.professionals_count, 0);

    return {
      total: patients.length,
      withProfessionals: withProf,
      avgProfessionals: patients.length > 0 ? Math.round((totalProf / patients.length) * 10) / 10 : 0,
    };
  }, [patients]);

  return (
    <AdminLayout
      title="Pacientes"
      subtitle="Gerenciamento de pacientes cadastrados"
    >
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Pacientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Com Profissionais Vinculados
              </CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withProfessionals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média de Profissionais/Paciente
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProfessionals}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={filteredPatients.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Frequency Filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={frequencyFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFrequencyFilter("all")}
                >
                  Todos
                </Button>
                {frequencies.map((freq) => (
                  <Button
                    key={freq}
                    variant={frequencyFilter === freq ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFrequencyFilter(freq)}
                  >
                    {freq}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Lista de Pacientes
              {filteredPatients.length > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
                  ({filteredPatients.length} resultado
                  {filteredPatients.length !== 1 ? "s" : ""})
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
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {hasActiveFilters
                    ? "Nenhum paciente encontrado"
                    : "Nenhum paciente cadastrado"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Tente ajustar os filtros de busca."
                    : "Os pacientes aparecerão aqui quando cadastrados."}
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
                      <TableHead>CPF</TableHead>
                      <TableHead>Profissionais Vinculados</TableHead>
                      <TableHead>Frequência de Acesso</TableHead>
                      <TableHead>Funcionalidades</TableHead>
                      <TableHead>Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <p className="font-medium">{patient.name}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">
                            {maskCPF(patient.cpf)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{patient.professionals_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              patient.access_frequency === "Diário"
                                ? "default"
                                : patient.access_frequency === "Semanal"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {patient.access_frequency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {patient.main_features.slice(0, 3).map((feature) => (
                              <Badge
                                key={feature}
                                variant="secondary"
                                className="text-xs"
                              >
                                {feature}
                              </Badge>
                            ))}
                            {patient.main_features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{patient.main_features.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(patient.created_at), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
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

export default AdminPatients;
