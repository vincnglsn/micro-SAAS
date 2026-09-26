"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center">AmzWatch</h1>
        <p className="mt-2 text-center text-slate-400 text-sm">
          Connectez-vous par email — sans mot de passe
        </p>

        {sent ? (
          <div className="mt-8 rounded-lg bg-slate-900 p-6 text-center">
            <p className="font-medium">Email envoyé !</p>
            <p className="mt-2 text-sm text-slate-400">
              Cliquez sur le lien reçu à {email} pour vous connecter.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-orange-500 py-3 font-semibold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Recevoir le lien de connexion"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
