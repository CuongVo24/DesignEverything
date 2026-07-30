import { test, expect, describe } from 'vitest';
import { join } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import YAML from 'yaml';
import { loadArtifactCatalog } from './loadArtifactCatalog.js';
import { compileRuntimeCatalog, listArtifacts, listJourney } from './compileRuntimeCatalog.js';
import { loadScript } from './loadScript.js';
import { loadShapes } from './loadShapes.js';
import type { ArtifactCatalog } from './schemas/artifactCatalog.js';

const CATALOG_PATH = join(process.cwd(), 'Design/Content/artifact-catalog.yaml');
const SCRIPT_PATH = join(process.cwd(), 'Design/Content/interview-script/script.yaml');
const SHAPES_PATH = join(process.cwd(), 'Design/Content/interview-script/shapes.yaml');

function writeTempCatalog(catalog: ArtifactCatalog): string {
  const dir = mkdtempSync(join(tmpdir(), 'artifact-catalog-test-'));
  const path = join(dir, 'artifact-catalog.yaml');
  writeFileSync(path, YAML.stringify(catalog), 'utf8');
  return path;
}

function compileReal() {
  const catalog = loadArtifactCatalog(CATALOG_PATH);
  const script = loadScript(SCRIPT_PATH);
  const shapes = loadShapes(SHAPES_PATH);
  return compileRuntimeCatalog({ catalog, script, shapes });
}

describe('B3c — authoritative runtime and artifact catalog contract', () => {
  test('catalog loads and compiles without drift against script/shapes', () => {
    const rt = compileReal();
    expect(rt.artifacts.length).toBeGreaterThan(0);
    expect(rt.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  test('doc artifact count per shape matches the audited snapshot (12 web/mobile/cli, 13 hybrid)', () => {
    const rt = compileReal();
    const countDocs = (shape: string) =>
      listArtifacts(rt, { shape, tier: 1 }).filter((a) => a.kind === 'doc').length;

    expect(countDocs('web')).toBe(12);
    expect(countDocs('mobile')).toBe(12);
    expect(countDocs('cli')).toBe(12);
    expect(countDocs('hybrid')).toBe(13);
  });

  test('execution-plan.json is kind=state and carries no docs/ prefix', () => {
    const rt = compileReal();
    const stateArtifacts = rt.artifacts.filter((a) => a.kind === 'state');
    expect(stateArtifacts.length).toBeGreaterThan(0);
    for (const artifact of stateArtifacts) {
      expect(artifact.path).toBeDefined();
      expect(artifact.path!.startsWith('docs/')).toBe(false);
      expect(artifact.path).toBe('.design-everything/execution-plan.json');
    }
  });

  test('listJourney compiles core + shape questions in script order, hybrid is union of web+mobile', () => {
    const rt = compileReal();
    const webJourney = listJourney(rt, 'web');
    const mobileJourney = listJourney(rt, 'mobile');
    const hybridJourney = listJourney(rt, 'hybrid');

    expect(webJourney).toContain('S0');
    expect(webJourney).toContain('W5');
    expect(webJourney).not.toContain('M1');

    expect(hybridJourney).toContain('W5');
    expect(hybridJourney).toContain('M5');
    // core questions appear before any branch question in hybrid, S7 gates the split
    expect(hybridJourney.indexOf('S0')).toBeLessThan(hybridJourney.indexOf('W1'));
    expect(hybridJourney.indexOf('S0')).toBeLessThan(hybridJourney.indexOf('M1'));

    // meta questions (CAL0) are excluded from the journey — they don't anchor a doc
    expect(webJourney).not.toContain('CAL0');
    expect(mobileJourney).not.toContain('CAL0');
  });

  test('rejects duplicate artifact id at load time', () => {
    const base = loadArtifactCatalog(CATALOG_PATH);
    const mutated: ArtifactCatalog = {
      ...base,
      artifacts: [...base.artifacts, { ...base.artifacts[0] }],
    };
    const path = writeTempCatalog(mutated);
    try {
      expect(() => loadArtifactCatalog(path)).toThrow(/Duplicate artifact id/);
    } finally {
      rmSync(path, { recursive: true, force: true });
    }
  });

  test('rejects artifact referencing an unknown shape', () => {
    const base = loadArtifactCatalog(CATALOG_PATH);
    const script = loadScript(SCRIPT_PATH);
    const shapes = loadShapes(SHAPES_PATH);
    const mutated = {
      ...base,
      artifacts: base.artifacts.map((a, i) =>
        i === 0 ? { ...a, shapes: ['desktop-does-not-exist'] } : a
      ),
    } as ArtifactCatalog;
    expect(() => compileRuntimeCatalog({ catalog: mutated, script, shapes })).toThrow(
      /unknown shape/
    );
  });

  test('rejects artifact referencing an unknown question id', () => {
    const base = loadArtifactCatalog(CATALOG_PATH);
    const script = loadScript(SCRIPT_PATH);
    const shapes = loadShapes(SHAPES_PATH);
    const mutated = {
      ...base,
      artifacts: base.artifacts.map((a, i) =>
        i === 0 ? { ...a, source: { ...a.source, question_ids: ['Z99-not-real'] } } : a
      ),
    } as ArtifactCatalog;
    expect(() => compileRuntimeCatalog({ catalog: mutated, script, shapes })).toThrow(
      /unknown question id/
    );
  });

  test('rejects path outside managed roots at load time', () => {
    const base = loadArtifactCatalog(CATALOG_PATH);
    const outsideRoot = {
      ...base,
      artifacts: base.artifacts.map((a, i) => (i === 0 ? { ...a, path: '../escape.md' } : a)),
    } as ArtifactCatalog;
    const path = writeTempCatalog(outsideRoot);
    try {
      expect(() => loadArtifactCatalog(path)).toThrow(/outside managed roots/);
    } finally {
      rmSync(path, { recursive: true, force: true });
    }
  });

  test('rejects case-collision between artifact paths at load time', () => {
    const base = loadArtifactCatalog(CATALOG_PATH);
    const collided = {
      ...base,
      artifacts: base.artifacts.map((a, i) =>
        i === 1 ? { ...a, path: base.artifacts[0].path!.toUpperCase() } : a
      ),
    } as ArtifactCatalog;
    const path = writeTempCatalog(collided);
    try {
      expect(() => loadArtifactCatalog(path)).toThrow(/Case-collision/);
    } finally {
      rmSync(path, { recursive: true, force: true });
    }
  });
});
