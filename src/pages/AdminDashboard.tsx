import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCog,
  CalendarCheck,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminDashboard = () => {
  // Fetch professionals count
  const { data: professionalsCount, isLoading: loadingProfessionals } = useQuery({
    queryKey: ["admin-professionals-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "professional");
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch patients count
  const { data: patientsCount, isLoading: loadingPatients } = useQuery({
    queryKey: ["admin-patients-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch consultations in the last 30 days
  const { data: consultationsData, isLoading: loadingConsultations } = useQuery({
    queryKey: ["admin-consultations-30days"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("consultations")
        .select("consultation_date")
        .gte("consultation_date", thirtyDaysAgo);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate consultations count
  const consultationsCount = consultationsData?.length || 0;

  // Generate chart data for the last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const count = consultationsData?.filter((c) => {
      const consultDate = new Date(c.consultation_date);
      return consultDate >= dayStart && consultDate <= dayEnd;
    }).length || 0;

    return {
      name: format(date, "EEE", { locale: ptBR }),
      consultas: count,
    };
  });

  // Calculate average engagement (mock calculation based on consultations per professional)
  const avgEngagement = professionalsCount && professionalsCount > 0 
    ? Math.round((consultationsCount / professionalsCount) * 10) / 10
    : 0;

  const isLoading = loadingProfessionals || loadingPatients || loadingConsultations;

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral do sistema">
      <div className="p-6 space-y-6">
        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Professionals Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Profissionais de Saúde
              </CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingProfessionals ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{professionalsCount}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          {/* Patients Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pacientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingPatients ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{patientsCount}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          {/* Consultations Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Consultas (30 dias)
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingConsultations ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{consultationsCount}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                realizadas no período
              </p>
            </CardContent>
          </Card>

          {/* Engagement Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Engajamento Médio
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{avgEngagement}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                consultas por profissional
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Consultas nos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConsultations ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="consultas"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorConsultas)"
                    strokeWidth={2}
                    name="Consultas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total de usuários</span>
                <span className="font-medium">
                  {(professionalsCount || 0) + (patientsCount || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Razão pacientes/profissional</span>
                <span className="font-medium">
                  {professionalsCount && professionalsCount > 0
                    ? Math.round((patientsCount || 0) / professionalsCount * 10) / 10
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Média diária de consultas</span>
                <span className="font-medium">
                  {Math.round(consultationsCount / 30 * 10) / 10}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-green-600">Operacional</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Banco de dados</span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-green-600">Conectado</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Última atualização</span>
                <span className="font-medium">
                  {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
