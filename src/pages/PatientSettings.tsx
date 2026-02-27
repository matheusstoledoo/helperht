import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Lock, 
  CreditCard,
  Shield,
  Users,
  Eye,
  EyeOff,
  CheckCircle,
  UserX,
  Settings,
  User,
  Heart,
  Phone,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PatientLayout from "@/components/patient/PatientLayout";

const PatientSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [shareDataBetweenProfessionals, setShareDataBetweenProfessionals] = useState(true);

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBloodType, setProfileBloodType] = useState("");
  const [profileAllergies, setProfileAllergies] = useState("");
  const [profileEmergencyName, setProfileEmergencyName] = useState("");
  const [profileEmergencyPhone, setProfileEmergencyPhone] = useState("");

  // Fetch user data
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ["user-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch patient data
  const { data: patient } = useQuery({
    queryKey: ["patient-by-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch professionals with access (derived from consultations)
  const { data: professionals, isLoading: loadingProfessionals } = useQuery({
    queryKey: ["patient-professionals-access", patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          professional_id,
          consultation_date,
          professional:users!consultations_professional_id_fkey(id, name, email)
        `)
        .eq("patient_id", patient.id)
        .order("consultation_date", { ascending: false });
      
      if (error) throw error;

      // Get unique professionals with their last consultation date
      const professionalsMap = new Map();
      data?.forEach((consultation) => {
        if (consultation.professional && !professionalsMap.has(consultation.professional.id)) {
          professionalsMap.set(consultation.professional.id, {
            ...consultation.professional,
            lastConsultation: consultation.consultation_date,
          });
        }
      });

      return Array.from(professionalsMap.values());
    },
    enabled: !!patient?.id,
  });

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "Não cadastrado";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  return (
    <PatientLayout 
      title="Configurações" 
      subtitle="Gerencie suas informações e preferências"
      breadcrumb={
        <nav className="flex items-center text-sm text-muted-foreground">
          <a href="/pac/dashboard" className="hover:text-foreground transition-colors">
            Página inicial
          </a>
          <span className="mx-2">›</span>
          <span className="text-foreground font-medium">Configurações</span>
        </nav>
      }
    >
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Perfil
              </CardTitle>
              {!editingProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProfileName(userData?.name || "");
                    setProfileBloodType(patient?.blood_type || "");
                    setProfileAllergies((patient?.allergies || []).join(", "));
                    setProfileEmergencyName(patient?.emergency_contact_name || "");
                    setProfileEmergencyPhone(patient?.emergency_contact_phone || "");
                    setEditingProfile(true);
                  }}
                >
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await supabase.from("users").update({ name: profileName }).eq("id", user!.id);
                        if (patient) {
                          await supabase.from("patients").update({
                            blood_type: profileBloodType || null,
                            allergies: profileAllergies ? profileAllergies.split(",").map(a => a.trim()).filter(Boolean) : null,
                            emergency_contact_name: profileEmergencyName || null,
                            emergency_contact_phone: profileEmergencyPhone || null,
                          }).eq("id", patient.id);
                        }
                        queryClient.invalidateQueries({ queryKey: ["user-data"] });
                        queryClient.invalidateQueries({ queryKey: ["patient-by-user"] });
                        toast({ title: "Perfil atualizado!" });
                        setEditingProfile(false);
                      } catch {
                        toast({ title: "Erro ao salvar", variant: "destructive" });
                      }
                    }}
                  >
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                </div>
              )}
            </div>
            <CardDescription>Seus dados pessoais e informações de saúde</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingUser ? (
              <Skeleton className="h-20 w-full" />
            ) : editingProfile ? (
              <>
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo sanguíneo</Label>
                  <Select value={profileBloodType} onValueChange={setProfileBloodType}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Alergias (separadas por vírgula)</Label>
                  <Input value={profileAllergies} onChange={(e) => setProfileAllergies(e.target.value)} placeholder="Ex: Dipirona, Amendoim" />
                </div>
                <Separator />
                <p className="text-sm font-medium flex items-center gap-1"><Phone className="h-4 w-4" /> Contato de emergência</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input value={profileEmergencyName} onChange={(e) => setProfileEmergencyName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input value={profileEmergencyPhone} onChange={(e) => setProfileEmergencyPhone(e.target.value)} />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nome</span>
                  <span className="text-sm font-medium">{userData?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tipo sanguíneo</span>
                  <span className="text-sm font-medium">{patient?.blood_type || "—"}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Alergias</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {patient?.allergies?.length ? patient.allergies.map((a, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                    )) : <span className="text-sm text-muted-foreground">Nenhuma</span>}
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Contato de emergência</span>
                  <span className="text-sm font-medium">
                    {patient?.emergency_contact_name
                      ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || "sem tel."})`
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Access Data Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Dados de Acesso
            </CardTitle>
            <CardDescription>
              Informações da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingUser ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted/50"
                    />
                    <Badge variant="outline" className="shrink-0">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                      Verificado
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Alterar Senha
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password" className="text-sm">
                        Nova senha
                      </Label>
                      <Input
                        id="new-password"
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password" className="text-sm">
                        Confirmar nova senha
                      </Label>
                      <Input
                        id="confirm-password"
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                      />
                    </div>

                    <Button
                      onClick={handlePasswordChange}
                      disabled={!newPassword || !confirmPassword || isChangingPassword}
                      className="w-full"
                    >
                      {isChangingPassword ? "Alterando..." : "Alterar Senha"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* CPF Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Documento
            </CardTitle>
            <CardDescription>
              CPF vinculado à sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUser ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cpf"
                    value={formatCPF(userData?.cpf)}
                    disabled
                    className="bg-muted/50 font-mono"
                  />
                  {userData?.cpf && (
                    <Badge variant="outline" className="shrink-0 bg-green-50 dark:bg-green-950/30 border-green-200">
                      <Shield className="h-3 w-3 mr-1 text-green-600" />
                      Verificado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  O CPF não pode ser alterado após a verificação. Entre em contato com o suporte se necessário.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Authorization Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Autorizações
            </CardTitle>
            <CardDescription>
              Controle quem pode acessar seus dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Share data toggle */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-1">
                <Label htmlFor="share-data" className="font-medium">
                  Compartilhar dados entre profissionais
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permitir que profissionais vejam informações inseridas por outros profissionais que te acompanham.
                </p>
              </div>
              <Switch
                id="share-data"
                checked={shareDataBetweenProfessionals}
                onCheckedChange={(checked) => {
                  setShareDataBetweenProfessionals(checked);
                  toast({
                    title: checked ? "Compartilhamento ativado" : "Compartilhamento desativado",
                    description: checked 
                      ? "Profissionais poderão ver dados de outros profissionais."
                      : "Cada profissional verá apenas seus próprios dados.",
                  });
                }}
              />
            </div>

            <Separator />

            {/* Professionals with access */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Profissionais com acesso</Label>
              </div>

              {loadingProfessionals ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : !professionals || professionals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum profissional com acesso registrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {professionals.map((prof) => (
                    <div
                      key={prof.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {prof.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{prof.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Último atendimento:{" "}
                            {format(new Date(prof.lastConsultation), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          toast({
                            title: "Revogar acesso",
                            description: `Para revogar o acesso de ${prof.name}, entre em contato com o suporte.`,
                          });
                        }}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Revogar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Profissionais que já realizaram atendimentos podem visualizar seus dados de saúde. 
                Entre em contato com o suporte para remover um profissional.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <Settings className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                toast({
                  title: "Excluir conta",
                  description: "Para excluir sua conta, entre em contato com o suporte.",
                });
              }}
            >
              Excluir minha conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </PatientLayout>
  );
};

export default PatientSettings;
