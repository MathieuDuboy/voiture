export default async function handler(req, res) {
    try {
      const lat = req.query.lat;
      const lon = req.query.lon;
      const radius = req.query.radius || 10000; // en mètres
      const limit = req.query.limit || 10;
  
      if (!lat || !lon) {
        return res.status(400).json({ error: "lat et lon requis" });
      }
  
      // 1) Recherche géographique
      const geoUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=${radius}&gscoord=${lat}|${lon}&gslimit=${limit}&format=json&origin=*`;
  
      const geoResp = await fetch(geoUrl);
      const geoJson = await geoResp.json();
  
      const results = geoJson.query.geosearch;
  
      // 2) Pour chaque pageid, on récupère le texte
      const final = [];
  
      for (const item of results) {
        const pageid = item.pageid;
  
        const pageUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&pageids=${pageid}&format=json&origin=*`;
  
        const pageResp = await fetch(pageUrl);
        const pageJson = await pageResp.json();
  
        const page = pageJson.query.pages[pageid];
  
        final.push({
          pageid: pageid,
          title: item.title,
          distance: item.dist,
          extract: page.extract || ""
        });
      }
  
      res.setHeader("Cache-Control", "s-maxage=60");
      return res.status(200).json({
        lat,
        lon,
        count: final.length,
        items: final
      });
  
    } catch (e) {
      return res.status(500).json({ error: String(e) });
    }
  }
  