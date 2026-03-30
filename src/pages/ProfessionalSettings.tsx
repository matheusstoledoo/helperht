import { useState, useEffect } from "react";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Briefcase,
  Lock,
  Save,
  ChevronRight,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ProfessionalSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  
  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Redirect if not professional
  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) { return; }

      try {
        const { data: userData, error } = await supabase
          .from("users")
          .select("name, email, cpf, specialty, created_at")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (userData) {
          setName(userData.name || "");
          setEmail(userData.email || user.email || "");
          setCpf(userData.cpf || "");
          setSpecialty(userData.specialty || "");
          setCreatedAt(userData.created_at || "");
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [user]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2");
    }
    return value;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const handleSaveAll = async () => {
    if (!user) return;
    
    if (!registrationNumber.trim()) {
      toast.error("O número de registro profissional é obrigatório");
      return;
    }

    // Validate password if user is trying to change it
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
    }

    setIsSaving(true);

    try {
      // Save specialty
      const { error: updateError } = await supabase
        .from("users")
        .update({ specialty })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update password if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;
        setNewPassword("");
        setConfirmPassword("");
      }

      toast.success("Alterações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };


  if (authLoading || roleLoading) {
    return <FullPageLoading />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-6 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                    Página inicial
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Configurações</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold text-foreground mt-2">
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas informações e preferências
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Personal Data Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Informações básicas do seu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">
                CPF <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cpf"
                value={formatCPF(cpf)}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O CPF não pode ser alterado
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">
                Data de nascimento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="birthdate"
                value={birthdate ? formatDate(birthdate) : "Não informada"}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="created-at">Data de cadastro</Label>
              <Input
                id="created-at"
                value={formatDate(createdAt)}
                disabled
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Profession Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Profissão
            </CardTitle>
            <CardDescription>
              Informações sobre sua atuação profissional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Input
                id="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ex: Cardiologia, Pediatria, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration">
                Número de registro profissional <span className="text-destructive">*</span>
              </Label>
              <Input
                id="registration"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="Ex: CRM 12345/SP"
              />
              <p className="text-xs text-muted-foreground">
                Obrigatório para identificação profissional
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Mantenha sua conta segura atualizando sua senha periodicamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={isSaving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalSettings;
