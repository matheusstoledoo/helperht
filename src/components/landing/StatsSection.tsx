import { Activity, FileText, Users } from "lucide-react";

const stats = [
  {
    icon: FileText,
    value: "100%",
    label: "Histórico digitalizado e organizado",
  },
  {
    icon: Users,
    value: "360°",
    label: "Visão completa do paciente",
  },
  {
    icon: Activity,
    value: "24/7",
    label: "Acesso ao seu histórico de saúde",
  },
];

export function StatsSection() {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-primary to-secondary">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center text-white">
              <div className="flex justify-center mb-4">
                <stat.icon className="w-10 h-10 text-white/80" />
              </div>
              <div className="text-4xl lg:text-5xl font-bold mb-2">
                {stat.value}
              </div>
              <div className="text-sm lg:text-base text-white/80">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
