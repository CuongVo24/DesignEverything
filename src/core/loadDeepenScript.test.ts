import { describe, it, expect } from 'vitest';
import { loadDeepenScript } from './loadDeepenScript.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REAL = join(__dirname, '../../Design/Content/interview-script/deepen-script.yaml');

function tmpFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'deepen-'));
  const p = join(dir, 'deepen-script.yaml');
  writeFileSync(p, content, 'utf8');
  return p;
}

describe('loadDeepenScript', () => {
  it('nạp file thật: 13 câu, đủ 4 module', () => {
    const script = loadDeepenScript(REAL);
    expect(script.questions.length).toBe(13);
    const modules = new Set(script.questions.map((q) => q.module));
    expect([...modules].sort()).toEqual(['adr', 'feature-spec', 'glossary', 'test-strategy']);
  });

  it('file thiếu → throw có message rõ (không fallback im lặng)', () => {
    expect(() => loadDeepenScript(join(__dirname, 'khong-ton-tai.yaml'))).toThrow(/Failed to read deepen script/);
  });

  it('YAML hỏng → throw', () => {
    const p = tmpFile('version: 1.0.0\nquestions: [ : : :');
    expect(() => loadDeepenScript(p)).toThrow(/Failed to parse deepen YAML/);
    unlinkSync(p);
  });

  it('per_subject:must thiếu {subject} trong ask → throw schema', () => {
    const p = tmpFile(
      `version: 1.0.0
questions:
  - id: DS2x
    module: feature-spec
    per_subject: must
    ask: "Ca biên nào?"
    kind: anchored
    target_doc: design/features/{subject-slug}.md
    default_from: []
    depends_on_tier1: []
    translate_back: true
`
    );
    expect(() => loadDeepenScript(p)).toThrow(/Invalid deepen script schema/);
    unlinkSync(p);
  });

  it('trùng id → throw', () => {
    const q = `  - id: DS1a
    module: glossary
    per_subject: none
    ask: "X?"
    kind: anchored
    target_doc: design/glossary.md
    default_from: []
    depends_on_tier1: []
    translate_back: true`;
    const p = tmpFile(`version: 1.0.0\nquestions:\n${q}\n${q}\n`);
    expect(() => loadDeepenScript(p)).toThrow(/Duplicate deepen question id/);
    unlinkSync(p);
  });

  it('target_doc ngoài design/ → throw', () => {
    const p = tmpFile(
      `version: 1.0.0
questions:
  - id: DS9z
    module: glossary
    per_subject: none
    ask: "X?"
    kind: anchored
    target_doc: docs/other.md
    default_from: []
    depends_on_tier1: []
    translate_back: true
`
    );
    expect(() => loadDeepenScript(p)).toThrow(/Invalid deepen script schema/);
    unlinkSync(p);
  });
});
