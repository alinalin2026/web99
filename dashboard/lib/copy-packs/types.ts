import type { SiteService } from "@/lib/site-schema";

export interface CopyPack {
  /** {name} {trade} {town} holes, filled by plain string replace — no AI call. */
  headline: string;
  about: string;
  ctaCall: string;
  ctaWhatsapp: string;
  defaultServices: (trade: string) => SiteService[];
}

export function fillCopy(template: string, vars: { name: string; trade: string; town: string }): string {
  return template
    .replaceAll("{name}", vars.name)
    .replaceAll("{trade}", vars.trade)
    .replaceAll("{town}", vars.town);
}
