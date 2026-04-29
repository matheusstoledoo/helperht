import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import logo from "@/assets/logo.png";

const emailSchema = z.string().trim().email({ message: "Email inválido" }).max(255);
const passwordSchema = z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }).max(100);

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading, getActiveRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      getActiveRole().then((role) => {
        navigate(role === 'patient' ? '/pac/inicio' : '/dashboard');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

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

      if (error) {
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
        const role = await getActiveRole();
        navigate(role === 'patient' ? '/pac/inicio' : '/dashboard');
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Helper Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Helper</h1>
          <p className="text-muted-foreground">Seu companheiro clínico inteligente</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar sua conta</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
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
                Não tem conta?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => navigate("/")}
                  disabled={loading}
                >
                  Criar conta
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>

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
