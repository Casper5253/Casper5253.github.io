import { describe, expect, it } from 'vitest';
import { resolvePagesConfig } from '../scripts/deploy-paths.mjs';

describe('Pages deployment paths', () => {
  it('uses the root for a case-insensitive user-site repository', () => {
    expect(resolvePagesConfig({ repository: 'Casper5253/casper5253.GITHUB.io', owner: 'Casper5253', repositoryName: 'casper5253.github.io' })).toEqual({ site: 'https://Casper5253.github.io', base: '/' });
  });
  it('derives the project path and honors configured overrides', () => {
    expect(resolvePagesConfig({ repository: 'Casper5253/portfolio', owner: 'Casper5253', repositoryName: 'portfolio' })).toEqual({ site: 'https://Casper5253.github.io', base: '/portfolio' });
    expect(resolvePagesConfig({ repository: 'Casper5253/portfolio', owner: 'Casper5253', repositoryName: 'portfolio', site: 'https://portfolio.example', base: '/site' })).toEqual({ site: 'https://portfolio.example', base: '/site' });
  });
});
