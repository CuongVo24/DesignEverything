import { expect, test, describe } from 'vitest';
import { emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { getStructure } from './docStructure.js';
import { getDogfoodProject, TEMPLATES_REL_DIR } from './dogfood-projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, TEMPLATES_REL_DIR);

const project = getDogfoodProject('proj-01');
const snapshotDocsDir = join(projectRoot, project.docsRelDir);

describe('Dogfood Project #1 Emission', () => {
  test('should generate documents for HabitBuilder matching the docs-generated snapshot', () => {
    const docs = emitTree(project.answers, project.branch, realTemplatesDir);
    const docFilesOnly = docs.filter((d) => !d.file.startsWith('.design-everything/'));
    expect(docFilesOnly).toHaveLength(12);

    const fileNames = docFilesOnly.map((d) => d.file);
    expect(fileNames).toContain(project.expectedReleaseDoc);
    expect(fileNames).not.toContain(project.forbiddenReleaseDoc);

    for (const doc of docFilesOnly) {
      const snapshotPath = join(snapshotDocsDir, doc.file);
      expect(existsSync(snapshotPath)).toBe(true);

      const snapshotContent = readFileSync(snapshotPath, 'utf8');
      const emittedStruct = getStructure(doc.content);
      const snapshotStruct = getStructure(snapshotContent);

      expect(emittedStruct.headings).toEqual(snapshotStruct.headings);
      expect(emittedStruct.anchors).toEqual(snapshotStruct.anchors);
    }
  });
});
