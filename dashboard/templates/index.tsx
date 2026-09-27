import type { Site } from "@/lib/site-schema";
import EmergencyTemplate from "./emergency/EmergencyTemplate";
import AppointmentTemplate from "./appointment/AppointmentTemplate";

/** Dispatches a Site to its category's template. Categories with no real
    template yet fall back to Emergency's layout rather than 404ing —
    the quiz never lets those categories reach this point in Phase 1. */
export default function SiteTemplate({ site }: { site: Site }) {
  switch (site.category) {
    case "appointment":
      return <AppointmentTemplate site={site} />;
    case "emergency":
    default:
      return <EmergencyTemplate site={site} />;
  }
}
