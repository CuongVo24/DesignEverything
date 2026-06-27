import { expect, test, describe, afterEach } from 'vitest';
import { onSessionStart } from './sessionStart.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testWorkspaceRoot = join(__dirname, '../../../test/fixtures/progress');
const progressPath = join(testWorkspaceRoot, 'progress.json');

describe('onSessionStart hook', () => {
  afterEach(() => {
    // Clean up progress.json if created in test folder
    try {
      if (existsSync(progressPath)) {
        unlinkSync(progressPath);
      }
    } catch {
      // Ignore
    }
  });

  test('should create progress.json with default S0 state when file is missing', () => {
    expect(existsSync(progressPath)).toBe(false);

    onSessionStart({ workspaceRoot: testWorkspaceRoot });

    expect(existsSync(progressPath)).toBe(true);
    const content = JSON.parse(readFileSync(progressPath, 'utf8'));
    expect(content.version).toBe('0.1.0');
    expect(content.current_step).toBe('S0');
    expect(content.phase).toBe('interview');
    expect(content.answered).toEqual([]);
    expect(content.answered_len_at_last_turn).toBe(0);
  });

  test('should not modify progress.json when it is already valid', () => {
    const validState = {
      version: '0.1.0',
      phase: 'interview',
      branch: 'web',
      current_step: 'W1',
      answered: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: 'turn-6',
      answered_len_at_last_turn: 7,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(progressPath, JSON.stringify(validState, null, 2), 'utf8');

    onSessionStart({ workspaceRoot: testWorkspaceRoot });

    const content = JSON.parse(readFileSync(progressPath, 'utf8'));
    expect(content.current_step).toBe('W1');
    expect(content.branch).toBe('web');
  });

  test('should throw error and not repair progress.json when file has invalid schema', () => {
    const invalidState = {
      version: '0.1.0',
      phase: 'invalid-phase', // invalid enum
      branch: null,
      current_step: 'S0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(progressPath, JSON.stringify(invalidState, null, 2), 'utf8');

    expect(() => onSessionStart({ workspaceRoot: testWorkspaceRoot })).toThrow(/Invalid progress schema/);

    // Verify it was not modified/repaired
    const content = JSON.parse(readFileSync(progressPath, 'utf8'));
    expect(content.phase).toBe('invalid-phase');
  });

  test('should throw error when progress.json has a version other than 0.1.0', () => {
    const wrongVersionState = {
      version: '0.0.9', // unsupported version
      phase: 'interview',
      branch: null,
      current_step: 'S0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(progressPath, JSON.stringify(wrongVersionState, null, 2), 'utf8');

    expect(() => onSessionStart({ workspaceRoot: testWorkspaceRoot })).toThrow(
      /Unsupported progress schema version: 0.0.9\. Expected 0\.1\.0\./
    );
  });
});
