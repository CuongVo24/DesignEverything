import { normalize } from 'path';
import { InternalMutationCapability } from './schemas/index.js';
import { matchesCatalogPattern } from './catalogPathMatch.js';

export type ArtifactClass = 'engine-state' | 'engine-policy' | 'managed-output' | 'interview-scratch' | 'user-owned';

// A catalog entry as far as ownership classification cares: either a bare
// exact-path string (the original, still-supported shape), or an object
// carrying `path` and/or `path_pattern` — real ArtifactRecord values from
// compileRuntimeCatalog satisfy this structurally, extra fields ignored.
export interface CatalogPathEntry {
  path?: string;
  path_pattern?: string;
}

export function normalizePath(path: string): string {
  const norm = normalize(path).replace(/\\/g, '/');
  if (norm.length >= 2 && norm[1] === ':') {
    return norm[0].toLowerCase() + norm.slice(1);
  }
  return norm;
}

export function classifyArtifact(path: string, catalogEntries: (string | CatalogPathEntry)[] = []): ArtifactClass {
  const norm = normalizePath(path);

  // 1. engine-state
  if (
    norm.includes('.design-everything/interview-state.json') ||
    norm.includes('.design-everything/execution-state.json') ||
    norm.includes('.design-everything/execution-plan.json') ||
    norm.endsWith('progress.json') ||
    norm.endsWith('answers.json') ||
    norm.includes('.interview/') ||
    norm.includes('.design-everything/backups/') ||
    norm.endsWith('.lock') ||
    norm.endsWith('.digest')
  ) {
    return 'engine-state';
  }

  // 2. engine-policy
  // Note: no bare `shapes/`/`schemas/` substring check here — the installed
  // layout only ever places `shapes.yaml` under
  // Design/Content/interview-script/ (covered by the prefix check below),
  // and no `schemas/` directory is ever copied into a target project. A
  // bare substring match would false-deny legitimate user code such as
  // `src/schemas/user.ts` or `src/shapes/circle.ts`.
  if (
    norm.includes('Design/Content/interview-script/') ||
    norm.endsWith('gate-policy.yaml') ||
    norm.endsWith('version.json')
  ) {
    return 'engine-policy';
  }

  // 3. interview-scratch
  if (norm.includes('.design-everything/scratch/')) {
    return 'interview-scratch';
  }

  // 4. managed-output — exact canonical path membership, or a declared
  // {placeholder} path_pattern match (P6 10.3 — e.g. artifact-catalog.yaml's
  // ADR/feature-spec entries, which only declare path_pattern, never path).
  // Exact match stays a Set for O(1) lookup and is never substring/suffix
  // based — a lookalike path in an unrelated directory (e.g.
  // "other/docs/01-vision.md") must not impersonate a catalog entry.
  const exactPaths = new Set<string>();
  const patterns: string[] = [];
  for (const entry of catalogEntries) {
    if (typeof entry === 'string') {
      exactPaths.add(normalizePath(entry));
    } else {
      if (entry.path) exactPaths.add(normalizePath(entry.path));
      if (entry.path_pattern) patterns.push(entry.path_pattern);
    }
  }
  if (exactPaths.has(norm) || patterns.some((p) => matchesCatalogPattern(norm, p))) {
    return 'managed-output';
  }

  // Fallback to user-owned
  return 'user-owned';
}

export function authorizeMutation(
  action: 'write' | 'delete' | 'rename',
  actor: 'agent-host' | 'core-transaction',
  targetPath: string,
  capability?: InternalMutationCapability,
  catalogEntries: (string | CatalogPathEntry)[] = []
): { decision: 'allow' | 'deny'; reason_code: string; user_message: string } {
  void action;
  const artifactClass = classifyArtifact(targetPath, catalogEntries);

  if (artifactClass === 'user-owned') {
    return {
      decision: 'allow',
      reason_code: 'USER_OWNED_ALLOWED',
      user_message: 'User-owned artifact mutation is allowed.',
    };
  }

  if (artifactClass === 'interview-scratch') {
    const norm = normalizePath(targetPath);
    // Scratch path must follow .design-everything/scratch/{session}/{question}/ pattern
    const scratchRegex = /\.design-everything\/scratch\/[^/]+\/[^/]+\/.+/;
    if (scratchRegex.test(norm)) {
      return {
        decision: 'allow',
        reason_code: 'INTERVIEW_SCRATCH_ALLOWED',
        user_message: 'Interview scratch file write is allowed.',
      };
    } else {
      return {
        decision: 'deny',
        reason_code: 'INVALID_SCRATCH_PATH',
        user_message: 'Scratch file must be stored under .design-everything/scratch/{session}/{question}/.',
      };
    }
  }

  // Protected classes: engine-state, engine-policy, managed-output
  if (actor === 'core-transaction' && capability) {
    const normTarget = normalizePath(targetPath);
    // Exact path-set membership only — a suffix/substring match would let a
    // capability scoped to e.g. ".design-everything/interview-state.json"
    // also authorize writes to "evil/.design-everything/interview-state.json".
    const normAllowed = new Set(capability.target_paths.map((p) => normalizePath(p)));
    const isTargetAllowed = normAllowed.has(normTarget);

    if (isTargetAllowed) {
      return {
        decision: 'allow',
        reason_code: 'INTERNAL_CAPABILITY_AUTHORIZED',
        user_message: 'Core transaction authorized with valid internal capability.',
      };
    } else {
      return {
        decision: 'deny',
        reason_code: 'CAPABILITY_TARGET_MISMATCH',
        user_message: `Internal capability target mismatch for path: ${targetPath}`,
      };
    }
  }

  return {
    decision: 'deny',
    reason_code: 'PROTECTED_ARTIFACT_MUTATION_DENIED',
    user_message: `Direct mutation of protected ${artifactClass} artifact (${targetPath}) by external actor is denied. Core transaction capability required.`,
  };
}
