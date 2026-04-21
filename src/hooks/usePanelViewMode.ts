import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Modo de visualização dos painéis profissionais.
 * - 'specialty': prioriza/destaca painéis conforme a especialidade do profissional
 * - 'all': mostra todos os painéis sem destaque/reordenação
 *
 * A preferência é persistida em `users.panel_view_mode` e compartilhada entre
 * todas as telas da área logada via um event emitter em memória, garantindo
 * consistência sem refetch.
 */
export type PanelViewMode = "specialty" | "all";

type Listener = (mode: PanelViewMode, specialty: string) => void;

// Cache global em memória (compartilhado entre todos os hooks ativos)
let cachedMode: PanelViewMode | null = null;
let cachedSpecialty: string = "";
let cachedUserId: string | null = null;
let inFlightFetch: Promise<void> | null = null;

const listeners = new Set<Listener>();

const emit = () => {
  if (cachedMode == null) return;
  for (const fn of listeners) fn(cachedMode, cachedSpecialty);
};

const fetchOnce = async (userId: string) => {
  if (cachedUserId === userId && cachedMode != null) return;
  if (inFlightFetch) return inFlightFetch;
  inFlightFetch = (async () => {
    const { data } = await supabase
      .from("users")
      .select("specialty, panel_view_mode")
      .eq("id", userId)
      .maybeSingle();
    cachedUserId = userId;
    cachedSpecialty = ((data as any)?.specialty as string) || "";
    cachedMode = ((data as any)?.panel_view_mode as PanelViewMode) || "specialty";
    emit();
  })();
  try {
    await inFlightFetch;
  } finally {
    inFlightFetch = null;
  }
};

export function usePanelViewMode() {
  const { user } = useAuth();
  const [mode, setMode] = useState<PanelViewMode>(cachedMode ?? "specialty");
  const [specialty, setSpecialty] = useState<string>(cachedSpecialty);
  const [loading, setLoading] = useState<boolean>(cachedMode == null);

  useEffect(() => {
    if (!user) return;
    const listener: Listener = (m, s) => {
      setMode(m);
      setSpecialty(s);
      setLoading(false);
    };
    listeners.add(listener);

    // Se mudou de usuário, invalida cache
    if (cachedUserId && cachedUserId !== user.id) {
      cachedMode = null;
      cachedSpecialty = "";
      cachedUserId = null;
    }

    if (cachedMode != null && cachedUserId === user.id) {
      setMode(cachedMode);
      setSpecialty(cachedSpecialty);
      setLoading(false);
    } else {
      fetchOnce(user.id);
    }

    return () => {
      listeners.delete(listener);
    };
  }, [user]);

  const setPanelViewMode = useCallback(
    async (next: PanelViewMode) => {
      if (!user) return;
      const previous = cachedMode ?? "specialty";
      // Atualização otimista global
      cachedMode = next;
      emit();
      const { error } = await supabase
        .from("users")
        .update({ panel_view_mode: next } as any)
        .eq("id", user.id);
      if (error) {
        console.error("Erro ao salvar preferência de visualização:", error);
        toast.error("Não foi possível salvar sua preferência");
        cachedMode = previous;
        emit();
      }
    },
    [user]
  );

  const toggle = useCallback(() => {
    const next: PanelViewMode = (cachedMode ?? mode) === "all" ? "specialty" : "all";
    return setPanelViewMode(next);
  }, [mode, setPanelViewMode]);

  return {
    mode,
    showAll: mode === "all",
    specialty,
    loading,
    setPanelViewMode,
    toggle,
  };
}
