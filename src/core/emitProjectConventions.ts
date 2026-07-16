import * as fs from 'fs';
import * as path from 'path';
import { ProjectProfile, ProjectConventions } from './schemas/index.js';

export interface EmitProjectConventionsInput {
  architectureDoc: string;
  constraintsDoc: string;
  profile: ProjectProfile;
  cwd?: string;
  /**
   * Danh sách dependency được phép (khóa cứng). Do skill điền lúc emit (D28
   * pattern — suy từ 05-architecture). Không truyền mà file đã tồn tại thì
   * giữ nguyên danh sách đã curated, không clobber.
   */
  dependencies?: string[];
}

export function emitProjectConventions(input: EmitProjectConventionsInput): string[] {
  const { profile, cwd = process.cwd(), dependencies } = input;
  const conventionsDir = path.join(cwd, 'docs', 'conventions');

  if (!fs.existsSync(conventionsDir)) {
    fs.mkdirSync(conventionsDir, { recursive: true });
  }

  const target = profile.target || 'node-cli';
  const language = profile.language || 'typescript';
  const runtime = profile.runtime || 'node';
  const pm = profile.package_manager || 'npm';

  // 1. tech-stack.md
  const techStackContent = `# Tech Stack Convention
- Target: ${target}
- Language: ${language}
- Runtime: ${runtime}
- Package Manager: ${pm}
- Framework: ${profile.framework || 'none'}
`;

  // 2. allowed-paths.md
  let allowedPaths = ['package.json'];
  if (target === 'node-cli') {
    allowedPaths = ['package.json', 'src/**/*.ts', 'src/**/*.js', 'test/**/*.ts', 'test/**/*.js'];
    if (language === 'typescript') {
      allowedPaths.push('tsconfig.json');
    }
  } else if (target === 'vite-web') {
    allowedPaths = [
      'package.json',
      'src/**/*.ts',
      'src/**/*.tsx',
      'src/**/*.js',
      'src/**/*.jsx',
      'index.html',
      'vite.config.ts',
      'vite.config.js',
      'public/**/*',
    ];
    if (language === 'typescript') {
      allowedPaths.push('tsconfig.json');
    }
  } else if (target === 'python-cli') {
    allowedPaths = ['requirements.txt', 'pyproject.toml', 'src/**/*.py', 'tests/**/*.py'];
  }

  const allowedPathsContent = `# Allowed Paths Convention
- ${allowedPaths.join('\n- ')}
`;

  // 3. coding-standards.md
  const codingStandardsContent = `# Coding Standards
- Follow standard coding guidelines for ${language}.
`;

  // 4. test-tiers.md
  const testTiersContent = `# Test Tiers
- Run tests via: ${pm === 'pip' ? 'pytest' : pm + ' test'}
`;

  // 5. allowed-dependencies.md — khóa dependency: chỉ dùng lib trong danh sách,
  // muốn thêm phải cập nhật file này TRƯỚC (amend conventions), không thêm lib
  // "tiện tay" trong lúc code. Danh sách do skill suy từ 05-architecture.
  const depsPath = path.join(conventionsDir, 'allowed-dependencies.md');
  const depsList = (dependencies ?? []).map((d) => d.trim()).filter(Boolean);
  const shouldWriteDeps = depsList.length > 0 || !fs.existsSync(depsPath);
  const allowedDependenciesContent = `# Allowed Dependencies Convention
Luật: chỉ được thêm dependency có trong danh sách dưới đây. Cần lib mới thì cập nhật file này trước (kèm lý do nối về 05-architecture.md), KHÔNG thêm thẳng vào manifest trong lúc code.
${depsList.length > 0 ? depsList.map((d) => `- ${d}`).join('\n') : '- (chưa khai báo — bổ sung từ mục Thư viện/thành phần chính của 05-architecture.md)'}
`;

  const files = [
    { name: 'tech-stack.md', content: techStackContent },
    { name: 'allowed-paths.md', content: allowedPathsContent },
    { name: 'coding-standards.md', content: codingStandardsContent },
    { name: 'test-tiers.md', content: testTiersContent },
    ...(shouldWriteDeps ? [{ name: 'allowed-dependencies.md', content: allowedDependenciesContent }] : []),
  ];

  const writtenPaths: string[] = [];
  for (const file of files) {
    const filePath = path.join(conventionsDir, file.name);
    fs.writeFileSync(filePath, file.content, 'utf8');
    writtenPaths.push(filePath);
  }

  return writtenPaths;
}

export function loadProjectConventions(conventionsDir: string): ProjectConventions {
  const techStackPath = path.join(conventionsDir, 'tech-stack.md');
  const allowedPathsPath = path.join(conventionsDir, 'allowed-paths.md');

  let target: 'node-cli' | 'vite-web' | 'python-cli' | 'unsupported' = 'node-cli';
  let language: 'typescript' | 'javascript' | 'python' | null = 'typescript';
  let runtime: string | null = 'node';
  const allowedPaths: string[] = [];

  if (fs.existsSync(techStackPath)) {
    const content = fs.readFileSync(techStackPath, 'utf8');
    const targetMatch = content.match(/-\s*Target:\s*(\S+)/i);
    const langMatch = content.match(/-\s*Language:\s*(\S+)/i);
    const runtimeMatch = content.match(/-\s*Runtime:\s*(\S+)/i);

    if (targetMatch) {
      const val = targetMatch[1].trim();
      if (val === 'node-cli' || val === 'vite-web' || val === 'python-cli' || val === 'unsupported') {
        target = val;
      }
    }
    if (langMatch) {
      const val = langMatch[1].trim();
      if (val === 'typescript' || val === 'javascript' || val === 'python') {
        language = val;
      }
    }
    if (runtimeMatch) runtime = runtimeMatch[1].trim();
  }

  if (fs.existsSync(allowedPathsPath)) {
    const content = fs.readFileSync(allowedPathsPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^-\s*(\S+)/);
      if (match && !line.includes('Allowed Paths Convention')) {
        allowedPaths.push(match[1]);
      }
    }
  }

  const allowedDependencies: string[] = [];
  const depsPath = path.join(conventionsDir, 'allowed-dependencies.md');
  if (fs.existsSync(depsPath)) {
    const content = fs.readFileSync(depsPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^-\s*([^\s(]\S*)/);
      if (match) allowedDependencies.push(match[1]);
    }
  }

  return {
    allowed_paths: allowedPaths,
    allowed_dependencies: allowedDependencies,
    tech_stack: {
      target,
      language,
      runtime,
    },
  };
}
export function loadProjectConventionsFromCwd(cwd?: string): ProjectConventions {
  const conventionsDir = path.join(cwd || process.cwd(), 'docs', 'conventions');
  return loadProjectConventions(conventionsDir);
}
