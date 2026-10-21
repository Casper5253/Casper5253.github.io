import snapshot from '../data/github.json';

export interface GitHubRepository {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  pushed_at: string | null;
  topics: string[];
}

export function loadGitHubSnapshot(): readonly GitHubRepository[] {
  return snapshot;
}
