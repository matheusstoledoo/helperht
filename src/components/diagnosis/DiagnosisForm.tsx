import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDiagnosisExplanation } from "@/hooks/useDiagnosisExplanation";
import { CidCombobox } from "./CidCombobox";
import { CidEntry } from "@/hooks/useCidSearch";
import { markDataUpdated } from "@/lib/healthDataEvents";

interface DiagnosisFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  existingDiagnosis?: {
    id: string;
    name: string;
    icd_code?: string;
    status: string;
    severity?: string;
    explanation_text?: string;
  };
}

export const DiagnosisForm = ({ open, onOpenChange, patientId, existingDiagnosis }: DiagnosisFormProps) => {
  const [searchValue, setSearchValue] = useState("");
  const [name, setName] = useState(existingDiagnosis?.name || "");
  const [icdCode, setIcdCode] = useState(existingDiagnosis?.icd_code || "");
  const [status, setStatus] = useState(existingDiagnosis?.status || "active");
  const [severity, setSeverity] = useState(existingDiagnosis?.severity || "moderate");
  const [explanation, setExplanation] = useState(existingDiagnosis?.explanation_text || "");
  const [saving, setSaving] = useState(false);
  
  const { generateExplanation, generating } = useDiagnosisExplanation();

  // Initialize search value when editing existing diagnosis
  useEffect(() => {
    if (existingDiagnosis) {
      setSearchValue(existingDiagnosis.name);
      setName(existingDiagnosis.name);
      setIcdCode(existingDiagnosis.icd_code || "");
    }
  }, [existingDiagnosis]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setName("");
      setIcdCode("");
      setStatus("active");
      setSeverity("moderate");
      setExplanation("");
    }
  }, [open]);

  const handleCidSelect = (entry: CidEntry) => {
    setName(entry.description);
    setIcdCode(entry.code);
    setSearchValue(entry.description);
  };

  const handleGenerateExplanation = async () => {
    if (!name) {
      toast.error("Por favor, insira o nome do diagnóstico primeiro");
      return;
    }

    const generatedExplanation = await generateExplanation({
      name,
      icd_code: icdCode,
      severity,
    });

    if (generatedExplanation) {
      setExplanation(generatedExplanation);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const diagnosisData = {
        patient_id: patientId,
        name,
        icd_code: icdCode || null,
        status: status as "active" | "resolved" | "under_observation",
        severity: severity as "mild" | "moderate" | "severe",
        explanation_text: explanation || null,
      };

      if (existingDiagnosis) {
        const { error } = await supabase
          .from("diagnoses")
          .update(diagnosisData)
          .eq("id", existingDiagnosis.id);

        if (error) throw error;
        toast.success("Diagnóstico atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("diagnoses")
          .insert(diagnosisData);

        if (error) throw error;
        toast.success("Diagnóstico adicionado com sucesso");
      }

      markDataUpdated();
      onOpenChange(false);
      // Reset form
      setName("");
      setIcdCode("");
      setStatus("active");
      setSeverity("moderate");
      setExplanation("");
    } catch (error) {
      console.error("Error saving diagnosis:", error);
      toast.error("Falha ao salvar diagnóstico");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingDiagnosis ? "Editar Diagnóstico" : "Adicionar Novo Diagnóstico"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Diagnóstico (Nome ou CID) *</Label>
            <CidCombobox
              value={searchValue}
              selectedCode={icdCode}
              onSelect={handleCidSelect}
              onChange={setSearchValue}
              placeholder="Digite o nome da doença ou código CID..."
            />
            <p className="text-xs text-muted-foreground">
              Busque pelo nome da doença ou código CID-10 para selecionar o diagnóstico.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="under_observation">Em Observação</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Gravidade</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Leve</SelectItem>
                  <SelectItem value="moderate">Moderada</SelectItem>
                  <SelectItem value="severe">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="explanation">Explicação Amigável para o Paciente</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateExplanation}
                disabled={generating || !name}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar com IA
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explicação clara e acessível para o paciente (ou gere com IA)"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Esta explicação será mostrada ao paciente em linguagem simples e compreensível.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                existingDiagnosis ? "Atualizar Diagnóstico" : "Adicionar Diagnóstico"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
