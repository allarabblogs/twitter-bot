export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, candidates } = req.body;
  if (!query || !candidates) return res.status(400).json({ error: 'Missing query or candidates' });

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const candidateList = candidates.map((t, i) => `[${i}] ${t.text}`).join('\n');

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
        max_tokens: 1500,
        system: `أنت مساعد ذكي يحلل تغريدات حساب @Allarabblogs. مهمتك:
1. فهم معنى البحث وليس فقط الكلمات الحرفية
2. إيجاد التغريدات الأكثر صلة بالمعنى والموضوع
3. تلخيص ما يقوله الحساب عن الموضوع بالعربية

رد دائماً بـ JSON فقط بهذا الشكل بالضبط بدون أي نص إضافي:
{
  "indices": [0, 3, 7, 12],
  "summary": "ملخص عربي مفيد هنا"
}

indices = أرقام التغريدات الأكثر صلة (15 كحد أقصى، مرتبة من الأكثر صلة للأقل)
summary = ملخص عربي واضح لما يقوله الحساب عن هذا الموضوع`,
        messages: [{
          role: 'user',
          content: `البحث: "${query}"\n\nالتغريدات المرشحة:\n${candidateList}\n\nأعطني الـ indices للتغريدات الأكثر صلة بالمعنى والملخص العربي.`
        }]
      })
    });

    const data = await response.json();
    const raw = data.content?.map(c => c.text || '').join('') || '';

    let result;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      result = JSON.parse(clean);
    } catch(e) {
      result = { indices: [], summary: raw };
    }

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: 'AI request failed', details: e.message });
  }
}
