import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Stethoscope, 
  Pill, 
  FileText, 
  ChevronRight,
  Apple,
  Dumbbell,
  Target,
  Activity,
  Clock,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getGreeting } from "@/lib/utils";

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

const RECENT_ACCESS_KEY = "pac_recent_access";

export default function PatientDashboardMain() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.name) setUserName(data.name);
    };
    fetchName();
  }, [user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_ACCESS_KEY);
      if (raw) setRecentIds(JSON.parse(raw));
    } catch {
      setRecentIds([]);
    }
  }, []);

  const dashboardCards: DashboardCard[] = [
    {
      id: "professionals",
      title: "Profissionais de Saúde",
      description: "Veja os profissionais que cuidam de você",
      icon: <Users className="h-8 w-8 sm:h-10 sm:w-10" />,
      route: `/pac/profissionais`,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    },
    {
      id: "diagnoses",
      title: "Diagnósticos",
      description: "Acompanhe seus diagnósticos atuais e histórico",
      icon: <Stethoscope className="h-8 w-8 sm:h-10 sm:w-10" />,
      route: `/pac/diagnosticos`,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
    },
    {
      id: "treatments",
      title: "Tratamentos",
      description: "Veja seus tratamentos e medicações",
      icon: <Pill className="h-8 w-8 sm:h-10 sm:w-10" />,
      route: `/pac/tratamentos`,
      color: "bg-green-500/10 text-green-600 dark:text-green-400"
    },
    {
      id: "documents",
      title: "Exames e Documentos",
      description: "Acesse exames, receitas e outros documentos",
      icon: <FileText className="h-8 w-8 sm:h-10 sm:w-10" />,
      route: `/pac/documentos`,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    },
    {
      id: "nutrition",
      title: "Nutrição",
      description: "Plano alimentar e registro de suplementação",
      icon: <Apple className="h-8 w-8 sm:h-10 sm:w-10" />,
      route: `/pac/nutricao`,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    },
    {
      id: "training",
      title: "Treinos",
      description: "Planos de treino e registro de atividades",
      icon: <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10" />,
      route: `/pac/treinos`,
      color: "bg-sky-500/10 text-sky-600 dark:text-sky-400"
    },
    {
      id: "goals-insights",
      title: "Objetivos & Insights",
      description: "Defina metas e receba análises inteligentes de IA",
      icon: <Target className="h-8 w-8 sm:h-10 sm:w-10" />,
      route: `/pac/objetivos`,
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400"
    },
    {
      id: "vitals",
      title: "Sinais Vitais",
      description: "Registre pressão, glicemia, peso e sintomas",
      icon: <Activity className="h-8 w-8 sm:h-10 sm:w-10" />,
      route: `/pac/sinais-vitais`,
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400"
    },
  ];

  const trackAccess = (id: string) => {
    try {
      const next = [id, ...recentIds.filter((x) => x !== id)].slice(0, 3);
      localStorage.setItem(RECENT_ACCESS_KEY, JSON.stringify(next));
      setRecentIds(next);
    } catch {
      // ignore
    }
  };

  const handleNavigate = (card: DashboardCard) => {
    trackAccess(card.id);
    navigate(card.route);
  };

  const recentCards = recentIds
    .map((id) => dashboardCards.find((c) => c.id === id))
    .filter((c): c is DashboardCard => Boolean(c));

  return (
    <PatientLayout title="" subtitle="" showHeader={true}>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Saudação personalizada */}
        <div className="mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            {getGreeting(userName)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            O que você gostaria de acessar hoje?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {dashboardCards.map((card) => (
            <Card
              key={card.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 active:scale-[0.98]"
              onClick={() => handleNavigate(card)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-2 sm:p-3 rounded-xl ${card.color}`}>
                    {card.icon}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3 sm:mt-4">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>

    </PatientLayout>
  );
}
