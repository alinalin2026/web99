import type { CopyPack } from "./types";

/** Default call-out prices are placeholders the customer edits in the quiz
    before it ever renders — never shown unpriced. */
const DEFAULTS: Record<string, { name: string; price: string }[]> = {
  plumber: [
    { name: "Burst pipe call-out", price: "from €90" },
    { name: "Blocked drain", price: "from €80" },
    { name: "Boiler breakdown", price: "from €95" },
  ],
  electrician: [
    { name: "Power outage call-out", price: "from €90" },
    { name: "Fuse board fault", price: "from €85" },
    { name: "Socket or switch repair", price: "from €70" },
  ],
  locksmith: [
    { name: "Locked out call-out", price: "from €75" },
    { name: "Broken key extraction", price: "from €65" },
    { name: "Lock change after break-in", price: "from €95" },
  ],
};

export const emergencyCopyPack: CopyPack = {
  headline: "24/7 emergency {trade} in {town}",
  about:
    "{name} answers the phone day or night. Based in {town}, out the door fast, and won't leave until it's fixed.",
  ctaCall: "Call now",
  ctaWhatsapp: "WhatsApp us",
  defaultServices: (trade) => DEFAULTS[trade] ?? DEFAULTS.plumber,
};
