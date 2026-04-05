import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  sport_type?: string;
}

interface StravaImportProps {
  userId: string;
  onSelectActivity: (data: {
    workoutType: string;
    duration: string;
    notes: string;
  }) => void;
}

const STRAVA_TYPE_MAP: Record<string, string> = {
  Run: "corrida",
  Ride: "ciclismo",
  Swim: "natacao",
  WeightTraining: "musculacao",
  Crossfit: "funcional",
  Yoga: "yoga",
  Walk: "outro",
  Hike: "outro",
};

export default function StravaImport({ userId, onSelectActivity }: StravaImportProps) {
  const [connected, setConnected] = useState(false);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("strava") === "connected") {
      setConnected(true);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("strava");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [userId]);

  useEffect(() => {
    if (connected) {
      fetchActivities();
    }
  }, [connected]);

  const checkConnection = async () => {
    setCheckingConnection(true);
    const { data } = await supabase
      .from("strava_tokens")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setConnected(true);
    }
    setCheckingConnection(false);
  };

  const handleConnect = () => {
    window.location.href = `https://abhaduqjqbxamjxcvsng.supabase.co/functions/v1/strava-auth?state=${userId}`;
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `https://abhaduqjqbxamjxcvsng.supabase.co/functions/v1/strava-activities`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!res.ok) throw new Error("Falha ao buscar atividades");

      const data = await res.json();
      if (Array.isArray(data)) {
        setActivities(data);
      }
    } catch (err) {
      toast.error("Erro ao buscar atividades do Strava");
    } finally {
      setLoading(false);
    }
  };

  const handleUseActivity = (activity: StravaActivity) => {
    const workoutType = STRAVA_TYPE_MAP[activity.type] || "outro";
    const durationMin = Math.round(activity.moving_time / 60);
    const distanceKm = (activity.distance / 1000).toFixed(2);
    const dateStr = format(new Date(activity.start_date_local), "dd/MM/yyyy", { locale: ptBR });

    onSelectActivity({
      workoutType,
      duration: String(durationMin),
      notes: `🏃 Importado do Strava: ${activity.name}\n📏 Distância: ${distanceKm} km\n📅 Data: ${dateStr}`,
    });

    toast.success("Dados do treino preenchidos!");
  };

  if (checkingConnection) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#FC4C02">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        Importar do Strava
      </h4>

      {!connected ? (
        <Button
          onClick={handleConnect}
          className="w-full text-white font-medium"
          style={{ backgroundColor: "#FC4C02" }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Conectar com Strava
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mr-1.5" />
              Strava conectado
            </Badge>
            <Button size="sm" variant="ghost" onClick={fetchActivities} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Atualizar"}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma atividade encontrada
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {activities.map((activity) => (
                <Card key={activity.id} className="hover:border-orange-300 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {activity.type}
                          </Badge>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {(activity.distance / 1000).toFixed(2)} km
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {Math.round(activity.moving_time / 60)} min
                          </span>
                          <span>
                            {format(new Date(activity.start_date_local), "dd/MM", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={() => handleUseActivity(activity)}
                      >
                        Usar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
