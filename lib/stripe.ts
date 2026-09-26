import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRO_PLAN = {
  name: "AmzWatch Pro",
  description: "Suivi de 25 ASIN concurrents Amazon, alertes toutes les 2h, historique 90 jours",
  amountCents: 1900,
  currency: "eur",
  asinLimit: 25,
};
