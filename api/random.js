import fs from "fs";
import path from "path";

// ===============================
// Charger les communes UNE FOIS
// ===============================
const communesPath = path.join(process.cwd(), "communes.json");
const COMMUNES = JSON.parse(fs.readFileSync(communesPath, "utf-8"));

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
// Classification Wikipedia
// ===============================
function classify(categories) {
  const text = categories.join(" ").toLowerCase();

  if (text.includes("église") || text.includes("chapelle") || text.includes("cathédrale")) return "Monuments religieux";
  if (text.includes("château")) return "Châteaux";
  if (text.includes("musée")) return "Musées";
  if (text.includes("lac") || text.includes("rivière") || text.includes("étang")) return "Lacs et rivières";
  if (text.includes("forêt") || text.includes("parc") || text.includes("naturel")) return "Nature";
  if (text.includes("monument") || text.includes("statue") || text.includes("tour")) return "Monuments";
  if (text.includes("site") || text.includes("historique")) return "Sites historiques";

  return "Autres découvertes";
}

// ===============================
// API Random
// ===============================
export default async function handler(req, res) {
  try {
    // 1) Commune aléatoire locale
    const idx = Math.floor(Math.random() * COMMUNES.length);
    const commune = COMMUNES[idx];

    const city = commune.nom;
    const deptCode = commune.codeDepartement;
    const deptName = DEPARTEMENTS[deptCode] || "departement inconnu";

    const lat = commune.centre?.lat;
    const lon = commune.centre?.lon;

    if (!lat || !lon) {
      return res.status(500).json({ error: "Commune sans coordonnées" });
    }

    // 2) Wikipedia POI
    const wikiUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=${lat}|${lon}&gslimit=20&format=json&origin=*`;
    const wikiResp = await fetch(wikiUrl);
    const wikiJson = await wikiResp.json();

    const results = wikiJson.query.geosearch || [];

    // 3) Regroupement par catégories
    const categories = {};

    for (const item of results) {
      const pageid = item.pageid;
      const pageUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=categories&pageids=${pageid}&format=json&origin=*`;
      const pageResp = await fetch(pageUrl);
      const pageJson = await pageResp.json();

      const page = pageJson.query.pages[pageid];
      const cats = (page.categories || []).map(c => c.title);

      const group = classify(cats);
      if (!categories[group]) categories[group] = [];
      categories[group].push({
        pageid,
        title: item.title,
        lat: item.lat,
        lon: item.lon
      });
    }

    // 4) Texte narratif
    const intro = `Nous sommes dans la ville de ${city}, dans le departement de ${deptName}. J'ai trouve plusieurs choses interessantes autour de nous. Que veux-tu decouvrir ?`;

    return res.json({
      city,
      departmentCode: deptCode,
      departmentName: deptName,
      lat,
      lon,
      intro,
      categories: Object.keys(categories),
      data: categories
    });

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
