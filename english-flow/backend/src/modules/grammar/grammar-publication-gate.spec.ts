import { allowedGrammarContentStatuses } from './grammar-publication-gate';

describe('allowedGrammarContentStatuses — fail-closed allow-list', () => {
  it('production: only PUBLISHED is allowed', () => {
    expect(
      allowedGrammarContentStatuses({ NODE_ENV: 'production' } as any),
    ).toEqual(['PUBLISHED']);
  });

  it('missing/undefined NODE_ENV: only PUBLISHED is allowed (fails closed)', () => {
    expect(allowedGrammarContentStatuses({} as any)).toEqual(['PUBLISHED']);
  });

  it('unrecognized NODE_ENV value (e.g. misconfigured deploy): only PUBLISHED is allowed (fails closed)', () => {
    expect(
      allowedGrammarContentStatuses({ NODE_ENV: 'staging' } as any),
    ).toEqual(['PUBLISHED']);
    expect(
      allowedGrammarContentStatuses({ NODE_ENV: 'productoin' } as any),
    ).toEqual(['PUBLISHED']);
    expect(allowedGrammarContentStatuses({ NODE_ENV: '' } as any)).toEqual([
      'PUBLISHED',
    ]);
  });

  it('explicit development: PUBLISHED and REVIEWED are allowed', () => {
    expect(
      allowedGrammarContentStatuses({ NODE_ENV: 'development' } as any),
    ).toEqual(['PUBLISHED', 'REVIEWED']);
  });

  it('explicit test: PUBLISHED and REVIEWED are allowed', () => {
    expect(allowedGrammarContentStatuses({ NODE_ENV: 'test' } as any)).toEqual([
      'PUBLISHED',
      'REVIEWED',
    ]);
  });

  it('PUBLISHED is always present regardless of environment', () => {
    for (const nodeEnv of [
      'production',
      undefined,
      'staging',
      'development',
      'test',
    ]) {
      const statuses = allowedGrammarContentStatuses({
        NODE_ENV: nodeEnv,
      } as any);
      expect(statuses).toContain('PUBLISHED');
    }
  });

  it('production, missing, and unrecognized environments never include REVIEWED, DRAFT, or ARCHIVED', () => {
    for (const nodeEnv of ['production', undefined, 'staging']) {
      const statuses = allowedGrammarContentStatuses({
        NODE_ENV: nodeEnv,
      } as any);
      expect(statuses).not.toContain('REVIEWED');
      expect(statuses).not.toContain('DRAFT');
      expect(statuses).not.toContain('ARCHIVED');
    }
  });
});
