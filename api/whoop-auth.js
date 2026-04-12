export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, refresh_token, grant_type } = req.body || {};
  const CLIENT_ID     = process.env.WHOOP_CLIENT_ID;
  const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
  const REDIRECT_URI  = process.env.WHOOP_REDIRECT_URI || 'https://jw-fitness-planner.vercel.app/';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'WHOOP credentials not configured in Vercel environment variables' });
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
