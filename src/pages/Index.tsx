import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Shield, 
  Stethoscope,
  ClipboardList,
  Pill,
  FolderOpen,
  Activity,
  ArrowRight,
  Heart,
  LogIn,
  MessageCircle
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InterestForm } from "@/components/landing/InterestForm";
import { SignUpModal } from "@/components/landing/SignUpModal";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { ImageShowcase } from "@/components/landing/ImageShowcase";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [interestFormOpen, setInterestFormOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const openInterestForm = () => {
    setInterestFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation with Development Banner */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Development Banner */}
        <div className="bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-medium">
          🚧 Ferramenta em desenvolvimento
        </div>
        {/* Navigation */}
        <div className="bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="container mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Helper Logo" className="w-10 h-10 object-contain" />
                <span className="text-xl font-bold text-foreground">Helper</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="border-accent text-accent hover:bg-accent/10"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
                <Button
                  onClick={() => setSignUpOpen(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Criar conta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-32 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 pb-1 leading-tight">
                Seu companheiro
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary mt-2 pb-2">
                  clínico inteligente
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0">
                Helper é um registro de saúde personalizado que conecta profissionais e pacientes, 
                organizando diagnósticos, tratamentos e documentos em um só lugar.
              </p>
              <div className="mb-8 max-w-xl mx-auto lg:mx-0 p-4 rounded-xl border border-accent/30 bg-accent/5">
                <p className="text-sm text-foreground font-medium mb-2">
                  ⚕️ Helper <span className="text-accent">não é um prontuário</span> — é um complemento ao prontuário:
                </p>
                <p className="text-sm text-foreground">
                  <strong>Para você, profissional,</strong> agregue mais valor à sua consulta, aumente a taxa de retenção dos seus pacientes e reduza tempo procurando dados em meio a longos textos.
                </p>
                <p className="text-sm text-foreground mt-2">
                  <strong>Para você, paciente,</strong> tenha controle e autonomia sobre seus dados de saúde. Pare de ficar carregando documentos e perdendo informações sobre aquilo que você tem de mais importante: seu bem-estar.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="bg-accent hover:bg-accent/90 text-white font-semibold px-8 group"
                  onClick={() => openInterestForm()}
                >
                  Tenho interesse
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-3xl blur-3xl" />
              <div className="relative bg-card border border-border rounded-3xl p-8 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-accent/5 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Diagnósticos</p>
                      <p className="text-sm text-muted-foreground">Histórico completo organizado</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Pill className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Tratamentos</p>
                      <p className="text-sm text-muted-foreground">Acompanhamento em tempo real</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-green-500/5 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Documentos</p>
                      <p className="text-sm text-muted-foreground">Exames e laudos centralizados</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* Quick Features Grid */}
      <section className="py-20 px-6 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Acompanhe seus pacientes em um só lugar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa para gestão do cuidado longitudinal em saúde
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Heart className="w-8 h-8 text-accent" />}
              title="Cuidado Longitudinal"
              description="Tome decisões a partir de todo o histórico do paciente"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-accent" />}
              title="Privacidade Primeiro"
              description="Segurança de nível empresarial protegendo dados sensíveis"
            />
            <FeatureCard
              icon={<ClipboardList className="w-8 h-8 text-accent" />}
              title="Estrutura Follow-up"
              description="Trilhas de acompanhamento pós-consulta estruturadas e automatizadas"
            />
            <FeatureCard
              icon={<Activity className="w-8 h-8 text-accent" />}
              title="Dados Longitudinais"
              description="Organize e visualize dados clínicos ao longo do tempo de forma integrada"
            />
            <FeatureCard
              icon={<Heart className="w-8 h-8 text-accent" />}
              title="Experiência do Paciente"
              description="Melhore o engajamento e satisfação do paciente com acompanhamento contínuo"
            />
          </div>

          {/* Image Showcase Carousel */}
          <ImageShowcase />
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* For Professionals Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Stethoscope className="w-4 h-4" />
              Para Profissionais
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Otimize sua prática clínica
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tenha acesso rápido ao histórico completo dos seus pacientes e tome decisões mais informadas
            </p>
          </div>

          <div className="space-y-20">
            <FeatureSection
              icon={<ClipboardList className="w-24 h-24 text-accent" />}
              title="Gestão de Diagnósticos"
              description="Registre e acompanhe todos os diagnósticos dos seus pacientes com histórico completo de evolução."
              features={[
                "Acompanhe o histórico de diagnósticos do paciente",
              ]}
              gradient="from-accent/10 to-accent/5"
            />

            <FeatureSection
              icon={<Pill className="w-24 h-24 text-primary" />}
              title="Controle de Tratamentos"
              description="Acompanhe medicamentos, terapias e procedimentos com detalhes sobre dosagem e frequência."
              features={[
                "Acompanhe medicamentos já utilizados e suas doses",
                "Utilize o histórico para aperfeiçoar os tratamentos e evitar repetição",
              ]}
              reversed
              gradient="from-primary/10 to-primary/5"
            />

            <FeatureSection
              icon={<FolderOpen className="w-24 h-24 text-green-600" />}
              title="Central de Documentos"
              description="Organize exames, laudos e prescrições em um repositório seguro e de fácil acesso."
              features={[
                "Organize seus documentos em um só lugar e evite carregar papéis ou perder exames",
                "Categorias: imagens, laboratório, prescrições e relatórios",
                "Upload por profissionais e pacientes",
                "Busca e filtros avançados"
              ]}
              gradient="from-green-500/10 to-green-500/5"
            />

            <FeatureSection
              icon={<Activity className="w-24 h-24 text-accent" />}
              title="Trilhas de Acompanhamento"
              description="Mantenha um contato próximo com seus pacientes."
              features={[
                "Acompanhe com frequência e regularidade",
                "Saiba o que está acontecendo de forma prática",
                "Faça o seguimento das suas condutas de forma rápida",
                "Saiba quais pacientes precisam de mais atenção",
              ]}
              reversed
              gradient="from-accent/10 to-accent/5"
            />
          </div>

          <div className="text-center mt-16">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white font-semibold px-12"
              onClick={() => openInterestForm()}
            >
              Tenho interesse
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* For Patients Section */}
      <section className="py-24 px-6 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <img src={logo} alt="Logo" className="w-4 h-4 object-contain" />
              Para Pacientes
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Sua saúde nas suas mãos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Acesse seu histórico médico completo, acompanhe tratamentos e mantenha todos os documentos organizados
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <PatientFeatureCard
              icon={<Users className="w-10 h-10 text-accent" />}
              title="Meus Profissionais"
              description="Visualize todos os profissionais que cuidam da sua saúde e acesse o histórico de cada um"
            />
            <PatientFeatureCard
              icon={<Activity className="w-10 h-10 text-accent" />}
              title="Meus Diagnósticos"
              description="Entenda suas condições de saúde com explicações claras e acompanhe a evolução"
            />
            <PatientFeatureCard
              icon={<Pill className="w-10 h-10 text-accent" />}
              title="Meus Tratamentos"
              description="Acompanhe medicamentos e terapias prescritas com detalhes de dosagem"
            />
            <PatientFeatureCard
              icon={<FolderOpen className="w-10 h-10 text-accent" />}
              title="Meus Documentos"
              description="Evite carregar papéis e perder exames, tenha tudo em um só lugar"
            />
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="bg-accent hover:bg-accent/90 text-white font-semibold px-12"
              onClick={() => openInterestForm()}
            >
              Tenho interesse
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent" />
            <div className="relative p-12 lg:p-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-white">
                Pronto para transformar o cuidado em saúde?
              </h2>
              <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
                Junte-se a profissionais e pacientes que estão revolucionando a forma de gerenciar saúde de forma integrada e inteligente.
              </p>
              <div className="flex justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 font-semibold px-8"
                  onClick={() => openInterestForm()}
                >
                  Registrar Interesse
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="text-muted-foreground mb-2">Ainda não é o momento certo?</p>
          <h3 className="text-xl lg:text-2xl font-semibold mb-4 text-foreground">
            Nos conte quais funcionalidades ajudariam você a acompanhar seus pacientes
          </h3>
          <p className="text-muted-foreground mb-6">
            Sua opinião é fundamental para construirmos uma ferramenta que realmente faça sentido para você.
          </p>
          <Button 
            variant="outline"
            size="lg"
            className="font-semibold"
            onClick={() => window.open("https://forms.gle/dN8vo8mfM4Dgy4vt8", "_blank", "noopener,noreferrer")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar Sugestão
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Helper Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-foreground">Helper</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Helper. Cuidado longitudinal.
            </p>
          </div>
        </div>
      </footer>

      {/* Interest Form Modal */}
      <InterestForm 
        open={interestFormOpen} 
        onOpenChange={setInterestFormOpen}
      />

      {/* Sign Up Modal */}
      <SignUpModal
        open={signUpOpen}
        onOpenChange={setSignUpOpen}
      />
    </div>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) => {
  return (
    <div className="group p-6 rounded-2xl bg-card border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300">
      <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground text-center">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground text-center">
        {description}
      </p>
    </div>
  );
};

const PatientFeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) => {
  return (
    <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-all duration-300">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;