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

describe('P6 10.2 -> A1-02 (Wave A1) — validateStagedEmit flags recipe-covered artifacts with no provenance marker', () => {
  test('a recipe-covered artifact with zero "> Nguồn:" markers and no unknown-fallback text blocks activation', () => {
    const rt = loadRuntimeCatalog();
    const recipes = loadDerivedRecipes(join(projectRoot, 'Design/Content/interview-script/derived-recipes.yaml'));
    // A1-02 made emit.ts attach a real "> Nguồn: <qid>" citation to every
    // populated architecture slot (client_and_rendering_strategy,
    // architecture_overview, auth_and_access_strategy, ...), so a normal
    // cliAnswers fixture no longer has a genuine gap here — that's the
    // fix working. To still exercise this check catching a REAL gap,
    // answer nothing for the cli-branch architecture questions (C1-C5):
    // every architecture slot stays empty, withSourceNote attaches no
    // citation to empty text (nothing to cite), so the doc ends up with
    // zero "> Nguồn:" markers, same as the pre-fix baseline this test used
    // to pin.
    const noArchAnswers: InterviewAnswers = { ...cliAnswers };
    delete noArchAnswers.C1;
    delete noArchAnswers.C2;
    delete noArchAnswers.C3;
    delete noArchAnswers.C4;
    delete noArchAnswers.C5;
    delete noArchAnswers.S8;
    const docs = emitTree(noArchAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    const archContent = readFileSync(join(generation.stagingDir, 'docs/05-architecture.md'), 'utf8');
    expect(archContent).not.toMatch(/^>\s*Nguồn:/m);

    const result = validateStagedEmit(generation, rt, null, recipes.recipes);
    // Promoted from warning to error (A1-02): a genuine provenance gap now
    // blocks activation rather than being tolerated and logged.
    expect(result.pass).toBe(false);
    const issue = result.issues.find(
      (i) => i.id === 'derived-recipe-provenance-missing' && i.message.includes('doc-05-architecture')
    );
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('error');
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

describe('A1-02 (Wave A1) — execution-plan.json structural provenance (runDerivedRecipe as production authority, not text-scan)', () => {
  test('a clean cli generation has no JSON provenance issues — real source_refs already satisfy runDerivedRecipe', () => {
    const rt = loadRuntimeCatalog();
    const recipes = loadDerivedRecipes(join(projectRoot, 'Design/Content/interview-script/derived-recipes.yaml'));
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    const result = validateStagedEmit(generation, rt, null, recipes.recipes);
    expect(result.issues.some((i) => i.id === 'derived-recipe-json-provenance-invalid')).toBe(false);
  });

  test('a task claiming source_refs but missing its own title fails required_fields coverage — a text regex could never catch this', () => {
    const rt = loadRuntimeCatalog();
    const recipes = loadDerivedRecipes(join(projectRoot, 'Design/Content/interview-script/derived-recipes.yaml'));
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    const planPath = join(generation.stagingDir, '.design-everything/execution-plan.json');
    const plan = JSON.parse(readFileSync(planPath, 'utf8'));
    // build-plan's output_schema requires [task_id, title, source_refs,
    // tier] per item (derived-recipes.yaml); this item claims to be
    // answer-derived (non-empty source_refs, so the adapter in
    // emitTransactionValidate.ts includes it in the checked set) but its
    // `intent` — mapped to the recipe's `title` field — is blank.
    plan.tasks['T-fabricated'] = {
      id: 'T-fabricated',
      type: 'implementation',
      milestone: 'M4-fabricated',
      intent: '',
      depends_on: [],
      allowed_paths: [],
      preconditions: [],
      commands: [],
      expected_result: 'n/a',
      evidence_required: [],
      failure_policy: 'abort',
      source_refs: ['S3', 'S5'],
    };
    writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

    const result = validateStagedEmit(generation, rt, null, recipes.recipes);
    const issue = result.issues.find((i) => i.id === 'derived-recipe-json-provenance-invalid');
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('error');
    expect(issue?.message).toContain('MISSING_REQUIRED_FIELD');
    expect(result.pass).toBe(false);
  });
});
