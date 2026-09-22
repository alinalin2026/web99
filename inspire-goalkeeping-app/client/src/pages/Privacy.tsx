import { ShieldCheck } from "lucide-react";

export default function Privacy() {
  return (
    <>
      <section className="page-hero bg-teal">
        <div className="container relative z-10">
          <p className="eyebrow text-coral">Privacy</p>
          <h1 className="page-title mt-5 text-white">
            What we do<br /><em className="text-coral">with your details.</em>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-white/65">
            A short, honest explanation of what Inspire Goalkeeping collects, why, and how to have it deleted.
          </p>
        </div>
        <div className="page-hero-mark text-white/10">05</div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            <div className="border-t border-ink/15 pt-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">What we collect</h2>
              <div className="mt-4 space-y-4 text-base leading-7 text-ink/65">
                <p>
                  When you get in touch — by the enquiry form, email or phone — we collect what you send us: your name,
                  contact details, and anything you tell us about the goalkeeper, such as age and current experience.
                </p>
                <p>
                  We don't collect anything about visitors just for browsing this site. There's no analytics, no
                  advertising pixel and no cookie banner here, because none of that runs on this preview.
                </p>
              </div>
            </div>

            <div className="border-t border-ink/15 pt-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Why we collect it</h2>
              <p className="mt-4 text-base leading-7 text-ink/65">
                Solely to reply to your enquiry, arrange sessions and keep in touch about coaching. We don't use it for
                anything else, and we don't add anyone to a marketing list without being asked to.
              </p>
            </div>

            <div className="border-t border-ink/15 pt-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Photos and video</h2>
              <p className="mt-4 text-base leading-7 text-ink/65">
                Where a session photo or clip features a player under 18, we only use it publicly with a parent or
                guardian's permission, and you can ask for it to be taken down at any time.
              </p>
            </div>

            <div className="border-t border-ink/15 pt-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">What we don't do</h2>
              <p className="mt-4 text-base leading-7 text-ink/65">
                We don't sell or share your information with third parties, and we don't use it for anything beyond
                running the coaching you've asked about.
              </p>
            </div>

            <div className="border-t border-ink/15 pt-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">How long we keep it</h2>
              <p className="mt-4 text-base leading-7 text-ink/65">
                We keep enquiry and booking details for as long as you're training with us, plus a reasonable period
                afterwards in case you come back. If you'd rather we deleted it sooner, just ask.
              </p>
            </div>

            <div className="border-t border-ink/15 pt-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Your rights</h2>
              <p className="mt-4 text-base leading-7 text-ink/65">
                Under GDPR you can ask for a copy of what we hold about you, ask us to correct or delete it, or object
                to how it's used. Email{" "}
                <a className="text-link" href="mailto:inspiregk2023@gmail.com">inspiregk2023@gmail.com</a>. If you're
                unhappy with how a concern is handled, you can complain to the Irish Data Protection Commission.
              </p>
            </div>

            <div className="border-t border-ink/15 pt-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Contact</h2>
              <p className="mt-4 text-base leading-7 text-ink/65">
                Email <a className="text-link" href="mailto:inspiregk2023@gmail.com">inspiregk2023@gmail.com</a> or
                call <a className="text-link" href="tel:+353896564601">+353 89 656 4601</a>. Based in the South-East
                of Ireland.
              </p>
            </div>
          </div>

          <div className="mt-14 flex items-start gap-3 rounded-2xl bg-sand/60 p-5 text-sm leading-6 text-ink/55">
            <ShieldCheck className="mt-0.5 shrink-0 text-coral" size={18} strokeWidth={1.6} />
            <p>
              This site is a front-end preview: the enquiry form doesn't send anywhere yet, so nothing described above
              is actually being collected or stored today. This page shows what would apply once the site goes live.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
