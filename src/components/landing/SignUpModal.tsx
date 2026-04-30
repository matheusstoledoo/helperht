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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export function SignUpModal({ open, onOpenChange }: SignUpModalProps) {
  const { toast } = useToast();
  const { signIn, getActiveRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<RoleChoice>("");
  const [step, setStep] = useState<1 | 2>(1);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpf, setCpf] = useState("");

  // Professional step 2 fields
  const [specialty, setSpecialty] = useState("");
  const [subspecialty, setSubspecialty] = useState("");
  const [councilNumber, setCouncilNumber] = useState("");
  const [councilState, setCouncilState] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setRole("");
    setStep(1);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCpf("");
    setSpecialty("");
    setSubspecialty("");
    setCouncilNumber("");
    setCouncilState("");
    setErrors({});
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const validateBaseFields = (): boolean => {
    const baseResult = baseSchema.safeParse({ name, email, password, confirmPassword });
    if (!baseResult.success) {
      const fieldErrors: Record<string, string> = {};
      baseResult.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Professional step 1 → advance to step 2
    if (role === "professional" && step === 1) {
      if (!validateBaseFields()) return;
      setStep(2);
      return;
    }

    // Patient (single-step) — validate all
    if (role === "patient") {
      if (!validateBaseFields()) return;
      const cpfResult = cpfSchema.safeParse(cpf);
      if (!cpfResult.success) {
        setErrors({ cpf: cpfResult.error.errors[0].message });
        return;
      }
    }

    // Professional step 2 — validate specialty/council/state
    if (role === "professional" && step === 2) {
      if (!specialty) {
        toast({ title: "Especialidade obrigatória", description: "Selecione sua especialidade.", variant: "destructive" });
        return;
      }
      if (!councilNumber.trim()) {
        toast({ title: "Número do conselho obrigatório", description: "Informe o número do seu registro.", variant: "destructive" });
        return;
      }
      if (!councilState.trim()) {
        toast({ title: "Estado de registro obrigatório", description: "Informe o estado do registro.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const cleanCpf = role === "patient" ? cpf.replace(/[^\d]/g, '') : "";

      const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          email: normalizedEmail,
          password,
          name,
          role,
          cpf: cleanCpf,
        },
      });

      // FunctionsHttpError: tentar ler o body para extrair o erro semântico
      let errorPayload: any = createData;
      if (createError && (createError as any).context?.json) {
        try { errorPayload = await (createError as any).context.json(); } catch { /* noop */ }
      } else if (createError && (createError as any).context?.text) {
        try { errorPayload = JSON.parse(await (createError as any).context.text()); } catch { /* noop */ }
      }

      if (createError || !errorPayload?.success) {
        const msg = errorPayload?.error === 'email_exists'
          ? 'Este email já está cadastrado. Faça login.'
          : (errorPayload?.message || createError?.message || 'Não foi possível criar a conta.');
        toast({ title: "Erro ao cadastrar", description: msg, variant: "destructive" });
        return;
      }

      // Atualizar perfil profissional na etapa 2
      if (role === 'professional' && createData.userId) {
        await supabase
          .from('users')
          .update({
            specialty,
            subspecialty: subspecialty.trim() || null,
            council_number: `${councilNumber.trim()}/${councilState}`,
            onboarding_completed: true,
          } as any)
          .eq('id', createData.userId);
      }

      // Login automático
      const { error: signInError } = await signIn(normalizedEmail, password);

      if (signInError) {
        toast({ title: "Conta criada", description: "Faça login para continuar." });
        handleOpenChange(false);
        return;
      }

      toast({ title: "Cadastro realizado!", description: "Redirecionando..." });
      handleOpenChange(false);

      await new Promise((resolve) => setTimeout(resolve, 800));
      const resolvedRole = await getActiveRole(createData?.userId);
      navigate(resolvedRole === 'professional' ? '/dashboard' : '/pac/inicio');
    } catch {
      toast({ title: "Erro", description: "Não foi possível criar a conta. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const councilLabel =
    specialty === "médico" ? "CRM *"
    : specialty === "fisioterapeuta" ? "CREFITO *"
    : specialty === "nutricionista" ? "CRN *"
    : specialty === "educador físico" ? "CREF *"
    : specialty === "psicólogo" ? "CRP *"
    : "Número do conselho profissional *";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar conta</DialogTitle>
          <DialogDescription>
            {!role
              ? "Selecione o tipo de conta que deseja criar."
              : role === "professional"
              ? step === 1
                ? "Etapa 1 de 2 — Dados pessoais."
                : "Etapa 2 de 2 — Dados profissionais."
              : "Preencha seus dados de paciente."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 0: Role selection */}
        {!role && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <button
              type="button"
              onClick={() => { setRole("professional"); setStep(1); }}
              className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Stethoscope className="w-10 h-10 text-primary" />
              <span className="font-semibold text-foreground">Profissional</span>
              <span className="text-xs text-muted-foreground text-center">Médico, nutricionista, etc.</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole("patient"); setStep(1); }}
              className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 transition-all"
            >
              <Heart className="w-10 h-10 text-accent" />
              <span className="font-semibold text-foreground">Paciente</span>
              <span className="text-xs text-muted-foreground text-center">Acompanhe sua saúde</span>
            </button>
          </div>
        )}

        {/* Form */}
        {role && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (role === "professional" && step === 2) {
                  setStep(1);
                } else {
                  setRole("");
                  setStep(1);
                }
                setErrors({});
              }}
              className="mb-1 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>

            {/* Step 1 fields (paciente single-step + profissional etapa 1) */}
            {(role === "patient" || (role === "professional" && step === 1)) && (
              <>
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
                  <Label htmlFor="signup-cpf">
                    CPF {role === "professional" ? "(opcional)" : "*"}
                  </Label>
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
              </>
            )}

            {/* Step 2: profissional */}
            {role === "professional" && step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="signup-specialty">Especialidade *</Label>
                  <Select value={specialty} onValueChange={setSpecialty} disabled={loading}>
                    <SelectTrigger id="signup-specialty">
                      <SelectValue placeholder="Selecione sua especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="médico">Médico</SelectItem>
                      <SelectItem value="fisioterapeuta">Fisioterapeuta</SelectItem>
                      <SelectItem value="nutricionista">Nutricionista</SelectItem>
                      <SelectItem value="educador físico">Educador físico</SelectItem>
                      <SelectItem value="psicólogo">Psicólogo</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-subspecialty">
                    {specialty === "médico"
                      ? "Área de atuação (ex: ortopedia, cardiologia)"
                      : specialty === "fisioterapeuta"
                      ? "Área de atuação (ex: esportiva, neurológica)"
                      : "Subespecialidade ou área de atuação (opcional)"}
                  </Label>
                  <Input
                    id="signup-subspecialty"
                    value={subspecialty}
                    onChange={(e) => setSubspecialty(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-council">{councilLabel}</Label>
                  <Input
                    id="signup-council"
                    value={councilNumber}
                    onChange={(e) => setCouncilNumber(e.target.value)}
                    placeholder="Ex: 12345"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-council-state">Estado de registro *</Label>
                  <Select value={councilState} onValueChange={setCouncilState} disabled={loading}>
                    <SelectTrigger id="signup-council-state">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {role === "professional" && step === 1 ? "Continuar" : "Criar conta"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
