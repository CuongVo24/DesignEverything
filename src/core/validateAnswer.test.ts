import { test, expect, describe } from 'vitest';
import { validateAnswer, AnswerContract } from './index.js';

describe('B3a — Answer and slot validation engine contract (validateAnswer)', () => {
  test('rejects empty or whitespace answers', () => {
    const res1 = validateAnswer(null, '');
    expect(res1.outcome).toBe('invalid');
    expect(res1.reason_code).toBe('EMPTY_ANSWER');

    const res2 = validateAnswer(null, '   \n  \t ');
    expect(res2.outcome).toBe('invalid');
    expect(res2.reason_code).toBe('EMPTY_ANSWER');
  });

  test('rejects placeholder text answers', () => {
    expect(validateAnswer(null, 'TBD').outcome).toBe('invalid');
    expect(validateAnswer(null, 'todo').outcome).toBe('invalid');
    expect(validateAnswer(null, '...').outcome).toBe('invalid');
    expect(validateAnswer(null, 'chưa rõ').outcome).toBe('invalid');
  });

  test('validates minimum trimmed characters requirement', () => {
    const contract: AnswerContract = {
      required: true,
      min_trimmed_chars: 10,
      warning_rules: [],
    };

    const resShort = validateAnswer(contract, 'short');
    expect(resShort.outcome).toBe('invalid');
    expect(resShort.reason_code).toBe('MIN_CHARS_VIOLATION');

    const resLong = validateAnswer(contract, 'This is long enough text');
    expect(resLong.outcome).toBe('valid');
  });

  test('returns needs_user_ack when warning rules are triggered', () => {
    const contract: AnswerContract = {
      required: true,
      min_trimmed_chars: 3,
      warning_rules: [
        {
          code: 'VAGUE_SCOPE',
          pattern: 'maybe|possibly|tbd',
          message: 'Scope contains vague words: maybe/possibly.',
        },
      ],
    };

    const res = validateAnswer(contract, 'We will maybe build a web app.');
    expect(res.outcome).toBe('needs_user_ack');
    expect(res.reason_code).toBe('WARNING_RULES_TRIGGERED');
    expect(res.warnings).toBeDefined();
    expect(res.warnings?.[0]).toContain('vague words');
  });

  test('returns valid for good input', () => {
    const contract: AnswerContract = {
      required: true,
      min_trimmed_chars: 5,
      warning_rules: [],
    };

    const res = validateAnswer(contract, 'A comprehensive project vision.');
    expect(res.outcome).toBe('valid');
    expect(res.reason_code).toBe('VALID_ANSWER');
  });

  test('P6.1 — rejects an answer that does not match the contract pattern', () => {
    const contract: AnswerContract = {
      required: true,
      min_trimmed_chars: 5,
      pattern: 'must',
      warning_rules: [],
    };

    const bad = validateAnswer(contract, 'Should: nice logging only.');
    expect(bad.outcome).toBe('invalid');
    expect(bad.reason_code).toBe('PATTERN_VIOLATION');

    const good = validateAnswer(contract, 'Must: run the main command.');
    expect(good.outcome).toBe('valid');
  });

  test('P6.1 — rejects an answer outside the contract enum_values', () => {
    const contract: AnswerContract = {
      required: true,
      min_trimmed_chars: 0,
      enum_values: ['web', 'mobile', 'hybrid', 'cli'],
      warning_rules: [],
    };

    const bad = validateAnswer(contract, 'desktop');
    expect(bad.outcome).toBe('invalid');
    expect(bad.reason_code).toBe('ENUM_VIOLATION');

    const good = validateAnswer(contract, 'cli');
    expect(good.outcome).toBe('valid');
  });

  test('P6.1 — an explicitly optional contract (required: false) allows an empty answer', () => {
    const contract: AnswerContract = {
      required: false,
      min_trimmed_chars: 0,
      warning_rules: [],
    };

    const res = validateAnswer(contract, '');
    expect(res.outcome).toBe('valid');
  });
});
