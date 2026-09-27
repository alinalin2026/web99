import type { SiteCategory } from "@/lib/site-schema";
import type { CopyPack } from "./types";
import { emergencyCopyPack } from "./emergency";
import { appointmentCopyPack } from "./appointment";

export { fillCopy } from "./types";
export type { CopyPack } from "./types";

const PACKS: Partial<Record<SiteCategory, CopyPack>> = {
  emergency: emergencyCopyPack,
  appointment: appointmentCopyPack,
};

export function copyPackFor(category: SiteCategory): CopyPack {
  return PACKS[category] ?? emergencyCopyPack;
}
