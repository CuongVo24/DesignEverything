import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { emitTree, type InterviewAnswers } from './emit.js';
import { loadArtifactCatalog } from './loadArtifactCatalog.js';
import { compileRuntimeCatalog, type RuntimeCatalog } from './compileRuntimeCatalog.js';
import { loadScript } from './loadScript.js';
import { loadShapes } from './loadShapes.js';
import { prepareEmit } from './emitTransactionStage.js';
import { validateStagedEmit } from './emitTransactionValidate.js';
import { activateEmit } from './emitTransactionActivate.js';
import { recoverEmit } from './recoverEmitTransaction.js';
import { emitJournalSchema, emitManifestSchema } from './schemas/emitManifest.js';

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
  root = mkdtempSync(join(tmpdir(), 'emit-transaction-test-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('B3d — transactional tier-1 emit and managed manifest contract', () => {
  test('prepareEmit stages every artifact under staging/, never touches live docs/', () => {
    const rt = loadRuntimeCatalog();
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    expect(existsSync(join(root, 'docs'))).toBe(false);
    expect(existsSync(join(generation.stagingDir, 'docs/00-vision.md'))).toBe(true);
    expect(generation.manifest.artifacts.length).toBe(docs.length);
  });

  test('validateStagedEmit passes on a complete cli generation and catches a corrupt plan', () => {
    const rt = loadRuntimeCatalog();
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    const good = validateStagedEmit(generation, rt);
    expect(good.pass).toBe(true);

    const planFile = join(generation.stagingDir, '.design-everything/execution-plan.json');
    writeFileSync(planFile, JSON.stringify({ not: 'a valid plan' }), 'utf8');
    const bad = validateStagedEmit(generation, rt);
    expect(bad.pass).toBe(false);
    expect(bad.issues.some((i) => i.id === 'execution-plan-schema-invalid')).toBe(true);
  });

  test('activateEmit writes the live tree and manifest on first emit', () => {
    const rt = loadRuntimeCatalog();
    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'x'.repeat(64) }, rt);

    const result = activateEmit(root, generation, null);
    expect(result.status).toBe('activated');
    expect(existsSync(join(root, 'docs/00-vision.md'))).toBe(true);
    expect(existsSync(join(root, '.design-everything/emit-manifest.json'))).toBe(true);
    expect(existsSync(join(root, '.design-everything/emit-journal.json'))).toBe(true);

    const journal = emitJournalSchema.parse(
      JSON.parse(readFileSync(join(root, '.design-everything/emit-journal.json'), 'utf8'))
    );
    expect(journal.step).toBe('done');
  });

  test('re-emit with a different shape cleans up stale managed files, keeps unknown docs untouched', () => {
    const rt = loadRuntimeCatalog();
    const cliDocs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const gen1 = prepareEmit(root, { docs: cliDocs, shape: 'cli', inputDigest: 'a'.repeat(64) }, rt);
    const r1 = activateEmit(root, gen1, null);
    expect(r1.status).toBe('activated');
    expect(existsSync(join(root, 'docs/07-distribution.md'))).toBe(true);

    // A file the user hand-authored outside the catalog must survive re-emit untouched.
    writeFileSync(join(root, 'docs/NOTES-user.md'), 'user notes', 'utf8');

    const webAnswers: InterviewAnswers = {
      ...cliAnswers,
      W1: 'SEO cần',
      W2: 'responsive',
      W3: 'Vercel',
      W4: 'Google OAuth',
      W5: 'Không realtime',
    };
    const webDocs = emitTree(webAnswers, 'web', realTemplatesDir);
    const gen2 = prepareEmit(root, { docs: webDocs, shape: 'web', inputDigest: 'b'.repeat(64) }, rt);
    const r2 = activateEmit(root, gen2, (r1 as { manifest: { generation_id: string } }).manifest.generation_id);
    expect(r2.status).toBe('activated');

    expect(existsSync(join(root, 'docs/07-deployment.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/07-distribution.md'))).toBe(false);
    expect(existsSync(join(root, 'docs/NOTES-user.md'))).toBe(true);
  });

  test('activateEmit rejects a stale expectedRevision without touching the live tree', () => {
    const rt = loadRuntimeCatalog();
    const cliDocs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const gen1 = prepareEmit(root, { docs: cliDocs, shape: 'cli', inputDigest: 'a'.repeat(64) }, rt);
    activateEmit(root, gen1, null);

    const gen2 = prepareEmit(root, { docs: cliDocs, shape: 'cli', inputDigest: 'c'.repeat(64) }, rt);
    const before = readFileSync(join(root, 'docs/00-vision.md'), 'utf8');
    const result = activateEmit(root, gen2, 'gen-does-not-exist');
    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toBe('revision-mismatch');
    }
    expect(readFileSync(join(root, 'docs/00-vision.md'), 'utf8')).toBe(before);
  });

  test('activateEmit refuses to overwrite an unknown user-owned file at a managed path', () => {
    const rt = loadRuntimeCatalog();
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'docs/00-vision.md'), 'hand-written by the user, not ours', 'utf8');

    const docs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const generation = prepareEmit(root, { docs, shape: 'cli', inputDigest: 'a'.repeat(64) }, rt);
    const result = activateEmit(root, generation, null);

    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toBe('user-file-collision');
      expect(result.details).toContain('docs/00-vision.md');
    }
    expect(readFileSync(join(root, 'docs/00-vision.md'), 'utf8')).toBe('hand-written by the user, not ours');
    expect(existsSync(join(root, '.design-everything/emit-manifest.json'))).toBe(false);
  });

  test('recoverEmit is a no-op when nothing is in flight', () => {
    expect(recoverEmit(root)).toBe('no-op');
  });

  test('recoverEmit rolls back a promotion interrupted mid-way, restoring prior content exactly', () => {
    const rt = loadRuntimeCatalog();
    const cliDocs = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const gen1 = prepareEmit(root, { docs: cliDocs, shape: 'cli', inputDigest: 'a'.repeat(64) }, rt);
    activateEmit(root, gen1, null);

    const webAnswers: InterviewAnswers = {
      ...cliAnswers,
      W1: 'SEO cần',
      W2: 'responsive',
      W3: 'Vercel',
      W4: 'Google OAuth',
      W5: 'Không realtime',
    };
    const webDocs = emitTree(webAnswers, 'web', realTemplatesDir);
    const gen2 = prepareEmit(root, { docs: webDocs, shape: 'web', inputDigest: 'b'.repeat(64) }, rt);
    const r2 = activateEmit(root, gen2, gen1.generation_id);
    expect(r2.status).toBe('activated');
    const activeManifestBefore = readFileSync(join(root, '.design-everything/emit-manifest.json'), 'utf8');

    // Simulate a crash mid-way through a THIRD promotion: manually replay the
    // journal/backup steps activateEmit would have taken, then stop before
    // finishing — mimicking process death between 'promoting' and 'done'.
    const gen3 = prepareEmit(root, { docs: cliDocs, shape: 'cli', inputDigest: 'c'.repeat(64) }, rt);
    const backupDir = `.design-everything/backups/${gen3.generation_id}`;
    mkdirSync(join(root, backupDir, 'docs'), { recursive: true });
    mkdirSync(join(root, backupDir, '.design-everything'), { recursive: true });
    // back up the one file we're about to corrupt
    const preCorruptionContent = readFileSync(join(root, 'docs/00-vision.md'), 'utf8');
    writeFileSync(join(root, backupDir, 'docs/00-vision.md'), preCorruptionContent, 'utf8');
    writeFileSync(
      join(root, backupDir, '.design-everything/emit-manifest.json'),
      activeManifestBefore,
      'utf8'
    );
    // partially promote: overwrite one file, but never finish / never write journal step=done
    writeFileSync(join(root, 'docs/00-vision.md'), 'PARTIALLY PROMOTED CONTENT', 'utf8');
    writeFileSync(
      join(root, '.design-everything/emit-journal.json'),
      JSON.stringify(
        emitJournalSchema.parse({
          generation_id: gen3.generation_id,
          step: 'promoting',
          backup_dir: backupDir,
          previous_generation_id: gen2.generation_id,
          started_at: new Date().toISOString(),
        }),
        null,
        2
      ),
      'utf8'
    );

    const outcome = recoverEmit(root);
    expect(outcome).toBe('rolled-back');
    const restoredManifest = emitManifestSchema.parse(
      JSON.parse(readFileSync(join(root, '.design-everything/emit-manifest.json'), 'utf8'))
    );
    expect(restoredManifest.generation_id).toBe(gen2.generation_id);
    expect(readFileSync(join(root, 'docs/00-vision.md'), 'utf8')).toBe(preCorruptionContent);
    expect(existsSync(join(root, '.design-everything/emit-journal.json'))).toBe(false);

    // idempotent — calling again after a clean rollback is a no-op
    expect(recoverEmit(root)).toBe('no-op');
  });
});
