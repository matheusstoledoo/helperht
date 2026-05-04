import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell } from "lucide-react";

interface NewItem {
  id: string;
  created_at: string;
  notes: string | null;
  professional_id: string;
  professional_name: string | null;
  specialty: string | null;
}

export const NewSinceLastVisit = ({ patientId }: { patientId: string }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<NewItem[] | null>(null);
  const [hadLastSeen, setHadLastSeen] = useState<boolean>(false);

  useEffect(() => {
    if (!user || !patientId) return;
    let cancelled = false;

    (async () => {
      const { data: lastSeen } = await supabase
        .from("professional_patient_last_seen")
        .select("last_seen_at")
        .eq("professional_id", user.id)
        .eq("patient_id", patientId)
        .maybeSingle();

      const lastSeenAt = lastSeen?.last_seen_at ?? null;

      if (!cancelled) setHadLastSeen(!!lastSeenAt);

      if (lastSeenAt) {
        const { data: consults } = await supabase
          .from("consultations")
          .select("id, created_at, notes, professional_id")
          .eq("patient_id", patientId)
          .neq("professional_id", user.id)
          .gt("created_at", lastSeenAt)
          .order("created_at", { ascending: false })
          .limit(5);

        const list = consults || [];
        let enriched: NewItem[] = [];
        if (list.length > 0) {
          const profIds = Array.from(new Set(list.map((c: any) => c.professional_id)));
          const { data: users } = await supabase
            .from("users")
            .select("id, name, specialty")
            .in("id", profIds);
          const userMap = new Map((users || []).map((u: any) => [u.id, u]));
          enriched = list.map((c: any) => ({
            id: c.id,
            created_at: c.created_at,
            notes: c.notes,
            professional_id: c.professional_id,
            professional_name: userMap.get(c.professional_id)?.name ?? null,
            specialty: userMap.get(c.professional_id)?.specialty ?? null,
          }));
        }
        if (!cancelled) setItems(enriched);
      } else {
        if (!cancelled) setItems([]);
      }

      // Upsert last_seen after loading
      await supabase
        .from("professional_patient_last_seen")
        .upsert(
          {
            professional_id: user.id,
            patient_id: patientId,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "professional_id,patient_id" }
        );
    })();

    return () => {
      cancelled = true;
    };
  }, [user, patientId]);

  if (!hadLastSeen) return null;
  if (!items || items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Bell className="h-5 w-5" />
          Novidades desde sua última visita
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="flex flex-col gap-1 border-l-2 border-primary/40 pl-3">
            <div className="flex flex-wrap items-center gap-2">
              {it.specialty && <Badge variant="secondary">{it.specialty}</Badge>}
              <span className="text-sm font-medium">{it.professional_name || "Profissional"}</span>
              <span className="text-xs text-muted-foreground">
                · há {formatDistanceToNow(new Date(it.created_at), { locale: ptBR })}
              </span>
            </div>
            {it.notes && (
              <p className="text-sm text-muted-foreground">
                {it.notes.slice(0, 100)}
                {it.notes.length > 100 ? "…" : ""}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
