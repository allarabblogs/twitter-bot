export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const RSS_URL = 'https://rss.app/feeds/9LWsg1jyV44TVKCX.xml';
    const response = await fetch(RSS_URL);
    const xml = await response.text();
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
