import type { CopyPack } from "./types";

const DEFAULTS: Record<string, { name: string; price: string }[]> = {
  handyman: [
    { name: "General repairs (half day)", price: "from €120" },
    { name: "Flat-pack assembly", price: "from €60" },
    { name: "Shelving & mounting", price: "from €70" },
  ],
  cleaner: [
    { name: "Standard clean (2hr)", price: "from €55" },
    { name: "Deep clean", price: "from €110" },
    { name: "End-of-tenancy clean", price: "from €150" },
  ],
  coach: [
    { name: "1-to-1 session", price: "from €40" },
    { name: "Small group session", price: "from €25pp" },
    { name: "Assessment & plan", price: "from €60" },
  ],
};

export const appointmentCopyPack: CopyPack = {
  headline: "Book a {trade} in {town}",
  about:
    "{name} takes bookings in {town} and the surrounding area. Pick a time that suits, and it's sorted.",
  ctaCall: "Call to book",
  ctaWhatsapp: "WhatsApp to book",
  defaultServices: (trade) => DEFAULTS[trade] ?? DEFAULTS.handyman,
};
