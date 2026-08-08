"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export default function PurchaseAnalytics({
  transactionId,
  value,
  pixelId,
}: {
  transactionId: string;
  value: number;
  pixelId: string | null;
}) {
  useEffect(() => {
    if (!transactionId) return;
    const key = `web99:purchase:${transactionId}`;
    try {
      if (window.sessionStorage.getItem(key) === "sent") return;
      window.sessionStorage.setItem(key, "sent");
    } catch {}

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function (...args: unknown[]) { window.dataLayer!.push(args); };
    window.gtag("js", new Date());
    window.gtag("config", "G-8X9XMJV81V");
    window.gtag("event", "purchase", {
      transaction_id: transactionId,
      currency: "EUR",
      value,
      items: [{ item_id: "web99-website", item_name: "Web99 website package", price: value, quantity: 1 }],
    });

    const ga = document.createElement("script");
    ga.async = true;
    ga.src = "https://www.googletagmanager.com/gtag/js?id=G-8X9XMJV81V";
    document.head.appendChild(ga);

    if (pixelId && /^\d+$/.test(pixelId)) {
      if (!window.fbq) {
        const fbq = function (...args: unknown[]) {
          const self = fbq as typeof fbq & { callMethod?: (...a: unknown[]) => void; queue: unknown[][] };
          if (self.callMethod) self.callMethod(...args);
          else self.queue.push(args);
        } as typeof window.fbq & { loaded?: boolean; version?: string; queue: unknown[][]; push?: unknown };
        fbq.queue = [];
        fbq.loaded = true;
        fbq.version = "2.0";
        fbq.push = fbq;
        window.fbq = fbq;
        window._fbq = fbq;
        const meta = document.createElement("script");
        meta.async = true;
        meta.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(meta);
      }
      window.fbq!("init", pixelId);
      window.fbq!("track", "Purchase", { currency: "EUR", value }, { eventID: `purchase_${transactionId}` });
    }
  }, [transactionId, value, pixelId]);

  return null;
}
