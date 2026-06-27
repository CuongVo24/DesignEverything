import { expect, test, describe } from 'vitest';
import { evaluateGate, isBlocked, passedGates } from './evaluateGate.js';
import { loadGatePolicy } from './loadGatePolicy.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const policyPath = join(__dirname, '../../Design/Content/interview-script/gate-policy.yaml');
const policy = loadGatePolicy(policyPath);
const scopeLockedGate = policy.gates[0];

describe('evaluateGate engine', () => {
  test('evaluateGate should return correct open status and missing docs', () => {
    // Missing all 3 docs
    let result = evaluateGate(scopeLockedGate, []);
    expect(result.open).toBe(false);
    expect(result.missing).toEqual(['00-vision.md', '01-personas.md', '02-scope.md']);

    // Missing 2 docs
    result = evaluateGate(scopeLockedGate, ['00-vision.md']);
    expect(result.open).toBe(false);
    expect(result.missing).toEqual(['01-personas.md', '02-scope.md']);

    // All 3 docs present
    result = evaluateGate(scopeLockedGate, ['00-vision.md', '01-personas.md', '02-scope.md']);
    expect(result.open).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  test('evaluateGate should normalize document paths correctly on both Windows and POSIX', () => {
    const mixedPaths = [
      'E:\\project\\docs\\00-vision.md',
      '/var/tmp/01-personas.md',
      'relative/path/to/02-scope.md',
    ];
    const result = evaluateGate(scopeLockedGate, mixedPaths);
    expect(result.open).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  test('isBlocked should correctly check tool blocking rules', () => {
    // Closed gate blocks Write, Edit, Bash
    expect(isBlocked(scopeLockedGate, 'Write', ['00-vision.md'])).toBe(true);
    expect(isBlocked(scopeLockedGate, 'Edit', ['00-vision.md'])).toBe(true);
    expect(isBlocked(scopeLockedGate, 'Bash', ['00-vision.md'])).toBe(true);

    // Open gate does not block any tools
    const openDocs = ['00-vision.md', '01-personas.md', '02-scope.md'];
    expect(isBlocked(scopeLockedGate, 'Write', openDocs)).toBe(false);
    expect(isBlocked(scopeLockedGate, 'Edit', openDocs)).toBe(false);
    expect(isBlocked(scopeLockedGate, 'Bash', openDocs)).toBe(false);
  });

  test('passedGates should return list of open gates only', () => {
    // Empty when gate is closed
    expect(passedGates(policy, ['00-vision.md'])).toEqual([]);

    // Contains gate ID when open
    expect(passedGates(policy, ['00-vision.md', '01-personas.md', '02-scope.md'])).toEqual([
      'scope-locked',
    ]);
  });
});
