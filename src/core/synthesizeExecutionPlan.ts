import * as fs from 'fs';
import * as path from 'path';
import { ProjectProfile, ExecutionPlanV3, ExecutionState, Contract } from './schemas/index.js';
import { getRecipe } from './stackRecipes.js';
import { extractMustFeatures, extractWontFeatures } from './validatePlan.js';
import { synthesizeFeatureContracts } from './synthesizeFeatureContracts.js';
import { compileContractToTaskCard } from './compileContractToTaskCard.js';
import { slugify } from './slugify.js';

// Risk keywords that, when present in the interview answers, must be represented
// as an unresolved (spike-required) risk so the plan validator forces a spike.
const RISK_KEYWORDS = ['rủi ro', 'chưa rõ', 'phức tạp', 'platform', 'dependency', 'limit', 'giới hạn'];

export interface SynthesizeResult {
  plan: ExecutionPlanV3;
  blocked: boolean;
  message?: string;
}

export function synthesizeExecutionPlan(options: {
  answers: Record<string, string>;
  profile: ProjectProfile;
  docs: string[] | Array<{ file: string; content: string }>;
  workspaceDir?: string;
  executionState?: ExecutionState;
}): SynthesizeResult {
  const { profile, answers } = options;
  const updatedAt = new Date().toISOString();

  // 1. Handle Blocked / Unsupported Profile
  if (profile.workspace_kind === 'existing-unsupported' || profile.target === 'unsupported' || !profile.target) {
    const blockedPlan: ExecutionPlanV3 = {
      metadata: {
        version: '3.0.0',
        updated_at: updatedAt,
      },
      trace_links: [
        { must_id: 'MUST-discovery', flow_id: 'FLOW-discovery', task_ids: ['T0-discovery'] },
      ],
      risks: [
        {
          id: 'R-unsupported',
          title: 'Unsupported or unconfigured project stack',
          status: 'spike-required',
          exit_criterion: 'Remediate workspace or select a supported profile (Node CLI, Vite Web, Python CLI).',
        },
      ],
      milestones: [
        { id: 'M0-discovery', title: 'Remediation & Spike Discovery', tasks: ['T0-discovery'] },
      ],
      tasks: {
        'T0-discovery': {
          id: 'T0-discovery',
          type: 'spike',
          milestone: 'M0-discovery',
          intent: 'Remediate workspace stack or confirm a supported project configuration.',
          depends_on: [],
          allowed_paths: [],
          preconditions: [],
          commands: [],
          expected_result: 'Workspace target matches a supported environment.',
          evidence_required: [],
          failure_policy: 'abort',
          requires_capability: null,
        },
      },
      capabilities_evidence: [],
      discovery_status: 'blocked',
    };

    return {
      plan: blockedPlan,
      blocked: true,
      message: 'Workspace target is unsupported or unconfigured.',
    };
  }

  // 2. Handle Unconfirmed Profile
  if (!profile.confirmation.confirmed) {
    const unconfirmedPlan: ExecutionPlanV3 = {
      metadata: {
        version: '3.0.0',
        updated_at: updatedAt,
      },
      trace_links: [
        { must_id: 'MUST-discovery', flow_id: 'FLOW-discovery', task_ids: ['T0-discovery'] },
      ],
      risks: [
        {
          id: 'R-unconfirmed',
          title: 'Unconfirmed project configuration profile',
          status: 'spike-required',
          exit_criterion: 'User confirms target project configuration options.',
        },
      ],
      milestones: [
        { id: 'M0-discovery', title: 'Profile Confirmation Discovery', tasks: ['T0-discovery'] },
      ],
      tasks: {
        'T0-discovery': {
          id: 'T0-discovery',
          type: 'spike',
          milestone: 'M0-discovery',
          intent: 'Confirm the project target and package manager choice.',
          depends_on: [],
          allowed_paths: [],
          preconditions: [],
          commands: [],
          expected_result: 'Project profile has been successfully confirmed.',
          evidence_required: [],
          failure_policy: 'abort',
          requires_capability: null,
        },
      },
      capabilities_evidence: [],
      discovery_status: 'blocked',
    };

    return {
      plan: unconfirmedPlan,
      blocked: true,
      message: 'Project profile configuration has not been confirmed.',
    };
  }

  // 3. Supported and Confirmed Profile -> Recipe Synthesis
  const pm = profile.package_manager || 'npm';
  const lang = profile.language || 'typescript';
  const recipe = getRecipe(profile.target, pm, lang);

  // Capability evidence source must reflect how the capability was established:
  // an empty workspace has no manifest yet, so it is only user-confirmed until
  // T0-discovery proves the runtime. An existing workspace has real manifests.
  const capabilitySource: 'existing-manifest' | 'user-confirmed' =
    profile.workspace_kind === 'empty' ? 'user-confirmed' : 'existing-manifest';

  const capabilitiesEvidence = recipe.capabilities.map((cap) => ({
    id: cap,
    name: cap === 'node-npm-project'
      ? 'Node.js NPM Project Manifest'
      : cap === 'vite-bundler'
      ? 'Vite Bundler Manifest'
      : 'Python Virtual Environment Project',
    source: capabilitySource,
    checked_at: updatedAt,
  }));

  const allTaskIds = ['T0-discovery', 'T1-scaffold', 'T2-skeleton', 'T3-verify'];

  // Trace links come from the user's Must-have scope, not a hard-coded label,
  // so every Must maps to the execution tasks (and the validator can enforce it).
  const mustFeatures = extractMustFeatures(answers || {});
  const flowText = (answers?.['user_flow'] || answers?.['S5'] || '').split('\n')[0].trim();
  const flowId = flowText || 'FLOW-primary';
  const traceLinks =
    mustFeatures.length > 0
      ? mustFeatures.map((must) => ({ must_id: must, flow_id: flowId, task_ids: allTaskIds }))
      : [{ must_id: 'MUST-walking-skeleton', flow_id: flowId, task_ids: allTaskIds }];

  // Risks: the runtime/scaffold risks are resolved by T0/T1. If the answers
  // surface technical uncertainty, add an unresolved risk that the T0 spike owns.
  const answerText = Object.values(answers || {}).join(' ').toLowerCase();
  const hasRiskSignal = RISK_KEYWORDS.some((kw) => answerText.includes(kw));
  const risks = [
    {
      id: 'R1',
      title: 'Environment runtime verification',
      status: 'confirmed' as const,
      exit_criterion: 'Verification commands for T0-discovery pass successfully.',
    },
    {
      id: 'R2',
      title: 'Scaffolding manifests correctly',
      status: 'confirmed' as const,
      exit_criterion: 'T1-scaffold verified and package manifest files exist.',
    },
    ...(hasRiskSignal
      ? [
          {
            id: 'R3-uncertainty',
            title: 'Technical uncertainty raised during the interview',
            status: 'spike-required' as const,
            exit_criterion: 'T0-discovery spike resolves the uncertainty before implementation.',
          },
        ]
      : []),
  ];

  const synthesizedPlan: ExecutionPlanV3 = {
    metadata: {
      version: '3.0.0',
      updated_at: updatedAt,
    },
    trace_links: traceLinks,
    risks,
    milestones: [
      { id: 'M0-discovery', title: 'Runtime & Environment Discovery', tasks: ['T0-discovery'] },
      { id: 'M1-scaffold', title: 'Project Scaffolding & Manifests', tasks: ['T1-scaffold'] },
      { id: 'M2-skeleton', title: 'Walking Skeleton Implementation', tasks: ['T2-skeleton'] },
      { id: 'M3-verify', title: 'Test Verification & Output', tasks: ['T3-verify'] },
    ],
    tasks: {
      'T0-discovery': recipe.tasks.T0,
      'T1-scaffold': recipe.tasks.T1,
      'T2-skeleton': recipe.tasks.T2,
      'T3-verify': recipe.tasks.T3,
    },
    capabilities_evidence: capabilitiesEvidence,
    discovery_status: 'pass' as const,
  };

  // 4. Feature Contract Synthesis Integration (B16b)
  const cwd = options.workspaceDir || process.cwd();
  let executionState: ExecutionState | undefined = options.executionState;
  if (!executionState) {
    const statePath = path.join(cwd, '.design-everything', 'execution-state.json');
    if (fs.existsSync(statePath)) {
      try {
        executionState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch {
        // ignore
      }
    }
  }

  const isSkeletonVerified = executionState && executionState.completed_tasks.includes('T3-verify');

  if (isSkeletonVerified) {
    let docObjects: Array<{ file: string; content: string }> = [];
    if (Array.isArray(options.docs)) {
      if (typeof options.docs[0] === 'string') {
        for (const filename of options.docs) {
          const filePath = path.join(cwd, 'docs', filename as string);
          if (fs.existsSync(filePath)) {
            docObjects.push({
              file: filename as string,
              content: fs.readFileSync(filePath, 'utf8'),
            });
          }
        }
      } else {
        docObjects = options.docs as Array<{ file: string; content: string }>;
      }
    }

    const conventionsRef = 'docs/conventions/tech-stack.md';
    const synthesizedContracts = synthesizeFeatureContracts({
      answers,
      profile,
      docs: docObjects,
      conventionsRef,
    });

    const activeCompletedTasks = executionState!.completed_tasks || [];

    // Filter musts and find the JIT next one
    const wonts = extractWontFeatures(answers);
    const musts = mustFeatures.filter((m) => !wonts.includes(m));

    let nextMust: string | null = null;
    let nextMilestoneId: string | null = null;
    let nextContracts: Contract[] = [];

    // We track which musts are completed so we can keep their contracts in the plan
    const completedMusts: string[] = [];

    for (const must of musts) {
      const slug = slugify(must);
      const milestoneId = `M4-${slug}`;

      const mustContracts = synthesizedContracts.filter((c) => c.feature_milestone === milestoneId);
      if (mustContracts.length === 0) continue;

      const allCompleted = mustContracts.every((c) => activeCompletedTasks.includes(c.id));
      if (allCompleted) {
        completedMusts.push(must);
      } else {
        if (!nextMust) {
          nextMust = must;
          nextMilestoneId = milestoneId;
          nextContracts = mustContracts;
        }
      }
    }

    // Now, construct the plan milestones and tasks
    // 1. Add completed musts
    for (const must of completedMusts) {
      const slug = slugify(must);
      const milestoneId = `M4-${slug}`;
      const mustContracts = synthesizedContracts.filter((c) => c.feature_milestone === milestoneId);

      synthesizedPlan.milestones.push({
        id: milestoneId,
        title: `Feature Implementation: ${must}`,
        tasks: mustContracts.map((c) => c.id),
      });

      for (const contract of mustContracts) {
        synthesizedPlan.tasks[contract.id] = compileContractToTaskCard(contract);
      }
    }

    // 2. Add JIT next must if found
    if (nextMust && nextMilestoneId) {
      synthesizedPlan.milestones.push({
        id: nextMilestoneId,
        title: `Feature Implementation: ${nextMust}`,
        tasks: nextContracts.map((c) => c.id),
      });

      for (const contract of nextContracts) {
        synthesizedPlan.tasks[contract.id] = compileContractToTaskCard(contract);
      }
    }

    // 3. Update trace links to map correctly
    // Active & completed musts map to their feature tasks.
    // Unopened musts map to T0-T3 skeleton tasks.
    const updatedTraceLinks = mustFeatures.map((must) => {
      const slug = slugify(must);
      const milestoneId = `M4-${slug}`;

      const isCompleted = completedMusts.includes(must);
      const isActive = nextMust === must;

      if (isCompleted || isActive) {
        const mustContracts = synthesizedContracts.filter((c) => c.feature_milestone === milestoneId);
        return {
          must_id: must,
          flow_id: flowId,
          task_ids: mustContracts.map((c) => c.id),
        };
      } else {
        // Unopened maps to T0-T3
        return {
          must_id: must,
          flow_id: flowId,
          task_ids: allTaskIds,
        };
      }
    });

    synthesizedPlan.trace_links = updatedTraceLinks;
  }

  return {
    plan: synthesizedPlan,
    blocked: false,
  };
}
