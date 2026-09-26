"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  plan: string;
  asin_limit: number;
};

type TrackedAsin = {
  id: string;
  asin: string;
  marketplace: string;
  product_title: string | null;
  product_image: string | null;
};

type Snapshot = {
  price: number | null;
  currency: string | null;
  in_stock: boolean | null;
  checked_at: string;
};

type Alert = {
  id: string;
  message: string;
  alert_type: string;
  created_at: string;
  tracked_asins: { asin: string; product_title: string | null } | null;
};

export default function DashboardClient({
  email,
  profile,
  trackedAsins,
  latestByAsin,
  alerts,
}: {
  email: string;
  profile: Profile | null;
  trackedAsins: TrackedAsin[];
  latestByAsin: Record<string, Snapshot>;
  alerts: Alert[];
}) {
  const router = useRouter();
  const [asin, setAsin] = useState("");
  const [marketplace, setMarketplace] = useState("amazon.fr");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/asins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asin, marketplace }),
    });
    const json = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setAsin("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch("/api/asins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const usedSlots = trackedAsins.length;
  const limit = profile?.asin_limit ?? 3;
  const isFree = (profile?.plan ?? "free") === "free";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">AmzWatch</h1>
          <p className="text-sm text-slate-400">{email}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm rounded-full bg-slate-900 px-3 py-1 text-slate-300">
            Plan {isFree ? "Gratuit" : "Pro"} · {usedSlots}/{limit} ASIN
          </span>
          {isFree && (
            <a
              href="/api/checkout"
              className="text-sm rounded-lg bg-orange-500 px-4 py-2 font-semibold hover:bg-orange-600 transition"
            >
              Passer en Pro
            </a>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-4">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
          <input
            type="text"
            required
            placeholder="ASIN (ex: B08N5WRWNW)"
            value={asin}
            onChange={(e) => setAsin(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg bg-slate-900 border border-slate-700 px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
          />
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-2 text-sm"
          >
            <option value="amazon.fr">amazon.fr</option>
            <option value="amazon.de">amazon.de</option>
            <option value="amazon.it">amazon.it</option>
            <option value="amazon.es">amazon.es</option>
            <option value="amazon.com">amazon.com</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-orange-500 px-6 py-2 font-semibold hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? "Ajout..." : "Suivre cet ASIN"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      <section className="max-w-5xl mx-auto px-6 py-6">
        <h2 className="text-lg font-semibold mb-4">ASIN suivis</h2>
        {trackedAsins.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Aucun ASIN suivi pour le moment. Ajoutez-en un ci-dessus.
          </p>
        ) : (
          <div className="grid gap-3">
            {trackedAsins.map((t) => {
              const snap = latestByAsin[t.id];
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {t.product_title || t.asin}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t.asin} · {t.marketplace}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {snap && (
                      <div className="text-right">
                        <p className="font-semibold">
                          {snap.price != null ? `${snap.price} ${snap.currency}` : "—"}
                        </p>
                        <p
                          className={`text-xs ${
                            snap.in_stock ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {snap.in_stock ? "En stock" : "Rupture"}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-slate-500 hover:text-red-400 transition text-sm"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-6 py-6">
        <h2 className="text-lg font-semibold mb-4">Alertes récentes</h2>
        {alerts.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Pas encore d&apos;alerte. La première vérification a lieu dans les 2 heures.
          </p>
        ) : (
          <div className="grid gap-2">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-lg bg-slate-900 px-4 py-3 text-sm">
                <span className="text-slate-300">{a.message}</span>
                <span className="ml-2 text-slate-600">
                  {new Date(a.created_at).toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
