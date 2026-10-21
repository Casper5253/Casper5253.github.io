import { appendFile } from 'node:fs/promises';

export function resolvePagesConfig({ repository, owner, repositoryName, site, base }) {
  const isUserSite = repository.toLowerCase() === `${owner}/${owner}.github.io`.toLowerCase();
  return {
    site: site || `https://${owner}.github.io`,
    base: base || (isUserSite ? '/' : `/${repositoryName}`),
  };
}

if (process.env.GITHUB_OUTPUT) {
  const config = resolvePagesConfig({
    repository: process.env.GITHUB_REPOSITORY,
    owner: process.env.GITHUB_REPOSITORY_OWNER,
    repositoryName: process.env.REPOSITORY_NAME,
    site: process.env.SITE,
    base: process.env.BASE,
  });
  console.log(`SITE=${config.site}`);
  console.log(`BASE=${config.base}`);
  await appendFile(process.env.GITHUB_OUTPUT, `site=${config.site}\nbase=${config.base}\n`);
}
