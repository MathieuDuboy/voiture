// /api/random.js - Version corrigée (approche en 2 requêtes)

// ===============================
// Cache mémoire des communes
// ===============================
let COMMUNES = null;

// ===============================
// Table départements
// ===============================
const DEPARTEMENTS = {
  "01": "Ain","02": "Aisne","03": "Allier","04": "Alpes-de-Haute-Provence","05": "Hautes-Alpes",
  "06": "Alpes-Maritimes","07": "Ardèche","08": "Ardennes","09": "Ariège","10": "Aube",
  "11": "Aude","12": "Aveyron","13": "Bouches-du-Rhône","14": "Calvados","15": "Cantal",
  "16": "Charente","17": "Charente-Maritime","18": "Cher","19": "Corrèze","21": "Côte-d'Or",
  "22": "Côtes-d'Armor","23": "Creuse","24": "Dordogne","25": "Doubs","26": "Drôme",
  "27": "Eure","28": "Eure-et-Loir","29": "Finistère","2A": "Corse-du-Sud","2B": "Haute-Corse",
  "30": "Gard","31": "Haute-Garonne","32": "Gers","33": "Gironde","34": "Hérault",
  "35": "Ille-et-Vilaine","36": "Indre","37": "Indre-et-Loire","38": "Isère","39": "Jura",
  "40": "Landes","41": "Loir-et-Cher","42": "Loire","43": "Haute-Loire","44": "Loire-Atlantique",
  "45": "Loiret","46": "Lot","47": "Lot-et-Garonne","48": "Lozère","49": "Maine-et-Loire",
  "50": "Manche","51": "Marne","52": "Haute-Marne","53": "Mayenne","54": "Meurthe-et-Moselle",
  "55": "Meuse","56": "Morbihan","57": "Moselle","58": "Nièvre","59": "Nord",
  "60": "Oise","61": "Orne","62": "Pas-de-Calais","63": "Puy-de-Dôme","64": "Pyrénées-Atlantiques",
  "65": "Hautes-Pyrénées","66": "Pyrénées-Orientales","67": "Bas-Rhin","68": "Haut-Rhin",
  "69": "Rhône","70": "Haute-Saône","71": "Saône-et-Loire","72": "Sarthe","73": "Savoie",
  "74": "Haute-Savoie","75": "Paris","76": "Seine-Maritime","77": "Seine-et-Marne",
  "78": "Yvelines","79": "Deux-Sèvres","80": "Somme","81": "Tarn","82": "Tarn-et-Garonne",
  "83": "Var","84": "Vaucluse","85": "Vendée","86": "Vienne","87": "Haute-Vienne",
  "88": "Vosges","89": "Yonne","90": "Territoire de Belfort","91": "Essonne",
  "92": "Hauts-de-Seine","93": "Seine-Saint-Denis","94": "Val-de-Marne","95": "Val-d'Oise",
  "971": "Guadeloupe","972": "Martinique","973": "Guyane","974": "La Réunion","976": "Mayotte"
};

// ===============================
// Outils texte
// ===============================
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // enlève les accents
}

// ===============================
// Intro variée (UX)
// ===============================
const INTRO_START = [
  "Nous venons d'arriver à",
  "Nous explorons aujourd'hui",
  "Nous faisons escale à",
  "Bienvenue à",
  "Notre aventure nous emmène à"
];

const INTRO_MIDDLE = [
  "une charmante ville située dans le département de",
  "une ville du département de",
  "un endroit intéressant dans le département de",
  "un coin de France dans le département de"
];

const INTRO_TRANSITION = [
  "En regardant autour de nous, j'ai découvert",
  "En explorant les environs, on peut trouver",
  "Autour de nous, il y a",
  "J'ai repéré"
];

const INTRO_END = [
  "Qu'est-ce qui te ferait plaisir de découvrir en premier ?",
  "Que veux-tu explorer ?",
  "Par quoi commence-t-on l'aventure ?",
  "Dis-moi ce qui t'intrigue le plus."
];

