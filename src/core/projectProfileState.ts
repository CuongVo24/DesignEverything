import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { ProjectProfile, projectProfileSchema } from './schemas/index.js';

export function calculateProfileDigest(profile: ProjectProfile): string {
  const data = JSON.stringify({
    workspace_kind: profile.workspace_kind,
    target: profile.target,
    runtime: profile.runtime,
    package_manager: profile.package_manager,
    framework: profile.framework,
    language: profile.language,
    source_root: profile.source_root,
    capabilities: profile.capabilities,
  });
  return createHash('sha256').update(data).digest('hex');
}

export function loadProjectProfile(workspace: string): ProjectProfile | null {
  const profilePath = join(workspace, '.design-everything/project-profile.json');
  if (!existsSync(profilePath)) {
    return null;
  }
  try {
    const raw = readFileSync(profilePath, 'utf8');
    const parsed = JSON.parse(raw);
    const validated = projectProfileSchema.parse(parsed);
    return validated;
  } catch {
    return null;
  }
}

export function saveProjectProfile(workspace: string, profile: ProjectProfile): void {
  const profilePath = join(workspace, '.design-everything/project-profile.json');
  let oldDigest = '';
  if (existsSync(profilePath)) {
    try {
      const old = JSON.parse(readFileSync(profilePath, 'utf8'));
      oldDigest = calculateProfileDigest(old);
    } catch {
      // ignore
    }
  }

  const newDigest = calculateProfileDigest(profile);

  const dir = dirname(profilePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Redact secrets: make sure absolute paths are stripped from evidence
  const redactedEvidence = profile.evidence.map((ev) => {
    if (ev.path) {
      // Keep only basename or relative path, strip drive letters or absolute paths
      const norm = ev.path.replace(/\\/g, '/');
      const parts = norm.split('/');
      const cleanPath = parts[parts.length - 1];
      return { ...ev, path: cleanPath };
    }
    return ev;
  });

  const redactedProfile: ProjectProfile = {
    ...profile,
    evidence: redactedEvidence,
  };

  writeFileSync(profilePath, JSON.stringify(redactedProfile, null, 2), 'utf8');

  // Profile change invalidates plan/state snapshot
  if (oldDigest && oldDigest !== newDigest) {
    const planPath = join(workspace, '.design-everything/execution-plan.json');
    if (existsSync(planPath)) {
      rmSync(planPath, { force: true });
    }
    const statePath = join(workspace, '.design-everything/execution-state.json');
    if (existsSync(statePath)) {
      try {
        const state = JSON.parse(readFileSync(statePath, 'utf8'));
        state.phase = 'plan-validating';
        state.active_task = null;
        state.validated_plan_digest = '';
        state.validated_docs_digest = '';
        writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
      } catch {
        // ignore
      }
    }
  }
}
