import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  userId: string;
  onCreated: () => void;
}

export function PatientReminderForm({ patientId, userId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reminderType, setReminderType] = useState("custom");
  const [reminderTime, setReminderTime] = useState("");
  const [recurrence, setRecurrence] = useState("none");

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Informe o título do lembrete");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("patient_reminders").insert({
      patient_id: patientId,
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      reminder_type: reminderType,
      reminder_time: reminderTime || null,
      recurrence,
    });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar lembrete");
      return;
    }
    toast.success("Lembrete criado!");
    setTitle("");
    setDescription("");
    setReminderType("custom");
    setReminderTime("");
    setRecurrence("none");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo lembrete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo lembrete</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="rem-title">Título *</Label>
            <Input
              id="rem-title"
              placeholder="Ex: Tomar remédio, Beber água..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="rem-type">Tipo</Label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medication">💊 Medicação</SelectItem>
                <SelectItem value="exam">🔬 Exame</SelectItem>
                <SelectItem value="appointment">📅 Consulta</SelectItem>
                <SelectItem value="habit">🏃 Hábito</SelectItem>
                <SelectItem value="custom">📌 Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rem-time">Horário (opcional)</Label>
            <Input
              id="rem-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="rem-recurrence">Recorrência</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem recorrência</SelectItem>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rem-desc">Descrição (opcional)</Label>
            <Textarea
              id="rem-desc"
              placeholder="Algum detalhe adicional..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
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
