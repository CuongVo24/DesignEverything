import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { runCliOperation } from '../../src/adapters/shared/cliOperations.js';
import { emitTier2 } from '../../src/core/emitTier2.js';
import { loadDeepenScript } from '../../src/core/loadDeepenScript.js';
import { optInModule, commitDeepenAnswer, saveDeepenState } from '../../src/core/deepenState.js';
import { issueTurnCapability } from '../../src/core/turnCapability.js';
import { defaultDeepenState } from '../../src/core/schemas/deepenState.js';
import type { DeepenState } from '../../src/core/schemas/deepenState.js';
import { journalPath, manifestPath } from '../../src/core/emitTransactionActivate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');
const script = loadDeepenScript(join(projectRoot, 'Design/Content/interview-script/deepen-script.yaml'));
const GOLDEN_DOCS = join(projectRoot, 'Design/Content/golden-example-web/docs');

function commitDeepen(s: DeepenState, args: { questionId: string; subjectId: string | null }): DeepenState {
  const issued = issueTurnCapability(s.state_revision || 0, {
    sessionId: s.session_id || 'default-session',
    operationKind: 'deepen',
    questionId: args.questionId,
    subjectId: args.subjectId,
  });
  const withCap: DeepenState = { ...s, pending_turn_capability: issued.capability };
  return commitDeepenAnswer(withCap, script, { module: 'glossary', ...args, capabilityToken: issued.token });
}

const answers: Record<string, string> = {
  S3: 'Must: Đăng nhập, Tìm kiếm. Should: Shopping List.',
  data_sensitivity_and_security: 'Chỉ thông tin đăng nhập',
  expected_scale_and_performance: 'Vài trăm user',
  client_and_rendering_strategy: 'Next.js SSR',
  architecture_overview: 'Responsive',
  auth_and_access_strategy: 'NextAuth',
  realtime_push_or_sync_strategy: 'Không realtime',
  DS1a: 'Recipe, ShoppingList',
  DS1b: 'Định nghĩa',
};

describe('P7.2.4 — repair recovers every tier-2 module channel', () => {
  let ws: string;

  beforeEach(() => {
    ws = join(tmpdir(), `de-tier2-repair-${Date.now()}`);
    mkdirSync(ws, { recursive: true });
    const copy = (src: string, rel: string) => {
      for (const name of readdirSync(src)) {
        const fp = join(src, name);
        const r = rel ? `${rel}/${name}` : name;
        if (statSync(fp).isDirectory()) copy(fp, r);
        else {
          const dest = join(ws, 'docs', r);
          mkdirSync(dirname(dest), { recursive: true });
          writeFileSync(dest, readFileSync(fp, 'utf8'));
        }
      }
    };
    copy(GOLDEN_DOCS, '');
    mkdirSync(join(ws, 'Design/.interview'), { recursive: true });
    writeFileSync(join(ws, 'Design/.interview/answers.json'), JSON.stringify(answers, null, 2));
    const contentDir = join(ws, 'Design/Content');
    mkdirSync(contentDir, { recursive: true });
    cpSync(join(projectRoot, 'Design/Content'), contentDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(ws, { recursive: true, force: true });
  });

  it('recovers an interrupted tier2-glossary promotion, restoring the prior generation\'s content', async () => {
    // Real successful activation (generation 1).
    let state = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    state = commitDeepen(state, { questionId: 'DS1a', subjectId: null });
    state = commitDeepen(state, { questionId: 'DS1b', subjectId: null });
    saveDeepenState(ws, state);
    const first = emitTier2({ workspace: ws, modules: ['glossary'], script, state });
    expect(first.emitted[0]?.module).toBe('glossary');

    const glossaryPath = join(ws, 'docs/design/glossary.md');
    const originalContent = readFileSync(glossaryPath, 'utf8');
    const channel = 'tier2-glossary' as const;
    const manifestFile = manifestPath(ws, channel);
    const gen1Manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));

    // Simulate a SECOND activation interrupted mid-promotion: back up gen1's
    // live content (as activateEmit itself would have, before overwriting),
    // then corrupt the live file the way an interrupted promotion would
    // leave it, and hand-write the journal activateEmit would have written
    // right before the crash — no crash-worker subprocess needed, this is
    // exactly the on-disk state a real crash at "promoting" leaves behind.
    const backupDir = '.design-everything/backups/tier2-glossary/gen-fake-interrupted';
    const backupManifestRel = manifestFile.slice(ws.length + 1).replace(/\\/g, '/');
    const backupTargetDir = join(ws, backupDir);
    mkdirSync(join(backupTargetDir, 'docs/design'), { recursive: true });
    cpSync(glossaryPath, join(backupTargetDir, 'docs/design/glossary.md'));
    cpSync(manifestFile, join(backupTargetDir, backupManifestRel));

    writeFileSync(glossaryPath, '# CORRUPTED MID-PROMOTION\n', 'utf8');

    writeFileSync(
      journalPath(ws, channel),
      JSON.stringify(
        {
          generation_id: 'gen-fake-interrupted',
          step: 'promoting',
          backup_dir: backupDir,
          previous_generation_id: gen1Manifest.generation_id,
          started_at: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );

    // The old, dead coarse 'tier2' channel journal must NOT exist — this
    // reproduces exactly why recoverEmit(ws, 'tier2') was always a no-op.
    expect(existsSync(join(ws, '.design-everything/emit-journal-tier2.json'))).toBe(false);

    const res = await runCliOperation(ws, ['repair']);
    expect(res.ok).toBe(true);

    // Recovery restored gen1's content and cleared the interrupted journal.
    expect(readFileSync(glossaryPath, 'utf8')).toBe(originalContent);
    expect(existsSync(journalPath(ws, channel))).toBe(false);
  });
});
