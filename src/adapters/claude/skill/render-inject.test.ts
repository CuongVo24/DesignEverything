import { expect, test, describe } from 'vitest';
import { renderInject } from './render-inject.js';
import { Progress, Script } from '../../../core/schemas/index.js';

describe('renderInject function', () => {
  const mockScript: Script = {
    version: '0.1.0',
    questions: [
      {
        id: 'S0',
        ask: 'Question S0',
        default: 'Default S0',
        translate_back: 'Translate S0',
        target_doc: '00-vision.md',
        depends_on: [],
        branch: 'core',
        gate: null,
      },
      {
        id: 'S3',
        ask: 'Cứ kể lộn xộn những việc bạn muốn người dùng làm được',
        default: 'Không có',
        translate_back: 'Translate S3',
        target_doc: '02-scope.md',
        depends_on: ['S2'],
        branch: 'core',
        gate: null,
      },
    ],
  };

  test('should return empty string when current_step is null', () => {
    const progress: Progress = {
      version: '0.1.0',
      phase: 'ready-to-build',
      branch: 'web',
      current_step: null,
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };

    const result = renderInject(progress, mockScript);
    expect(result).toBe('');
  });

  test('should render question details and 4 golden rules when current_step is active', () => {
    const progress: Progress = {
      version: '0.1.0',
      phase: 'interview',
      branch: null,
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: 'turn-2',
      answered_len_at_last_turn: 2,
      updated_at: new Date().toISOString(),
    };

    const result = renderInject(progress, mockScript);
    expect(result).toContain('ID câu hỏi: S3');
    expect(result).toContain('Cứ kể lộn xộn những việc bạn muốn người dùng làm được');
    expect(result).toContain('Translate S3');
    expect(result).toContain('02-scope.md');
    expect(result).toContain('4 Quy tắc vàng của phỏng vấn');
  });

  test('should throw error when current_step question is not found in script', () => {
    const progress: Progress = {
      version: '0.1.0',
      phase: 'interview',
      branch: null,
      current_step: 'S99',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };

    expect(() => renderInject(progress, mockScript)).toThrow(
      /Question with ID S99 not found in script/
    );
  });
});
