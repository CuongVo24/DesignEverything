import { ProjectConventions, contractSchema } from './schemas/index.js';

export function matchPath(pattern: string, filePath: string): boolean {
  const p = pattern.replace(/\\/g, '/');
  const f = filePath.replace(/\\/g, '/');

  let reg = '^';
  let i = 0;
  while (i < p.length) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') {
        if (p[i + 2] === '/') {
          reg += '(?:.*/)?';
          i += 3;
        } else {
          reg += '.*';
          i += 2;
        }
      } else {
        reg += '[^/]*';
        i++;
      }
    } else if (c === '?') {
      reg += '[^/]';
      i++;
    } else if ('[\\^$.|+()'.includes(c)) {
      reg += '\\' + c;
      i++;
    } else {
      reg += c;
      i++;
    }
  }
  reg += '$';
  return new RegExp(reg).test(f);
}

export interface ContractValidationResult {
  pass: boolean;
  errors: string[];
}

export function validateContract(contract: unknown, conventions: ProjectConventions): ContractValidationResult {
  const errors: string[] = [];

  // 1. Zod schema validation
  const parsed = contractSchema.safeParse(contract);
  if (!parsed.success) {
    const schemaErrors = parsed.error.errors.map((e) => {
      if (e.path.join('.') === 'verification' && (e.message.includes('at least 1') || e.code === 'too_small')) {
        return 'Verification commands cannot be empty.';
      }
      return `${e.path.join('.')}: ${e.message}`;
    });
    return {
      pass: false,
      errors: schemaErrors,
    };
  }

  const validatedContract = parsed.data;

  // 2. Validate interfaces paths against allowed paths in conventions
  for (const iface of validatedContract.interfaces) {
    const isAllowed = conventions.allowed_paths.some((pattern) => matchPath(pattern, iface.path));
    if (!isAllowed) {
      errors.push(`Interface path "${iface.path}" is not allowed by conventions.`);
    }
  }

  // 3. Validate verification is not empty or file-exists-only
  if (validatedContract.verification.length === 0) {
    errors.push('Verification commands cannot be empty.');
  } else {
    const allFileExists = validatedContract.verification.every(
      (cmd) => cmd.expected.kind === 'file-exists'
    );
    if (allFileExists) {
      errors.push('Verification cannot only consist of file-exists checks for implementation tasks.');
    }
  }

  // 4. Validate stack commands matching conventions
  const target = conventions.tech_stack.target;
  for (const cmd of validatedContract.verification) {
    const executable = cmd.argv[0];
    if (!executable) continue;

    if (target === 'python-cli') {
      // Python cli shouldn't use npm/node/yarn/npx/vite/vitest
      if (['npm', 'node', 'yarn', 'npx', 'vite', 'vitest'].includes(executable)) {
        errors.push(
          `Command "${executable}" is invalid for Python stack. Conventions target is python-cli.`
        );
      }
    } else {
      // Node/Vite stacks shouldn't use python/pip/pytest
      if (['python', 'pip', 'pytest', 'python3', 'pip3'].includes(executable)) {
        errors.push(
          `Command "${executable}" is invalid for Node/Vite stack. Conventions target is ${target}.`
        );
      }
    }
  }

  return {
    pass: errors.length === 0,
    errors,
  };
}
