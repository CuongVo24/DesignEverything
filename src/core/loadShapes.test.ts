import { describe, it, expect } from 'vitest';
import { loadShapes } from './loadShapes.js';
import { join, dirname } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('loadShapes', () => {
  it('should load valid shapes registry', () => {
    const registry = loadShapes(join(__dirname, '../../Design/Content/interview-script/shapes.yaml'));
    expect(registry.version).toBe('2.0.0');
    expect(registry.shapes.length).toBe(4);
    expect(registry.shapes.find(s => s.id === 'web')).toBeDefined();
  });

  it('should throw on invalid YAML structure', () => {
    const tempFile = join(__dirname, './temp-invalid-shapes.yaml');
    writeFileSync(tempFile, 'version: "1.0.0"\nshapes:\n  - id: \n  name: hello');
    expect(() => loadShapes(tempFile)).toThrow();
    unlinkSync(tempFile);
  });

  it('should throw on duplicate shape id', () => {
    const tempFile = join(__dirname, './temp-duplicate-shapes.yaml');
    writeFileSync(tempFile, `version: 1.0.0
shapes:
  - id: web
    name: Web App
    branch_prefix: W
    release_docs:
      - 07-deployment.md
  - id: web
    name: Duplicate Web
    branch_prefix: D
    release_docs:
      - 07-dup.md
`);
    expect(() => loadShapes(tempFile)).toThrow(/Duplicate shape id found/);
    unlinkSync(tempFile);
  });
});
