import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { emitTree, type InterviewAnswers } from './emit.js';
import { loadArtifactCatalog } from './loadArtifactCatalog.js';
import { compileRuntimeCatalog, type RuntimeCatalog } from './compileRuntimeCatalog.js';
import { loadScript } from './loadScript.js';
import { loadShapes } from './loadShapes.js';
import { loadDerivedRecipes } from './loadDerivedRecipes.js';
import { prepareEmit } from './emitTransactionStage.js';
import { validateStagedEmit } from './emitTransactionValidate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');

const cliAnswers: InterviewAnswers = {
  S0: 'CLI tool',
  S1: 'Nỗi đau A, xoay xở B',
  S2: 'Dev (Contributor)',
  S3: 'Must: chạy lệnh chính. Should: log đẹp.',
  S4: 'Config, Job',
  S5: 'Mở terminal -> chạy lệnh -> xem kết quả',
  S6: 'Solo, 2 tuần',
  C1: 'Node.js (TypeScript)',
  C2: 'flags/arguments',
  C3: 'file config JSON ~/.config/myapp.json',
  C4: 'macOS',
  C5: 'NPM registry',
};

function loadRuntimeCatalog(): RuntimeCatalog {
  const catalog = loadArtifactCatalog(join(projectRoot, 'Design/Content/artifact-catalog.yaml'));
  const script = loadScript(join(projectRoot, 'Design/Content/interview-script/script.yaml'));
  const shapes = loadShapes(join(projectRoot, 'Design/Content/interview-script/shapes.yaml'));
  return compileRuntimeCatalog({ catalog, script, shapes });
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'emit-validate-recipe-test-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('P6 10.2 — validateStagedEmit flags recipe-covered artifacts with no provenance marker', () => {
  test('a recipe-covered artifact with zero "> Nguồn:" markers and no unknown-fallback text gets a warning', () => {
    const rt = loadRuntimeCatalog();
    const recipes = loadDerivedRecipes(join(projectRoot, 'Design/Content/interview-script/derived-recipes.yaml'));
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    // Baseline: today's real doc-templates don't emit the SourceRef marker
    // convention at all (that convention only exists for tier-2 render) —
    // this pins that reality rather than assuming it.
    const archContent = readFileSync(join(generation.stagingDir, 'docs/05-architecture.md'), 'utf8');
    expect(archContent).not.toMatch(/^>\s*Nguồn:/m);

    const result = validateStagedEmit(generation, rt, null, recipes.recipes);
    expect(result.pass).toBe(true); // warning-only, never blocks activation
    const issue = result.issues.find(
      (i) => i.id === 'derived-recipe-provenance-missing' && i.message.includes('doc-05-architecture')
    );
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('warning');
  });

  test('omitting derivedRecipes (the default) produces no such issue — fully backward compatible', () => {
    const rt = loadRuntimeCatalog();
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    const result = validateStagedEmit(generation, rt);
    expect(result.issues.some((i) => i.id === 'derived-recipe-provenance-missing')).toBe(false);
  });

  test('a staged doc carrying a "> Nguồn:" marker is not flagged', () => {
    const rt = loadRuntimeCatalog();
    const recipes = loadDerivedRecipes(join(projectRoot, 'Design/Content/interview-script/derived-recipes.yaml'));
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    const archPath = join(generation.stagingDir, 'docs/05-architecture.md');
    writeFileSync(archPath, readFileSync(archPath, 'utf8') + '\n> Nguồn: S8\n', 'utf8');

    const result = validateStagedEmit(generation, rt, null, recipes.recipes);
    expect(
      result.issues.some((i) => i.id === 'derived-recipe-provenance-missing' && i.message.includes('doc-05-architecture'))
    ).toBe(false);
  });

  test('a staged doc carrying the recipe fallback unknown text is not flagged', () => {
    const rt = loadRuntimeCatalog();
    const recipes = loadDerivedRecipes(join(projectRoot, 'Design/Content/interview-script/derived-recipes.yaml'));
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    const archPath = join(generation.stagingDir, 'docs/05-architecture.md');
    writeFileSync(archPath, readFileSync(archPath, 'utf8') + '\n> ⚠ unknown — cần hỏi người\n', 'utf8');

    const result = validateStagedEmit(generation, rt, null, recipes.recipes);
    expect(
      result.issues.some((i) => i.id === 'derived-recipe-provenance-missing' && i.message.includes('doc-05-architecture'))
    ).toBe(false);
  });
});
