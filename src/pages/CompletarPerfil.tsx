import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

export default function CompletarPerfil() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [specialty, setSpecialty] = useState("");
  const [subspecialty, setSubspecialty] = useState("");
  const [councilNumber, setCouncilNumber] = useState("");

  // Se não estiver logado, voltar ao login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Se já tiver specialty, pular essa tela
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("role, specialty")
        .eq("id", user.id)
        .maybeSingle();

      if (!data || data.role !== "professional" || (data.specialty && data.specialty.trim() !== "")) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setChecking(false);
    };
    if (user) checkProfile();
  }, [user, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!specialty) {
      toast({
        title: "Especialidade obrigatória",
        description: "Selecione sua especialidade para continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("users")
      .update({
        specialty,
        subspecialty: subspecialty.trim() || null,
        council_number: councilNumber.trim() || null,
        onboarding_completed: true,
      } as any)
      .eq("id", user.id);
    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Perfil atualizado!", description: "Bem-vindo ao Helper." });
    navigate("/dashboard", { replace: true });
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Helper Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Helper</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Complete seu perfil</CardTitle>
            <CardDescription>
              Adicione sua especialidade para personalizar sua experiência.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSave}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cp-specialty">Especialidade principal</Label>
                <Select value={specialty} onValueChange={setSpecialty} disabled={loading}>
                  <SelectTrigger id="cp-specialty">
                    <SelectValue placeholder="Selecione sua especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="médico">Médico</SelectItem>
                    <SelectItem value="fisioterapeuta">Fisioterapeuta</SelectItem>
                    <SelectItem value="nutricionista">Nutricionista</SelectItem>
                    <SelectItem value="educador físico">Educador físico</SelectItem>
                    <SelectItem value="psicólogo">Psicólogo</SelectItem>
                    <SelectItem value="enfermeiro">Enfermeiro</SelectItem>
                    <SelectItem value="farmacêutico">Farmacêutico</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cp-subspecialty">
                  {specialty === "médico"
                    ? "Área de atuação (ex: ortopedia, cardiologia, clínica geral)"
                    : specialty === "fisioterapeuta"
                    ? "Área de atuação (ex: esportiva, neurológica, ortopédica)"
                    : "Subespecialidade ou área de atuação (opcional)"}
                </Label>
                <Input
                  id="cp-subspecialty"
                  type="text"
                  value={subspecialty}
                  onChange={(e) => setSubspecialty(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cp-council">
                  {specialty === "médico" ? "CRM"
                    : specialty === "fisioterapeuta" ? "CREFITO"
                    : specialty === "nutricionista" ? "CRN"
                    : specialty === "educador físico" ? "CREF"
                    : specialty === "psicólogo" ? "CRP"
                    : specialty === "enfermeiro" ? "COREN"
                    : specialty === "farmacêutico" ? "CRF"
                    : "Número do conselho profissional (opcional)"}
                </Label>
                <Input
                  id="cp-council"
                  type="text"
                  value={councilNumber}
                  onChange={(e) => setCouncilNumber(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
