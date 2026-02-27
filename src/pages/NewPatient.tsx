import { useState } from "react";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, UserPlus, Loader2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ExistingPatient {
  id: string;
  user_id: string;
  users: {
    name: string;
    email: string | null;
  } | null;
}

const NewPatient = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [noEmail, setNoEmail] = useState(false);
  const [noPhone, setNoPhone] = useState(false);
  const [dataCollectionConfirmed, setDataCollectionConfirmed] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingPatient, setExistingPatient] = useState<ExistingPatient | null>(null);
  const [cpfChecked, setCpfChecked] = useState(false);
  const [canCreateNew, setCanCreateNew] = useState(false);

  // Format CPF as user types
  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  // Format phone as user types
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
    // Reset search state when CPF changes
    setCpfChecked(false);
    setExistingPatient(null);
    setCanCreateNew(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSearchCpf = async () => {
    const cleanCpf = cpf.replace(/\D/g, "");
    
    if (cleanCpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Search for existing user with this CPF
      const { data: userData, error } = await supabase
        .from("users")
        .select("id, name, email, cpf")
        .eq("cpf", cleanCpf)
        .maybeSingle();

      if (error) throw error;

      if (userData) {
        // User exists, find the patient record
        const { data: patientData } = await supabase
          .from("patients")
          .select(`
            id,
            user_id,
            users (name, email)
          `)
          .eq("user_id", userData.id)
          .maybeSingle();

        if (patientData) {
          setExistingPatient(patientData);
          setCanCreateNew(false);
        } else {
          // User exists but no patient record - rare case
          setExistingPatient(null);
          setCanCreateNew(true);
        }
      } else {
        // No user found, allow creation
        setExistingPatient(null);
        setCanCreateNew(true);
      }
      
      setCpfChecked(true);
    } catch (error) {
      console.error("Error searching CPF:", error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar o CPF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o nome completo.",
        variant: "destructive",
      });
      return;
    }

    if (!birthdate) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha a data de nascimento.",
        variant: "destructive",
      });
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    // Validate email if required
    if (!noEmail && !email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o e-mail ou marque 'Não possui e-mail'.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone if required
    if (!noPhone && !phone.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o telefone ou marque 'Não possui telefone'.",
        variant: "destructive",
      });
      return;
    }

    // Validate data collection confirmation
    if (!dataCollectionConfirmed) {
      toast({
        title: "Confirmação necessária",
        description: "Por favor, confirme que o paciente foi informado sobre a coleta de dados.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
      const patientEmail = noEmail ? `${cleanCpf}@temp.paciente.com` : email.trim();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: patientEmail,
        password: tempPassword,
        options: {
          data: {
            name: name.trim(),
            role: "patient",
            cpf: cleanCpf,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update user with phone if provided
        if (!noPhone && phone.trim()) {
          await supabase
            .from("users")
            .update({ phone: phone.replace(/\D/g, "") })
            .eq("id", authData.user.id);
        }

        // Get the created patient record and update birthdate
        const { data: patientData } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (patientData) {
          await supabase
            .from("patients")
            .update({ birthdate })
            .eq("id", patientData.id);

          toast({
            title: "Paciente cadastrado",
            description: `${name} foi cadastrado com sucesso.`,
          });

          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("Error creating patient:", error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Não foi possível cadastrar o paciente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if not authenticated or not professional
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  if (!roleLoading && !isProfessional && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  if (authLoading || roleLoading) {
    return <FullPageLoading />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Breadcrumbs */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Página inicial</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Cadastro de paciente</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Cadastrar Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CPF Search Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF do paciente *</Label>
                <div className="flex gap-2">
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSearchCpf}
                    disabled={isSearching || cpf.replace(/\D/g, "").length !== 11}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar CPF
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Existing Patient Alert */}
              {cpfChecked && existingPatient && (
                <Alert className="border-primary bg-primary/5">
                  <UserCheck className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <div className="space-y-2">
                      <p className="font-medium">
                        Paciente já cadastrado: {existingPatient.users?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Você pode começar a atendê-lo.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/prof/paciente/${existingPatient.id}`)}
                      >
                        Abrir paciente
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* New Patient Alert */}
              {cpfChecked && canCreateNew && (
                <Alert className="border-accent bg-accent/5">
                  <UserPlus className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <p>CPF não encontrado. Preencha os dados para cadastrar um novo paciente.</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Patient Form - Only show if CPF checked and can create */}
            {cpfChecked && canCreateNew && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthdate">Data de nascimento *</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                  />
                </div>

                {/* Email field */}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail {!noEmail && "*"}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    disabled={noEmail}
                    className={noEmail ? "bg-muted" : ""}
                  />
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="noEmail"
                      checked={noEmail}
                      onCheckedChange={(checked) => {
                        setNoEmail(checked as boolean);
                        if (checked) setEmail("");
                      }}
                    />
                    <Label htmlFor="noEmail" className="text-sm font-normal cursor-pointer">
                      Não possui e-mail
                    </Label>
                  </div>
                </div>

                {/* Phone field */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone {!noPhone && "*"}</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    disabled={noPhone}
                    className={noPhone ? "bg-muted" : ""}
                  />
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="noPhone"
                      checked={noPhone}
                      onCheckedChange={(checked) => {
                        setNoPhone(checked as boolean);
                        if (checked) setPhone("");
                      }}
                    />
                    <Label htmlFor="noPhone" className="text-sm font-normal cursor-pointer">
                      Não possui telefone
                    </Label>
                  </div>
                </div>

                {/* Data collection confirmation */}
                <div className="flex items-start space-x-2 pt-4 p-4 rounded-lg bg-muted/50 border">
                  <Checkbox
                    id="dataCollection"
                    checked={dataCollectionConfirmed}
                    onCheckedChange={(checked) => setDataCollectionConfirmed(checked as boolean)}
                  />
                  <Label htmlFor="dataCollection" className="text-sm font-normal cursor-pointer leading-relaxed">
                    Confirmo que o paciente foi informado sobre a coleta e tratamento de seus dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD).
                  </Label>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleCreatePatient}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Salvar novo paciente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewPatient;
