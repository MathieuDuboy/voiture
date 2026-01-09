export default async function handler(req, res) {
  try {
    // 1) Point aléatoire en France
    const lat = 41 + Math.random() * (51.5 - 41);
    const lon = -5.5 + Math.random() * (9.5 + 5.5);

    // 2) Trouver la ville
    const geoResp = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lat=${lat}&lon=${lon}`);
    const geoJson = await geoResp.json();

    const city = geoJson.features?.[0]?.properties?.city || "un endroit inconnu";
    const context = geoJson.features?.[0]?.properties?.context || "";
    const dept = context.split(",")[0] || "";

    // 3) Wikipedia POI
    const wikiUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=${lat}|${lon}&gslimit=20&format=json&origin=*`;
    const wikiResp = await fetch(wikiUrl);
    const wikiJson = await wikiResp.json();

    const results = wikiJson.query.geosearch;

    // 4) Regrouper par catégories
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

    // 5) Texte narratif
    const intro = `Nous sommes dans la petite ville de ${city} dans le département ${dept}. J'ai trouvé plusieurs choses intéressantes autour de nous. Que veux-tu découvrir ?`;

    return res.json({
      lat,
      lon,
      city,
      department: dept,
      intro,
      categories: Object.keys(categories),
      data: categories
    });

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
