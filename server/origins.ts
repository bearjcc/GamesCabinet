const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

/** CORS origins: CORS_ORIGINS (comma-separated) plus localhost defaults. */
export function resolveOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const fromEnv = (env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEV_ORIGINS, ...fromEnv])];
}
