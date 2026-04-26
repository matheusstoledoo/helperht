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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const NewPatient = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dataCollectionConfirmed, setDataCollectionConfirmed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreatePatient = async () => {
    if (!name.trim()) {
      toast({ title: "Campo obrigatório", description: "Preencha o nome completo.", variant: "destructive" });
      return;
    }
    if (!dataCollectionConfirmed) {
      toast({ title: "Confirmação necessária", description: "Confirme que o paciente foi informado sobre a coleta de dados.", variant: "destructive" });
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");

    setIsSubmitting(true);
    try {
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
      const uniqueSuffix = Date.now().toString(36);
      const patientEmail = email.trim() || `paciente_${uniqueSuffix}@temp.paciente.com`;

      const { data: result, error: fnError } = await supabase.functions.invoke("create-user", {
        body: {
          email: patientEmail,
          password: tempPassword,
          name: name.trim(),
          role: "patient",
          cpf: cleanCpf || null,
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

      if (phone.trim()) {
        await supabase
          .from("users")
          .update({ phone: phone.replace(/\D/g, "") })
          .eq("id", userId);
      }

      if (birthdate) {
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
      }

      await queryClient.invalidateQueries({ queryKey: ["patients-list"] });

      toast({
        title: "Paciente cadastrado",
        description: `${name} foi cadastrado com sucesso.`,
      });

      // Reset form
      setCpf("");
      setName("");
      setBirthdate("");
      setEmail("");
      setPhone("");
      setDataCollectionConfirmed(false);
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
          <CardContent className="space-y-4">
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
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate">Data de nascimento</Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
              />
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewPatient;
