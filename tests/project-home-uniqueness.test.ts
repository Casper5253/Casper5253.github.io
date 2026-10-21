import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const projectsDirectory = new URL('../src/content/projects/', import.meta.url);

describe('project home assignments', () => {
  it('does not assign an artifact or diagram to multiple projects', async () => {
    const files = (await readdir(projectsDirectory, { withFileTypes: true }))
      .filter((file) => file.isFile() && file.name.endsWith('.md'));
    const projects = await Promise.all(files.map(async (file) => {
      const source = await readFile(new URL(file.name, projectsDirectory), 'utf8');
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      expect(frontmatter, `${file.name} should have YAML frontmatter`).not.toBeNull();
      return { id: file.name.slice(0, -3), data: parse(frontmatter![1]!) };
    }));
    const artifactOwners = new Map<string, string>();
    const diagramOwners = new Map<string, string>();

    for (const project of projects) {
      for (const artifact of project.data.home?.stack ?? []) {
        expect(artifactOwners.has(artifact), `${artifact} is claimed by ${project.id} and ${artifactOwners.get(artifact)}`).toBe(false);
        artifactOwners.set(artifact, project.id);
      }
      if (project.data.home?.diagram) {
        const diagram = project.data.home.diagram as string;
        expect(diagramOwners.has(diagram), `${diagram} is claimed by ${project.id} and ${diagramOwners.get(diagram)}`).toBe(false);
        diagramOwners.set(diagram, project.id);
      }
    }
  });
});
