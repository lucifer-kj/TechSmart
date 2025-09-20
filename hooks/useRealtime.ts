"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RealtimeConnectionStatus = "connecting" | "connected" | "disconnected";

type PostgresChangeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export type RealtimeConfig = {
  channelName?: string;
  schema?: string;
  table: string;
  event?: PostgresChangeEvent;
  filter?: string; // e.g. "client_uuid=eq.abc"
};

export function useRealtime<TRecord = unknown>(
  config: RealtimeConfig,
  onChange: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new?: TRecord;
    old?: TRecord;
  }) => void
) {
  const { table, schema = "public", event = "*", filter, channelName } = config;
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const name = channelName ?? `${table}-realtime`;
    const channel = supabase
      .channel(name)
      .on(
        "postgres_changes" as any,
        { event, schema, table, filter },
        (payload: {
          eventType: "INSERT" | "UPDATE" | "DELETE";
          new?: unknown;
          old?: unknown;
        }) => {
          if (!isMounted.current) return;
          onChange({
            eventType: payload.eventType,
            new: payload.new as TRecord | undefined,
            old: payload.old as TRecord | undefined,
          });
        }
      )
      .subscribe((s) => {
        if (!isMounted.current) return;
        // Status can be: SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR
        if (s === "SUBSCRIBED") setStatus("connected");
        else if (s === "CLOSED" || s === "TIMED_OUT" || s === "CHANNEL_ERROR") setStatus("disconnected");
        else setStatus("connecting");
      });

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      setStatus("disconnected");
    };
    // We intentionally exclude onChange from deps to avoid resubscribing per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, table, schema, event, filter, channelName]);

  return { status } as const;
}


