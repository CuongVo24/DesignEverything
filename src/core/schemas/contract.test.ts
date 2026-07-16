import { test, expect, describe } from 'vitest';
import { contractSchema, projectConventionsSchema } from './contract.js';

describe('Contract Schemas', () => {
  const validContract = {
    id: 'C-auth-login',
    feature_milestone: 'M4-auth',
    layer: 'app',
    micro_task: 'Implement authentication login logic.',
    scope: {
      in: ['src/features/auth/login.ts'],
      out: ['src/features/auth/register.ts'],
    },
    checklist: ['Verify username exists', 'Validate password hashes'],
    interfaces: [
      {
        path: 'src/features/auth/login.ts',
        change: 'NEW',
        signature: 'loginUser(user, pass)',
        est_lines: 150,
      },
    ],
    risks: [
      {
        risk: 'Weak hash comparison',
        level: 'medium',
        mitigation: 'Use bcrypt compare function',
      },
    ],
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

  test('should parse valid contract successfully', () => {
    const res = contractSchema.safeParse(validContract);
    expect(res.success).toBe(true);
  });

  test('should fail parsing invalid contract', () => {
    const invalid = { ...validContract, id: '' };
    const res = contractSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  test('should fail when missing required fields', () => {
    const invalid: Partial<typeof validContract> = { ...validContract };
    delete invalid.conventions_ref;
    const res = contractSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  test('should parse valid conventions', () => {
    const conventions = {
      allowed_paths: ['src/**/*.ts', 'package.json'],
      allowed_dependencies: ['vitest', 'zod'],
      tech_stack: {
        target: 'node-cli',
        language: 'typescript',
        runtime: 'node',
      },
    };
    const res = projectConventionsSchema.safeParse(conventions);
    expect(res.success).toBe(true);
  });
});
