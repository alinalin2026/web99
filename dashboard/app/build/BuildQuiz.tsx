"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  PALETTES,
  FONTS,
  heroImageFor,
  LIVE_TEMPLATE_CATEGORIES,
  type Site,
  type SiteLogo,
  type SiteService,
  type SiteTheme,
  type PaletteId,
  type FontId,
} from "@/lib/site-schema";
import { copyPackFor, fillCopy } from "@/lib/copy-packs";
import { TRADE_TILES, type TradeTile } from "@/lib/trade-tiles";
import SiteTemplate from "@/templates";
import PreviewActionBar from "@/templates/shared/PreviewActionBar";

const STORAGE_KEY = "web99_build_answers_v1";
const TOTAL_STEPS = 7;
const SARAH_START_URL = "https://web99.ie/start";

interface Answers {
  name: string;
  tradeTile: TradeTile | null;
  town: string;
  services: SiteService[];
  theme: SiteTheme;
  logo: SiteLogo;
  phone: string;
}

const DEFAULT_ANSWERS: Answers = {
  name: "",
  tradeTile: null,
  town: "",
  services: [],
  theme: { palette: "navy-amber", font: "bold" },
  logo: { type: "text" },
  phone: "",
};

function loadAnswers(): Answers {
  if (typeof window === "undefined") return DEFAULT_ANSWERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ANSWERS;
    return { ...DEFAULT_ANSWERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ANSWERS;
  }
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function track(previewId: string | null, kind: string, detail: Record<string, unknown> = {}) {
  fetch("/api/preview-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previewId, kind, detail }),
  }).catch(() => {});
}

