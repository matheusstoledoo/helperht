import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import logo from "@/assets/logo.png";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().trim().email({ message: "Email inválido" }).max(255);
const passwordSchema = z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }).max(100);
const nameSchema = z.string().trim().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }).max(100);
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

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Professional signup state
  const [showProfessionalSignup, setShowProfessionalSignup] = useState(false);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupCpf, setSignupCpf] = useState("");
  const [signupSpecialty, setSignupSpecialty] = useState("");
  const [signupSubspecialty, setSignupSubspecialty] = useState("");
  const [signupCouncilNumber, setSignupCouncilNumber] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      emailSchema.parse(normalizedEmail);
      passwordSchema.parse(loginPassword);

      const { error } = await signIn(normalizedEmail, loginPassword);
      console.log('[Login] Result:', { error });

      if (error) {
        console.error('[Login] Error:', error.message);
        if (error.message?.includes("Email not confirmed")) {
          toast({
            title: "Email não confirmado",
            description: "Confirme seu email antes de fazer login. Verifique sua caixa de entrada.",
            variant: "destructive",
          });
        } else if (error.message?.includes("Invalid login credentials")) {
          toast({
            title: "Erro ao entrar",
            description: "Email ou senha incorretos. Verifique suas credenciais.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao entrar",
            description: error.message || "Não foi possível conectar. Tente novamente.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Bem-vindo!",
          description: "Login realizado com sucesso.",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail.trim().toLowerCase());
      cpfSchema.parse(signupCpf);
      passwordSchema.parse(signupPassword);

      if (signupPassword !== signupConfirmPassword) {
        toast({
          title: "As senhas não coincidem",
          description: "Verifique a confirmação de senha.",
          variant: "destructive",
        });
        return;
      }

      setSignupStep(2);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleProfessionalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!signupSpecialty) {
        toast({
          title: "Especialidade obrigatória",
          description: "Selecione sua especialidade para continuar.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const cleanEmail = signupEmail.trim().toLowerCase();

      // Criar via edge function (admin API garante email_confirmed e
      // sincronização entre auth.users, public.users e user_roles).
      const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          email: cleanEmail,
          password: signupPassword,
          name: signupName,
          role: 'professional',
          cpf: signupCpf.replace(/[^\d]/g, ''),
        },
      });

      if (createError || !createData?.success) {
        const msg = createData?.error === 'email_exists'
          ? 'Este email já está cadastrado. Faça login.'
          : (createData?.message || createError?.message || 'Não foi possível criar a conta.');
        toast({
          title: "Erro ao cadastrar",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      const newUserId: string | undefined = createData.userId;

      // Completar perfil do profissional (especialidade, conselho)
      if (newUserId) {
        await supabase
          .from('users')
          .update({
            specialty: signupSpecialty,
            subspecialty: signupSubspecialty.trim() || null,
            council_number: signupCouncilNumber.trim() || null,
            onboarding_completed: true,
          } as any)
          .eq('id', newUserId);
      }

      // Login automático
      const { error: signInError } = await signIn(cleanEmail, signupPassword);
      if (signInError) {
        toast({
          title: "Conta criada",
          description: "Faça login com seu e-mail e senha.",
        });
        return;
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao Helper.",
      });
      navigate('/dashboard');

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro inesperado",
          description: error instanceof Error ? error.message : "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Helper Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Helper</h1>
          <p className="text-muted-foreground">Seu companheiro clínico inteligente</p>
        </div>

        {showProfessionalSignup ? (
          <Card>
            {signupStep === 1 ? (
              <>
                <CardHeader>
                  <CardTitle>Cadastro Profissional</CardTitle>
                  <CardDescription>Etapa 1 de 2 — Dados pessoais</CardDescription>
                </CardHeader>
                <form onSubmit={handleProfessionalStep1}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="prof-name">Nome completo</Label>
                      <Input
                        id="prof-name"
                        type="text"
                        placeholder="Seu nome"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prof-email">Email</Label>
                      <Input
                        id="prof-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prof-cpf">CPF</Label>
                      <Input
                        id="prof-cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={signupCpf}
                        onChange={(e) => setSignupCpf(e.target.value)}
                        required
                        disabled={loading}
                        maxLength={14}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prof-password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="prof-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword((v) => !v)}
                          disabled={loading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          aria-label={showSignupPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prof-confirm-password">Confirmar senha</Label>
                      <div className="relative">
                        <Input
                          id="prof-confirm-password"
                          type={showSignupConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupConfirmPassword((v) => !v)}
                          disabled={loading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          aria-label={showSignupConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={loading}>
                      Continuar
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-muted-foreground"
                      onClick={() => setShowProfessionalSignup(false)}
                      disabled={loading}
                    >
                      Voltar ao login
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Qual é sua especialidade?</CardTitle>
                  <CardDescription>
                    Isso personaliza como você visualiza os dados dos seus pacientes.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleProfessionalSignup}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="prof-specialty">Especialidade principal</Label>
                      <Select value={signupSpecialty} onValueChange={setSignupSpecialty} disabled={loading}>
                        <SelectTrigger id="prof-specialty">
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
                      <Label htmlFor="prof-subspecialty">
                        {signupSpecialty === "médico"
                          ? "Área de atuação (ex: ortopedia, cardiologia, clínica geral)"
                          : signupSpecialty === "fisioterapeuta"
                          ? "Área de atuação (ex: esportiva, neurológica, ortopédica)"
                          : "Subespecialidade ou área de atuação (opcional)"}
                      </Label>
                      <Input
                        id="prof-subspecialty"
                        type="text"
                        value={signupSubspecialty}
                        onChange={(e) => setSignupSubspecialty(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prof-council">
                        {signupSpecialty === "médico" ? "CRM"
                          : signupSpecialty === "fisioterapeuta" ? "CREFITO"
                          : signupSpecialty === "nutricionista" ? "CRN"
                          : signupSpecialty === "educador físico" ? "CREF"
                          : signupSpecialty === "psicólogo" ? "CRP"
                          : "Número do conselho profissional (opcional)"}
                      </Label>
                      <Input
                        id="prof-council"
                        type="text"
                        value={signupCouncilNumber}
                        onChange={(e) => setSignupCouncilNumber(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        "Finalizar cadastro"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setSignupStep(1)}
                      disabled={loading}
                    >
                      Voltar
                    </Button>
                  </CardFooter>
                </form>
              </>
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Entrar</CardTitle>
              <CardDescription>Entre com suas credenciais para acessar sua conta</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const result = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: `${window.location.origin}/dashboard`,
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
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  Entrar ou cadastrar com Google
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Novo por aqui? Sua conta de paciente é criada automaticamente ao continuar com Google.
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground"
                  onClick={() => navigate("/forgot-password")}
                  disabled={loading}
                >
                  Esqueci minha senha
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  É profissional de saúde?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setShowProfessionalSignup(true)}
                    disabled={loading}
                  >
                    Criar conta profissional
                  </button>
                </p>
              </CardFooter>
            </form>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate("/")} disabled={loading}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
