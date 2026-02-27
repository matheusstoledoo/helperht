import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InterestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: "patient" | "professional";
}

export function InterestForm({ open, onOpenChange, userType }: InterestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedType, setSelectedType] = useState<string>(
    userType === "patient" ? "paciente" : "profissional"
  );
  const [specialty, setSpecialty] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
    setSelectedType(userType === "patient" ? "paciente" : "profissional");
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedSpecialty = specialty.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !selectedType) {
      toast.error("Preencha os campos obrigatórios: Nome, Email, Telefone e Tipo de usuário.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Informe um email válido.");
      return;
    }

    if (trimmedName.length > 200 || trimmedEmail.length > 255 || trimmedPhone.length > 30 || trimmedSpecialty.length > 200) {
      toast.error("Um ou mais campos excedem o tamanho máximo permitido.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("interested_leads").insert({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || null,
        user_type: selectedType,
        specialty: selectedType === "profissional" ? trimmedSpecialty || null : null,
      });

      if (error) throw error;

      toast.success("Interesse registrado com sucesso! Entraremos em contato.");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao registrar interesse. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar interesse</DialogTitle>
          <DialogDescription>
            Preencha seus dados para que possamos entrar em contato
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input
              id="lead-name"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-email">Email *</Label>
            <Input
              id="lead-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">Telefone *</Label>
            <Input
              id="lead-phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de usuário *</Label>
            <Select value={selectedType} onValueChange={setSelectedType} disabled={submitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profissional">Profissional</SelectItem>
                <SelectItem value="paciente">Paciente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedType === "profissional" && (
            <div className="space-y-1.5">
              <Label htmlFor="lead-specialty">Especialidade</Label>
              <Input
                id="lead-specialty"
                placeholder="Ex: Cardiologia, Psicologia..."
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                maxLength={200}
                disabled={submitting}
              />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-accent hover:bg-accent/90 text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {submitting ? "Enviando..." : "Registrar interesse"}
            {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
