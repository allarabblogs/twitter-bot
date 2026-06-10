export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, tweets } = req.body;
  if (!query || !tweets) return res.status(400).json({ error: 'Missing query or tweets' });

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: 'أنت مساعد ذكي يحلل تغريدات حساب @Allarabblogs على تويتر. رد دائماً باللغة العربية بشكل واضح ومفيد. لخّص ما يقوله الحساب عن الموضوع في فقرة أو فقرتين فقط.',
        messages: [{ role: 'user', content: `البحث: "${query}"\n\nالتغريدات المطابقة:\n${tweets}\n\nقدم ملخصاً عربياً مفيداً لما يقوله الحساب عن هذا الموضوع.` }]
      })
    });
    const data = await response.json();
    const answer = data.content?.map(c => c.text || '').join('') || '';
    res.status(200).json({ answer });
  } catch (e) {
    res.status(500).json({ error: 'AI request failed', details: e.message });
  }
}
