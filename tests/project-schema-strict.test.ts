import { describe, expect, it, vi } from 'vitest';
import { projectSchema } from '../src/content.config';

vi.mock('astro:content', () => ({ defineCollection: (config: unknown) => config }));

describe('project schema strictness', () => {
  it('accepts a project that names its one home chapter', () => {
    expect(() => projectSchema.parse({
      title: 'Example',
      short: 'One line.',
      kind: 'independent',
      status: 'prototype',
      period: 'October 2026',
      role: 'Designed and built it.',
      order: 1,
      home: { chapter: 'build', note: 'What it shows.' },
    })).not.toThrow();
  });

  it('accepts a project without a home block', () => {
    expect(() => projectSchema.parse({
      title: 'Example',
      short: 'One line.',
      kind: 'client',
      status: 'ongoing',
      period: 'Current',
      role: 'Part of the team.',
      order: 2,
    })).not.toThrow();
  });

  it('rejects the retired stages key', () => {
    expect(() => projectSchema.parse({
      title: 'Example',
      short: 'One line.',
      kind: 'independent',
      status: 'prototype',
      period: 'October 2026',
      role: 'Designed and built it.',
      order: 1,
      stages: [{ stage: 'build', note: 'Retired shape.' }],
    })).toThrow();
  });

  it('rejects any unknown key', () => {
    expect(() => projectSchema.parse({
      title: 'Example',
      short: 'One line.',
      kind: 'independent',
      status: 'prototype',
      period: 'October 2026',
      role: 'Designed and built it.',
      order: 1,
      typo: 'nope',
    })).toThrow();
  });
});
