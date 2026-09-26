import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="text-xl font-bold">AmzWatch</span>
        <Link
          href="/login"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600 transition"
        >
          Se connecter
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          Sachez avant tout le monde quand un concurrent{" "}
          <span className="text-orange-500">baisse son prix</span> ou tombe en{" "}
          <span className="text-orange-500">rupture de stock</span>
        </h1>
        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
          Le tracker de concurrents Amazon en français. Ajoutez leurs ASIN, on
          surveille prix, stock et avis toutes les 2 heures, et on vous alerte
          par email dès qu&apos;il y a un mouvement.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-orange-500 px-8 py-3 font-semibold hover:bg-orange-600 transition"
          >
            Commencer gratuitement
          </Link>
          <a
            href="#pricing"
            className="rounded-lg border border-slate-700 px-8 py-3 font-semibold hover:bg-slate-900 transition"
          >
            Voir les tarifs
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Sans carte bancaire · 3 ASIN suivis gratuitement
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-8">
        <Feature
          title="Alertes prix en temps réel"
          desc="Baisse ou hausse de prix d'un concurrent : vous êtes prévenu par email dans les 2 heures."
        />
        <Feature
          title="Rupture de stock"
          desc="Le concurrent tombe en rupture ? C'est le moment idéal pour ajuster votre prix. On vous le dit direct."
        />
        <Feature
          title="Historique 90 jours"
          desc="Visualisez l'évolution des prix sur 3 mois pour comprendre les stratégies de vos concurrents."
        />
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Tarifs simples</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-slate-800 p-8">
            <h3 className="text-xl font-semibold">Gratuit</h3>
            <p className="mt-2 text-4xl font-bold">0€</p>
            <ul className="mt-6 space-y-3 text-slate-300">
              <li>✓ 3 ASIN suivis</li>
              <li>✓ Alertes quotidiennes groupées</li>
              <li>✓ Historique 7 jours</li>
            </ul>
            <Link
              href="/login"
              className="mt-8 block text-center rounded-lg border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-900 transition"
            >
              Démarrer
            </Link>
          </div>
          <div className="rounded-2xl border border-orange-500 p-8 relative">
            <span className="absolute -top-3 right-8 bg-orange-500 text-xs font-bold px-3 py-1 rounded-full">
              Recommandé
            </span>
            <h3 className="text-xl font-semibold">Pro</h3>
            <p className="mt-2 text-4xl font-bold">
              19€<span className="text-base font-normal text-slate-400">/mois</span>
            </p>
            <ul className="mt-6 space-y-3 text-slate-300">
              <li>✓ 25 ASIN suivis</li>
              <li>✓ Alertes toutes les 2h</li>
              <li>✓ Historique 90 jours</li>
              <li>✓ Support prioritaire</li>
            </ul>
            <Link
              href="/login"
              className="mt-8 block text-center rounded-lg bg-orange-500 px-6 py-3 font-semibold hover:bg-orange-600 transition"
            >
              Passer en Pro
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-center text-sm text-slate-500">
        AmzWatch — suivi de concurrents Amazon
      </footer>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-6">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{desc}</p>
    </div>
  );
}
