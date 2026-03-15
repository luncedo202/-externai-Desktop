/**
 * SupabaseService — manages Supabase project connection & metadata
 * Credentials are persisted in localStorage so they survive reloads.
 */

const STORAGE_KEY = 'supabase_connection';

const SupabaseService = {
  // ─── Persistence ────────────────────────────────────────────────────────────

  save(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  // ─── Validation ─────────────────────────────────────────────────────────────

  /**
   * Validate that the provided URL + anon key actually reach a Supabase project
   * by hitting the health endpoint.
   */
  async validate(url, anonKey) {
    const normalized = url.replace(/\/$/, '');
    const res = await fetch(`${normalized}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return true;
  },

  // ─── Tables ─────────────────────────────────────────────────────────────────

  async fetchTables(url, anonKey) {
    const normalized = url.replace(/\/$/, '');
    // Use PostgREST OpenAPI spec to discover available tables
    const res = await fetch(`${normalized}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch tables: HTTP ${res.status}`);
    const spec = await res.json();
    // PostgREST returns an OpenAPI spec; paths are like "/tablename"
    const paths = spec.paths ? Object.keys(spec.paths) : [];
    return paths
      .filter((p) => p.startsWith('/') && p.length > 1)
      .map((p) => p.slice(1));
  },

  // ─── Code generation ────────────────────────────────────────────────────────

  /**
   * Returns the JS snippet to add to a project to initialise the Supabase client.
   */
  generateClientCode(url, anonKey) {
    return `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = '${url}'
const supabaseKey = '${anonKey}'

export const supabase = createClient(supabaseUrl, supabaseKey)
`;
  },

  generateEnvCode(url, anonKey) {
    return `VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=${anonKey}
`;
  },
};

export default SupabaseService;
