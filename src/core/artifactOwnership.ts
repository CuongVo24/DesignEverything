import { join } from 'path';
import { readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import { InternalMutationCapability, InternalMutationOperation } from './schemas/index.js';
import { matchesCatalogPattern } from './catalogPathMatch.js';
import { normalizeDrive } from './pathPolicy.js';

export type ArtifactClass = 'engine-state' | 'engine-policy' | 'managed-output' | 'interview-scratch' | 'user-owned';

// A catalog entry as far as ownership classification cares: either a bare
// exact-path string (the original, still-supported shape), or an object
// carrying `path` and/or `path_pattern` — real ArtifactRecord values from
// compileRuntimeCatalog satisfy this structurally, extra fields ignored.
export interface CatalogPathEntry {
  path?: string;
  path_pattern?: string;
}

// B2c §3 — "cùng module được dùng bởi evaluatePreAction, evaluateGate,
// artifact ownership, slots containment và emit manifest". This used to be
// a second, byte-identical copy of pathPolicy.ts's normalizeDrive under a
// different name; re-exported here so existing callers/imports of
// `normalizePath` from this module are unaffected.
export const normalizePath = normalizeDrive;

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

// P4.2/R07 — write-gate size cap for interview scratch. Matches the 1MB
// figure loadQuestionSlots already enforces at read time; that check ran
// only once a file was already on disk, so an oversized scratch write
// could land and sit there unenforced until someone happened to read it
// back. Enforcing the same limit here closes that gap at the point of
// write instead. Deliberately the same number, not a stricter one — this
// is not a new policy, just the existing one applied earlier.
const MAX_SCRATCH_WRITE_BYTES = 1024 * 1024;

// P4.2/R07 — operation binding. `InternalMutationCapability.operation` names
// *why* a capability was minted; until now nothing checked that the reason
// was compatible with what it was actually being used to authorize, so a
// capability minted for one purpose (e.g. `emit_doc`) could authorize a
// mutation of a completely different class of artifact (e.g. engine-state)
// as long as the target path happened to appear in `target_paths`. This is
// defense-in-depth, not a production seam: no call site in this codebase
// constructs a `core-transaction` capability today (Core's own writes run
// in-process and are trusted directly, never passing through the
// PreToolUse gate this module backs) — see B2a contract §7 for why
// "issuer production" was dropped from this contract's checklist. The
// branch stays fully exercised by unit tests so the invariant holds the
// moment a real issuer is ever introduced.
const OPERATION_ALLOWED_CLASSES: Record<InternalMutationOperation, ArtifactClass[]> = {
  commit_step: ['engine-state'],
  transact_store: ['engine-state'],
  init_state: ['engine-state'],
  migrate: ['engine-state'],
  emit_doc: ['managed-output'],
};

const OPERATION_ALLOWED_ACTIONS: Record<InternalMutationOperation, Array<'write' | 'delete' | 'rename'>> = {
  commit_step: ['write'],
  transact_store: ['write', 'delete', 'rename'],
  init_state: ['write'],
  migrate: ['write'],
  // Tier-1/tier-2 re-emit backs up and unlinks stale managed files (X22),
  // so emit_doc legitimately needs delete alongside write.
  emit_doc: ['write', 'delete'],
};

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
    // P4.2/R07 — byte length of the content actually being written, when the
    // caller (evaluatePreAction, threaded from PreActionRequest.content_size_bytes)
    // has it available. Absent for callers that predate this field or for
    // action kinds where it has no meaning; the size check is skipped in
    // that case rather than denying on missing data, matching how
    // `scratchContext` already degrades to a shape-only check when absent.
    contentSizeBytes?: number;
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

    if (options?.contentSizeBytes !== undefined && options.contentSizeBytes > MAX_SCRATCH_WRITE_BYTES) {
      return {
        decision: 'deny',
        reason_code: 'SCRATCH_FILE_OVERSIZED',
        user_message: `Scratch write of ${options.contentSizeBytes} bytes exceeds the ${MAX_SCRATCH_WRITE_BYTES} byte limit.`,
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

    if (!isTargetAllowed) {
      return {
        decision: 'deny',
        reason_code: 'CAPABILITY_TARGET_MISMATCH',
        user_message: `Internal capability target mismatch for path: ${targetPath}`,
      };
    }

    // P4.2/R07 — operation binding. Narrows the allow that would otherwise
    // follow purely from target-path-set membership: the capability's
    // declared `operation` must actually cover both this artifact's class
    // and this action, not just this exact path.
    if (!OPERATION_ALLOWED_CLASSES[capability.operation].includes(artifactClass)) {
      return {
        decision: 'deny',
        reason_code: 'CAPABILITY_OPERATION_CLASS_MISMATCH',
        user_message: `Capability operation "${capability.operation}" does not authorize mutating a "${artifactClass}" artifact.`,
      };
    }
    if (!OPERATION_ALLOWED_ACTIONS[capability.operation].includes(action)) {
      return {
        decision: 'deny',
        reason_code: 'CAPABILITY_OPERATION_ACTION_MISMATCH',
        user_message: `Capability operation "${capability.operation}" does not authorize a "${action}" action.`,
      };
    }

    return {
      decision: 'allow',
      reason_code: 'INTERNAL_CAPABILITY_AUTHORIZED',
      user_message: `Core transaction authorized ${action} with valid internal capability.`,
    };
  }

  return {
    decision: 'deny',
    reason_code: 'PROTECTED_ARTIFACT_MUTATION_DENIED',
    user_message: `Direct ${action} of protected ${artifactClass} artifact (${targetPath}) by external actor is denied. Core transaction capability required.`,
  };
}

// P4.2/R07 — lifecycle cleanup for interview scratch. Scratch has no commit
// transaction of its own to clear it (unlike the canonical store), so
// abandoned sessions/questions would otherwise accumulate files under
// `.design-everything/scratch/` forever. Best-effort and idempotent, same
// contract as `cleanupOrphanTempFiles` in interviewStore.ts: a missing
// directory, a file removed by a racing cleanup, or a transiently locked
// file (Windows AV/indexer) is silently a no-op, never an error — this must
// never be the thing that makes a commit/session fail.
const DEFAULT_SCRATCH_TTL_MS = 24 * 60 * 60 * 1000; // 24h — a generous multiple of a single interview session's real duration.

export function cleanupExpiredScratch(workspaceRoot: string, ttlMs: number = DEFAULT_SCRATCH_TTL_MS): void {
  const scratchRoot = join(workspaceRoot, '.design-everything', 'scratch');
  let sessionDirs: string[];
  try {
    sessionDirs = readdirSync(scratchRoot);
  } catch {
    return; // No scratch directory yet — nothing to clean.
  }

  const now = Date.now();
  for (const sessionDir of sessionDirs) {
    const sessionPath = join(scratchRoot, sessionDir);
    let questionDirs: string[];
    try {
      questionDirs = readdirSync(sessionPath);
    } catch {
      continue;
    }

    for (const questionDir of questionDirs) {
      const questionPath = join(sessionPath, questionDir);
      let files: string[];
      try {
        files = readdirSync(questionPath);
      } catch {
        continue;
      }

      let remaining = 0;
      for (const file of files) {
        const filePath = join(questionPath, file);
        try {
          const stat = statSync(filePath);
          if (!stat.isFile() || now - stat.mtimeMs <= ttlMs) {
            remaining += 1;
            continue;
          }
          unlinkSync(filePath);
        } catch {
          // Best-effort: already removed by a racing cleanup, or transiently
          // locked — next commit's cleanup retries. Do not count it as
          // remaining just because we couldn't confirm removal; a stale
          // empty-directory rmdir attempt below is itself best-effort.
        }
      }

      if (remaining === 0) {
        try {
          rmdirSync(questionPath);
        } catch {
          // Not empty (a file we couldn't remove) or already gone — fine.
        }
      }
    }
  }
}
