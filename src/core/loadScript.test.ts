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
    expect(script.version).toBe('1.0.1');
    expect(script.questions.length).toBe(17);
    expect(script.questions[0].id).toBe('S0');
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
});
