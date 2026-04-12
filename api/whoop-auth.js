export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CLIENT_ID     = process.env.WHOOP_CLIENT_ID;
  const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
  const REDIRECT_URI  = process.env.WHOOP_REDIRECT_URI || 'https://jw-fitness-tracker.vercel.app/';

  // ── Proxy WHOOP API data requests (GET with Authorization header) ──
  if (req.method === 'GET') {
    const path = req.query.path;
    if (!path) return res.status(400).json({ error: 'Missing path' });
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Missing authorization' });
    try {
      const response = await fetch(`https://api.prod.whoop.com/developer/v2${path}`, {
        headers: { 'Authorization': authHeader }
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── OAuth token exchange (POST) ──
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, refresh_token, grant_type } = req.body || {};

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'WHOOP credentials not configured' });
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id',     CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('redirect_uri',  REDIRECT_URI);

    if (grant_type === 'refresh_token' && refresh_token) {
      params.append('grant_type',    'refresh_token');
      params.append('refresh_token', refresh_token);
    } else if (code) {
      params.append('grant_type', 'authorization_code');
      params.append('code',       code);
    } else {
      return res.status(400).json({ error: 'Missing code or refresh_token' });
    }

    const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString()
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
