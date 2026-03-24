import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface InterestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType?: "patient" | "professional";
}

const baseSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(1, "Telefone é obrigatório").max(20),
  userType: z.enum(["patient", "professional"], { required_error: "Selecione o tipo de usuário" }),
  specialty: z.string().trim().max(100).optional(),
});

export function InterestForm({ open, onOpenChange }: InterestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedType, setSelectedType] = useState<"patient" | "professional" | "">("");
  const [specialty, setSpecialty] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const data = {
      name,
      email,
      phone,
      userType: selectedType || undefined,
      specialty: selectedType === "professional" ? specialty : undefined,
    };

    const result = baseSchema.safeParse(data);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (selectedType === "professional" && !specialty.trim()) {
      setErrors({ specialty: "Especialidade é obrigatória para profissionais" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("interested_leads").insert({
        name: result.data.name,
        phone: result.data.phone,
        email: result.data.email,
        user_type: result.data.userType,
        specialty: selectedType === "professional" ? specialty.trim() : null,
      } as any);

      if (error) throw error;

      toast({
        title: "Interesse registrado!",
        description: "Entraremos em contato em breve.",
      });
      setName("");
      setPhone("");
      setEmail("");
      setSelectedType("");
      setSpecialty("");
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving lead:", err);
      toast({
        title: "Erro",
        description: "Não foi possível registrar seu interesse. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Interesse</DialogTitle>
          <DialogDescription>
            Deixe seus dados e entraremos em contato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-2">
            <Label>Tipo de usuário *</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={selectedType === "professional" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setSelectedType("professional"); setSpecialty(""); }}
              >
                Profissional
              </Button>
              <Button
                type="button"
                variant={selectedType === "patient" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setSelectedType("patient"); setSpecialty(""); }}
              >
                Paciente
              </Button>
            </div>
            {errors.userType && <p className="text-sm text-destructive">{errors.userType}</p>}
          </div>
          {selectedType === "professional" && (
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade *</Label>
              <Input
                id="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ex: Cardiologia, Nutrição, Ortopedia..."
              />
              {errors.specialty && <p className="text-sm text-destructive">{errors.specialty}</p>}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enviar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}