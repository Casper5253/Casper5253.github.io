export async function fetchPublicRepository(name, fetcher = fetch, token) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetcher(`https://api.github.com/repos/Casper5253/${name}`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const reset = response.headers.get('x-ratelimit-reset');
    const resetMessage = reset ? `; rate limit resets at ${new Date(Number(reset) * 1000).toISOString()}` : '';
    throw new Error(`GitHub API returned ${response.status} for ${name}${resetMessage}`);
  }
  const repository = await response.json();
  if (repository.private !== false) throw new Error(`GitHub repository ${name} is not public`);
  return {
    name: repository.name,
    description: repository.description,
    html_url: repository.html_url,
    language: repository.language,
    stargazers_count: repository.stargazers_count,
    pushed_at: repository.pushed_at,
    topics: repository.topics,
  };
}
