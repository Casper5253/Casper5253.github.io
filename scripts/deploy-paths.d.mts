export function resolvePagesConfig(input: {
  repository: string;
  owner: string;
  repositoryName: string;
  site?: string;
  base?: string;
}): { site: string; base: string };
