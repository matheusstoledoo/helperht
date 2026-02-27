import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

interface RealtimeSubscriptionOptions<T> {
  table: string;
  filter?: string;
  onInsert?: (record: T) => void;
  onUpdate?: (record: T) => void;
  onDelete?: (record: T) => void;
  showToasts?: boolean;
}

export const useRealtimeSubscription = <T>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  showToasts = true,
}: RealtimeSubscriptionOptions<T>) => {
  const channelName = `${table}-changes${filter ? `-${filter}` : ""}`;

  const handleInsert = useCallback(
    (payload: any) => {
      console.log(`[Realtime] New ${table}:`, payload.new);
      if (onInsert) {
        onInsert(payload.new as T);
      }
      if (showToasts) {
        toast.success(`New ${table.slice(0, -1)} added`, {
          description: "Data updated in real-time",
        });
      }
    },
    [table, onInsert, showToasts]
  );

  const handleUpdate = useCallback(
    (payload: any) => {
      console.log(`[Realtime] Updated ${table}:`, payload.new);
      if (onUpdate) {
        onUpdate(payload.new as T);
      }
      if (showToasts) {
        toast.info(`${table.slice(0, -1)} updated`, {
          description: "Changes synced automatically",
        });
      }
    },
    [table, onUpdate, showToasts]
  );

  const handleDelete = useCallback(
    (payload: any) => {
      console.log(`[Realtime] Deleted ${table}:`, payload.old);
      if (onDelete) {
        onDelete(payload.old as T);
      }
      if (showToasts) {
        toast.error(`${table.slice(0, -1)} deleted`, {
          description: "Changes synced automatically",
        });
      }
    },
    [table, onDelete, showToasts]
  );

  useEffect(() => {
    console.log(`[Realtime] Setting up subscription for ${table}${filter ? ` (${filter})` : ""}`);
    
    let channel: RealtimeChannel = supabase.channel(channelName);

    const setupChannel = channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: table,
          filter: filter,
        },
        handleInsert
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: table,
          filter: filter,
        },
        handleUpdate
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: table,
          filter: filter,
        },
        handleDelete
      );

    setupChannel.subscribe((status) => {
      console.log(`[Realtime] ${table} subscription status:`, status);
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] Successfully subscribed to ${table}`);
      } else if (status === "CHANNEL_ERROR") {
        console.error(`[Realtime] Error subscribing to ${table}`);
      }
    });

    return () => {
      console.log(`[Realtime] Cleaning up ${table} subscription`);
      supabase.removeChannel(channel);
    };
  }, [table, filter, channelName, handleInsert, handleUpdate, handleDelete]);
};
