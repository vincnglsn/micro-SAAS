"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
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

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center">AmzWatch</h1>
        <p className="mt-2 text-center text-slate-400 text-sm">
          Connectez-vous par email — sans mot de passe
        </p>

        {sent ? (
          <form onSubmit={handleVerifyCode} className="mt-8 space-y-4">
            <div className="rounded-lg bg-slate-900 p-4 text-center">
              <p className="font-medium">Email envoyé !</p>
              <p className="mt-2 text-sm text-slate-400">
                Saisissez le code reçu à {email} (ou cliquez sur le lien dans
                l&apos;email).
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={10}
              placeholder="Code reçu par email"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-orange-500"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-orange-500 py-3 font-semibold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "Vérification..." : "Se connecter"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendCode} className="mt-8 space-y-4">
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
              {loading ? "Envoi..." : "Recevoir le code de connexion"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
