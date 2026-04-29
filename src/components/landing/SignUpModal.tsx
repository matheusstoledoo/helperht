import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Stethoscope, Heart, ArrowLeft } from "lucide-react";

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const cpfSchema = z.string()
  .trim()
  .regex(/^[0-9]{11}$|^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$/, {
    message: "CPF deve ter 11 dígitos (apenas números ou formato XXX.XXX.XXX-XX)"
  })
  .refine(
    (cpf) => {
      const cleanCpf = cpf.replace(/[^\d]/g, '');
      return !/^(\d)\1{10}$/.test(cleanCpf);
    },
    { message: "CPF inválido" }
  );

const baseSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type RoleChoice = "" | "patient" | "professional";

export function SignUpModal({ open, onOpenChange }: SignUpModalProps) {
  const { toast } = useToast();
  const { signIn, getActiveRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<RoleChoice>("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [professionalRegistry, setProfessionalRegistry] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setRole("");
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCpf("");
    setProfessionalRegistry("");
    setErrors({});
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate base fields
    const baseResult = baseSchema.safeParse({ name, email, password, confirmPassword });
    if (!baseResult.success) {
      const fieldErrors: Record<string, string> = {};
      baseResult.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Validate CPF (mandatory for all roles)
    const cpfResult = cpfSchema.safeParse(cpf);
    if (!cpfResult.success) {
      setErrors({ cpf: cpfResult.error.errors[0].message });
      return;
    }

    // Validate professional registry
    if (role === "professional" && !professionalRegistry.trim()) {
      setErrors({ professionalRegistry: "Registro profissional é obrigatório" });
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const cleanCpf = cpf.replace(/[^\d]/g, '');

      const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          email: normalizedEmail,
          password,
          name,
          role,
          cpf: cleanCpf,
        },
      });

      if (createError || !createData?.success) {
        const msg = createData?.error === 'email_exists'
          ? 'Este email já está cadastrado. Faça login.'
          : (createData?.message || createError?.message || 'Não foi possível criar a conta.');
        toast({ title: "Erro ao cadastrar", description: msg, variant: "destructive" });
        return;
      }

      // Login automático após criar conta
      const { error: signInError } = await signIn(normalizedEmail, password);

      if (signInError) {
        toast({
          title: "Conta criada",
          description: "Faça login para continuar.",
        });
        handleOpenChange(false);
        return;
      }

      toast({
        title: "Cadastro realizado!",
        description: "Redirecionando...",
      });

      handleOpenChange(false);
      navigate(role === "patient" ? "/pac/dashboard" : "/dashboard");
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível criar a conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar conta</DialogTitle>
          <DialogDescription>
            {!role
              ? "Selecione o tipo de conta que deseja criar."
              : role === "professional"
              ? "Preencha seus dados de profissional de saúde."
              : "Preencha seus dados de paciente."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Role selection */}
        {!role && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <button
              type="button"
              onClick={() => setRole("professional")}
              className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Stethoscope className="w-10 h-10 text-primary" />
              <span className="font-semibold text-foreground">Profissional</span>
              <span className="text-xs text-muted-foreground text-center">Médico, nutricionista, etc.</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("patient")}
              className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 transition-all"
            >
              <Heart className="w-10 h-10 text-accent" />
              <span className="font-semibold text-foreground">Paciente</span>
              <span className="text-xs text-muted-foreground text-center">Acompanhe sua saúde</span>
            </button>
          </div>
        )}

        {/* Step 2: Form */}
        {role && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setRole(""); setErrors({}); }}
              className="mb-1 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>

            <div className="space-y-2">
              <Label htmlFor="signup-name">Nome completo *</Label>
              <Input
                id="signup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">E-mail *</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={loading}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-cpf">CPF *</Label>
              <Input
                id="signup-cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                disabled={loading}
                maxLength={14}
              />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
            </div>

            {role === "professional" && (
              <div className="space-y-2">
                <Label htmlFor="signup-registry">Registro profissional *</Label>
                <Input
                  id="signup-registry"
                  value={professionalRegistry}
                  onChange={(e) => setProfessionalRegistry(e.target.value)}
                  placeholder="Ex: CRM 12345/SP, CRN 6789"
                  disabled={loading}
                />
                {errors.professionalRegistry && (
                  <p className="text-sm text-destructive">{errors.professionalRegistry}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="signup-password">Senha *</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-confirm">Confirmar senha *</Label>
              <Input
                id="signup-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar conta
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
