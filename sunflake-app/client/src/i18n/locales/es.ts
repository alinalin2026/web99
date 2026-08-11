import type { Dictionary } from "../types";

export const es: Dictionary = {
  meta: {
    title: "SunFlake Holidays | Viajes a medida",
    description:
      "SunFlake Holidays — nosotros buscamos, tú viajas, tú descansas. Viajes a medida para viajeros exigentes, de las cumbres alpinas a las playas soleadas.",
  },
  nav: {
    howItWorks: "Cómo funciona",
    quiz: "Hacer el test",
    stories: "Historias de viaje",
    contact: "Contacto",
    cta: "Empieza tu viaje",
  },
  hero: {
    eyebrow: "Conserjería de viajes a medida",
    title: "De cumbres nevadas a playas soleadas.",
    subtitle:
      "Nosotros buscamos. Tú viajas. Tú descansas. Cada viajero es único — igual que cada viaje que diseñamos para ti.",
    ctaPrimary: "Hacer el test",
    ctaSecondary: "Ver cómo funciona",
  },
  howItWorks: {
    title: "Cómo funciona",
    subtitle: "Tres pasos sin prisa entre tú y tu próxima escapada.",
    steps: [
      {
        title: "Cuéntanos tu sueño",
        body: "Unas cuantas preguntas sinceras sobre cómo te gusta viajar de verdad — nada de formularios que parecen la declaración de la renta.",
      },
      {
        title: "Nosotros buscamos",
        body: "Nuestros diseñadores de viajes rastrean alojamientos con encanto y rincones del mapa que los algoritmos suelen pasar por alto.",
      },
      {
        title: "Tú viajas, tú descansas",
        body: "Un itinerario a medida llega a tu bandeja de entrada, pensado para ti — no una plantilla con tu nombre puesto.",
      },
    ],
  },
  quiz: {
    title: "Encuentra tu destino",
    subtitle:
      "Cinco preguntas rápidas. Una respuesta sincera cada vez. Te encontraremos la escapada que de verdad te va.",
    start: "Empezar el test",
    questionWord: "Pregunta",
    next: "Siguiente",
    back: "Atrás",
    seeResult: "Revelar mi resultado",
    restart: "Repetir el test",
    ctaContact: "Quiero mi itinerario personalizado",
    questions: [
      {
        id: "heart",
        prompt: "¿Adónde va tu corazón primero?",
        options: [
          { id: "a", label: "Directo a la montaña", weight: "alpine" },
          { id: "b", label: "Directo a la orilla del mar", weight: "coastal" },
          { id: "c", label: "Sinceramente, imposible elegir", weight: "both" },
        ],
      },
      {
        id: "soundtrack",
        prompt: "Elige la banda sonora de tus vacaciones.",
        options: [
          { id: "a", label: "El viento entre los pinos", weight: "alpine" },
          { id: "b", label: "Las olas en la orilla", weight: "coastal" },
          { id: "c", label: "Las dos, en modo aleatorio", weight: "both" },
        ],
      },
      {
        id: "afternoon",
        prompt: "Describe tu tarde ideal.",
        options: [
          { id: "a", label: "Una ruta con unas vistas que merecen la subida", weight: "alpine" },
          { id: "b", label: "Un baño y luego una siesta muy larga", weight: "coastal" },
          { id: "c", label: "Un poco de cada cosa, por favor", weight: "both" },
        ],
      },
      {
        id: "suitcase",
        prompt: "¿Qué llevas de verdad en la maleta?",
        options: [
          { id: "a", label: "Un jersey de lana y botas de verdad", weight: "alpine" },
          { id: "b", label: "Bañador y protector solar", weight: "coastal" },
          { id: "c", label: "Capas para absolutamente todo", weight: "both" },
        ],
      },
      {
        id: "evening",
        prompt: "¿Cómo te gustan las noches?",
        options: [
          { id: "a", label: "Junto al fuego, algo caliente en la mano", weight: "alpine" },
          { id: "b", label: "En la terraza, atardecer, algo fresco en la mano", weight: "coastal" },
          { id: "c", label: "Depende totalmente de la noche", weight: "both" },
        ],
      },
    ],
    results: {
      alpine: {
        title: "La Escapada Alpina",
        body: "Te atrae el aire fino y las grandes vistas — cabañas con estufa de leña, senderos que terminan en una cresta, y noches bien merecidas. Empezaríamos tu viaje en la montaña.",
      },
      coastal: {
        title: "La Escapada Costera",
        body: "Viajas por ese relax lento que solo el aire marino sabe dar — terrazas, comidas largas, y un horizonte sin nada planeado. Empezaríamos tu viaje junto al mar.",
      },
      both: {
        title: "De la Nieve a la Arena",
        body: "No quieres elegir, y sinceramente, nosotros tampoco en tu lugar. Un solo itinerario, dos paisajes — mañanas alpinas y atardeceres de playa en el mismo viaje.",
      },
    },
  },
  stories: {
    sectionTitle: "Historias de viaje",
    sectionSubtitle: "Algunos de los viajes que hemos diseñado, contados como merecen.",
    readMore: "Leer la historia",
    backToStories: "Volver a las historias de viaje",
    minuteRead: "min de lectura",
    items: [
      {
        slug: "alps-cabin-escape",
        title: "Una Semana en los Alpes: Escapadas en Cabaña",
        excerpt:
          "Humo de leña, cencerros, y una cabaña con unas vistas que te detienen a media frase. Notas de una semana en los valles altos.",
        readTime: "4",
        body: [
          "La cabaña estaba justo por encima del límite del bosque, lo bastante cerca del pueblo como para llegar al pan recién hecho en quince minutos andando, y lo bastante lejos como para que el único sonido después del anochecer fuera el arroyo bajo la terraza. Esta es la versión de la montaña que la mayoría no llega a ver en un viaje de esquí — la versión lenta y verde del verano alto, cuando las cumbres todavía tienen nieve pero los prados de abajo están llenos de flores silvestres.",
          "Las mañanas empezaban temprano, no por ninguna alarma, sino porque la luz entraba de lado por las contraventanas de pino y quedarse en la cama parecía una cita perdida. Café en la terraza, una mirada a la cresta, y una decisión más importante que cualquier otra ese día: qué sendero. La mayoría de los días era el camino largo — pasando antiguas cabañas de pastores, por un sendero claramente más transitado por vacas que por senderistas, hasta una cresta donde el valle se abría en ambas direcciones.",
          "Las noches eran para la estufa de leña y una botella de algo local, del tipo de vino que nunca llega a exportarse porque apenas hay suficiente para el propio pueblo. Comíamos fuera mientras la luz lo permitía, y entrábamos en cuanto el frío bajaba de las cumbres — y siempre bajaba, incluso en julio. Existe un tipo particular de cansancio que viene de un día entero al aire libre y un estómago lleno, y produce el mejor sueño del año.",
          "Si vas: apunta a la temporada media, cuando los refugios siguen abiertos pero los senderos ya están tranquilos, y no planifiques demasiado los días. La mejor tarde de toda la semana fue la que no habíamos planeado en absoluto.",
        ],
      },
      {
        slug: "mediterranean-terrace",
        title: "Atardeceres Mediterráneos: Vida en la Terraza",
        excerpt:
          "Paredes encaladas, una terraza que atrapa la última luz, y absolutamente nada que hacer. Notas de la costa.",
        readTime: "4",
        body: [
          "La terraza miraba al oeste, y esa resultó ser la única decisión que de verdad importaba. Todo lo demás de la semana se organizó alrededor de ese único hecho — dónde comer, cuándo bañarse, a qué hora empezar a pensar en la cena — todo construido en torno a estar en esa silla exacta cuando el sol caía al agua.",
          "El pueblo en sí era lo bastante pequeño como para cruzarlo de punta a punta antes de que se enfriara el café, encalado y desgastado por el sol de una forma que las fotos nunca terminan de capturar, porque las fotos no transmiten el calor que desprende la piedra. Las mañanas eran para el mercado — tomates que sabían a algo, pan aún caliente, un puesto de pescado con lo que había llegado esa noche. Las tardes eran para no hacer casi nada, a propósito, algo que costó unos días acostumbrarse.",
          "El mar en sí estaba lo bastante templado a media mañana como para nadar sin el habitual respingo, lo bastante claro como para verte los pies a la altura del pecho, y lo bastante cerca como para que la vuelta a la ducha no se sintiera como una rendición. La mayoría de los días tenían exactamente un plan, y solía ser suficiente.",
          "Si vas: reserva la habitación con terraza aunque cueste más. Al final, lo que pagas es la luz — y vale hasta el último céntimo.",
        ],
      },
      {
        slug: "snow-to-sand",
        title: "De Cumbres Nevadas a Playas Soleadas: Un Itinerario, Dos Mundos",
        excerpt:
          "Para los viajeros que se niegan a elegir entre la montaña y el mar — porque ¿por qué deberían?",
        readTime: "5",
        body: [
          "De vez en cuando un viajero nos dice que quiere la montaña y la costa en el mismo viaje, y pregunta, casi disculpándose, si es una petición extraña. No lo es. Suele ser el mejor encargo que recibimos, porque obliga al itinerario a ganarse de verdad sus transiciones en lugar de limitarse a llenar días.",
          "El truco está en el orden y en el ritmo, no en la ambición. Empieza arriba: tres o cuatro días en las cumbres primero, mientras las piernas están frescas y el frío todavía se siente como una novedad y no como una carga. Mañanas largas en los senderos, noches cortas junto al fuego, y un descenso gradual — literalmente — hacia la costa, para que el cuerpo tenga tiempo de notar cómo el aire se va calentando y la luz se alarga antes incluso de que aparezca el mar.",
          "El tramo intermedio, el trayecto en coche o en tren bajando por las estribaciones, acaba siendo una de las mejores partes del viaje precisamente porque nadie lo planea. Viñedos donde las montañas se allanan, una parada para comer en un pueblo del que nadie ha oído hablar, el primer vistazo al agua en alguna curva que hace callar al coche entero por un segundo.",
          "Entonces la costa hace lo que mejor sabe hacer — ralentizarlo todo. Los últimos tres o cuatro días son para la terraza, el baño, la comida larga, el atardecer. Al final, la montaña parece un viaje completamente distinto, que es precisamente la idea. Un itinerario, dos formas muy distintas de no hacer absolutamente nada.",
        ],
      },
    ],
  },
  footer: {
    tagline: "Nosotros buscamos. Tú viajas. Tú descansas.",
    contactTitle: "Cuéntanos tu sueño",
    contactBody:
      "Haz el test, o escríbenos directamente — una persona de verdad lee cada mensaje.",
    rights: "SunFlake Holidays. Viajes a medida.",
  },
  notFound: {
    title: "Este sendero no lleva a ninguna parte",
    body: "La página que buscas se ha extraviado. Volvamos al mapa.",
    cta: "Volver a SunFlake",
  },
  common: {
    language: "Idioma",
  },
};
