import { test, expect, describe } from 'vitest';
import { compileContractToTaskCard } from './compileContractToTaskCard.js';
import { Contract } from './schemas/index.js';

describe('compileContractToTaskCard', () => {
  const contract: Contract = {
    id: 'C-auth-login',
    feature_milestone: 'M4-auth',
    layer: 'app',
    micro_task: 'Implement authentication login logic.',
    scope: {
      in: ['src/features/auth/login.ts'],
      out: [],
    },
    checklist: ['Verify username exists'],
    interfaces: [
      {
        path: 'src/features/auth/login.ts',
        change: 'NEW',
        signature: 'loginUser(user, pass)',
        est_lines: 150,
      },
    ],
    risks: [],
    verification: [
      {
        id: 'run-auth-test',
        argv: ['npm', 'test'],
        expected: {
          kind: 'exit-code-zero',
        },
      },
    ],
    status: 'WAITING_FOR_APPROVAL',
    conventions_ref: 'docs/conventions/tech-stack.md',
    derived_from: {
      must_id: 'MUST-1',
      entity_ids: ['User'],
      flow_id: 'F-1',
    },
  };

  test('should compile contract to task card correctly', () => {
    const taskCard = compileContractToTaskCard(contract);
    expect(taskCard.id).toBe(contract.id);
    expect(taskCard.type).toBe('implementation');
    expect(taskCard.milestone).toBe(contract.feature_milestone);
    expect(taskCard.intent).toBe(contract.micro_task);
    expect(taskCard.allowed_paths).toEqual(['src/features/auth/login.ts']);
    expect(taskCard.preconditions).toEqual(['Verify username exists']);
    expect(taskCard.commands).toEqual(contract.verification);
    expect(taskCard.evidence_required).toEqual(['run-auth-test']);
    expect(taskCard.failure_policy).toBe('fail-closed');
  });
});