function buildIntro(city, deptName, groups) {
  // "Autres découvertes" toujours en dernier
  const cats = groups.filter(g => g !== "Autres découvertes");
  if (groups.includes("Autres découvertes")) cats.push("Autres découvertes");

  let list;
  if (cats.length === 0) list = "quelques endroits intéressants";
  else if (cats.length === 1) list = cats[0];
  else if (cats.length === 2) list = `${cats[0]} et ${cats[1]}`;
  else list = `${cats.slice(0, -1).join(", ")} et ${cats[cats.length - 1]}`;

  return `${pick(INTRO_START)} ${city}, ${pick(INTRO_MIDDLE)} ${deptName}. ${pick(INTRO_TRANSITION)} ${list}. ${pick(INTRO_END)}`;
}

// ===============================
// Classification POI améliorée
// ===============================
function classifyPOI(categoryTitles, title) {
  const scores = {
    histoire: 0,
    art: 0,
    science: 0,
    nature: 0,
    technique: 0,
    traditions: 0
  };

  // Nettoyage des catégories
  const cleanedCats = (categoryTitles || []).map(c => 
    c.replace(/^categorie:/i, "").replace(/^catégorie:/i, "")
  );
  
  const categoryText = normalizeText(cleanedCats.join(" "));
  const titleText = normalizeText(title);

  // Mots-clés pondérés
  const keywords = {
    histoire: [
      { term: "eglise", w: 3 }, { term: "chapelle", w: 2 }, { term: "cathedrale", w: 3 },
      { term: "abbaye", w: 2 }, { term: "basilique", w: 2 },
      { term: "chateau", w: 3 }, { term: "fort", w: 2 }, { term: "citadelle", w: 3 },
      { term: "remparts", w: 2 }, { term: "monument historique", w: 4 }, { term: "patrimoine", w: 2 },
      { term: "archeolog", w: 3 }, { term: "vestige", w: 2 }, { term: "ruines", w: 2 },
      { term: "memorial", w: 2 }, { term: "statue", w: 1 }, { term: "tombe", w: 1 }
    ],
    art: [
      { term: "musee", w: 4 }, { term: "arts", w: 2 }, { term: "art", w: 1 },
      { term: "peinture", w: 2 }, { term: "sculpture", w: 2 }, { term: "galerie", w: 2 },
      { term: "theatre", w: 2 }, { term: "opera", w: 2 }, { term: "culture", w: 1 },
      { term: "cinema", w: 1 }
    ],
    science: [
      { term: "observatoire", w: 3 }, { term: "planetarium", w: 3 },
      { term: "astronom", w: 2 }, { term: "science", w: 2 },
      { term: "botanique", w: 2 }, { term: "geolog", w: 2 },
      { term: "aquarium", w: 2 }
    ],
    nature: [
      { term: "parc", w: 2 }, { term: "jardin", w: 2 }, { term: "arboretum", w: 3 },
      { term: "reserve naturelle", w: 4 }, { term: "site naturel", w: 2 },
      { term: "foret", w: 2 }, { term: "montagne", w: 2 },
      { term: "lac", w: 1 }, { term: "riviere", w: 1 }, { term: "cascade", w: 2 },
      { term: "grotte", w: 2 }, { term: "plage", w: 1 }
    ],
    technique: [
      { term: "pont", w: 2 }, { term: "viaduc", w: 2 }, { term: "phare", w: 2 },
      { term: "barrage", w: 2 }, { term: "canal", w: 2 },
      { term: "chemin de fer", w: 2 }, { term: "gare", w: 1 },
      { term: "industrie", w: 2 }, { term: "mine", w: 2 },
      { term: "moulin", w: 2 }
    ],
    traditions: [
      { term: "ecomusee", w: 4 }, { term: "artisan", w: 2 },
      { term: "vignoble", w: 2 }, { term: "vin", w: 1 },
      { term: "gastronom", w: 2 }
    ]
  };

  // Calcul des scores
  for (const [theme, terms] of Object.entries(keywords)) {
    for (const { term, w } of terms) {
      if (categoryText.includes(term)) scores[theme] += w;
      if (titleText.includes(term)) scores[theme] += Math.max(1, Math.floor(w / 2));
    }
  }

  // Trouver thème dominant
  let maxScore = 0;
  let main = "autres";

  for (const [theme, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      main = theme;
    }
  }

  // Seuil anti faux-positifs
  if (maxScore < 2) return "Autres découvertes";

  const themeNames = {
    histoire: "Histoire & Patrimoine",
    art: "Arts & Culture",
    science: "Sciences & Savoir",
    nature: "Nature & Environnement",
    technique: "Technique & Industrie",
    traditions: "Savoir-faire & Traditions"
  };

  return themeNames[main] || "Autres découvertes";
}

