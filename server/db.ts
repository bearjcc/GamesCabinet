import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export type MatchStoreKind = 'postgres' | 'flatfile' | 'memory';

export type MatchStoreFactories = {
  createPostgres: (url: string) => unknown;
  createFlatFile: (dir: string) => unknown;
};

/* v8 ignore start -- require() wiring covered via injected factories in tests */
function defaultFactories(): MatchStoreFactories {
  return {
    createPostgres: (url) => {
      const { PostgresStore } = require('bgio-postgres') as {
        PostgresStore: new (url: string, opts?: object) => unknown;
      };
      return new PostgresStore(url, { logging: false });
    },
    createFlatFile: (dir) => {
      const { FlatFile } = require('boardgame.io/server') as {
        FlatFile: new (opts: { dir: string; logging?: boolean }) => unknown;
      };
      return new FlatFile({ dir, logging: false });
    },
  };
}
/* v8 ignore stop */

export function matchStoreKind(env: NodeJS.ProcessEnv = process.env): MatchStoreKind {
  if (env.DATABASE_URL) return 'postgres';
  if (env.FLATFILE_DIR) return 'flatfile';
  return 'memory';
}

/**
 * Durable match store when DATABASE_URL or FLATFILE_DIR is set; else in-memory.
 * Prefer DATABASE_URL (Postgres via bgio-postgres) on Railway.
 */
export function createMatchStore(
  env: NodeJS.ProcessEnv = process.env,
  factories: MatchStoreFactories = defaultFactories(),
): unknown {
  const kind = matchStoreKind(env);
  if (kind === 'postgres') return factories.createPostgres(env.DATABASE_URL as string);
  if (kind === 'flatfile') return factories.createFlatFile(env.FLATFILE_DIR as string);
  return undefined;
}
