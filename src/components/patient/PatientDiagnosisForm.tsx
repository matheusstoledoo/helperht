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

interface Props {
  patientId: string;
  onCreated: () => void;
}

export function PatientDiagnosisForm({ patientId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do diagnóstico");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("diagnoses").insert({
      patient_id: patientId,
      name: name.trim(),
      icd_code: icdCode.trim() || null,
      diagnosed_date: date,
      public_notes: notes.trim() || null,
      status: "active",
    });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
      return;
    }
    toast.success("Diagnóstico cadastrado!");
    setName("");
    setIcdCode("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar diagnóstico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo diagnóstico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="diag-name">Nome do diagnóstico *</Label>
            <Input
              id="diag-name"
              placeholder="Ex: Hipertensão arterial"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="diag-icd">Código CID (opcional)</Label>
            <Input
              id="diag-icd"
              placeholder="Ex: I10"
              value={icdCode}
              onChange={(e) => setIcdCode(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="diag-date">Data do diagnóstico</Label>
            <Input
              id="diag-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="diag-notes">Observações (opcional)</Label>
            <Textarea
              id="diag-notes"
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
