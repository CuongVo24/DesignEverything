import { describe, it, expect } from 'vitest';
import { filterUnexpectedFiles } from './filterUnexpectedFiles.js';

describe('filterUnexpectedFiles', () => {
  it('excludes files under always-allowed prefixes regardless of allowedPaths', () => {
    const modified = ['.design-everything/execution-state.json', 'progress.json', 'docs/00-vision.md', 'Design/notes.md'];
    expect(filterUnexpectedFiles(modified, [])).toEqual([]);
  });

  it('excludes files matching an allowed glob', () => {
    const modified = ['src/feature/handler.ts'];
    expect(filterUnexpectedFiles(modified, ['src/feature/**'])).toEqual([]);
  });

  it('flags files outside always-allowed prefixes and outside every allowed glob', () => {
    const modified = ['src/feature/handler.ts', 'infra/terraform/main.tf'];
    expect(filterUnexpectedFiles(modified, ['src/feature/**'])).toEqual(['infra/terraform/main.tf']);
  });

  it('normalizes backslash separators before matching', () => {
    const modified = ['src\\feature\\handler.ts'];
    expect(filterUnexpectedFiles(modified, ['src/feature/**'])).toEqual([]);
  });
});
