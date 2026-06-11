function rid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Database not configured.' });
  const headers = { Authorization: `Bearer ${token}` };

  if (req.method === 'GET') {
    try {
      const r = await fetch(`${url}/lrange/comments/0/99`, { headers });
      const data = await r.json();
      const comments = (data.result || [])
        .map(c => { try { return JSON.parse(c); } catch(e) { return null; } })
        .filter(Boolean)
        .map(c => ({ id: c.id, name: c.name, text: c.text, time: c.time })); // strip secret
      return res.status(200).json({ comments });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { name, text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text required' });

    const comment = {
      id: rid(),
      secret: rid() + rid(),
      name: (name || 'زائر').slice(0, 50).trim(),
      text: text.slice(0, 500).trim(),
      time: new Date().toISOString()
    };

    try {
      await fetch(`${url}/lpush/comments/${encodeURIComponent(JSON.stringify(comment))}`, { method: 'POST', headers });
      await fetch(`${url}/ltrim/comments/0/99`, { method: 'POST', headers });
      return res.status(200).json({ ok: true, id: comment.id, secret: comment.secret });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id, secret } = req.body || {};
    if (!id || !secret) return res.status(400).json({ error: 'Missing id or secret' });
    try {
      const r = await fetch(`${url}/lrange/comments/0/199`, { headers });
      const data = await r.json();
      const all = data.result || [];
      let found = false;
      const kept = all.filter(raw => {
        try {
          const c = JSON.parse(raw);
          if (c.id === id && c.secret === secret) { found = true; return false; }
        } catch(e) {}
        return true;
      });
      if (!found) return res.status(403).json({ error: 'لا يمكنك حذف هذا التعليق' });
      await fetch(`${url}/del/comments`, { method: 'POST', headers });
      for (let i = kept.length - 1; i >= 0; i--) {
        await fetch(`${url}/lpush/comments/${encodeURIComponent(kept[i])}`, { method: 'POST', headers });
      }
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
