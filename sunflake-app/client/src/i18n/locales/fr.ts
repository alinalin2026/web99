import type { Dictionary } from "../types";

export const fr: Dictionary = {
  meta: {
    title: "SunFlake Holidays | Voyages sur mesure",
    description:
      "SunFlake Holidays — nous cherchons, vous voyagez, vous vous détendez. Des voyages sur mesure pour les voyageurs exigeants, des sommets alpins aux plages ensoleillées.",
  },
  nav: {
    howItWorks: "Comment ça marche",
    quiz: "Faire le quiz",
    stories: "Récits de voyage",
    contact: "Contact",
    cta: "Commencer l'aventure",
  },
  hero: {
    eyebrow: "Conciergerie de voyage sur mesure",
    title: "Des sommets enneigés aux plages ensoleillées.",
    subtitle:
      "Nous cherchons. Vous voyagez. Vous vous détendez. Chaque voyageur est unique — chaque voyage que nous concevons l'est tout autant.",
    ctaPrimary: "Faire le quiz",
    ctaSecondary: "Voir comment ça marche",
  },
  howItWorks: {
    title: "Comment ça marche",
    subtitle: "Trois étapes tranquilles entre vous et votre prochaine escapade.",
    steps: [
      {
        title: "Racontez-nous votre rêve",
        body: "Quelques questions sincères sur votre façon de voyager — aucun formulaire qui ressemble à une déclaration d'impôts.",
      },
      {
        title: "Nous cherchons",
        body: "Nos conseillers voyage passent au crible des adresses de charme et des coins de carte que les algorithmes oublient souvent.",
      },
      {
        title: "Vous voyagez, vous vous détendez",
        body: "Un itinéraire sur mesure arrive dans votre boîte mail, pensé pour vous — pas un modèle avec votre nom dessus.",
      },
    ],
  },
  quiz: {
    title: "Trouvez votre voyage",
    subtitle:
      "Cinq questions rapides. Une réponse sincère à la fois. Nous vous associerons à l'escapade qui vous correspond vraiment.",
    start: "Commencer le quiz",
    questionWord: "Question",
    next: "Suivant",
    back: "Retour",
    seeResult: "Découvrir mon match",
    restart: "Recommencer",
    ctaContact: "Recevoir mon itinéraire personnalisé",
    questions: [
      {
        id: "heart",
        prompt: "Où votre cœur vous emmène-t-il en premier ?",
        options: [
          { id: "a", label: "Tout droit vers la montagne", weight: "alpine" },
          { id: "b", label: "Tout droit vers le rivage", weight: "coastal" },
          { id: "c", label: "Impossible de choisir, honnêtement", weight: "both" },
        ],
      },
      {
        id: "soundtrack",
        prompt: "Choisissez la bande-son de vos vacances.",
        options: [
          { id: "a", label: "Le vent dans les pins", weight: "alpine" },
          { id: "b", label: "Les vagues sur le rivage", weight: "coastal" },
          { id: "c", label: "Les deux, en aléatoire", weight: "both" },
        ],
      },
      {
        id: "afternoon",
        prompt: "Décrivez votre après-midi idéal.",
        options: [
          { id: "a", label: "Une randonnée avec une vue qui mérite l'effort", weight: "alpine" },
          { id: "b", label: "Une baignade, puis une très longue sieste", weight: "coastal" },
          { id: "c", label: "Un peu des deux, s'il vous plaît", weight: "both" },
        ],
      },
      {
        id: "suitcase",
        prompt: "Qu'y a-t-il vraiment dans votre valise ?",
        options: [
          { id: "a", label: "Un pull en laine et de vraies chaussures de marche", weight: "alpine" },
          { id: "b", label: "Un maillot de bain et de la crème solaire", weight: "coastal" },
          { id: "c", label: "Des couches pour absolument tout", weight: "both" },
        ],
      },
      {
        id: "evening",
        prompt: "Comment aimez-vous vos soirées ?",
        options: [
          { id: "a", label: "Au coin du feu, une boisson chaude à la main", weight: "alpine" },
          { id: "b", label: "En terrasse, coucher de soleil, boisson fraîche", weight: "coastal" },
          { id: "c", label: "Ça dépend entièrement du soir", weight: "both" },
        ],
      },
    ],
    results: {
      alpine: {
        title: "L'Escapade Alpine",
        body: "Vous êtes attiré par l'air pur et les grands panoramas — chalets avec poêle à bois, sentiers qui finissent sur une crête, soirées bien méritées. Nous commencerions par la montagne.",
      },
      coastal: {
        title: "L'Escapade Côtière",
        body: "Vous voyagez pour ce relâchement lent que seul l'air marin procure — terrasses, longs déjeuners, un horizon sans rien au programme. Nous commencerions par le bord de mer.",
      },
      both: {
        title: "De la Neige au Sable",
        body: "Vous ne voulez pas choisir, et franchement, nous non plus à votre place. Un seul itinéraire, deux paysages — matins alpins et soirées à la plage dans le même voyage.",
      },
    },
  },
  stories: {
    sectionTitle: "Récits de voyage",
    sectionSubtitle: "Quelques-uns des voyages que nous avons conçus, racontés comme il se doit.",
    readMore: "Lire le récit",
    backToStories: "Retour aux récits de voyage",
    minuteRead: "min de lecture",
    items: [
      {
        slug: "alps-cabin-escape",
        title: "Une Semaine dans les Alpes : Escapades en Chalet",
        excerpt:
          "Fumée de bois, cloches de vaches, et un chalet avec une vue qui coupe le souffle en pleine phrase. Carnet d'une semaine dans les hautes vallées.",
        readTime: "4",
        body: [
          "Le chalet se trouvait juste au-dessus de la limite des arbres, assez proche du village pour que le pain frais ne soit qu'à quinze minutes de marche, et assez loin pour que le seul bruit après la tombée de la nuit soit le ruisseau sous la terrasse. C'est la version des montagnes que peu de gens voient lors d'un séjour au ski — la version lente, verte, de plein été, quand les sommets sont encore couverts de blanc mais que les prairies en dessous débordent de fleurs sauvages.",
          "Les matins commençaient tôt, non pas à cause d'un réveil, mais parce que la lumière entrait de biais à travers les volets en pin et rendait le fait de rester au lit presque impensable. Café sur la terrasse, un regard vers la crête, et une décision plus importante que toute autre ce jour-là : quel sentier prendre. La plupart du temps, c'était le chemin le plus long — au-delà des anciens chalets d'alpage, le long d'un sentier visiblement plus fréquenté par les vaches que par les randonneurs, jusqu'à une crête où la vallée s'ouvrait dans les deux directions.",
          "Les soirées appartenaient au poêle à bois et à une bouteille de vin local, de ceux qui ne quittent jamais le village faute de quantité suffisante pour l'exporter. Nous mangions dehors tant que la lumière le permettait, puis rentrions quand le froid descendait des sommets — et il descendait toujours, même en juillet. Il existe une fatigue particulière après une journée entière au grand air et un ventre bien rempli, et elle garantit le meilleur sommeil de l'année.",
          "Si vous partez : visez l'arrière-saison, quand les refuges sont encore ouverts mais les sentiers déjà tranquilles, et ne planifiez pas trop vos journées. Le meilleur après-midi de toute la semaine fut celui que nous n'avions absolument pas prévu.",
        ],
      },
      {
        slug: "mediterranean-terrace",
        title: "Couchers de Soleil Méditerranéens : La Vie en Terrasse",
        excerpt:
          "Murs blanchis à la chaux, une terrasse qui capte les derniers rayons, et absolument rien à faire. Carnet de la côte.",
        readTime: "4",
        body: [
          "La terrasse était orientée à l'ouest, ce qui s'est avéré être la seule décision qui comptait vraiment. Tout le reste de la semaine s'est organisé autour de ce simple fait — où déjeuner, quand se baigner, à quelle heure penser au dîner — tout cela construit autour du moment d'être assis dans ce fauteuil précis quand le soleil plongeait dans l'eau.",
          "Le village lui-même était assez petit pour être traversé d'un bout à l'autre avant que le café ne refroidisse, blanchi à la chaux et délavé par le soleil d'une façon que les photos ne rendent jamais vraiment, car elles ne peuvent pas transmettre la chaleur qui se dégage de la pierre. Les matins étaient pour le marché — des tomates qui avaient un vrai goût, du pain encore chaud, un étal de poisson avec ce qui était arrivé la veille au soir. Les après-midis étaient pour ne rien faire, exprès, ce qui a demandé quelques jours d'adaptation.",
          "La mer elle-même était suffisamment chaude dès le milieu de matinée pour s'y baigner sans le traditionnel sursaut, assez claire pour voir ses pieds à hauteur de poitrine, et assez proche pour que le retour sous la douche ne ressemble jamais à un aveu d'échec. La plupart des journées n'avaient qu'un seul programme, et c'était généralement suffisant.",
          "Si vous partez : réservez la chambre avec terrasse même si elle coûte plus cher. Vous payez, au fond, pour la lumière — et elle vaut chaque centime.",
        ],
      },
      {
        slug: "snow-to-sand",
        title: "Des Sommets Enneigés aux Plages Ensoleillées : Un Itinéraire, Deux Mondes",
        excerpt:
          "Pour les voyageurs qui refusent de choisir entre la montagne et la mer — parce que pourquoi le devraient-ils ?",
        readTime: "5",
        body: [
          "De temps en temps, un voyageur nous dit qu'il souhaite la montagne et la mer dans le même voyage, en demandant, presque en s'excusant, si c'est une requête étrange. Ce ne l'est pas. C'est généralement le meilleur brief que nous recevons, car il oblige l'itinéraire à vraiment mériter ses transitions plutôt que de simplement remplir les journées.",
          "L'astuce réside dans l'ordre et le rythme, pas dans l'ambition. Commencez en altitude : trois ou quatre jours dans les sommets d'abord, tant que les jambes sont fraîches et que le froid ressemble encore à une nouveauté plutôt qu'à une corvée. De longues matinées sur les sentiers, de courtes soirées près du feu, et une descente progressive — littéralement — vers la côte, pour que le corps ait le temps de sentir l'air se réchauffer et la lumière s'allonger avant même que la mer n'apparaisse.",
          "Le tronçon du milieu, la route ou le train qui descend à travers les contreforts, finit par être l'un des meilleurs moments du voyage, justement parce que personne ne le prévoit. Des vignobles là où les montagnes s'aplanissent, une halte déjeuner dans une ville dont personne n'a entendu parler, le premier aperçu de l'eau à un virage qui fait taire toute la voiture un instant.",
          "Puis la côte fait ce qu'elle sait faire — elle ralentit tout. Les trois ou quatre derniers jours sont pour la terrasse, la baignade, le long déjeuner, le coucher de soleil. À la fin, les montagnes ressemblent à un tout autre voyage, ce qui est plutôt le but. Un seul itinéraire, deux façons très différentes de ne rien faire du tout.",
        ],
      },
    ],
  },
  footer: {
    tagline: "Nous cherchons. Vous voyagez. Vous vous détendez.",
    contactTitle: "Racontez-nous votre rêve",
    contactBody:
      "Faites le quiz, ou écrivez-nous directement — une vraie personne lit chaque message.",
    rights: "SunFlake Holidays. Voyages sur mesure.",
  },
  notFound: {
    title: "Ce sentier ne mène nulle part",
    body: "La page que vous cherchez s'est égarée. Revenons à la carte.",
    cta: "Retour à SunFlake",
  },
  common: {
    language: "Langue",
  },
};
