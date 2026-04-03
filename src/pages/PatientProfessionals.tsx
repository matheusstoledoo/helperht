import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { User, Calendar, ChevronRight, Search, Clock, Check, X, Shield } from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface PendingRequest {
  id: string;
  professional_id: string;
  professional_name: string;
  professional_specialty: string | null;
  created_at: string;
}

interface LinkedProfessional {
  id: string;
  professional_id: string;
  name: string;
  specialty: string | null;
  linked_at: string;
}

const PatientProfessionals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [linkedProfessionals, setLinkedProfessionals] = useState<LinkedProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{ type: "accept" | "reject" | "revoke"; linkId: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    try {
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!patient) { setLoading(false); return; }

      // Fetch all links for this patient
      const { data: links, error } = await supabase
        .from("professional_patient_links")
        .select("id, professional_id, status, created_at")
        .eq("patient_id", patient.id);

      if (error) { console.error(error); setLoading(false); return; }

      if (!links || links.length === 0) {
        setPendingRequests([]);
        setLinkedProfessionals([]);
        setLoading(false);
        return;
      }

      // Get professional info for all links
      const profIds = [...new Set(links.map((l) => l.professional_id))];
      const { data: professionals } = await supabase
        .from("users")
        .select("id, name, specialty")
        .in("id", profIds);

      const profMap = new Map(professionals?.map((p) => [p.id, p]) || []);

      const pending: PendingRequest[] = [];
      const active: LinkedProfessional[] = [];

      links.forEach((link) => {
        const prof = profMap.get(link.professional_id);
        if (!prof) return;

        if (link.status === "pending") {
          pending.push({
            id: link.id,
            professional_id: link.professional_id,
            professional_name: prof.name,
            professional_specialty: prof.specialty,
            created_at: link.created_at,
          });
        } else if (link.status === "active") {
          active.push({
            id: link.id,
            professional_id: link.professional_id,
            name: prof.name,
            specialty: prof.specialty,
            linked_at: link.created_at,
          });
        }
      });

      setPendingRequests(pending);
      setLinkedProfessionals(active);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, authLoading]);

  const handleAccept = async (linkId: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("professional_patient_links")
      .update({ status: "active" })
      .eq("id", linkId);

    setActionLoading(false);
    setConfirmAction(null);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível aceitar a solicitação.", variant: "destructive" });
    } else {
      toast({ title: "Acesso concedido", description: "O profissional agora pode acessar seus dados." });
      fetchData();
    }
  };

  const handleReject = async (linkId: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("professional_patient_links")
      .update({ status: "rejected" })
      .eq("id", linkId);

    setActionLoading(false);
    setConfirmAction(null);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível recusar a solicitação.", variant: "destructive" });
    } else {
      toast({ title: "Acesso negado", description: "A solicitação foi recusada." });
      fetchData();
    }
  };

  const handleRevoke = async (linkId: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("professional_patient_links")
      .delete()
      .eq("id", linkId);

    setActionLoading(false);
    setConfirmAction(null);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível revogar o acesso.", variant: "destructive" });
    } else {
      toast({ title: "Acesso revogado", description: "O profissional não pode mais acessar seus dados." });
      fetchData();
    }
  };

  const specialties = [...new Set(linkedProfessionals.map((p) => p.specialty).filter(Boolean))] as string[];

  const filteredProfessionals = linkedProfessionals.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = specialtyFilter === "all" || p.specialty === specialtyFilter;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <PatientLayout title="" subtitle="" breadcrumb={<PatientBreadcrumb currentPage="Profissionais da saúde" />}>
      <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Pending Requests */}
        {!loading && pendingRequests.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Solicitações de acesso pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">{req.professional_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {req.professional_specialty || "Especialidade não informada"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Solicitado em {format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => setConfirmAction({ type: "accept", linkId: req.id, name: req.professional_name })}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => setConfirmAction({ type: "reject", linkId: req.id, name: req.professional_name })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Search and filter */}
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
          {specialties.length > 0 && (
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filtrar por especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as especialidades</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Linked Professionals */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {linkedProfessionals.length === 0
                  ? "Nenhum profissional de saúde vinculado. Quando um profissional solicitar acesso aos seus dados, você verá a solicitação aqui."
                  : "Nenhum profissional corresponde aos filtros aplicados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProfessionals.map((professional) => (
              <Card key={professional.id} className="hover:shadow-md transition-shadow">
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
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Acesso ativo
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmAction({ type: "revoke", linkId: professional.id, name: professional.name })}
                      >
                        Revogar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/pac/profissional/${professional.professional_id}`)}
                      >
                        Ver acompanhamento
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredProfessionals.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {filteredProfessionals.length} profissional{filteredProfessionals.length !== 1 ? "is" : ""} vinculado{filteredProfessionals.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "accept" && "Aceitar solicitação de acesso"}
              {confirmAction?.type === "reject" && "Recusar solicitação de acesso"}
              {confirmAction?.type === "revoke" && "Revogar acesso do profissional"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "accept" &&
                `Ao aceitar, ${confirmAction.name} poderá visualizar seus dados clínicos (diagnósticos, tratamentos, exames, etc.).`}
              {confirmAction?.type === "reject" &&
                `A solicitação de ${confirmAction?.name} será recusada. Ele(a) poderá solicitar novamente no futuro.`}
              {confirmAction?.type === "revoke" &&
                `${confirmAction?.name} perderá acesso aos seus dados clínicos imediatamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === "accept") handleAccept(confirmAction.linkId);
                else if (confirmAction.type === "reject") handleReject(confirmAction.linkId);
                else handleRevoke(confirmAction.linkId);
              }}
              className={confirmAction?.type === "revoke" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {actionLoading ? "Processando..." : confirmAction?.type === "accept" ? "Aceitar" : confirmAction?.type === "reject" ? "Recusar" : "Revogar acesso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PatientLayout>
  );
};

export default PatientProfessionals;
