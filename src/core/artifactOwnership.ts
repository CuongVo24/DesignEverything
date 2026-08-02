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

// P4.2/R07 — {session}/{question} segments a scratch write is bound to.
// `questionId: null` means no question is currently active (e.g. interview
// complete) — no scratch write can ever be "current" in that state.
export interface ScratchWriteContext {
  sessionId: string;
  questionId: string | null;
}

// Interview scratch is free-form drafting space, not an arbitrary file
// drop — only plain text/structured-data formats a question's answer
// drafting could plausibly produce are accepted. Nothing in the schema or
// script declares binary/image scratch content today, so this stays
// conservative rather than inventing an undeclared policy.
const SCRATCH_ALLOWED_EXTENSIONS = new Set(['.txt', '.md', '.json', '.csv', '.yaml', '.yml']);

export function authorizeMutation(
  action: 'write' | 'delete' | 'rename',
  actor: 'agent-host' | 'core-transaction',
  targetPath: string,
  capability?: InternalMutationCapability,
  catalogEntries: (string | CatalogPathEntry)[] = [],
  options?: {
    // P4.2/X02 — a managed-output path that does not yet exist on disk and
    // is not part of the currently active emit manifest is a legitimate
    // interview-phase draft ("pre-create"), not a bypass of the emit
    // transaction. Once a path exists or is active, direct writes must go
    // back to denying — that is an attempt to overwrite an already-managed
    // artifact outside the transaction. The caller (evaluatePreAction)
    // computes this from filesystem/manifest state; this module stays pure.
    preCreateAllowed?: boolean;
    scratchContext?: ScratchWriteContext;
  }
): { decision: 'allow' | 'deny'; reason_code: string; user_message: string } {
  // P8.5 — action is no longer discarded. Every branch below already
  // treated write/delete/rename identically before this change (the
  // parameter was simply never read) and still does — the protected-class
  // fallthrough already denied an agent-host delete/rename exactly like a
  // write, since it had no branch of its own to fall into. What changes is
  // that the parameter is now real (typed callers can rely on it being
  // consumed) and messages are accurate about which action was authorized,
  // instead of silently degrading "delete"/"rename" callers to
  // write-shaped wording.
  const artifactClass = classifyArtifact(targetPath, catalogEntries);

  if (artifactClass === 'user-owned') {
    return {
      decision: 'allow',
      reason_code: 'USER_OWNED_ALLOWED',
      user_message: `User-owned artifact ${action} is allowed.`,
    };
  }

  if (artifactClass === 'interview-scratch') {
    const norm = normalizePath(targetPath);
    // Scratch path must be a direct child of
    // .design-everything/scratch/{session}/{question}/ — a nested
    // subdirectory under {question}/ is denied (depth cap) rather than
    // matched by a trailing `.+`, since the one legitimate writer
    // (loadQuestionSlots) only ever produces a flat {session}/{question}/{fileName}.
    const scratchMatch = norm.match(/^\.design-everything\/scratch\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!scratchMatch) {
      return {
        decision: 'deny',
        reason_code: 'INVALID_SCRATCH_PATH',
        user_message: 'Scratch file must be a direct child of .design-everything/scratch/{session}/{question}/.',
      };
    }

    const [, pathSession, pathQuestion, fileName] = scratchMatch;
    const extMatch = fileName.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';
    if (!SCRATCH_ALLOWED_EXTENSIONS.has(ext)) {
      return {
        decision: 'deny',
        reason_code: 'SCRATCH_EXTENSION_DENIED',
        user_message: `Scratch file extension "${ext || '(none)'}" is not allowed; use one of: ${[...SCRATCH_ALLOWED_EXTENSIONS].join(', ')}.`,
      };
    }

    // P4.2/R07 — bind the write to the caller's real, current session and
    // question. Without this, any agent-host write could target another
    // session's scratch directory, or a past/future question's directory
    // that isn't the one currently active — exactly what the B2a contract
    // (§3, "Không dùng scratch để override ... past/future question")
    // forbids. `scratchContext` is optional so callers with no session/
    // question notion (e.g. plan-validating phase, or existing tests) keep
    // today's shape-only check.
    if (options?.scratchContext) {
      const { sessionId, questionId } = options.scratchContext;
      if (pathSession !== sessionId) {
        return {
          decision: 'deny',
          reason_code: 'SCRATCH_SESSION_MISMATCH',
          user_message: `Scratch write targets session "${pathSession}" but the current session is "${sessionId}".`,
        };
      }
      if (questionId === null || pathQuestion !== questionId) {
        return {
          decision: 'deny',
          reason_code: 'SCRATCH_QUESTION_MISMATCH',
          user_message: `Scratch write targets question "${pathQuestion}" but the current active question is ${questionId === null ? 'none' : `"${questionId}"`}.`,
        };
      }
    }

    return {
      decision: 'allow',
      reason_code: 'INTERVIEW_SCRATCH_ALLOWED',
      user_message: `Interview scratch file ${action} is allowed.`,
    };
  }

  // P4.2/X02 — a managed-output path that doesn't exist yet and isn't part
  // of the active emit manifest is a legitimate interview-phase draft, not
  // an overwrite. This must not extend to engine-state/engine-policy (a
  // pre-create scratch file cannot masquerade as e.g. progress.json) or to
  // delete/rename (there is nothing to "pre-create" by deleting).
  if (artifactClass === 'managed-output' && action === 'write' && options?.preCreateAllowed) {
    return {
      decision: 'allow',
      reason_code: 'MANAGED_DOC_PRE_CREATE_ALLOWED',
      user_message: `Pre-creating managed document ${targetPath} during interview drafting is allowed; run the emit command to make it authoritative.`,
    };
  }

  // Protected classes: engine-state, engine-policy, managed-output
  if (actor === 'core-transaction' && capability) {
    // A capability is a scaffold for a future architecture right now: no
    // production caller ever constructs one (both call sites in
    // evaluatePreAction.ts pass `undefined`), so `expires_at`/`operation`
    // being unread was previously invisible dead-branch debt rather than an
    // active exploit — nothing currently relies on an expired capability
    // being accepted. Enforcing expiry here closes that gap the moment a
    // real issuer does show up, without having to invent one now.
    // `operation` is intentionally NOT cross-validated against `action`:
    // the two are different dimensions (why a capability was minted vs.
    // what kind of filesystem mutation is being attempted) and no mapping
    // between them is declared anywhere in the schema or callers — checking
    // one against the other would fabricate a policy that doesn't exist
    // rather than enforce a real one.
    if (new Date(capability.expires_at).getTime() <= Date.now()) {
      return {
        decision: 'deny',
        reason_code: 'CAPABILITY_EXPIRED',
        user_message: `Internal capability expired at ${capability.expires_at}; a fresh capability must be issued for this transaction.`,
      };
    }

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
        user_message: `Core transaction authorized ${action} with valid internal capability.`,
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
    user_message: `Direct ${action} of protected ${artifactClass} artifact (${targetPath}) by external actor is denied. Core transaction capability required.`,
  };
}