// ===============================
// API Random - VERSION FONCTIONNELLE
// ===============================
export default async function handler(req, res) {
  try {
    // 1) Charger communes.json UNE SEULE FOIS
    if (!COMMUNES) {
      const baseUrl = `https://${req.headers.host}`;
      const resp = await fetch(`${baseUrl}/communes.json`);
      
      if (!resp.ok) {
        return res.status(500).json({ error: "Impossible de charger /communes.json" });
      }

      const raw = await resp.json();

      // Filtrer uniquement celles avec coordonnées valides
      COMMUNES = raw.filter(c =>
        c &&
        c.centre &&
        Array.isArray(c.centre.coordinates) &&
        c.centre.coordinates.length === 2 &&
        typeof c.centre.coordinates[0] === "number" &&
        typeof c.centre.coordinates[1] === "number"
      );

      console.log(`✅ Communes valides: ${COMMUNES.length}`);
    }

    if (!COMMUNES || COMMUNES.length === 0) {
      return res.status(500).json({ error: "Aucune commune valide disponible" });
    }

    // 2) Choisir une commune aléatoire
    const idx = Math.floor(Math.random() * COMMUNES.length);
    const commune = COMMUNES[idx];

    const city = commune.nom || "Ville inconnue";
    const deptCode = (commune.codeDepartement || "??").toString();
    const deptName = DEPARTEMENTS[deptCode] || "Département inconnu";

    // GeoJSON = [lon, lat]
    const lon = commune.centre.coordinates[0];
    const lat = commune.centre.coordinates[1];

    console.log(`📍 ${city} (${deptCode}) - ${lat}, ${lon}`);

    // 3) REQUÊTE 1: Recherche géographique (geosearch)
    const geosearchUrl = `https://fr.wikipedia.org/w/api.php?` + new URLSearchParams({
      action: 'query',
      list: 'geosearch',
      gscoord: `${lat}|${lon}`,
      gsradius: '10000',
      gslimit: '20',
      format: 'json',
      origin: '*'
    });

    const geoResp = await fetch(geosearchUrl);
    const geoData = await geoResp.json();
    
    const results = geoData?.query?.geosearch || [];
    console.log(`📚 ${results.length} POI trouvés`);

    // 4) Pour chaque POI, récupérer ses catégories
    const grouped = {};
    
    // Limiter à 5 requêtes simultanées pour éviter le rate limiting
    const batchSize = 5;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      // Récupérer les catégories pour chaque POI du batch
      for (const item of batch) {
        const categoriesUrl = `https://fr.wikipedia.org/w/api.php?` + new URLSearchParams({
          action: 'query',
          prop: 'categories',
          pageids: item.pageid,
          format: 'json',
          origin: '*',
          cllimit: 'max'
        });

        const catResp = await fetch(categoriesUrl);
        const catData = await catResp.json();
        
        const page = catData?.query?.pages?.[item.pageid];
        const catTitles = (page?.categories || []).map(c => c.title);
        
        // Classification avec la nouvelle fonction
        const group = classifyPOI(catTitles, item.title);
        
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push({
          pageid: item.pageid,
          title: item.title,
          lat: item.lat,
          lon: item.lon,
          distance: item.dist,
          categories: catTitles
        });
      }
      
      // Petite pause entre les batches pour être gentil avec l'API
      if (i + batchSize < results.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 5) Catégories ordonnées
    const groups = Object.keys(grouped);
    const orderedGroups = groups.filter(g => g !== "Autres découvertes");
    if (groups.includes("Autres découvertes")) orderedGroups.push("Autres découvertes");

    // 6) Intro dynamique
    const intro = buildIntro(city, deptName, orderedGroups);

    // 7) Réponse
    return res.json({
      city,
      departmentCode: deptCode,
      departmentName: deptName,
      lat,
      lon,
      intro,
      categories: orderedGroups,
      data: grouped,
      stats: {
        poiCount: results.length,
        groupedCount: groups.length
      }
    });

  } catch (e) {
    console.error("❌ Erreur dans /api/random:", e);
    return res.status(500).json({ 
      error: "Internal server error",
      message: e.message
    });
  }
}
