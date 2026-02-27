import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTreatmentExplanation } from "@/hooks/useTreatmentExplanation";

interface TreatmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  existingTreatment?: {
    id: string;
    name: string;
    description?: string;
    status: string;
    dosage?: string;
    frequency?: string;
    explanation_text?: string;
  };
}

export const TreatmentForm = ({ open, onOpenChange, patientId, existingTreatment }: TreatmentFormProps) => {
  const [name, setName] = useState(existingTreatment?.name || "");
  const [description, setDescription] = useState(existingTreatment?.description || "");
  const [status, setStatus] = useState(existingTreatment?.status || "active");
  const [dosage, setDosage] = useState(existingTreatment?.dosage || "");
  const [frequency, setFrequency] = useState(existingTreatment?.frequency || "");
  const [explanation, setExplanation] = useState(existingTreatment?.explanation_text || "");
  const [saving, setSaving] = useState(false);
  
  const { generateExplanation, generating } = useTreatmentExplanation();

  const handleGenerateExplanation = async () => {
    if (!name) {
      toast.error("Por favor, insira o nome do tratamento primeiro");
      return;
    }

    const generatedExplanation = await generateExplanation({
      name,
      description,
      dosage,
      frequency,
      isModification: !!existingTreatment,
    });

    if (generatedExplanation) {
      setExplanation(generatedExplanation);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const treatmentData = {
        patient_id: patientId,
        name,
        description: description || null,
        status: status as "active" | "completed" | "discontinued" | "pending",
        dosage: dosage || null,
        frequency: frequency || null,
        explanation_text: explanation || null,
      };

      if (existingTreatment) {
        const { error } = await supabase
          .from("treatments")
          .update(treatmentData)
          .eq("id", existingTreatment.id);

        if (error) throw error;
        toast.success("Tratamento atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("treatments")
          .insert(treatmentData);

        if (error) throw error;
        toast.success("Tratamento adicionado com sucesso");
      }

      onOpenChange(false);
      // Reset form
      setName("");
      setDescription("");
      setStatus("active");
      setDosage("");
      setFrequency("");
      setExplanation("");
    } catch (error) {
      console.error("Error saving treatment:", error);
      toast.error("Falha ao salvar tratamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingTreatment ? "Modificar Tratamento" : "Adicionar Novo Tratamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Tratamento *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Metformina"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição ou indicação"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage">Dosagem</Label>
              <Input
                id="dosage"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="ex: 850mg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Input
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="ex: 2x/dia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="discontinued">Descontinuado</SelectItem>
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
                    {existingTreatment ? "Explicar Alteração" : "Gerar com IA"}
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explicação clara para o paciente (ou gere com IA)"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {existingTreatment 
                ? "Explique o que mudou e por que esta modificação é importante."
                : "Explique o que este tratamento faz e por que está sendo prescrito."}
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
                existingTreatment ? "Atualizar Tratamento" : "Adicionar Tratamento"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
