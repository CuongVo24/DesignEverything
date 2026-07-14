import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ProjectProfile, ProfileQuestion } from './schemas/index.js';

export function inspectProjectProfile(
  workspace: string,
  userAnswers?: Record<string, string>
): { profile: ProjectProfile; questions: ProfileQuestion[] } {
  const observedAt = new Date().toISOString();
  const evidence: Array<{ name: string; path?: string; observed_at: string; confidence: number }> = [];
  const manifestPaths: string[] = [];
  const capabilities: string[] = [];
  const questions: ProfileQuestion[] = [];

  // 1. Detect if workspace is empty
  let files: string[] = [];
  if (existsSync(workspace)) {
    try {
      files = readdirSync(workspace);
    } catch {
      // ignore
    }
  }

  // Ignore VCS/tooling scaffolding AND DesignEverything design artifacts. A
  // workspace that only contains design docs (interview output) has not been
  // scaffolded yet — it must be treated like an empty workspace that needs a
  // target chosen, NOT misclassified as an unsupported existing stack.
  const ignoreList = [
    '.git', '.design-everything', '.gemini', '.agents', 'node_modules', '.venv', 'venv',
    'Design', 'docs', 'progress.json', 'README.md', 'LICENSE', 'LICENSE.md',
    '.gitignore', '.gitattributes', '.claude', '.codex', '.vscode',
  ];
  const activeFiles = files.filter((f) => !ignoreList.includes(f));

  let workspaceKind: 'empty' | 'existing-supported' | 'existing-unsupported' = 'existing-supported';

  if (activeFiles.length === 0) {
    workspaceKind = 'empty';
    evidence.push({
      name: 'Thư mục trống (hoặc chỉ chứa tệp cấu hình ẩn)',
      observed_at: observedAt,
      confidence: 1.0,
    });
  }

  // 2. Scan markers
  const packageJsonPath = join(workspace, 'package.json');
  const packageLockPath = join(workspace, 'package-lock.json');
  const pnpmLockPath = join(workspace, 'pnpm-lock.yaml');
  const yarnLockPath = join(workspace, 'yarn.lock');
  const reqsTxtPath = join(workspace, 'requirements.txt');
  const pyprojTomlPath = join(workspace, 'pyproject.toml');
  const goModPath = join(workspace, 'go.mod');
  const cargoTomlPath = join(workspace, 'Cargo.toml');
  const viteConfigJsPath = join(workspace, 'vite.config.js');
  const viteConfigTsPath = join(workspace, 'vite.config.ts');

  let hasPackageJson = false;
  let hasPackageLock = false;
  let hasPnpmLock = false;
  let hasYarnLock = false;
  let hasReqsTxt = false;
  let hasPyprojToml = false;
  let hasGoMod = false;
  let hasCargoToml = false;
  let hasViteConfig = false;

  if (workspaceKind !== 'empty') {
    if (existsSync(packageJsonPath)) {
      hasPackageJson = true;
      manifestPaths.push('package.json');
      evidence.push({ name: 'package.json', path: 'package.json', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(packageLockPath)) {
      hasPackageLock = true;
      evidence.push({ name: 'package-lock.json', path: 'package-lock.json', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(pnpmLockPath)) {
      hasPnpmLock = true;
      evidence.push({ name: 'pnpm-lock.yaml', path: 'pnpm-lock.yaml', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(yarnLockPath)) {
      hasYarnLock = true;
      evidence.push({ name: 'yarn.lock', path: 'yarn.lock', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(reqsTxtPath)) {
      hasReqsTxt = true;
      manifestPaths.push('requirements.txt');
      evidence.push({ name: 'requirements.txt', path: 'requirements.txt', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(pyprojTomlPath)) {
      hasPyprojToml = true;
      manifestPaths.push('pyproject.toml');
      evidence.push({ name: 'pyproject.toml', path: 'pyproject.toml', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(goModPath)) {
      hasGoMod = true;
      manifestPaths.push('go.mod');
      evidence.push({ name: 'go.mod', path: 'go.mod', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(cargoTomlPath)) {
      hasCargoToml = true;
      manifestPaths.push('Cargo.toml');
      evidence.push({ name: 'Cargo.toml', path: 'Cargo.toml', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(viteConfigJsPath)) {
      hasViteConfig = true;
      evidence.push({ name: 'vite.config.js', path: 'vite.config.js', observed_at: observedAt, confidence: 1.0 });
    }
    if (existsSync(viteConfigTsPath)) {
      hasViteConfig = true;
      evidence.push({ name: 'vite.config.ts', path: 'vite.config.ts', observed_at: observedAt, confidence: 1.0 });
    }
  }

  // 3. Resolve profile fields
  let target: 'node-cli' | 'vite-web' | 'python-cli' | 'unsupported' | null = null;
  let runtime: string | null = null;
  let packageManager: 'npm' | 'pnpm' | 'yarn' | 'pip' | null = null;
  let framework: 'vite' | 'none' | null = null;
  let language: 'typescript' | 'javascript' | 'python' | null = null;
  let sourceRoot: string | null = null;
  let confirmed = false;

  if (workspaceKind === 'empty') {
    // Check userAnswers
    const targetAns = userAnswers?.target;
    const pmAns = userAnswers?.packageManager;

    if (targetAns === 'node-cli' || targetAns === 'vite-web' || targetAns === 'python-cli') {
      target = targetAns;
    } else {
      questions.push({
        id: 'target',
        question: 'Chọn loại dự án bạn muốn khởi tạo?',
        options: ['node-cli', 'vite-web', 'python-cli'],
        default: 'node-cli',
        target_field: 'target',
      });
    }

    if (target) {
      if (target === 'python-cli') {
        packageManager = 'pip';
        runtime = 'python';
        language = 'python';
        framework = 'none';
        sourceRoot = 'src';
      } else {
        runtime = 'node';
        framework = target === 'vite-web' ? 'vite' : 'none';
        language = 'typescript'; // default to ts for empty project
        sourceRoot = target === 'vite-web' ? 'src' : 'src';

        if (pmAns === 'npm' || pmAns === 'pnpm') {
          packageManager = pmAns;
        } else {
          questions.push({
            id: 'packageManager',
            question: 'Chọn package manager bạn muốn sử dụng?',
            options: ['npm', 'pnpm'],
            default: 'npm',
            target_field: 'package_manager',
          });
        }
      }
    }

    if (target && packageManager) {
      confirmed = true;
    }
  } else if (hasGoMod || hasCargoToml) {
    workspaceKind = 'existing-unsupported';
    target = 'unsupported';
    confirmed = false;
  } else {
    // Existing files detected
    if (hasPackageJson) {
      runtime = 'node';
      // Detect target
      let isVite = hasViteConfig;
      if (!isVite) {
        try {
          const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          if (pkg.dependencies?.vite || pkg.devDependencies?.vite) {
            isVite = true;
          }
        } catch {
          // ignore
        }
      }

      if (isVite) {
        target = 'vite-web';
        framework = 'vite';
        sourceRoot = 'src';
      } else {
        target = 'node-cli';
        framework = 'none';
        sourceRoot = existsSync(join(workspace, 'src')) ? 'src' : '';
      }

      // Language check
      language = 'javascript';
      if (existsSync(join(workspace, 'tsconfig.json')) || hasViteConfig) {
        language = 'typescript';
      }

      // PackageManager check
      const lockfilesCount = (hasPackageLock ? 1 : 0) + (hasPnpmLock ? 1 : 0) + (hasYarnLock ? 1 : 0);
      if (lockfilesCount > 1) {
        const pmAns = userAnswers?.packageManager;
        if (pmAns === 'npm' || pmAns === 'pnpm' || pmAns === 'yarn') {
          packageManager = pmAns;
          confirmed = true;
        } else {
          questions.push({
            id: 'packageManager',
            question: 'Phát hiện nhiều lockfiles xung đột. Chọn package manager bạn đang sử dụng chính?',
            options: [
              ...(hasPackageLock ? ['npm'] : []),
              ...(hasPnpmLock ? ['pnpm'] : []),
              ...(hasYarnLock ? ['yarn'] : []),
            ],
            default: hasPnpmLock ? 'pnpm' : 'npm',
            target_field: 'package_manager',
          });
          confirmed = false;
        }
      } else if (hasPnpmLock) {
        packageManager = 'pnpm';
        confirmed = true;
      } else if (hasYarnLock) {
        packageManager = 'yarn';
        confirmed = true;
      } else {
        packageManager = 'npm';
        confirmed = true;
      }
    } else if (hasReqsTxt || hasPyprojToml) {
      target = 'python-cli';
      runtime = 'python';
      packageManager = 'pip';
      framework = 'none';
      language = 'python';
      sourceRoot = existsSync(join(workspace, 'src')) ? 'src' : '';
      confirmed = true;
    } else {
      workspaceKind = 'existing-unsupported';
      target = 'unsupported';
      confirmed = false;
    }
  }

  // 4. Set Capabilities
  if (target === 'node-cli') {
    capabilities.push('node-npm-project', 'typescript-lang');
  } else if (target === 'vite-web') {
    capabilities.push('node-npm-project', 'vite-bundler', 'typescript-lang');
  } else if (target === 'python-cli') {
    capabilities.push('python-venv-project');
  }

  const profile: ProjectProfile = {
    workspace_kind: workspaceKind,
    target,
    runtime,
    package_manager: packageManager,
    framework,
    language,
    source_root: sourceRoot,
    manifest_paths: manifestPaths,
    capabilities,
    confirmation: {
      confirmed,
      confirmed_by: confirmed ? 'doctor-heuristic' : undefined,
      confirmed_at: confirmed ? observedAt : undefined,
    },
    evidence,
  };

  return { profile, questions };
}
