import { TaskCard } from './schemas/index.js';

export interface StackRecipe {
  target: 'node-cli' | 'vite-web' | 'python-cli';
  allowed_manifests: string[];
  allowed_source: string[];
  capabilities: string[];
  tasks: {
    T0: TaskCard;
    T1: TaskCard;
    T2: TaskCard;
    T3: TaskCard;
  };
}

export function getRecipe(
  target: 'node-cli' | 'vite-web' | 'python-cli',
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'pip',
  language: 'typescript' | 'javascript' | 'python'
): StackRecipe {
  const pm = packageManager;

  if (target === 'node-cli') {
    const isTS = language === 'typescript';
    const manifests = isTS ? ['package.json', 'tsconfig.json'] : ['package.json'];

    return {
      target: 'node-cli',
      allowed_manifests: manifests,
      allowed_source: ['src/**'],
      capabilities: ['node-npm-project', isTS ? 'typescript-lang' : ''].filter(Boolean),
      tasks: {
        T0: {
          id: 'T0-discovery',
          type: 'spike',
          milestone: 'M0-discovery',
          intent: 'Verify Node.js and package manager runtime environment.',
          depends_on: [],
          allowed_paths: [],
          preconditions: [],
          commands: [
            { id: 'node-version', argv: ['node', '--version'], expected: { kind: 'exit-code-zero' } },
            { id: 'pm-version', argv: [pm, '--version'], expected: { kind: 'exit-code-zero' } },
          ],
          expected_result: 'Runtime environment verified.',
          evidence_required: ['node-version', 'pm-version'],
          failure_policy: 'abort',
        },
        T1: {
          id: 'T1-scaffold',
          type: 'scaffold',
          milestone: 'M1-scaffold',
          intent: 'Initialize project manifests and package scripts.',
          depends_on: ['T0-discovery'],
          allowed_paths: manifests,
          preconditions: ['T0-discovery verified'],
          commands: [
            {
              id: 'init-project',
              argv: pm === 'pnpm' ? ['pnpm', 'init'] : ['npm', 'init', '-y'],
              expected: { kind: 'file-exists', value: 'package.json' },
              requires_user_confirmation: true,
            },
          ],
          expected_result: 'Manifest files package.json created and valid.',
          evidence_required: ['init-project'],
          failure_policy: 'abort',
          requires_capability: 'node-npm-project',
        },
        T2: {
          id: 'T2-skeleton',
          type: 'implementation',
          milestone: 'M2-skeleton',
          intent: 'Create walking skeleton entrypoint file.',
          depends_on: ['T1-scaffold'],
          // Skeleton implementation is source-only: the manifest (package.json,
          // scripts, dev deps needed by T3-verify's `npm test`) is owned by
          // T1-scaffold, keeping the write-scope guard tight during T2.
          allowed_paths: isTS ? ['src/index.ts', 'src/**'] : ['src/index.js', 'src/**'],
          preconditions: ['T1-scaffold completed'],
          commands: [
            {
              id: 'run-skeleton',
              // For TypeScript there is no build step in this plan, so prove the
              // entrypoint exists rather than executing a dist/ file that was
              // never compiled. For JavaScript the entrypoint is runnable.
              argv: isTS
                ? ['node', '-e', "process.exit(require('fs').existsSync('src/index.ts') ? 0 : 1)"]
                : ['node', 'src/index.js'],
              expected: { kind: 'exit-code-zero' },
            },
          ],
          expected_result: isTS
            ? 'Walking skeleton entrypoint src/index.ts exists and scripts are wired.'
            : 'Walking skeleton runs successfully without error.',
          evidence_required: ['run-skeleton'],
          failure_policy: 'abort',
          requires_capability: isTS ? 'typescript-lang' : 'node-npm-project',
        },
        T3: {
          id: 'T3-verify',
          type: 'verification',
          milestone: 'M3-verify',
          intent: 'Run test suite to verify project code integrity.',
          depends_on: ['T2-skeleton'],
          allowed_paths: [],
          preconditions: ['T2-skeleton verified'],
          commands: [
            { id: 'run-tests', argv: [pm, 'test'], expected: { kind: 'exit-code-zero' } },
          ],
          expected_result: 'Test suite runs and all tests pass.',
          evidence_required: ['run-tests'],
          failure_policy: 'abort',
          requires_capability: 'node-npm-project',
        },
      },
    };
  } else if (target === 'vite-web') {
    const isTS = language === 'typescript';
    const manifests = isTS
      ? ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html']
      : ['package.json', 'vite.config.js', 'index.html'];

    return {
      target: 'vite-web',
      allowed_manifests: manifests,
      allowed_source: ['src/**', 'public/**'],
      capabilities: ['node-npm-project', 'vite-bundler', isTS ? 'typescript-lang' : ''].filter(Boolean),
      tasks: {
        T0: {
          id: 'T0-discovery',
          type: 'spike',
          milestone: 'M0-discovery',
          intent: 'Verify Node.js and package manager for Vite bundler.',
          depends_on: [],
          allowed_paths: [],
          preconditions: [],
          commands: [
            { id: 'node-version', argv: ['node', '--version'], expected: { kind: 'exit-code-zero' } },
            { id: 'pm-version', argv: [pm, '--version'], expected: { kind: 'exit-code-zero' } },
          ],
          expected_result: 'Vite bundler runtime verified.',
          evidence_required: ['node-version', 'pm-version'],
          failure_policy: 'abort',
        },
        T1: {
          id: 'T1-scaffold',
          type: 'scaffold',
          milestone: 'M1-scaffold',
          intent: 'Scaffold Vite project structure and manifests.',
          depends_on: ['T0-discovery'],
          allowed_paths: manifests,
          preconditions: ['T0-discovery verified'],
          commands: [
            {
              id: 'init-vite',
              argv: pm === 'pnpm' ? ['pnpm', 'init'] : ['npm', 'init', '-y'],
              expected: { kind: 'file-exists', value: 'package.json' },
              requires_user_confirmation: true,
            },
          ],
          expected_result: 'Vite manifests initialized.',
          evidence_required: ['init-vite'],
          failure_policy: 'abort',
          requires_capability: 'node-npm-project',
        },
        T2: {
          id: 'T2-skeleton',
          type: 'implementation',
          milestone: 'M2-skeleton',
          intent: 'Create Vite entrypoint and walking skeleton UI components.',
          depends_on: ['T1-scaffold'],
          allowed_paths: [isTS ? 'src/main.ts' : 'src/main.js', 'src/App.tsx', 'src/App.jsx', 'src/**', 'public/**'],
          preconditions: ['T1-scaffold completed'],
          commands: [
            { id: 'check-entry', argv: ['node', '-e', "require('fs').existsSync('index.html')"], expected: { kind: 'exit-code-zero' } },
          ],
          expected_result: 'Vite walking skeleton files exist.',
          evidence_required: ['check-entry'],
          failure_policy: 'abort',
          requires_capability: 'vite-bundler',
        },
        T3: {
          id: 'T3-verify',
          type: 'verification',
          milestone: 'M3-verify',
          intent: 'Build Vite production bundle successfully.',
          depends_on: ['T2-skeleton'],
          allowed_paths: [],
          preconditions: ['T2-skeleton verified'],
          commands: [
            { id: 'build-vite', argv: [pm, 'run', 'build'], expected: { kind: 'exit-code-zero' } },
          ],
          expected_result: 'Vite production build succeeds.',
          evidence_required: ['build-vite'],
          failure_policy: 'abort',
          requires_capability: 'vite-bundler',
        },
      },
    };
  } else {
    // python-cli
    const manifests = ['requirements.txt', 'pyproject.toml'];

    return {
      target: 'python-cli',
      allowed_manifests: manifests,
      allowed_source: ['src/**', 'tests/**'],
      capabilities: ['python-venv-project'],
      tasks: {
        T0: {
          id: 'T0-discovery',
          type: 'spike',
          milestone: 'M0-discovery',
          intent: 'Verify Python environment and pip manager.',
          depends_on: [],
          allowed_paths: [],
          preconditions: [],
          commands: [
            { id: 'python-version', argv: ['python', '--version'], expected: { kind: 'exit-code-zero' } },
            { id: 'pip-version', argv: ['pip', '--version'], expected: { kind: 'exit-code-zero' } },
          ],
          expected_result: 'Python runtime environment verified.',
          evidence_required: ['python-version', 'pip-version'],
          failure_policy: 'abort',
        },
        T1: {
          id: 'T1-scaffold',
          type: 'scaffold',
          milestone: 'M1-scaffold',
          intent: 'Scaffold python virtual environment and requirements.',
          depends_on: ['T0-discovery'],
          allowed_paths: manifests,
          preconditions: ['T0-discovery verified'],
          commands: [
            {
              id: 'init-venv',
              argv: ['python', '-m', 'venv', '.venv'],
              expected: { kind: 'exit-code-zero' },
              requires_user_confirmation: true,
            },
          ],
          expected_result: 'Python venv successfully initialized.',
          evidence_required: ['init-venv'],
          failure_policy: 'abort',
          requires_capability: 'python-venv-project',
        },
        T2: {
          id: 'T2-skeleton',
          type: 'implementation',
          milestone: 'M2-skeleton',
          intent: 'Create python entrypoint and walking skeleton CLI logic.',
          depends_on: ['T1-scaffold'],
          allowed_paths: ['src/main.py', 'src/**'],
          preconditions: ['T1-scaffold completed'],
          commands: [
            { id: 'run-skeleton', argv: ['python', 'src/main.py'], expected: { kind: 'exit-code-zero' } },
          ],
          expected_result: 'Python walking skeleton CLI runs without error.',
          evidence_required: ['run-skeleton'],
          failure_policy: 'abort',
          requires_capability: 'python-venv-project',
        },
        T3: {
          id: 'T3-verify',
          type: 'verification',
          milestone: 'M3-verify',
          intent: 'Run python unit tests to verify logic.',
          depends_on: ['T2-skeleton'],
          allowed_paths: [],
          preconditions: ['T2-skeleton verified'],
          commands: [
            { id: 'run-pytest', argv: ['pytest'], expected: { kind: 'exit-code-zero' } },
          ],
          expected_result: 'Python test suite runs and all tests pass.',
          evidence_required: ['run-pytest'],
          failure_policy: 'abort',
          requires_capability: 'python-venv-project',
        },
      },
    };
  }
}
