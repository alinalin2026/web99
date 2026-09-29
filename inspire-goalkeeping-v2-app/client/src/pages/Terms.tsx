import { ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Who we are",
    body: [
      "Inspire Goalkeeping Academy runs specialist goalkeeper coaching — weekly academy sessions, 1–2–1 performance training, club coaching, clinics and camps — for players across the South-East of Ireland. These terms apply to every session and programme booked with us.",
    ],
  },
  {
    title: "Bookings and payment",
    body: [
      "Sessions are booked through the enquiry form, by email or by phone. A slot is confirmed once we've replied with a time, venue and price. Payment goes directly to Inspire Goalkeeping Academy — bank transfer or in person — this website doesn't process any payments.",
    ],
  },
  {
    title: "Cancellations and weather",
    body: [
      "Give us at least 24 hours' notice to cancel or move a session so we can offer the slot to someone else. Late cancellations may still be charged. If we call off a session — bad weather, an unsafe pitch, coach illness — we'll get you into the next one at no extra cost.",
    ],
  },
  {
    title: "Code of conduct",
    body: [
      "Players, parents and guardians are expected to treat coaches, venues and other players with respect, show up on time in appropriate kit, and flag any injury or condition that could affect a session in advance.",
      "A parent or guardian should be contactable by phone throughout any session involving a player under 18.",
    ],
  },
  {
    title: "Safeguarding",
    body: [
      "Player welfare comes before everything else. Coaching follows the safeguarding guidance set out by Sport Ireland and the FAI, and sessions with under-18s are run with appropriate adult presence or supervision at all times.",
      "Any safeguarding concern can be raised directly and confidentially using the contact details below and will be acted on promptly.",
    ],
  },
  {
    title: "Physical activity and assumption of risk",
    body: [
      "Goalkeeping involves diving, collisions and repeated impact with the ball — normal risks of the sport. Sessions are coached with proper technique and supervision throughout, but not every risk can be removed, and taking part means accepting that.",
    ],
  },
  {
    title: "Photography and media",
    body: [
      "Sessions are sometimes photographed or filmed for the academy's own social media and marketing. We ask a parent or guardian's permission before using any image of a player under 18, and consent can be refused or withdrawn at any time — just get in touch.",
    ],
  },
  {
    title: "Liability",
    body: [
      "We coach with reasonable skill, care and appropriate supervision. Beyond that, our liability for loss or injury arising from a session is limited to what the law requires, and we're not responsible for personal belongings brought to a session.",
    ],
  },
  {
    title: "Changes to these terms",
    body: [
      "These terms may be updated as the academy's programmes develop. Booking a session after a change means you accept the current version.",
    ],
  },
  {
    title: "Governing law",
    body: ["These terms are governed by the law of Ireland."],
  },
];

export default function Terms() {
  return (
    <>
      <section className="page-hero-v2 bg-navy">
        <div className="container relative z-10">
          <p className="eyebrow text-lime">04 / The fine print</p>
          <h1 className="page-title-v2 mt-6">
            Fair,<br /><em>clear.</em>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-white/70">
            The terms behind every session — no jargon, nothing buried in small print.
          </p>
        </div>
      </section>

      <section className="section-pad bg-cloud">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            {sections.map((s) => (
              <div key={s.title} className="border-t-2 border-ink/10 pt-7">
                <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">{s.title}</h2>
                <div className="mt-4 space-y-4">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-sm leading-7 text-slate-500">{p}</p>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t-2 border-ink/10 pt-7">
              <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">Getting in touch</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
                Questions about a booking or these terms? Email{" "}
                <a className="text-link" href="mailto:inspiregk2023@gmail.com">inspiregk2023@gmail.com</a> or call{" "}
                <a className="text-link" href="tel:+353896564601">+353 89 656 4601</a>.
              </p>
            </div>
          </div>

          <div className="mt-14 flex items-start gap-3 border-t-4 border-lime bg-white p-5 text-sm leading-6 text-slate-500 shadow-[6px_6px_0_#dfe8ec]">
            <ShieldCheck className="mt-0.5 shrink-0 text-cobalt" size={18} strokeWidth={1.6} />
            <p>
              This page is a plain-English preview draft for this website, written to match the coaching offer
              described on this site. Have it checked before it's relied on as a final legal document.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
