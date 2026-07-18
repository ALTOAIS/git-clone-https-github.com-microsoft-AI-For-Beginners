import { GrammarContentStatus } from '@prisma/client';

/**
 * Single source of truth for which GrammarRule.contentStatus values the
 * read API may ever return. PUBLISHED is always visible everywhere —
 * today PUBLISHED = 0, so a deployed build must return zero rules until
 * real publication happens. REVIEWED is additionally visible ONLY in an
 * explicit allow-list of recognized local/test development environments
 * (matching this repo's actual NODE_ENV values — see seed-guard.ts,
 * import-grammar-rules.ts, and this backend's jest config/test runs).
 *
 * Fail-closed by design: this is an allow-list, not a "not production"
 * check, so a missing, undefined, or unrecognized NODE_ENV (e.g. a
 * misconfigured deploy) falls through to PUBLISHED-only rather than
 * accidentally exposing REVIEWED/PARTIALLY_VERIFIED content.
 */
const LOCAL_DEV_ENVIRONMENTS: ReadonlySet<string> = new Set([
  'development',
  'test',
]);

export function allowedGrammarContentStatuses(
  env: NodeJS.ProcessEnv = process.env,
): GrammarContentStatus[] {
  if (LOCAL_DEV_ENVIRONMENTS.has(env.NODE_ENV ?? '')) {
    return ['PUBLISHED', 'REVIEWED'];
  }
  return ['PUBLISHED'];
}
