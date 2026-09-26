import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: trackedAsins } = await supabase
    .from("tracked_asins")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const { data: alerts } = await supabase
    .from("alerts")
    .select("*, tracked_asins(asin, product_title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Dernier relevé par ASIN suivi
  const asinIds = (trackedAsins ?? []).map((a) => a.id);
  const { data: snapshots } = asinIds.length
    ? await supabase
        .from("price_snapshots")
        .select("*")
        .in("tracked_asin_id", asinIds)
        .order("checked_at", { ascending: false })
    : { data: [] };

  type SnapshotRow = NonNullable<typeof snapshots>[number];
  const latestByAsin = new Map<string, SnapshotRow>();
  for (const s of snapshots ?? []) {
    if (!latestByAsin.has(s.tracked_asin_id)) {
      latestByAsin.set(s.tracked_asin_id, s);
    }
  }

  return (
    <DashboardClient
      email={user.email ?? ""}
      profile={profile}
      trackedAsins={trackedAsins ?? []}
      latestByAsin={Object.fromEntries(latestByAsin)}
      alerts={alerts ?? []}
    />
  );
}
