import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { markDataUpdated } from "@/lib/healthDataEvents";

interface Props {
  patientId: string;
  onCreated: () => void;
}

export function PatientTreatmentForm({ patientId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do tratamento");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("treatments").insert({
      patient_id: patientId,
      name: name.trim(),
      dosage: dosage.trim() || null,
      frequency: frequency.trim() || null,
      start_date: startDate,
      end_date: endDate || null,
      public_notes: notes.trim() || null,
      status: "active",
    });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar tratamento");
      return;
    }
    toast.success("Tratamento cadastrado!");
    markDataUpdated();
    setName("");
    setDosage("");
    setFrequency("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setNotes("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar tratamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo tratamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="treat-name">Nome do tratamento *</Label>
            <Input
              id="treat-name"
              placeholder="Ex: Losartana 50mg"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="treat-dosage">Dosagem</Label>
              <Input
                id="treat-dosage"
                placeholder="Ex: 50mg"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="treat-freq">Frequência</Label>
              <Input
                id="treat-freq"
                placeholder="Ex: 1x ao dia"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="treat-start">Início</Label>
              <Input
                id="treat-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="treat-end">Fim (opcional)</Label>
              <Input
                id="treat-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="treat-notes">Observações (opcional)</Label>
            <Textarea
              id="treat-notes"
              placeholder="Alguma informação adicional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
