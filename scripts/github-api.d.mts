export interface PublicRepositorySnapshot {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  pushed_at: string | null;
  topics: string[];
}

export function fetchPublicRepository(name: string, fetcher?: (input: string, init?: RequestInit) => Promise<Response>, token?: string): Promise<PublicRepositorySnapshot>;
