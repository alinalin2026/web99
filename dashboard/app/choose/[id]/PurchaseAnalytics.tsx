"use client";

import { useEffect } from "react";

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

    const w = window as typeof window & Record<string, any>;
    w.dataLayer = w.dataLayer || [];
    w.gtag = w.gtag || function (...args: unknown[]) { w.dataLayer.push(args); };
    w.gtag("js", new Date());
    w.gtag("config", "G-8X9XMJV81V");
    w.gtag("event", "purchase", {
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
      if (!w.fbq) {
        const fbq: any = function (...args: unknown[]) {
          if (fbq.callMethod) fbq.callMethod(...args);
          else fbq.queue.push(args);
        };
        fbq.queue = [];
        fbq.loaded = true;
        fbq.version = "2.0";
        fbq.push = fbq;
        w.fbq = fbq;
        w._fbq = fbq;
        const meta = document.createElement("script");
        meta.async = true;
        meta.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(meta);
      }
      w.fbq("init", pixelId);
      w.fbq("track", "Purchase", { currency: "EUR", value }, { eventID: `purchase_${transactionId}` });
    }
  }, [transactionId, value, pixelId]);

  return null;
}
