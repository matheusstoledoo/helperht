import { useState, useEffect } from "react";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Eye, Users, LogOut, Settings, ArrowUpDown, Route, UserSearch } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { DailyTasksList } from "@/components/trails/DailyTasksList";
import { RequestPatientAccessModal } from "@/components/professional/RequestPatientAccessModal";

interface PatientStatus {
  noWorkoutDays: number | null;
  hasNewNote: boolean;
  hasUpcomingCheckpoint: boolean;
}

interface PatientWithUser {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  users: {
    name: string;
    email: string | null;
  } | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isProfessional, isAdmin, isPatient, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [patients, setPatients] = useState<PatientWithUser[]>([]);
  const [statuses, setStatuses] = useState<Record<string, PatientStatus>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"name" | "created_at" | "updated_at">("updated_at");
  const [isLoading, setIsLoading] = useState(true);
  const [professionalName, setProfessionalName] = useState("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isPatient && !roleLoading && user) {
      navigate('/pac/dashboard');
    }
  }, [isPatient, roleLoading, user, navigate]);

  useEffect(() => {
    const fetchProfessionalName = async () => {
      if (!user) { return; }
      const { data } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfessionalName(data.name);
      }
    };
    fetchProfessionalName();
  }, [user]);

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        if (isAdmin) {
          // Admins see all patients
          const { data, error } = await supabase
            .from("patients")
            .select(`
              id,
              user_id,
              created_at,
              updated_at,
              users (
                name,
                email
              )
            `)
            .order("updated_at", { ascending: false });

          if (error) throw error;
          setPatients(data || []);
        } else {
          // Professionals see only linked patients with active status
          const { data: links, error: linksError } = await supabase
            .from("professional_patient_links")
            .select("patient_id")
            .eq("professional_id", user!.id)
            .eq("status", "active");

          if (linksError) throw linksError;

          const linkedPatientIds = (links || []).map((l) => l.patient_id);

          if (linkedPatientIds.length === 0) {
            setPatients([]);
          } else {
            const { data, error } = await supabase
              .from("patients")
              .select(`
                id,
                user_id,
                created_at,
                updated_at,
                users (
                  name,
                  email
                )
              `)
              .in("id", linkedPatientIds)
              .order("updated_at", { ascending: false });

            if (error) throw error;
            setPatients(data || []);
          }
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os pacientes.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && (isProfessional || isAdmin)) {
      fetchPatients();
    }
  }, [user, isProfessional, isAdmin, toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredPatients = patients
    .filter((patient) =>
      patient.users?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "name") {
        return (a.users?.name || "").localeCompare(b.users?.name || "");
      }
      if (sortOrder === "created_at") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  if (authLoading || roleLoading) {
    return <FullPageLoading />;
  }

  if (!isProfessional && !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Olá, {professionalName || "Profissional"}
                </h1>
                <p className="text-sm text-muted-foreground">Resumo dos seus pacientes</p>
              </div>
              {/* Desktop actions */}
              <div className="hidden sm:flex items-center gap-2">
                <Button onClick={() => navigate("/prof/pacientes/novo")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar paciente
                </Button>
                <Button variant="outline" onClick={() => setShowAccessModal(true)}>
                  <UserSearch className="mr-2 h-4 w-4" />
                  Solicitar acesso
                </Button>
                <Button variant="outline" onClick={() => navigate("/prof/trilhas")}>
                  <Route className="mr-2 h-4 w-4" />
                  Trilhas
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate("/prof/config")}>
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setShowLogoutDialog(true)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
              {/* Mobile actions - just icons */}
              <div className="flex sm:hidden items-center gap-1">
                <Button size="icon" variant="outline" onClick={() => navigate("/prof/config")}>
                  <Settings className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => setShowLogoutDialog(true)}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Mobile action buttons */}
            <div className="flex sm:hidden gap-2 flex-wrap">
              <Button className="flex-1" size="sm" onClick={() => navigate("/prof/pacientes/novo")}>
                <UserPlus className="mr-2 h-4 w-4" />
                Cadastrar
              </Button>
              <Button className="flex-1" variant="outline" size="sm" onClick={() => setShowAccessModal(true)}>
                <UserSearch className="mr-2 h-4 w-4" />
                Solicitar acesso
              </Button>
              <Button className="flex-1" variant="outline" size="sm" onClick={() => navigate("/prof/trilhas")}>
                <Route className="mr-2 h-4 w-4" />
                Trilhas
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Daily Tasks */}
        <DailyTasksList />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Meus pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente pelo nome"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={sortOrder}
                onValueChange={(value: "name" | "created_at" | "updated_at") => setSortOrder(value)}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="created_at">Data de cadastro</SelectItem>
                  <SelectItem value="updated_at">Última atualização</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Patients - Table on desktop, Cards on mobile */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando pacientes...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "Nenhum paciente encontrado com esse nome."
                  : "Nenhum paciente cadastrado ainda."}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome do paciente</TableHead>
                        <TableHead>Data de cadastro</TableHead>
                        <TableHead>Última atualização</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">
                            {patient.users?.name || "Sem nome"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(patient.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(patient.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/prof/paciente/${patient.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver paciente
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-3">
                  {filteredPatients.map((patient) => (
                    <Card
                      key={patient.id}
                      className="cursor-pointer active:bg-accent/10 transition-colors"
                      onClick={() => navigate(`/prof/paciente/${patient.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {patient.users?.name || "Sem nome"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Atualizado em {format(new Date(patient.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {!isLoading && filteredPatients.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                {filteredPatients.length} paciente
                {filteredPatients.length !== 1 ? "s" : ""} encontrado
                {filteredPatients.length !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>
              Você realmente deseja sair da sua conta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RequestPatientAccessModal
        open={showAccessModal}
        onOpenChange={setShowAccessModal}
      />
    </div>
  );
};

export default Dashboard;