function resizeToDataUrl(file: File, maxWidth = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unsupported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function BuildQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [revealed, setRevealed] = useState(false);
  const [blockedTile, setBlockedTile] = useState<TradeTile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const previewPromise = useRef<Promise<string> | null>(null);

  useEffect(() => {
    setAnswers(loadAnswers());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers, hydrated]);

  useEffect(() => {
    if (!hydrated || revealed) return;
    track(null, `step_${step + 1}`, { step: step + 1 });
  }, [step, hydrated, revealed]);

  // Prefill services the moment a trade is picked.
  useEffect(() => {
    if (answers.tradeTile && answers.services.length === 0) {
      const pack = copyPackFor(answers.tradeTile.category);
      setAnswers((a) => ({ ...a, services: pack.defaultServices(a.tradeTile!.trade) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.tradeTile]);

  const site: Site | null = useMemo(() => {
    if (!answers.tradeTile || !answers.name || !answers.town) return null;
    const { trade, category } = answers.tradeTile;
    const pack = copyPackFor(category);
    const vars = { name: answers.name, trade, town: answers.town };
    return {
      name: answers.name,
      category,
      trade,
      town: answers.town,
      phone: answers.phone || undefined,
      services: answers.services,
      theme: answers.theme,
      logo: answers.logo,
      images: { hero: heroImageFor(category, trade, hashSeed(answers.name || trade)) },
      copy: {
        headline: fillCopy(pack.headline, vars),
        about: fillCopy(pack.about, vars),
        ctaCall: pack.ctaCall,
        ctaWhatsapp: pack.ctaWhatsapp,
      },
    };
  }, [answers]);

  useEffect(() => {
    if (revealed && site && !previewPromise.current) {
      previewPromise.current = fetch("/api/previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site),
      })
        .then((r) => r.json())
        .then((d) => {
          track(d.id, "reveal", {});
          return d.id as string;
        });
    }
  }, [revealed, site]);

  async function resolvePreviewId(): Promise<string> {
    if (previewPromise.current) return previewPromise.current;
    if (!site) throw new Error("No site yet");
    previewPromise.current = fetch("/api/previews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(site),
    })
      .then((r) => r.json())
      .then((d) => d.id as string);
    return previewPromise.current;
  }

  if (!hydrated) return null;

  if (revealed && site) {
    return (
      <main>
        <PreviewActionBar resolvePreviewId={resolvePreviewId} />
        <SiteTemplate site={site} />
      </main>
    );
  }

  const canNext = [
    answers.name.trim().length > 1,
    Boolean(answers.tradeTile),
    answers.town.trim().length > 1,
    answers.services.length > 0,
    true, // look
    true, // logo optional
    true, // phone optional
  ][step];

  function next() {
    if (step === TOTAL_STEPS - 1) {
      setRevealed(true);
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <main style={wrap}>
      <div style={progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{ ...progressSeg, background: i <= step ? "#5b3fe8" : "#e6e2f0" }} />
        ))}
      </div>

      {step === 0 && (
        <Screen title="What's your business called?">
          <input
            autoFocus
            style={input}
            placeholder="e.g. Murphy Plumbing"
            value={answers.name}
            onChange={(e) => setAnswers((a) => ({ ...a, name: e.target.value }))}
          />
        </Screen>
      )}

      {step === 1 && (
        <Screen title="What do you do?">
          <div style={tileGrid}>
            {TRADE_TILES.map((t) => (
              <button
                key={t.label}
                style={{
                  ...tile,
                  ...(answers.tradeTile?.label === t.label ? tileActive : {}),
                }}
                onClick={() => {
                  if (LIVE_TEMPLATE_CATEGORIES.includes(t.category)) {
                    setBlockedTile(null);
                    setAnswers((a) => ({ ...a, tradeTile: t, services: [] }));
                  } else {
                    setBlockedTile(t);
                  }
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {blockedTile && (
            <div style={notice}>
              <p style={{ margin: "0 0 10px" }}>
                We don't have an instant preview for {blockedTile.label.toLowerCase()} yet —
                we'll build yours by hand and send a preview within 48 hours.
              </p>
              <a href={SARAH_START_URL} style={noticeLink}>
                Continue that way →
              </a>
            </div>
          )}
        </Screen>
      )}

      {step === 2 && (
        <Screen title="Where are you based?">
          <input
            autoFocus
            style={input}
            placeholder="e.g. Swords"
            value={answers.town}
            onChange={(e) => setAnswers((a) => ({ ...a, town: e.target.value }))}
          />
        </Screen>
      )}

      {step === 3 && (
        <Screen title="What do you offer?">
          <div style={{ display: "grid", gap: 10 }}>
            {answers.services.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...input, flex: 2 }}
                  value={s.name}
                  onChange={(e) =>
                    setAnswers((a) => {
                      const services = [...a.services];
                      services[i] = { ...services[i], name: e.target.value };
                      return { ...a, services };
                    })
                  }
                />
                <input
                  style={{ ...input, flex: 1 }}
                  placeholder="price (optional)"
                  value={s.price ?? ""}
                  onChange={(e) =>
                    setAnswers((a) => {
                      const services = [...a.services];
                      services[i] = { ...services[i], price: e.target.value };
                      return { ...a, services };
                    })
                  }
                />
                <button
                  style={removeBtn}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, services: a.services.filter((_, j) => j !== i) }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              style={secondaryBtn}
              onClick={() =>
                setAnswers((a) => ({ ...a, services: [...a.services, { name: "", price: "" }] }))
              }
            >
              + Add a service
            </button>
          </div>
        </Screen>
      )}

      {step === 4 && (
        <Screen title="Pick a look">
          <p style={label}>Colours</p>
          <div style={tileGrid}>
            {(Object.keys(PALETTES) as PaletteId[]).map((id) => (
              <button
                key={id}
                onClick={() => setAnswers((a) => ({ ...a, theme: { ...a.theme, palette: id } }))}
                style={{
                  ...tile,
                  background: PALETTES[id].bg,
                  color: PALETTES[id].ink,
                  border:
                    answers.theme.palette === id ? "3px solid #5b3fe8" : "3px solid transparent",
                }}
              >
                <span style={{ color: PALETTES[id].accent, fontWeight: 800 }}>●</span> {id}
              </button>
            ))}
          </div>
          <p style={label}>Type style</p>
          <div style={tileGrid}>
            {(Object.keys(FONTS) as FontId[]).map((id) => (
              <button
                key={id}
                onClick={() => setAnswers((a) => ({ ...a, theme: { ...a.theme, font: id } }))}
                style={{
                  ...tile,
                  fontFamily: FONTS[id].heading,
                  ...(answers.theme.font === id ? tileActive : {}),
                }}
              >
                {id}
              </button>
            ))}
          </div>
        </Screen>
      )}

      {step === 5 && (
        <Screen title="Got a logo?">
          <input
            type="file"
            accept="image/*"
            style={{ marginBottom: 12 }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await resizeToDataUrl(file);
              setAnswers((a) => ({ ...a, logo: { type: "upload", url } }));
            }}
          />
          {answers.logo.type === "upload" && answers.logo.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={answers.logo.url} alt="logo" style={{ height: 48, display: "block", marginBottom: 12 }} />
          )}
          <button
            style={secondaryBtn}
            onClick={() => setAnswers((a) => ({ ...a, logo: { type: "text" } }))}
          >
            Make one for me
          </button>
        </Screen>
      )}

      {step === 6 && (
        <Screen title="Phone number for customers?">
          <input
            autoFocus
            style={input}
            placeholder="e.g. 087 000 0000"
            value={answers.phone}
            onChange={(e) => setAnswers((a) => ({ ...a, phone: e.target.value }))}
          />
          <p style={{ ...label, marginTop: 10 }}>Optional — adds Call and WhatsApp buttons.</p>
        </Screen>
      )}

      <div style={navRow}>
        <button onClick={back} disabled={step === 0} style={{ ...secondaryBtn, opacity: step === 0 ? 0.4 : 1 }}>
          Back
        </button>
        <button onClick={next} disabled={!canNext} style={{ ...primaryBtn, opacity: canNext ? 1 : 0.4 }}>
          {step === TOTAL_STEPS - 1 ? "See my website" : "Next"}
        </button>
      </div>
    </main>
  );
}

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h1 style={h1}>{title}</h1>
      {children}
    </div>
  );
}

