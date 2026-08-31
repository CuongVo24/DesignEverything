import { expect, test, describe, afterAll } from 'vitest';
import { loadScript } from './loadScript.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tempYamlPath = join(__dirname, '../../test/fixtures/progress/temp-test-script.yaml');

describe('loadScript', () => {
  afterAll(() => {
    try {
      unlinkSync(tempYamlPath);
    } catch {
      // Ignore if not exists
    }
  });

  test('should successfully load the real script.yaml file', () => {
    const realScriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');
    const script = loadScript(realScriptPath);
    expect(script.version).toBe('2.2.0'); // B24c (D61) — multi_select bump
    expect(script.questions.length).toBe(26);
    expect(script.questions[0].id).toBe('CAL0');
  });

  // Một câu phụ thuộc chính nó (hoặc phụ thuộc câu chưa tồn tại/đứng sau) sẽ
  // không bao giờ đủ điều kiện → phỏng vấn kẹt cứng giữa chừng mà không báo lỗi.
  test('đồ thị depends_on của script thật phải hợp lệ và không tự phụ thuộc', () => {
    const realScriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');
    const script = loadScript(realScriptPath);
    const seen = new Set<string>();

    for (const q of script.questions) {
      expect(q.depends_on).not.toContain(q.id);
      for (const dep of q.depends_on) {
        // Mọi dependency phải là câu có thật và ĐỨNG TRƯỚC trong script.
        expect(seen.has(dep)).toBe(true);
      }
      seen.add(q.id);
    }
  });

  test('should throw error when file is missing', () => {
    const missingPath = join(__dirname, '../../test/fixtures/progress/does-not-exist.yaml');
    expect(() => loadScript(missingPath)).toThrow(/Failed to read script file/);
  });

  test('should throw error on invalid YAML syntax', () => {
    writeFileSync(tempYamlPath, 'invalid: yaml: : syntax', 'utf8');
    expect(() => loadScript(tempYamlPath)).toThrow(/Failed to parse YAML/);
  });

  test('should throw error on duplicate question IDs', () => {
    const yamlContent = `
version: 0.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: null
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
  - id: S0
    ask: "Question 2?"
    default: null
    target_doc: doc2.md
    branch: core
    gate: null
    translate_back: "t2"
    depends_on: []
`;
    writeFileSync(tempYamlPath, yamlContent, 'utf8');
    expect(() => loadScript(tempYamlPath)).toThrow(/Duplicate question id found/);
  });

  test('should throw error when depends_on refers to a forward or non-existent question', () => {
    const yamlContent = `
version: 0.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: null
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: [S1]
  - id: S1
    ask: "Question 2?"
    default: null
    target_doc: doc2.md
    branch: core
    gate: null
    translate_back: "t2"
    depends_on: []
`;
    writeFileSync(tempYamlPath, yamlContent, 'utf8');
    expect(() => loadScript(tempYamlPath)).toThrow(/depends on undeclared or forward-declared id/);
  });

  test('should throw error when web/mobile branch question precedes S6', () => {
    const yamlContent = `
version: 0.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: null
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
  - id: W1
    ask: "Question 2?"
    default: null
    target_doc: doc2.md
    branch: web
    gate: null
    translate_back: "t2"
    depends_on: [S0]
  - id: S6
    ask: "Question S6?"
    default: null
    target_doc: doc3.md
    branch: core
    gate: null
    translate_back: "t3"
    depends_on: [S0]
`;
    writeFileSync(tempYamlPath, yamlContent, 'utf8');
    expect(() => loadScript(tempYamlPath)).toThrow(/cannot precede S6/);
  });

  // B22b — options/recommendation/option_hints (schema 2.1.0). Mutual
  // exclusion, recommendation required when options present, fixed.value
  // must reference a real option, and option_hints closure enforcement.
  describe('options/recommendation/option_hints (2.1.0)', () => {
    test('should throw when a question declares both options and option_hints', () => {
      const yamlContent = `
version: 2.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: "d"
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
    options:
      - { value: a, label: "A", description: "desc a" }
      - { value: b, label: "B", description: "desc b" }
    recommendation: { mode: fixed, value: a }
    option_hints:
      synthesize_from: [S0]
      hint_count: 2
      hint_style: "style"
`;
      writeFileSync(tempYamlPath, yamlContent, 'utf8');
      expect(() => loadScript(tempYamlPath)).toThrow(/Invalid script schema/);
    });

    test('should throw when options is present without recommendation', () => {
      const yamlContent = `
version: 2.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: "d"
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
    options:
      - { value: a, label: "A", description: "desc a" }
      - { value: b, label: "B", description: "desc b" }
`;
      writeFileSync(tempYamlPath, yamlContent, 'utf8');
      expect(() => loadScript(tempYamlPath)).toThrow(/Invalid script schema/);
    });

    test('should throw when recommendation is present without options', () => {
      const yamlContent = `
version: 2.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: "d"
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
    recommendation: { mode: contextual }
`;
      writeFileSync(tempYamlPath, yamlContent, 'utf8');
      expect(() => loadScript(tempYamlPath)).toThrow(/Invalid script schema/);
    });

    test('should throw when a fixed recommendation value does not match any option', () => {
      const yamlContent = `
version: 2.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: "d"
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
    options:
      - { value: a, label: "A", description: "desc a" }
      - { value: b, label: "B", description: "desc b" }
    recommendation: { mode: fixed, value: c }
`;
      writeFileSync(tempYamlPath, yamlContent, 'utf8');
      expect(() => loadScript(tempYamlPath)).toThrow(/Invalid script schema/);
    });

    test('should throw when option_hints.synthesize_from refers to an id outside the depends_on closure', () => {
      const yamlContent = `
version: 2.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: "d"
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
  - id: S1
    ask: "Question 2?"
    default: "d"
    target_doc: doc2.md
    branch: core
    gate: null
    translate_back: "t2"
    depends_on: []
  - id: S2
    ask: "Question 3?"
    default: "d"
    target_doc: doc3.md
    branch: core
    gate: null
    translate_back: "t3"
    depends_on: [S1]
    option_hints:
      synthesize_from: [S0]
      hint_count: 2
      hint_style: "style"
`;
      writeFileSync(tempYamlPath, yamlContent, 'utf8');
      expect(() => loadScript(tempYamlPath)).toThrow(/option_hints source must be in its depends_on closure/);
    });

    test('should accept a question with a well-formed options block (fixed recommendation)', () => {
      const yamlContent = `
version: 2.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: "a"
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
    options:
      - { value: a, label: "A", description: "desc a" }
      - { value: b, label: "B", description: "desc b" }
    recommendation: { mode: fixed, value: a }
`;
      writeFileSync(tempYamlPath, yamlContent, 'utf8');
      const script = loadScript(tempYamlPath);
      expect(script.questions[0].options).toHaveLength(2);
      expect(script.questions[0].recommendation).toEqual({ mode: 'fixed', value: 'a' });
    });

    test('should accept a question with a well-formed option_hints block whose source is within the depends_on closure', () => {
      const yamlContent = `
version: 2.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: "d"
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
  - id: S1
    ask: "Question 2?"
    default: "d"
    target_doc: doc2.md
    branch: core
    gate: null
    translate_back: "t2"
    depends_on: [S0]
    option_hints:
      synthesize_from: [S0]
      hint_count: 3
      hint_style: "style"
`;
      writeFileSync(tempYamlPath, yamlContent, 'utf8');
      const script = loadScript(tempYamlPath);
      expect(script.questions[1].option_hints).toEqual({
        synthesize_from: ['S0'],
        hint_count: 3,
        hint_style: 'style',
      });
    });

    test('should leave a question without options/option_hints as plain free-text (backward compat)', () => {
      const yamlContent = `
version: 2.1.0
questions:
  - id: S0
    ask: "Question 1?"
    default: "d"
    target_doc: doc1.md
    branch: core
    gate: null
    translate_back: "t1"
    depends_on: []
`;
      writeFileSync(tempYamlPath, yamlContent, 'utf8');
      const script = loadScript(tempYamlPath);
      expect(script.questions[0].options).toBeUndefined();
      expect(script.questions[0].recommendation).toBeUndefined();
      expect(script.questions[0].option_hints).toBeUndefined();
    });
  });
});
