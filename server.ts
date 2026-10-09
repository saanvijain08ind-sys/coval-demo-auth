import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const authClient = supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey) : null;
const adminClient = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(express.json({ limit: '32kb' }));

interface VerifiedIdentity {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  provider: string;
  role: 'admin' | 'user';
}

function bearerToken(req: express.Request): string | null {
  const value = req.get('authorization');
  return value?.startsWith('Bearer ') ? value.slice(7) : null;
}

function decodedClaims(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getLocation(req: express.Request): string | null {
  if (process.env.TRUST_PROXY !== 'true') return null;
  const city = req.get('x-vercel-ip-city');
  const region = req.get('x-vercel-ip-country-region');
  const country = req.get('x-vercel-ip-country');
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

async function requireIdentity(req: express.Request, res: express.Response): Promise<VerifiedIdentity | null> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return null;
  }
  if (!authClient) {
    res.status(503).json({ error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
    return null;
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
    return null;
  }

  const user = data.user;
  const metadata = user.user_metadata || {};
  const claims = decodedClaims(token);
  const sessionId = typeof claims?.session_id === 'string' ? claims.session_id : '';
  if (!sessionId) {
    res.status(401).json({ error: 'The Supabase access token is missing its session identifier.' });
    return null;
  }

  const provider = String(user.app_metadata?.provider || 'unknown');
  const name = String(metadata.full_name || metadata.name || metadata.user_name || user.email || 'Coval user');
  if (!adminClient) {
    res.status(503).json({ error: 'Login monitoring requires SUPABASE_SERVICE_ROLE_KEY on the server.' });
    return null;
  }

  const { data: adminRecord, error: adminError } = await adminClient
    .from('auth_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (adminError) {
    console.error('Unable to check auth admin role:', adminError.message);
    res.status(503).json({ error: 'Auth role table is unavailable. Run supabase/auth-monitoring.sql.' });
    return null;
  }

  return {
    id: user.id,
    email: user.email || null,
    name,
    avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
    provider,
    role: adminRecord ? 'admin' : 'user',
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    supabaseConfigured: Boolean(authClient),
    monitoringConfigured: Boolean(adminClient),
  });
});

app.post('/api/auth/session', async (req, res) => {
  try {
    const identity = await requireIdentity(req, res);
    if (!identity) return;
    const token = bearerToken(req)!;
    const claims = decodedClaims(token)!;
    const sessionId = String(claims.session_id);
    const expiresAt = new Date(Number(claims.exp) * 1000).toISOString();
    const startedAt = new Date(Number(claims.iat) * 1000).toISOString();
    const { data: priorSession, error: lookupError } = await adminClient!.from('auth_login_activity')
      .select('started_at')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (lookupError) {
      console.error('Unable to check existing auth session:', lookupError.message);
      return res.status(503).json({ error: 'Could not update this login record.' });
    }

    const { error } = await adminClient!.from('auth_login_activity').upsert({
      session_id: sessionId,
      user_id: identity.id,
      email: identity.email,
      display_name: identity.name,
      avatar_url: identity.avatarUrl,
      provider: identity.provider,
      source_ip: req.ip || null,
      location: getLocation(req),
      user_agent: req.get('user-agent') || null,
      started_at: priorSession?.started_at || startedAt,
      last_seen_at: new Date().toISOString(),
      expires_at: expiresAt,
      ended_at: null,
    }, { onConflict: 'session_id' });

    if (error) {
      console.error('Unable to record auth session:', error.message);
      return res.status(503).json({ error: 'Could not record this login. Check the auth monitoring SQL setup.' });
    }
    return res.json({ user: identity, session_id: sessionId, started_at: startedAt, expires_at: expiresAt });
  } catch (error) {
    console.error('Unable to verify auth session:', error);
    return res.status(503).json({ error: 'Unable to verify this session with Supabase.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const identity = await requireIdentity(req, res);
    if (!identity) return;
    const claims = decodedClaims(bearerToken(req)!)!;
    const sessionId = String(claims.session_id);
    const { error } = await adminClient!.from('auth_login_activity')
      .update({ ended_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', identity.id);
    if (error) {
      console.error('Unable to close auth session:', error.message);
      return res.status(503).json({ error: 'Could not record session sign-out.' });
    }
    return res.json({ status: 'signed_out' });
  } catch (error) {
    console.error('Unable to close auth session:', error);
    return res.status(503).json({ error: 'Could not record session sign-out.' });
  }
});

app.get('/api/auth/activity', async (req, res) => {
  try {
    const identity = await requireIdentity(req, res);
    if (!identity) return;
    if (identity.role !== 'admin') return res.status(403).json({ error: 'Admin access is required to view login activity.' });

    const { data, error } = await adminClient!.from('auth_login_activity')
      .select('session_id,user_id,email,display_name,avatar_url,provider,source_ip,location,user_agent,started_at,last_seen_at,expires_at,ended_at')
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Unable to load auth activity:', error.message);
      return res.status(503).json({ error: 'Could not load login activity.' });
    }
    return res.json({ activity: data || [] });
  } catch (error) {
    console.error('Unable to verify auth admin:', error);
    return res.status(503).json({ error: 'Unable to verify admin access.' });
  }
});

app.all('/api/*', (_req, res) => res.status(404).json({ error: 'Auth API endpoint not found.' }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Coval Auth Console running at http://0.0.0.0:${PORT}`);
});
