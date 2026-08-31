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
        options: [
          { value: 'deep', label: 'Giải thích kỹ', description: 'Có thêm lý do và hướng dẫn.' },
          { value: 'fast', label: 'Đi nhanh', description: 'Tập trung chốt quyết định nhanh.' },
        ],
        recommendation: { mode: 'fixed', value: 'fast' },
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
        option_hints: {
          synthesize_from: ['S0', 'S2'],
          hint_count: 3,
          hint_style: 'nhóm Must tiêu biểu',
        },
      },
      {
        id: 'S7',
        ask: 'Chọn hình-hài dự án',
        default: 'web',
        kind: 'anchored',
        translate_back: 'Translate S7',
        target_doc: '06-constraints.md',
        depends_on: [],
        branch: 'core',
        gate: null,
        options: [
          { value: 'web', label: 'Ứng dụng web', description: 'Triển khai nhanh trên trình duyệt.' },
          { value: 'mobile', label: 'App di động', description: 'Cần build/ký riêng.' },
        ],
        recommendation: { mode: 'fixed', value: 'web' },
      },
      {
        id: 'W1',
        ask: 'Có cần SEO không',
        default: 'default text',
        kind: 'anchored',
        translate_back: 'Translate W1',
        target_doc: '05-architecture.md',
        depends_on: [],
        branch: 'web',
        gate: null,
        options: [
          { value: 'public-seo', label: 'Công khai cần SEO', description: 'Tăng khả năng được tìm thấy.' },
          { value: 'private-app', label: 'Ứng dụng riêng tư', description: 'Đơn giản hơn.' },
        ],
        recommendation: { mode: 'contextual' },
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
      session_id: 'session-1',
      state_revision: 0,
      phase: 'ready-for-validation',
      branch: 'web',
      current_step: null,
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
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
      session_id: 'session-1',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      current_step: 'S0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
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
      session_id: 'session-1',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      current_step: 'CAL0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
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
      session_id: 'session-1',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      current_step: 'S3',
      answered: ['S0', 'CAL0'],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
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

  test('should inject the plaintext capability token and --capability-token instruction when a token is provided', () => {
    const progress: Progress = {
      version: '0.1.0',
      session_id: 'session-1',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      current_step: 'S0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
    };

    const result = renderInject(progress, mockScript, 'deadbeef1234');
    expect(result).toContain('[Capability Token');
    expect(result).toContain('deadbeef1234');
    expect(result).toContain('--capability-token');
  });

  test('should NOT render a Capability Token section when no token is provided', () => {
    const progress: Progress = {
      version: '0.1.0',
      session_id: 'session-1',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      current_step: 'S0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
    };

    const result = renderInject(progress, mockScript);
    expect(result).not.toContain('[Capability Token');
  });

  test('should throw error when current_step question is not found in script', () => {
    const progress: Progress = {
      version: '0.1.0',
      session_id: 'session-1',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      current_step: 'S99',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
    };

    expect(() => renderInject(progress, mockScript)).toThrow(
      /Question with ID S99 not found in script/
    );
  });

  function progressAt(currentStep: string | null): Progress {
    return {
      version: '0.1.0',
      session_id: 'session-1',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      current_step: currentStep,
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
    };
  }

  describe('options/option_hints interaction blocks (8.1)', () => {
    test('renders a static options block with the exact --answer prose per option, marking the fixed recommendation', () => {
      const result = renderInject(progressAt('CAL0'), mockScript);
      expect(result).toContain('[Lựa chọn (options)]');
      expect(result).toContain('Đi nhanh (Khuyến nghị)');
      expect(result).toContain('--answer "Đi nhanh: Tập trung chốt quyết định nhanh."');
      expect(result).toContain('--answer "Giải thích kỹ: Có thêm lý do và hướng dẫn."');
      expect(result).not.toContain('Giải thích kỹ (Khuyến nghị)');
    });

    test('always keeps the free-text reminder and never puts the internal value into --answer', () => {
      const result = renderInject(progressAt('CAL0'), mockScript);
      expect(result).toContain('Người dùng có thể dùng Other để tự nhập câu trả lời');
      expect(result).not.toContain('--answer "fast"');
      expect(result).not.toContain('--answer "deep"');
    });

    test('a contextual recommendation is never preselected', () => {
      const result = renderInject(progressAt('W1'), mockScript);
      expect(result).toContain('Khuyến nghị phụ thuộc ngữ cảnh — không preselect lựa chọn nào.');
      expect(result).not.toContain('(Khuyến nghị)');
    });

    test('S7 gets an extra --branch instruction alongside --answer, not instead of it', () => {
      const result = renderInject(progressAt('S7'), mockScript);
      expect(result).toContain('--branch <value nội bộ>');
      expect(result).toMatch(/CÙNG với --answer/);
    });

    test('CAL0 gets an extra --calibrate instruction alongside --answer, not instead of it', () => {
      const result = renderInject(progressAt('CAL0'), mockScript);
      expect(result).toContain('--calibrate <value nội bộ>');
    });

    test('renders an option_hints block with hint_style and every source, flagging missing answers as unknown', () => {
      const result = renderInject(progressAt('S3'), mockScript, undefined, { S0: 'committed S0 answer' });
      expect(result).toContain('[Gợi ý lựa chọn — tổng hợp từ answers đã commit]');
      expect(result).toContain('nhóm Must tiêu biểu');
      expect(result).toContain('S0: committed S0 answer');
      expect(result).toContain('S2: ⚠ unknown — cần hỏi người, không tự bịa');
    });

    test('a question with neither options nor option_hints renders no interaction block (regression)', () => {
      const result = renderInject(progressAt('S0'), mockScript);
      expect(result).not.toContain('[Lựa chọn (options)]');
      expect(result).not.toContain('[Gợi ý lựa chọn');
    });
  });
});