/* --- styles: mobile-first, thumb-sized targets ----------------------------- */

const wrap: CSSProperties = {
  maxWidth: 480,
  margin: "0 auto",
  padding: "24px 18px 100px",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  minHeight: "100vh",
};
const progressRow: CSSProperties = { display: "flex", gap: 6, marginBottom: 28 };
const progressSeg: CSSProperties = { flex: 1, height: 5, borderRadius: 3 };
const h1: CSSProperties = { fontSize: 24, fontWeight: 800, margin: "0 0 20px", letterSpacing: -0.3 };
const label: CSSProperties = { fontSize: 13, color: "#77738f", margin: "18px 0 8px", fontWeight: 600 };
const input: CSSProperties = {
  width: "100%",
  padding: "16px 14px",
  fontSize: 17,
  borderRadius: 12,
  border: "1px solid #e6e2f0",
  boxSizing: "border-box",
};
const tileGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 };
const tile: CSSProperties = {
  padding: "18px 12px",
  fontSize: 15,
  fontWeight: 700,
  borderRadius: 14,
  border: "3px solid #e6e2f0",
  background: "#fff",
  minHeight: 56,
  cursor: "pointer",
};
const tileActive: CSSProperties = { border: "3px solid #5b3fe8", background: "#f0edff" };
const notice: CSSProperties = {
  marginTop: 14,
  padding: 16,
  borderRadius: 12,
  background: "#f0edff",
  fontSize: 14,
  lineHeight: 1.5,
};
const noticeLink: CSSProperties = { color: "#5b3fe8", fontWeight: 700 };
const navRow: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  gap: 10,
  padding: "14px 18px calc(14px + env(safe-area-inset-bottom))",
  background: "#fff",
  borderTop: "1px solid #e6e2f0",
};
const primaryBtn: CSSProperties = {
  flex: 2,
  padding: "16px 0",
  fontSize: 16,
  fontWeight: 800,
  color: "#fff",
  background: "#5b3fe8",
  border: "none",
  borderRadius: 999,
  minHeight: 52,
};
const secondaryBtn: CSSProperties = {
  flex: 1,
  padding: "14px 16px",
  fontSize: 15,
  fontWeight: 700,
  color: "#5b3fe8",
  background: "#fff",
  border: "1px solid #e6e2f0",
  borderRadius: 999,
  minHeight: 52,
};
const removeBtn: CSSProperties = {
  width: 44,
  fontSize: 20,
  color: "#c33b32",
  background: "#fff",
  border: "1px solid #e6e2f0",
  borderRadius: 10,
};
