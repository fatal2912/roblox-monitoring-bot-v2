import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import type { MonitorEvent } from "@rbm/shared";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function readSnapshot(sourceType: string, sourceId: string) {
  const { data, error } = await supabase.from("monitor_snapshots")
    .select("payload").eq("source_type", sourceType).eq("source_id", sourceId).maybeSingle();
  if (error) throw error;
  return data?.payload as Record<string, any> | undefined;
}

export async function writeSnapshot(sourceType: string, sourceId: string, payload: object) {
  const { error } = await supabase.from("monitor_snapshots").upsert({
    source_type: sourceType, source_id: sourceId, payload, updated_at: new Date().toISOString()
  }, { onConflict: "source_type,source_id" });
  if (error) throw error;
}

export async function recordEvent(event: MonitorEvent) {
  const { error } = await supabase.from("monitor_events").insert({
    event_type: event.event_type, source_type: event.source_type, source_id: event.source_id,
    title: event.title, summary: event.summary, details: event.details, occurred_at: event.occurred_at
  });
  if (error) throw error;
}
