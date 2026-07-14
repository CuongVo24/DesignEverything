import { ProjectProfile, ExecutionPlanV3 } from './schemas/index.js';
import { getRecipe } from './stackRecipes.js';
import { extractMustFeatures } from './validatePlan.js';

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
  docs: string[];
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

  return {
    plan: synthesizedPlan,
    blocked: false,
  };
}
