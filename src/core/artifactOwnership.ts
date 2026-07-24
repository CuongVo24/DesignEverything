import { normalize } from 'path';
import { InternalMutationCapability } from './schemas/index.js';

export type ArtifactClass = 'engine-state' | 'engine-policy' | 'managed-output' | 'interview-scratch' | 'user-owned';

export function normalizePath(path: string): string {
  const norm = normalize(path).replace(/\\/g, '/');
  if (norm.length >= 2 && norm[1] === ':') {
    return norm[0].toLowerCase() + norm.slice(1);
  }
  return norm;
}

export function classifyArtifact(path: string, catalogPaths: string[] = []): ArtifactClass {
  const norm = normalizePath(path);

  // 1. engine-state
  if (
    norm.includes('.design-everything/interview-state.json') ||
    norm.includes('.design-everything/execution-state.json') ||
    norm.includes('.design-everything/execution-plan.json') ||
    norm.endsWith('progress.json') ||
    norm.includes('.design-everything/backups/') ||
    norm.endsWith('.lock') ||
    norm.endsWith('.digest')
  ) {
    return 'engine-state';
  }

  // 2. engine-policy
  if (
    norm.includes('Design/Content/interview-script/') ||
    norm.endsWith('gate-policy.yaml') ||
    norm.includes('shapes/') ||
    norm.includes('schemas/') ||
    norm.endsWith('version.json')
  ) {
    return 'engine-policy';
  }

  // 3. interview-scratch
  if (norm.includes('.design-everything/scratch/')) {
    return 'interview-scratch';
  }

  // 4. managed-output
  const normCatalog = catalogPaths.map((p) => normalizePath(p));
  if (normCatalog.some((cp) => norm.endsWith(cp) || norm.includes(cp))) {
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
  catalogPaths: string[] = []
): { decision: 'allow' | 'deny'; reason_code: string; user_message: string } {
  const artifactClass = classifyArtifact(targetPath, catalogPaths);

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
    const normAllowed = capability.target_paths.map((p) => normalizePath(p));
    const isTargetAllowed = normAllowed.some((ap) => normTarget.endsWith(ap) || normTarget.includes(ap));

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
