import { test, expect, describe } from 'vitest';
import { validateContract, matchPath } from './validateContract.js';
import { ProjectConventions } from './schemas/index.js';

describe('matchPath (glob pattern matching)', () => {
  test('should match correct glob patterns', () => {
    expect(matchPath('src/**/*.ts', 'src/index.ts')).toBe(true);
    expect(matchPath('src/**/*.ts', 'src/features/auth/login.ts')).toBe(true);
    expect(matchPath('src/**/*.ts', 'src/features/auth/login.js')).toBe(false);
    expect(matchPath('src/**/*.ts', 'test/index.ts')).toBe(false);
    expect(matchPath('package.json', 'package.json')).toBe(true);
    expect(matchPath('package.json', 'src/package.json')).toBe(false);
  });
});

describe('validateContract', () => {
  const conventions: ProjectConventions = {
    allowed_paths: ['package.json', 'src/**/*.ts'],
    allowed_dependencies: [],
    tech_stack: {
      target: 'node-cli',
      language: 'typescript',
      runtime: 'node',
    },
  };

  const validContract = {
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

  test('should pass validation for valid contract', () => {
    const res = validateContract(validContract, conventions);
    expect(res.pass).toBe(true);
    expect(res.errors).toEqual([]);
  });

  test('should fail validation when path is out of conventions', () => {
    const invalid = {
      ...validContract,
      interfaces: [
        {
          path: 'src/features/auth/login.py', // Python path in Node stack
          change: 'NEW',
          est_lines: 10,
        },
      ],
    };
    const res = validateContract(invalid, conventions);
    expect(res.pass).toBe(false);
    expect(res.errors.some((e) => e.includes('is not allowed by conventions'))).toBe(true);
  });

  test('should fail validation when verification is empty', () => {
    const invalid = { ...validContract, verification: [] };
    const res = validateContract(invalid, conventions);
    expect(res.pass).toBe(false);
    expect(res.errors.some((e) => e.includes('Verification commands cannot be empty'))).toBe(true);
  });

  test('should fail validation when verification is only file-exists', () => {
    const invalid = {
      ...validContract,
      verification: [
        {
          id: 'check-file',
          argv: ['node', '-e', 'process.exit(0)'],
          expected: { kind: 'file-exists', value: 'src/features/auth/login.ts' },
        },
      ],
    };
    const res = validateContract(invalid, conventions);
    expect(res.pass).toBe(false);
    expect(res.errors.some((e) => e.includes('cannot only consist of file-exists'))).toBe(true);
  });

  test('should fail validation when using mixing stack commands', () => {
    const invalid = {
      ...validContract,
      verification: [
        {
          id: 'run-pytest',
          argv: ['pytest'], // Pytest in Node stack
          expected: { kind: 'exit-code-zero' },
        },
      ],
    };
    const res = validateContract(invalid, conventions);
    expect(res.pass).toBe(false);
    expect(res.errors.some((e) => e.includes('invalid for Node/Vite stack'))).toBe(true);
  });
});
