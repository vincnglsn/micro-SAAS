import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tâche quotidienne : relève prix / stock / avis de chaque ASIN suivi,
// enregistre un instantané, détecte les changements, rédige un résumé avec
// Claude et envoie une alerte email (si RESEND_API_KEY est configurée).

const RAINFOREST_URL = "https://api.rainforestapi.com/request";
const PRICE_THRESHOLD_PCT = 3; // variation de prix minimale pour alerter
const RATING_THRESHOLD = 0.2; // baisse/hausse de note minimale pour alerter

type Snapshot = {
  price: number | null;
  currency: string | null;
  in_stock: boolean | null;
  rating: number | null;
  review_count: number | null;
  title: string | null;
  image: string | null;
};

type Change = { type: "price" | "stock" | "rating"; old: string; new: string; text: string };

async function fetchProduct(asin: string, marketplace: string): Promise<Snapshot | null> {
  const params = new URLSearchParams({
    api_key: process.env.RAINFOREST_API_KEY!,
    type: "product",
    amazon_domain: marketplace || "amazon.fr",
    asin,
  });

  const res = await fetch(`${RAINFOREST_URL}?${params.toString()}`, { cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.product) {
    console.error(
      `[check-prices] Rainforest KO pour ${asin}: HTTP ${res.status} - ${json?.request_info?.message ?? json?.message ?? "pas de produit dans la réponse"}`
    );
    return null;
  }
  const p = json.product;
  const offer = p.buybox_winner;
  return {
    price: offer?.price?.value ?? null,
    currency: offer?.price?.currency ?? "EUR",
    in_stock: offer ? offer.availability?.type !== "out_of_stock" : false,
    rating: p.rating ?? null,
    review_count: p.ratings_total ?? null,
    title: p.title ?? null,
    image: p.main_image?.link ?? null,
  };
}

function detectChanges(
  prev: { price: number | null; in_stock: boolean | null; rating: number | null },
  cur: Snapshot
): Change[] {
  const changes: Change[] = [];
  const cc = cur.currency ?? "EUR";

  if (prev.price != null && cur.price != null && prev.price > 0) {
    const pct = ((cur.price - prev.price) / prev.price) * 100;
    if (Math.abs(pct) >= PRICE_THRESHOLD_PCT) {
      changes.push({
        type: "price",
        old: `${prev.price} ${cc}`,
        new: `${cur.price} ${cc}`,
        text: `Prix ${pct < 0 ? "en baisse" : "en hausse"} de ${Math.abs(pct).toFixed(1)} % (${prev.price} → ${cur.price} ${cc})`,
      });
    }
  }
  if (prev.in_stock != null && cur.in_stock != null && prev.in_stock !== cur.in_stock) {
    changes.push({
      type: "stock",
      old: prev.in_stock ? "en stock" : "rupture",
      new: cur.in_stock ? "en stock" : "rupture",
      text: cur.in_stock ? "Le produit est de nouveau en stock" : "Le produit est en rupture de stock",
    });
  }
  if (prev.rating != null && cur.rating != null && Math.abs(cur.rating - prev.rating) >= RATING_THRESHOLD) {
    changes.push({
      type: "rating",
      old: String(prev.rating),
      new: String(cur.rating),
      text: `Note moyenne ${cur.rating < prev.rating ? "en baisse" : "en hausse"} (${prev.rating} → ${cur.rating})`,
    });
  }
  return changes;
}

// Résumé court rédigé par Claude ; retombe sur un texte simple si l'API échoue.
async function summarize(title: string, changes: Change[]): Promise<string> {
  const fallback = `${title} : ${changes.map((c) => c.text).join(" ; ")}.`;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content:
              `Tu aides un vendeur Amazon francophone à surveiller un concurrent. ` +
              `Produit : "${title}". Changements détectés : ${changes.map((c) => c.text).join(" ; ")}. ` +
              `Écris en français un résumé de 2 phrases maximum : ce qui a changé et ce que cela peut signifier ` +
              `pour le vendeur (sans exagérer, sans jargon marketing, sans emoji).`,
          },
        ],
      }),
    });
    const json = await res.json();
    const text = json?.content?.[0]?.text?.trim();
    if (!res.ok || !text) {
      console.error(`[check-prices] Claude KO: HTTP ${res.status} ${JSON.stringify(json?.error ?? "")}`);
      return fallback;
    }
    return text;
  } catch (e) {
    console.error("[check-prices] Claude erreur:", e);
    return fallback;
  }
}

