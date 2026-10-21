import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPublicRepository } from './github-api.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositories = ['agent-memory', 'herdr-orchestration'];
const snapshot = await Promise.all(repositories.map((name) => fetchPublicRepository(name, fetch, process.env.GITHUB_TOKEN)));

const output = resolve(root, 'src/data/github.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
