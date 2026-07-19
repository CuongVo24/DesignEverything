import { describe, expect, test } from 'vitest';
import { getRecipe } from './stackRecipes.js';

describe('stack recipes', () => {
  test('vite scaffold includes the confirmed install and a real entry check', () => {
    const recipe = getRecipe('vite-web', 'npm', 'typescript');
    const scaffold = recipe.tasks.T1;
    const entryCheck = recipe.tasks.T2.commands.find((command) => command.id === 'check-entry');

    expect(scaffold.commands).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'init-project', requires_user_confirmation: true }),
      expect.objectContaining({
        id: 'install-vite',
        requires_user_confirmation: true,
        expected: { kind: 'file-exists', value: 'node_modules/vite/package.json' },
      }),
    ]));
    expect(scaffold.evidence_required).toEqual(['init-project', 'install-vite']);
    expect(entryCheck?.argv.join(' ')).toContain('process.exit');
  });

  test('every node expression expected to exit zero explicitly exits', () => {
    for (const target of ['node-cli', 'vite-web', 'python-cli'] as const) {
      const packageManager = target === 'python-cli' ? 'pip' : 'npm';
      const language = target === 'python-cli' ? 'python' : 'typescript';
      const recipe = getRecipe(target, packageManager, language);
      for (const task of Object.values(recipe.tasks)) {
        for (const command of task.commands) {
          if (command.expected.kind === 'exit-code-zero' && command.argv[0] === 'node' && command.argv[1] === '-e') {
            expect(command.argv[2]).toContain('process.exit');
          }
        }
      }
    }
  });
});
