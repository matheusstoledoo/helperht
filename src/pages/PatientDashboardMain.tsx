import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Stethoscope, 
  Pill, 
  FileText, 
  ChevronRight
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

export default function PatientDashboardMain() {
  const navigate = useNavigate();

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
  ];

  return (
    <PatientLayout title="" subtitle="" showHeader={true}>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {dashboardCards.map((card) => (
            <Card
              key={card.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 active:scale-[0.98]"
              onClick={() => navigate(card.route)}
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