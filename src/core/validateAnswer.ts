import { AnswerContract } from './schemas/index.js';

export type AnswerValidationOutcome = 'valid' | 'invalid' | 'needs_user_ack';

export interface AnswerValidationResult {
  outcome: AnswerValidationOutcome;
  reason_code: string;
  message: string;
  warnings?: string[];
}

const PLACEHOLDER_PATTERNS = [
  /^tbd$/i,
  /^todo$/i,
  /^abc$/i,
  /^\.\.\.$/,
  /^test$/i,
  /^placeholder$/i,
  /^sample$/i,
  /^chưa rõ$/i,
  /^chưa xác định$/i,
];

export function validateAnswer(
  contract: AnswerContract | null | undefined,
  payload: string | Record<string, unknown>
): AnswerValidationResult {
  const trimmed = typeof payload === 'string' ? payload.trim() : JSON.stringify(payload).trim();

  // 1. Check for empty/whitespace — an explicitly optional contract
  // (required: false) is the only way to skip this; the schema defaults
  // `required` to true, so a null/absent contract still enforces it.
  if (trimmed.length === 0) {
    if (contract && contract.required === false) {
      return {
        outcome: 'valid',
        reason_code: 'VALID_ANSWER',
        message: 'Câu trả lời hợp lệ (không bắt buộc, để trống).',
      };
    }
    return {
      outcome: 'invalid',
      reason_code: 'EMPTY_ANSWER',
      message: 'Câu trả lời không được để rỗng hoặc chỉ chứa khoảng trắng.',
    };
  }

  // 2. Check for placeholders
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      outcome: 'invalid',
      reason_code: 'PLACEHOLDER_ANSWER_DENIED',
      message: `Câu trả lời "${trimmed}" là văn bản giữ chỗ (placeholder) không hợp lệ.`,
    };
  }

  if (!contract) {
    return {
      outcome: 'valid',
      reason_code: 'VALID_ANSWER',
      message: 'Câu trả lời hợp lệ.',
    };
  }

  // 3. Minimum trimmed length check
  if (contract.min_trimmed_chars && trimmed.length < contract.min_trimmed_chars) {
    return {
      outcome: 'invalid',
      reason_code: 'MIN_CHARS_VIOLATION',
      message: `Câu trả lời phải có tối thiểu ${contract.min_trimmed_chars} ký tự (hiện tại: ${trimmed.length}).`,
    };
  }

  // 4. Enum values check
  if (contract.enum_values && contract.enum_values.length > 0 && !contract.enum_values.includes(trimmed)) {
    return {
      outcome: 'invalid',
      reason_code: 'ENUM_VIOLATION',
      message: `Câu trả lời "${trimmed}" không nằm trong danh sách cho phép: ${contract.enum_values.join(', ')}.`,
    };
  }

  // 5. Pattern check (must-contain, case-insensitive — mirrors warning_rules)
  if (contract.pattern) {
    const regex = new RegExp(contract.pattern, 'i');
    if (!regex.test(trimmed)) {
      return {
        outcome: 'invalid',
        reason_code: 'PATTERN_VIOLATION',
        message: `Câu trả lời không khớp mẫu bắt buộc: ${contract.pattern}.`,
      };
    }
  }

  // 6. Warning rules check -> needs_user_ack
  const warnings: string[] = [];
  if (contract.warning_rules && contract.warning_rules.length > 0) {
    for (const rule of contract.warning_rules) {
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(trimmed)) {
          warnings.push(rule.message);
        }
      }
    }
  }

  if (warnings.length > 0) {
    return {
      outcome: 'needs_user_ack',
      reason_code: 'WARNING_RULES_TRIGGERED',
      message: `Câu trả lời có cảnh báo cần xác nhận: ${warnings.join('; ')}`,
      warnings,
    };
  }

  return {
    outcome: 'valid',
    reason_code: 'VALID_ANSWER',
    message: 'Câu trả lời hợp lệ.',
  };
}
