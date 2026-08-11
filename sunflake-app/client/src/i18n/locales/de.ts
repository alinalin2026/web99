import type { Dictionary } from "../types";

export const de: Dictionary = {
  meta: {
    title: "SunFlake Holidays | Maßgeschneiderte Reisen",
    description:
      "SunFlake Holidays — wir suchen, Sie reisen, Sie entspannen. Maßgeschneiderte Reisen für anspruchsvolle Reisende, von Alpengipfeln bis zu Sonnenstränden.",
  },
  nav: {
    howItWorks: "So funktioniert's",
    quiz: "Zum Quiz",
    stories: "Reisegeschichten",
    contact: "Kontakt",
    cta: "Reise beginnen",
  },
  hero: {
    eyebrow: "Boutique-Reisekonzierge",
    title: "Von Schneegipfeln zu Sonnenstränden.",
    subtitle:
      "Wir suchen. Sie reisen. Sie entspannen. Jeder Reisende ist einzigartig — genau wie jede Reise, die wir für Sie gestalten.",
    ctaPrimary: "Zum Quiz",
    ctaSecondary: "So funktioniert's",
  },
  howItWorks: {
    title: "So funktioniert's",
    subtitle: "Drei entspannte Schritte zwischen Ihnen und Ihrer nächsten Auszeit.",
    steps: [
      {
        title: "Erzählen Sie uns Ihren Traum",
        body: "Ein paar ehrliche Fragen dazu, wie Sie wirklich reisen möchten — kein Formular, das sich wie eine Steuererklärung anfühlt.",
      },
      {
        title: "Wir suchen",
        body: "Unsere Reisedesigner durchforsten Boutique-Unterkünfte und versteckte Ecken der Landkarte, die Algorithmen gerne übersehen.",
      },
      {
        title: "Sie reisen, Sie entspannen",
        body: "Eine kuratierte Reiseroute landet in Ihrem Postfach — für Sie gestaltet, nicht eine Vorlage mit Ihrem Namen darauf.",
      },
    ],
  },
  quiz: {
    title: "Finden Sie Ihr Match",
    subtitle:
      "Fünf schnelle Fragen. Eine ehrliche Antwort nach der anderen. Wir finden die Auszeit, die wirklich zu Ihnen passt.",
    start: "Quiz starten",
    questionWord: "Frage",
    next: "Weiter",
    back: "Zurück",
    seeResult: "Mein Match zeigen",
    restart: "Nochmal versuchen",
    ctaContact: "Meine persönliche Reiseroute erhalten",
    questions: [
      {
        id: "heart",
        prompt: "Wohin zieht es Ihr Herz zuerst?",
        options: [
          { id: "a", label: "Direkt in die Berge", weight: "alpine" },
          { id: "b", label: "Direkt an die Küste", weight: "coastal" },
          { id: "c", label: "Ehrlich gesagt, unmöglich zu entscheiden", weight: "both" },
        ],
      },
      {
        id: "soundtrack",
        prompt: "Wählen Sie den Soundtrack für Ihren Urlaub.",
        options: [
          { id: "a", label: "Wind in den Kiefern", weight: "alpine" },
          { id: "b", label: "Wellen am Ufer", weight: "coastal" },
          { id: "c", label: "Beides, im Zufallsmodus", weight: "both" },
        ],
      },
      {
        id: "afternoon",
        prompt: "Beschreiben Sie Ihren idealen Nachmittag.",
        options: [
          { id: "a", label: "Eine Wanderung mit einer Aussicht, die den Aufstieg lohnt", weight: "alpine" },
          { id: "b", label: "Ein Schwimmen, dann ein sehr langes Nickerchen", weight: "coastal" },
          { id: "c", label: "Von beidem etwas, bitte", weight: "both" },
        ],
      },
      {
        id: "suitcase",
        prompt: "Was steckt wirklich in Ihrem Koffer?",
        options: [
          { id: "a", label: "Ein Wollpullover und richtige Wanderschuhe", weight: "alpine" },
          { id: "b", label: "Ein Badeanzug und Sonnencreme", weight: "coastal" },
          { id: "c", label: "Schichten für absolut alles", weight: "both" },
        ],
      },
      {
        id: "evening",
        prompt: "Wie mögen Sie Ihre Abende?",
        options: [
          { id: "a", label: "Am Kamin, etwas Warmes in der Hand", weight: "alpine" },
          { id: "b", label: "Auf der Terrasse, Sonnenuntergang, etwas Kühles in der Hand", weight: "coastal" },
          { id: "c", label: "Kommt ganz auf den Abend an", weight: "both" },
        ],
      },
    ],
    results: {
      alpine: {
        title: "Die Alpenauszeit",
        body: "Sie fühlen sich zu dünner Luft und weiten Ausblicken hingezogen — Hütten mit Holzofen, Pfade, die auf einem Grat enden, und Abende, die man sich wirklich verdient hat. Wir würden Sie in den Bergen starten lassen.",
      },
      coastal: {
        title: "Die Küstenauszeit",
        body: "Sie reisen für dieses langsame Loslassen, das nur salzige Luft schafft — Terrassen, lange Mittagessen und ein Horizont ohne Programm. Wir würden Sie am Wasser starten lassen.",
      },
      both: {
        title: "Von Schnee zu Sand",
        body: "Sie wollen sich nicht entscheiden, und ehrlich gesagt, wir an Ihrer Stelle auch nicht. Eine Reiseroute, zwei Landschaften — alpine Morgen und Strandabende in derselben Reise.",
      },
    },
  },
  stories: {
    sectionTitle: "Reisegeschichten",
    sectionSubtitle: "Einige der Reisen, die wir gestaltet haben — richtig erzählt.",
    readMore: "Geschichte lesen",
    backToStories: "Zurück zu den Reisegeschichten",
    minuteRead: "Min. Lesezeit",
    items: [
      {
        slug: "alps-cabin-escape",
        title: "Eine Woche in den Alpen: Berghütten-Auszeiten",
        excerpt:
          "Holzrauch, Kuhglocken und eine Hütte mit einer Aussicht, bei der man mitten im Satz innehält. Notizen aus einer Woche in den Hochtälern.",
        readTime: "4",
        body: [
          "Die Hütte lag knapp über der Baumgrenze, nah genug am Dorf, dass frisches Brot nur fünfzehn Gehminuten entfernt war, und weit genug weg, dass nach Einbruch der Dunkelheit nur der Bach unter der Terrasse zu hören war. Das ist die Version der Berge, die die meisten Menschen bei einem Skiurlaub nicht zu sehen bekommen — die langsame, grüne Hochsommer-Version, wenn die Gipfel noch weiß gekappt sind, die Wiesen darunter aber voller Wildblumen stehen.",
          "Die Morgen begannen früh, nicht wegen eines Weckers, sondern weil das Licht seitlich durch die Kiefernläden fiel und das Liegenbleiben wie ein verpasster Termin wirken ließ. Kaffee auf der Terrasse, ein Blick zum Grat, und eine Entscheidung, die an diesem Tag mehr zählte als alles andere: welcher Pfad. Meistens war es der weite Weg — vorbei an alten Alphütten, entlang eines Pfades, der offensichtlich mehr von Kühen als von Wanderern begangen wurde, bis zu einem Grat, an dem sich das Tal in beide Richtungen öffnete.",
          "Die Abende gehörten dem Holzofen und einer Flasche von etwas Lokalem, der Sorte Wein, die es nie auf eine Exportliste schafft, weil kaum genug davon für das Dorf selbst da ist. Wir aßen draußen, solange es das Licht zuließ, und zogen um, sobald die Kälte von den Gipfeln herabkam — und das tat sie immer, selbst im Juli. Es gibt eine besondere Art von Müdigkeit nach einem vollen Tag draußen und einem vollen Magen, und sie sorgt für den besten Schlaf des Jahres.",
          "Wenn Sie hinfahren: Zielen Sie auf die Nebensaison, wenn die Hütten noch geöffnet, die Pfade aber schon ruhig sind, und planen Sie die Tage nicht zu genau. Der beste Nachmittag der ganzen Woche war der, den wir überhaupt nicht geplant hatten.",
        ],
      },
      {
        slug: "mediterranean-terrace",
        title: "Mittelmeer-Sonnenuntergänge: Das Leben auf der Terrasse",
        excerpt:
          "Weiß getünchte Mauern, eine Terrasse, die das letzte Licht einfängt, und absolut nichts zu tun. Notizen von der Küste.",
        readTime: "4",
        body: [
          "Die Terrasse lag nach Westen, und das erwies sich als die einzige Entscheidung, die wirklich zählte. Alles andere in dieser Woche ordnete sich um diese eine Tatsache — wo man zu Mittag aß, wann man schwamm, wann man ans Abendessen dachte — alles darauf ausgerichtet, genau in diesem Stuhl zu sitzen, wenn die Sonne ins Wasser sank.",
          "Der Ort selbst war klein genug, um ihn von einem Ende zum anderen zu durchqueren, bevor der Kaffee kalt wurde, weiß getüncht und sonnengebleicht auf eine Art, die Fotos nie ganz einfangen, weil Fotos die Hitze, die vom Stein abstrahlt, nicht transportieren können. Die Morgen gehörten dem Markt — Tomaten, die noch nach etwas schmeckten, noch warmes Brot, ein Fischstand mit dem, was in der Nacht hereingekommen war. Die Nachmittage gehörten dem bewussten Nichtstun, woran man sich erst ein paar Tage gewöhnen musste.",
          "Das Meer selbst war schon am Vormittag warm genug zum Schwimmen, ohne den üblichen scharfen Atemzug, klar genug, um die eigenen Füße auf Brusthöhe zu sehen, und nah genug, dass der Weg zurück zur Dusche sich nicht wie eine Niederlage anfühlte. Die meisten Tage hatten genau einen Plan, und das reichte meistens.",
          "Wenn Sie hinfahren: Buchen Sie das Zimmer mit Terrasse, auch wenn es mehr kostet. Am Ende zahlen Sie für das Licht — und das ist jeden Cent wert.",
        ],
      },
      {
        slug: "snow-to-sand",
        title: "Von Schneegipfeln zu Sonnenstränden: Eine Reiseroute, zwei Welten",
        excerpt:
          "Für Reisende, die sich weigern, zwischen Bergen und Meer zu wählen — denn warum sollten sie?",
        readTime: "5",
        body: [
          "Von Zeit zu Zeit sagt uns ein Reisender, dass er die Berge und die Küste in derselben Reise haben möchte, und fragt, leicht entschuldigend, ob das ein seltsamer Wunsch sei. Ist es nicht. Es ist meist das beste Briefing, das wir bekommen, weil es die Reiseroute zwingt, sich ihre Übergänge wirklich zu verdienen, statt einfach nur Tage zu füllen.",
          "Der Trick liegt in der Reihenfolge und im Tempo, nicht im Ehrgeiz. Beginnen Sie oben: erst drei oder vier Tage in den Gipfeln, solange die Beine noch frisch sind und die Kälte sich noch wie eine Neuheit und nicht wie eine Last anfühlt. Lange Vormittage auf den Pfaden, kurze Abende am Feuer, und ein allmählicher — im wörtlichen Sinne — Abstieg zur Küste, damit der Körper Zeit hat, die wärmer werdende Luft und das längere Licht zu bemerken, bevor das Meer überhaupt in Sicht kommt.",
          "Die mittlere Etappe, die Fahrt oder die Zugfahrt hinunter durch die Vorberge, wird oft zu einem der schönsten Teile der Reise, gerade weil niemand sie plant. Weinberge, wo die Berge flacher werden, ein Mittagsstopp in einem Ort, von dem niemand gehört hat, der erste Blick aufs Wasser irgendwo hinter einer Kurve, bei dem für einen Moment das ganze Auto verstummt.",
          "Dann tut die Küste, was sie am besten kann — sie verlangsamt alles. Die letzten drei oder vier Tage gehören der Terrasse, dem Schwimmen, dem langen Mittagessen, dem Sonnenuntergang. Am Ende fühlen sich die Berge wie eine ganz andere Reise an, und genau das ist der Punkt. Eine Reiseroute, zwei sehr unterschiedliche Arten, überhaupt nichts zu tun.",
        ],
      },
    ],
  },
  footer: {
    tagline: "Wir suchen. Sie reisen. Sie entspannen.",
    contactTitle: "Erzählen Sie uns Ihren Traum",
    contactBody:
      "Machen Sie das Quiz, oder schreiben Sie uns direkt — jede Nachricht wird von einem echten Menschen gelesen.",
    rights: "SunFlake Holidays. Maßgeschneiderte Reisen.",
  },
  notFound: {
    title: "Dieser Pfad führt nirgendwohin",
    body: "Die gesuchte Seite hat sich verlaufen. Zurück zur Karte.",
    cta: "Zurück zu SunFlake",
  },
  common: {
    language: "Sprache",
  },
};
