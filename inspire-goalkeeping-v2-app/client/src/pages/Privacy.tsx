import { ShieldCheck } from "lucide-react";

export default function Privacy() {
  return (
    <>
      <section className="page-hero-v2 bg-cobalt">
        <div className="container relative z-10">
          <p className="eyebrow text-lime">05 / Privacy</p>
          <h1 className="page-title-v2 mt-6">
            What we do<br /><em>with your details.</em>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-white/70">
            A short, honest explanation of what Inspire Goalkeeping Academy collects, why, and how to have it deleted.
          </p>
        </div>
      </section>

      <section className="section-pad bg-cloud">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            <div className="border-t-2 border-ink/10 pt-7">
              <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">What we collect</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-500">
                <p>
                  When you get in touch — the enquiry form, email or phone — we collect what you send: your name,
                  contact details, and anything you tell us about the goalkeeper, such as age and current level.
                </p>
                <p>
                  We don't collect anything about visitors just for browsing this site. No analytics, no advertising
                  pixel, no cookie banner — none of that runs on this preview.
                </p>
              </div>
            </div>

            <div className="border-t-2 border-ink/10 pt-7">
              <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">Why we collect it</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Solely to reply to your enquiry, arrange sessions and stay in touch about coaching. We don't use it
                for anything else, and we won't add anyone to a marketing list without being asked to.
              </p>
            </div>

            <div className="border-t-2 border-ink/10 pt-7">
              <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">Photos and video</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Where a session photo or clip features a player under 18, we only use it publicly with a parent or
                guardian's permission, and it can be taken down on request at any time.
              </p>
            </div>

            <div className="border-t-2 border-ink/10 pt-7">
              <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">What we don't do</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                We don't sell or share your information with third parties, and we don't use it beyond running the
                coaching you've asked about.
              </p>
            </div>

            <div className="border-t-2 border-ink/10 pt-7">
              <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">How long we keep it</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                We keep enquiry and booking details for as long as you're training with the academy, plus a
                reasonable period afterwards in case you return. Ask and we'll delete it sooner.
              </p>
            </div>

            <div className="border-t-2 border-ink/10 pt-7">
              <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">Your rights</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Under GDPR you can ask for a copy of what we hold about you, ask us to correct or delete it, or
                object to how it's used. Email{" "}
                <a className="text-link" href="mailto:inspiregk2023@gmail.com">inspiregk2023@gmail.com</a>. If a
                concern isn't resolved to your satisfaction, you can complain to the Irish Data Protection
                Commission.
              </p>
            </div>

            <div className="border-t-2 border-ink/10 pt-7">
              <h2 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">Contact</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Email <a className="text-link" href="mailto:inspiregk2023@gmail.com">inspiregk2023@gmail.com</a> or
                call <a className="text-link" href="tel:+353896564601">+353 89 656 4601</a>. Based in the South-East
                of Ireland.
              </p>
            </div>
          </div>

          <div className="mt-14 flex items-start gap-3 border-t-4 border-lime bg-white p-5 text-sm leading-6 text-slate-500 shadow-[6px_6px_0_#dfe8ec]">
            <ShieldCheck className="mt-0.5 shrink-0 text-cobalt" size={18} strokeWidth={1.6} />
            <p>
              This site is a front-end preview: the enquiry form doesn't send anywhere yet, so nothing described
              above is actually being collected or stored today. This page shows what would apply once the site
              goes live.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