async function sendEmail(to: string, title: string, summary: string, asin: string, marketplace: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const url = `https://www.${marketplace || "amazon.fr"}/dp/${asin}`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "AmzWatch <onboarding@resend.dev>",
      to: [to],
      subject: `AmzWatch – changement détecté : ${title.slice(0, 60)}`,
      html: `<p>${esc(summary)}</p><p><a href="${url}">Voir le produit sur Amazon</a></p><p style="color:#888;font-size:12px">AmzWatch – What Else by Vinc</p>`,
    }),
  });
  if (!res.ok) {
    console.error(`[check-prices] Resend KO: HTTP ${res.status} ${await res.text().catch(() => "")}`);
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: asins, error } = await supabase
    .from("tracked_asins")
    .select("id, user_id, asin, marketplace, product_title, product_image")
    .eq("is_active", true);

  if (error) {
    console.error(`[check-prices] Lecture tracked_asins KO: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log(`[check-prices] ${asins?.length ?? 0} ASIN actif(s) trouvé(s)`);

  let ok = 0;
  let failed = 0;
  let alerts = 0;

  for (const row of asins ?? []) {
    try {
      const snap = await fetchProduct(row.asin, row.marketplace);
      if (!snap) {
        failed++;
        continue;
      }

      // Dernier relevé AVANT insertion, pour comparer
      const { data: prevRows } = await supabase
        .from("price_snapshots")
        .select("price, in_stock, rating")
        .eq("tracked_asin_id", row.id)
        .order("checked_at", { ascending: false })
        .limit(1);
      const prev = prevRows?.[0] ?? null;

      const { error: insertError } = await supabase.from("price_snapshots").insert({
        tracked_asin_id: row.id,
        price: snap.price,
        currency: snap.currency,
        in_stock: snap.in_stock,
        rating: snap.rating,
        review_count: snap.review_count,
      });
      if (insertError) throw insertError;

      if (!row.product_title && snap.title) {
        await supabase
          .from("tracked_asins")
          .update({ product_title: snap.title, product_image: snap.image })
          .eq("id", row.id);
      }

      if (prev) {
        const changes = detectChanges(
          {
            price: prev.price != null ? Number(prev.price) : null,
            in_stock: prev.in_stock,
            rating: prev.rating != null ? Number(prev.rating) : null,
          },
          snap
        );
        if (changes.length > 0) {
          const title = row.product_title || snap.title || row.asin;
          const summary = await summarize(title, changes);

          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", row.user_id)
            .maybeSingle();
          const emailSent = profile?.email
            ? await sendEmail(profile.email, title, summary, row.asin, row.marketplace)
            : false;

          const main = changes[0];
          const { error: alertError } = await supabase.from("alerts").insert({
            user_id: row.user_id,
            tracked_asin_id: row.id,
            alert_type: main.type,
            message: summary,
            old_value: main.old,
            new_value: main.new,
            email_sent: emailSent,
          });
          if (alertError) console.error(`[check-prices] Insert alerte KO: ${alertError.message}`);
          else alerts++;
        }
      }
      ok++;
    } catch (e) {
      console.error(`[check-prices] Erreur pour ${row.asin}:`, e);
      failed++;
    }
  }

  console.log(`[check-prices] terminé: ok=${ok} failed=${failed} alertes=${alerts}`);
  return NextResponse.json({ checked: asins?.length ?? 0, ok, failed, alerts });
}
