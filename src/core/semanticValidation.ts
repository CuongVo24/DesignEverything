import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { manifestPath } from './emitTransactionActivate.js';
import { emitManifestSchema, type EmitManifest, executionPlanSchemaV3 } from './schemas/index.js';
import { loadGatePolicy } from './loadGatePolicy.js';
import { buildGateSnapshot } from './gateSnapshot.js';
import { evaluateGate } from './evaluateGate.js';
import {
  calculatePlanDigest,
  calculateDocsDigest,
  calculateValidationResultDigest,
  loadEmittedDocs,
} from './validatedSnapshot.js';

export type ValidationCheckId =
  | 'manifest-present'
  | 'manifest-activated'
  | 'artifact-digest'
  | 'plan-schema'
  | 'gate-docs';

export interface ValidationCheck {
  id: ValidationCheckId;
  ok: boolean;
  detail: string;
}

export interface SemanticValidationResult {
  pass: boolean;
  checks: ValidationCheck[];
  plan_digest: string;
  docs_digest: string;
  validation_digest: string;
}

function listDocsRecursive(docsDir: string): string[] {
  if (!existsSync(docsDir)) return [];
  const results: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        results.push(full);
      }
    }
  };
  try {
    walk(docsDir);
  } catch {
    // Unreadable directory -> treat as empty, never crash validation.
  }
  return results;
}

/**
 * P1 (DEBT1) — the machine checks `validate` actually runs before a plan may
 * move to `ready-to-execute`. Replaces the old hardcoded `validationPass:
 * true`: every check here reads real bytes/manifests off disk and can fail.
 * Always emits exactly one entry per ValidationCheckId (even when an earlier
 * check already failed) so `validation_digest` is a deterministic function
 * of workspace state, not of which checks happened to run.
 */
export function runSemanticValidation(workspaceRoot: string): SemanticValidationResult {
  const checks: ValidationCheck[] = [];

  // 1+2. Tier-1 emit manifest must exist, parse, and be activated.
  const tier1ManifestPath = manifestPath(workspaceRoot, 'tier1');
  let manifest: EmitManifest | null = null;
  if (!existsSync(tier1ManifestPath)) {
    checks.push({
      id: 'manifest-present',
      ok: false,
      detail: 'Tier-1 emit manifest không tồn tại — chưa emit lần nào.',
    });
  } else {
    try {
      const parsed = emitManifestSchema.safeParse(JSON.parse(readFileSync(tier1ManifestPath, 'utf8')));
      if (!parsed.success) {
        checks.push({ id: 'manifest-present', ok: false, detail: 'emit-manifest.json không đúng schema.' });
      } else {
        manifest = parsed.data;
        checks.push({ id: 'manifest-present', ok: true, detail: '' });
      }
    } catch {
      checks.push({ id: 'manifest-present', ok: false, detail: 'emit-manifest.json không phải JSON hợp lệ.' });
    }
  }
  checks.push({
    id: 'manifest-activated',
    ok: manifest !== null && manifest.activated_at !== null,
    detail: manifest === null
      ? 'Không có manifest hợp lệ để kiểm tra activation.'
      : manifest.activated_at !== null
        ? ''
        : 'Manifest đang staged, chưa activated_at.',
  });

  // 3. Every artifact the manifest claims must hash-match the bytes on disk.
  if (manifest) {
    const mismatches: string[] = [];
    for (const artifact of manifest.artifacts) {
      const abs = join(workspaceRoot, artifact.path);
      if (!existsSync(abs)) {
        mismatches.push(artifact.path);
        continue;
      }
      const content = readFileSync(abs, 'utf8');
      const digest = createHash('sha256').update(content).digest('hex');
      if (digest !== artifact.digest) {
        mismatches.push(artifact.path);
      }
    }
    checks.push({
      id: 'artifact-digest',
      ok: mismatches.length === 0,
      detail: mismatches.length > 0
        ? `Sai lệch bytes so với manifest hoặc thiếu file: ${mismatches.join(', ')}.`
        : '',
    });
  } else {
    checks.push({
      id: 'artifact-digest',
      ok: false,
      detail: 'Bỏ qua vì không có manifest hợp lệ.',
    });
  }

  // 4. execution-plan.json must parse against its own schema.
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');
  let planJson: unknown = null;
  if (!existsSync(execPlanPath)) {
    checks.push({ id: 'plan-schema', ok: false, detail: 'execution-plan.json không tồn tại.' });
  } else {
    try {
      planJson = JSON.parse(readFileSync(execPlanPath, 'utf8'));
      const parsed = executionPlanSchemaV3.safeParse(planJson);
      checks.push({
        id: 'plan-schema',
        ok: parsed.success,
        detail: parsed.success ? '' : 'execution-plan.json không khớp schema V3.',
      });
    } catch {
      planJson = null;
      checks.push({ id: 'plan-schema', ok: false, detail: 'execution-plan.json không phải JSON hợp lệ.' });
    }
  }

  // 5. Required docs for the requires_validation gate(s) must actually be on
  // disk (docs-only slice of evaluateGate — 'validation-pass' itself is
  // intentionally ignored here to avoid circularity with this very result).
  const policyPath = join(workspaceRoot, 'Design/Content/interview-script/gate-policy.yaml');
  if (!existsSync(policyPath)) {
    checks.push({ id: 'gate-docs', ok: false, detail: 'gate-policy.yaml không tồn tại.' });
  } else {
    try {
      const policy = loadGatePolicy(policyPath);
      const existingDocs = listDocsRecursive(join(workspaceRoot, 'docs'));
      const snapshot = buildGateSnapshot(workspaceRoot, existingDocs, false, []);
      const validationGates = policy.gates.filter((g) => g.requires_validation);
      const missingDocs: string[] = [];
      for (const gate of validationGates) {
        const { missing } = evaluateGate(gate, snapshot);
        missingDocs.push(...missing.filter((m) => m !== 'validation-pass'));
      }
      checks.push({
        id: 'gate-docs',
        ok: missingDocs.length === 0,
        detail: missingDocs.length > 0 ? `Thiếu tài liệu bắt buộc: ${missingDocs.join(', ')}.` : '',
      });
    } catch {
      checks.push({ id: 'gate-docs', ok: false, detail: 'Lỗi nạp gate-policy.yaml.' });
    }
  }

  const pass = checks.every((c) => c.ok);
  const plan_digest = planJson ? calculatePlanDigest(planJson) : '';
  const docs_digest = calculateDocsDigest(loadEmittedDocs(workspaceRoot, execPlanPath));
  const validation_digest = calculateValidationResultDigest(checks);

  return { pass, checks, plan_digest, docs_digest, validation_digest };
}
