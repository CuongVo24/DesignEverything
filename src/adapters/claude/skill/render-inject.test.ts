import { expect, test, describe } from 'vitest';
import { renderInject } from './render-inject.js';
import { Progress, Script } from '../../../core/schemas/index.js';

describe('renderInject function', () => {
  const mockScript: Script = {
    version: '2.0.0',
    questions: [
      {
        id: 'S0',
        ask: 'Question S0',
        default: 'Default S0',
        kind: 'anchored',
        translate_back: 'Translate S0',
        target_doc: '00-vision.md',
        depends_on: [],
        branch: 'core',
        gate: null,
      },
      {
        id: 'CAL0',
        ask: 'Calibrate Question',
        default: 'Default Calibrate',
        kind: 'meta',
        translate_back: 'Translate Calibrate',
        target_doc: null,
        depends_on: [],
        branch: 'core',
        gate: null,
      },
      {
        id: 'S3',
        ask: 'Cứ kể lộn xộn những việc bạn muốn người dùng làm được',
        default: 'Không có',
        kind: 'anchored',
        translate_back: 'Translate S3',
        target_doc: '02-scope.md',
        depends_on: ['S2'],
        branch: 'core',
        gate: null,
      },
    ],
    critics: {
      S3: {
        challenge: 'Scope Creep Challenge',
        ack_prompt: 'Confirm Scope Creep',
      },
    },
  } as unknown as Script;

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
      calibrate_mode: null,
    };

    const result = renderInject(progress, mockScript);
    expect(result).toBe('');
  });

  test('should render question details and 4 golden rules when current_step is active', () => {
    const progress: Progress = {
      version: '0.1.0',
      phase: 'interview',
      branch: null,
      current_step: 'S0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: 'turn-0',
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
    };

    const result = renderInject(progress, mockScript);
    expect(result).toContain('ID câu hỏi: S0');
    expect(result).toContain('Question S0');
    expect(result).toContain('Translate S0');
    expect(result).toContain('00-vision.md');
    expect(result).toContain('Loại câu hỏi (kind): anchored');
    expect(result).toContain('4 Quy tắc vàng của phỏng vấn');
  });

  test('should support meta question with no target_doc without throwing', () => {
    const progress: Progress = {
      version: '0.1.0',
      phase: 'interview',
      branch: null,
      current_step: 'CAL0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
    };

    const result = renderInject(progress, mockScript);
    expect(result).toContain('ID câu hỏi: CAL0');
    expect(result).toContain('Loại câu hỏi (kind): meta');
    expect(result).toContain('File đích (target_doc): Không có (meta question)');
  });

  test('should inject critics section when critics entry exists for current_step', () => {
    const progress: Progress = {
      version: '0.1.0',
      phase: 'interview',
      branch: null,
      current_step: 'S3',
      answered: ['S0', 'CAL0'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: 'turn-1',
      answered_len_at_last_turn: 1,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
    };

    const result = renderInject(progress, mockScript);
    expect(result).toContain('[Yêu cầu Phản biện (Critic-pass)]');
    expect(result).toContain('Challenge: Scope Creep Challenge');
    expect(result).toContain('Ack prompt: Confirm Scope Creep');
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
      calibrate_mode: null,
    };

    expect(() => renderInject(progress, mockScript)).toThrow(
      /Question with ID S99 not found in script/
    );
  });
});
