import { expect, test, describe } from 'vitest';
import { loadScript } from './loadScript.js';
import { loadGatePolicy } from './loadGatePolicy.js';
import { loadShapes } from './loadShapes.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');
const policyPath = join(__dirname, '../../Design/Content/interview-script/gate-policy.yaml');
const taxonomyPath = join(__dirname, '../../Design/Content/taxonomy.md');
const gatePolicyMdPath = join(__dirname, '../../Design/Core/Schemas/gate-policy.md');

describe('Content Integrity (Tầng 1)', () => {
  test('script.yaml must load successfully and contain exactly 17 questions with unique IDs', () => {
    const script = loadScript(scriptPath);
    expect(script.version).toBe('2.0.0');
    expect(script.questions.length).toBe(19);

    const questionIds = script.questions.map((q) => q.id);
    const uniqueIds = new Set(questionIds);
    expect(uniqueIds.size).toBe(questionIds.length);
  });

  test('every target_doc in script.yaml questions must exist in taxonomy.md', () => {
    const script = loadScript(scriptPath);
    const taxonomyContent = readFileSync(taxonomyPath, 'utf8');

    // Extract all file basenames ending with .md from taxonomy.md using regex
    const matches = taxonomyContent.match(/[a-zA-Z0-9-]+\.md/g);
    expect(matches).not.toBeNull();
    const validDocs = new Set(matches);

    for (const question of script.questions) {
      if (question.target_doc !== null) {
        expect(validDocs.has(question.target_doc)).toBe(true);
      }
    }
  });

  test('every gate referenced in script.yaml must exist in gate-policy.yaml', () => {
    const script = loadScript(scriptPath);
    const policy = loadGatePolicy(policyPath);
    const policyGateIds = new Set(policy.gates.map((g) => g.id));

    for (const question of script.questions) {
      if (question.gate !== null) {
        expect(policyGateIds.has(question.gate)).toBe(true);
      }
    }
  });

  test('gate-policy.yaml matches the example and description in gate-policy.md', () => {
    const policy = loadGatePolicy(policyPath);
    const mdContent = readFileSync(gatePolicyMdPath, 'utf8');

    // Verify scope-locked gate is configured in yaml
    const scopeLockedGate = policy.gates.find((g) => g.id === 'scope-locked');
    expect(scopeLockedGate).toBeDefined();
    expect(scopeLockedGate!.requires_docs).toEqual(['00-vision.md', '01-personas.md', '02-scope.md']);
    expect(scopeLockedGate!.blocks).toEqual(['Write', 'Edit', 'Bash']);

    // Verify the YAML content values are mentioned/documented in the MD content
    expect(mdContent).toContain('scope-locked');
    expect(mdContent).toContain('00-vision.md');
    expect(mdContent).toContain('01-personas.md');
    expect(mdContent).toContain('02-scope.md');
    expect(mdContent).toContain('Write');
    expect(mdContent).toContain('Edit');
    expect(mdContent).toContain('Bash');
  });

  test('shapes.yaml shapes list must match taxonomy.md shapes list 100%', () => {
    const shapesPath = join(__dirname, '../../Design/Content/interview-script/shapes.yaml');
    const registry = loadShapes(shapesPath);
    const taxonomyContent = readFileSync(taxonomyPath, 'utf8');

    // For each shape, verify its id is documented in taxonomy.md
    for (const shape of registry.shapes) {
      expect(taxonomyContent).toContain(`\`${shape.id}\``);
    }
  });

  test('every branch in script.yaml must exist in shapes.yaml or be core', () => {
    const script = loadScript(scriptPath);
    const shapesPath = join(__dirname, '../../Design/Content/interview-script/shapes.yaml');
    const registry = loadShapes(shapesPath);
    const validBranches = new Set(['core', ...registry.shapes.map((s) => s.id)]);

    for (const question of script.questions) {
      expect(validBranches.has(question.branch)).toBe(true);
    }
  });
});
