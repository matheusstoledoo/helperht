import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, UserPlus, Clock } from "lucide-react";

interface FoundPatient {
  id: string;
  user_id: string;
  users: { name: string; email: string | null } | null;
  linkStatus: string | null;
}

interface RequestPatientAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RequestPatientAccessModal = ({
  open,
  onOpenChange,
}: RequestPatientAccessModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchName, setSearchName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FoundPatient[]>([]);
  const [searched, setSearched] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchName.trim().length < 3 || !user) return;
    setIsSearching(true);
    setSearched(false);

    try {
      const { data, error } = await supabase.rpc("search_patients_for_linking", {
        _professional_id: user.id,
        _search_name: searchName.trim(),
      });

      if (error) throw error;

      const found: FoundPatient[] = (data || []).map((row: any) => ({
        id: row.patient_id,
        user_id: row.patient_user_id,
        users: { name: row.patient_name, email: null },
        linkStatus: row.link_status || null,
      }));

      setResults(found);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar pacientes.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setSearched(true);
    }
  };

  const handleRequestAccess = async (patientId: string) => {
    if (!user) return;
    setRequesting(patientId);
    try {
      const { error } = await supabase
        .from("professional_patient_links")
        .insert({
          professional_id: user.id,
          patient_id: patientId,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada",
        description: "O paciente será notificado para aprovar seu acesso.",
      });

      setResults((prev) =>
        prev.map((p) =>
          p.id === patientId ? { ...p, linkStatus: "pending" } : p
        )
      );

      queryClient.invalidateQueries({ queryKey: ["patients-list"] });
    } catch (error: any) {
      console.error("Request error:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível solicitar acesso.",
        variant: "destructive",
      });
    } finally {
      setRequesting(null);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSearchName("");
      setResults([]);
      setSearched(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar acesso a paciente</DialogTitle>
          <DialogDescription>
            Busque um paciente já cadastrado para solicitar vínculo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do paciente</Label>
            <div className="flex gap-2">
              <Input
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setSearched(false);
                }}
                placeholder="Digite pelo menos 3 caracteres"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                variant="secondary"
                onClick={handleSearch}
                disabled={isSearching || searchName.trim().length < 3}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {searched && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum paciente encontrado.
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-3 rounded-md border bg-card"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {patient.users?.name}
                    </p>
                  </div>
                  {patient.linkStatus === "active" ? (
                    <span className="text-xs text-muted-foreground">
                      Já vinculado
                    </span>
                  ) : patient.linkStatus === "pending" ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Pendente
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestAccess(patient.id)}
                      disabled={requesting === patient.id}
                    >
                      {requesting === patient.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3 mr-1" />
                          Solicitar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
