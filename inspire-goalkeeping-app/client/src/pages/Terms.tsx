import { ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Who we are",
    body: [
      "Inspire Goalkeeping provides specialist goalkeeper coaching — individual sessions, club coaching, clinics and camps — for players across the South-East of Ireland. These terms cover every session and programme booked through us.",
    ],
  },
  {
    title: "Bookings and payment",
    body: [
      "Sessions are booked by phone, email or the enquiry form. A booking is confirmed once we've replied with a time, location and price. Payment is made directly to Inspire Goalkeeping — by bank transfer or in person — and not through this website.",
    ],
  },
  {
    title: "Cancellations and weather",
    body: [
      "We ask for at least 24 hours' notice to cancel or reschedule a session so the slot can go to someone else. Sessions cancelled with less notice may still be charged, except where Inspire Goalkeeping cancels — for bad weather, an unsafe pitch, or coach illness — in which case we'll offer the next available slot at no extra cost.",
    ],
  },
  {
    title: "Code of conduct",
    body: [
      "We ask players, parents and guardians to treat coaches, facilities and other players with respect, to arrive on time and in appropriate kit, and to let us know about any injury or condition that might affect a session beforehand.",
      "A parent or guardian should be reachable by phone for the duration of every session involving a player under 18.",
    ],
  },
  {
    title: "Safeguarding",
    body: [
      "The welfare of every young player comes first. Coaching follows the safeguarding guidance set out by Sport Ireland and the FAI, and sessions with players under 18 are run with appropriate adult presence or supervision at all times.",
      "Any safeguarding concern can be raised directly and confidentially with Inspire Goalkeeping using the contact details below, and will be taken seriously and acted on promptly.",
    ],
  },
  {
    title: "Physical activity and assumption of risk",
    body: [
      "Goalkeeping is a physical, contact-adjacent sport, and sessions involve normal risks such as diving, collisions and impact with the ball. We coach with proper technique and supervision throughout, but we can't eliminate every risk inherent to the sport, and by taking part players and their guardians accept this.",
    ],
  },
  {
    title: "Photography and media",
    body: [
      "We sometimes photograph or film sessions for Inspire Goalkeeping's own social media and marketing. We ask permission from a parent or guardian before using any image of a player under 18, and you're free to say no, or withdraw consent later, at any point — just get in touch.",
    ],
  },
  {
    title: "Liability",
    body: [
      "We coach with reasonable skill, care and appropriate supervision. Beyond that, our liability for loss or injury arising from a session is limited to what the law requires, and we're not responsible for loss or damage to personal belongings brought to a session.",
    ],
  },
  {
    title: "Changes to these terms",
    body: [
      "We may update these terms from time to time as the coaching offer develops. Continuing to book sessions after a change means you accept the updated terms.",
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
      <section className="page-hero bg-sand">
        <div className="container relative z-10">
          <p className="eyebrow text-coral">The fine print</p>
          <h1 className="page-title mt-5">
            Fair and<br /><em>clear.</em>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-ink/60">
            The terms behind every session, in plain language — no surprises, nothing buried.
          </p>
        </div>
        <div className="page-hero-mark text-ink/10">04</div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            {sections.map((s) => (
              <div key={s.title} className="border-t border-ink/15 pt-7">
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h2>
                <div className="mt-4 space-y-4">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-base leading-7 text-ink/65">{p}</p>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-ink/15 pt-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Getting in touch</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-ink/65">
                Questions about a booking or these terms? Email{" "}
                <a className="text-link" href="mailto:inspiregk2023@gmail.com">inspiregk2023@gmail.com</a> or call{" "}
                <a className="text-link" href="tel:+353896564601">+353 89 656 4601</a>.
              </p>
            </div>
          </div>

          <div className="mt-14 flex items-start gap-3 rounded-2xl bg-sand/60 p-5 text-sm leading-6 text-ink/55">
            <ShieldCheck className="mt-0.5 shrink-0 text-coral" size={18} strokeWidth={1.6} />
            <p>
              This page is a plain-English preview draft for this website, written to match the coaching offer described
              on this site. Have it checked before it's relied on as a final legal document.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
