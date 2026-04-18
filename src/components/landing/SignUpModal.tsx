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
import { Loader2, Stethoscope, Heart, ArrowLeft } from "lucide-react";
import { lovable } from "@/integrations/lovable";

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
  const { signUp } = useAuth();
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

    // Validate CPF
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
      const { error } = await signUp(email, password, name, role as "patient" | "professional", cpf);

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Erro ao cadastrar",
            description: "Este email já está cadastrado. Faça login.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao cadastrar",
            description: error.message,
            variant: "destructive",
          });
        }
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

            {role === "patient" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const result = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: `${window.location.origin}/pac/dashboard`,
                    });
                    if (result.error) {
                      toast({
                        title: "Erro ao entrar com Google",
                        description: (result.error as any)?.message || "Tente novamente.",
                        variant: "destructive",
                      });
                      setLoading(false);
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  Continuar com Google
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Sua conta de paciente é criada automaticamente. Você poderá completar o CPF depois.
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou cadastre com e-mail</span>
                  </div>
                </div>
              </>
            )}
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
