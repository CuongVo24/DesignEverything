import { Contract, TaskCard } from './schemas/index.js';

export function compileContractToTaskCard(contract: Contract): TaskCard {
  return {
    id: contract.id,
    type: 'implementation',
    milestone: contract.feature_milestone,
    intent: contract.micro_task,
    depends_on: [],
    allowed_paths: contract.interfaces.map((i) => i.path),
    preconditions: contract.checklist,
    commands: contract.verification,
    expected_result: 'Verification commands executed successfully.',
    evidence_required: contract.verification.map((cmd) => cmd.id),
    failure_policy: 'fail-closed',
    requires_capability: null,
  };
}
