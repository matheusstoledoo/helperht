import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const [searchName, setSearchName] = useState("");
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
  const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [canCreateNew, setCanCreateNew] = useState(false);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSearchName = async () => {
    const trimmed = searchName.trim();
    if (trimmed.length < 3) {
      toast({
        title: "Nome muito curto",
        description: "Digite pelo menos 3 caracteres para buscar.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email")
        .ilike("name", `%${trimmed}%`)
        .eq("role", "patient");

      if (usersError) throw usersError;

      if (usersData && usersData.length > 0) {
        const userIds = usersData.map((u) => u.id);
        const { data: patients } = await supabase
          .from("patients")
          .select("id, user_id")
          .in("user_id", userIds);

        const matched: ExistingPatient[] = (patients || []).map((p) => {
          const foundUser = usersData.find((u) => u.id === p.user_id);
          return {
            id: p.id,
            user_id: p.user_id,
            users: foundUser ? { name: foundUser.name, email: foundUser.email } : null,
          };
        }).filter((p) => p.users !== null);

        setExistingPatients(matched);
        setCanCreateNew(true);

        if (matched.length === 0) {
          toast({
            title: "Pacientes com nome similar encontrados",
            description: "Já existem pacientes com nomes similares no sistema. Verifique antes de cadastrar um novo.",
          });
        }
      } else {
        setExistingPatients([]);
        setCanCreateNew(true);
      }
      setSearchDone(true);

      if (!usersData?.length) {
        setName(trimmed);
      }
    } catch (error) {
      console.error("Error searching patients:", error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar pacientes. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!name.trim()) {
      toast({ title: "Campo obrigatório", description: "Preencha o nome completo.", variant: "destructive" });
      return;
    }
    if (!birthdate) {
      toast({ title: "Campo obrigatório", description: "Preencha a data de nascimento.", variant: "destructive" });
      return;
    }
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      toast({ title: "CPF inválido", description: "Digite um CPF válido com 11 dígitos.", variant: "destructive" });
      return;
    }
    if (!noEmail && !email.trim()) {
      toast({ title: "Campo obrigatório", description: "Preencha o e-mail ou marque 'Não possui e-mail'.", variant: "destructive" });
      return;
    }
    if (!noPhone && !phone.trim()) {
      toast({ title: "Campo obrigatório", description: "Preencha o telefone ou marque 'Não possui telefone'.", variant: "destructive" });
      return;
    }
    if (!dataCollectionConfirmed) {
      toast({ title: "Confirmação necessária", description: "Confirme que o paciente foi informado sobre a coleta de dados.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
      const patientEmail = noEmail ? `${cleanCpf}@temp.paciente.com` : email.trim();

      const { data: result, error: fnError } = await supabase.functions.invoke("create-user", {
        body: {
          email: patientEmail,
          password: tempPassword,
          name: name.trim(),
          role: "patient",
          cpf: cleanCpf,
          requesting_professional_id: user?.id,
        },
      });

      if (fnError) {
        const errorBody = result || {};
        if (errorBody.error === "email_exists" && errorBody.existingPatientId) {
          toast({
            title: "Paciente já cadastrado",
            description: "Um paciente com este e-mail já existe. Redirecionando...",
          });
          navigate(`/prof/paciente/${errorBody.existingPatientId}`);
          return;
        }
        throw new Error(errorBody.message || errorBody.error || fnError.message || "Erro ao cadastrar");
      }
      if (!result?.success) throw new Error(result?.error || "Erro ao cadastrar paciente");

      const userId = result.userId;

      if (!noPhone && phone.trim()) {
        await supabase
          .from("users")
          .update({ phone: phone.replace(/\D/g, "") })
          .eq("id", userId);
      }

      const { data: patientData } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (patientData) {
        await supabase
          .from("patients")
          .update({ birthdate })
          .eq("id", patientData.id);
      }

      await queryClient.invalidateQueries({ queryKey: ["patients-list"] });

      toast({
        title: "Paciente cadastrado",
        description: `${name} foi cadastrado com sucesso.`,
      });

      // Reset form
      setSearchName("");
      setCpf("");
      setName("");
      setBirthdate("");
      setEmail("");
      setPhone("");
      setNoEmail(false);
      setNoPhone(false);
      setDataCollectionConfirmed(false);
      setExistingPatients([]);
      setSearchDone(false);
      setCanCreateNew(false);
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Cadastrar Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name Search Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="searchName">Buscar paciente por nome *</Label>
                <div className="flex gap-2">
                  <Input
                    id="searchName"
                    value={searchName}
                    onChange={(e) => {
                      setSearchName(e.target.value);
                      setSearchDone(false);
                      setExistingPatients([]);
                      setCanCreateNew(false);
                    }}
                    placeholder="Digite o nome do paciente"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchName();
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSearchName}
                    disabled={isSearching || searchName.trim().length < 3}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Existing Patients List */}
              {searchDone && existingPatients.length > 0 && (
                <Alert className="border-primary bg-primary/5">
                  <UserCheck className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <div className="space-y-3">
                      <p className="font-medium">Pacientes encontrados:</p>
                      {existingPatients.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-background border">
                          <div>
                            <p className="font-medium text-sm">{p.users?.name}</p>
                            {p.users?.email && (
                              <p className="text-xs text-muted-foreground">{p.users.email}</p>
                            )}
                          </div>
                          <Button size="sm" onClick={() => navigate(`/prof/paciente/${p.id}`)}>
                            Abrir paciente
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          setCanCreateNew(true);
                          setName(searchName.trim());
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Cadastrar novo paciente mesmo assim
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* No results */}
              {searchDone && existingPatients.length === 0 && canCreateNew && (
                <Alert className="border-accent bg-accent/5">
                  <UserPlus className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <p>Nenhum paciente encontrado. Preencha os dados abaixo para cadastrar.</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Patient Form */}
            {searchDone && canCreateNew && (
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
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
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
