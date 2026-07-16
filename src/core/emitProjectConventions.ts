import * as fs from 'fs';
import * as path from 'path';
import { ProjectProfile, ProjectConventions } from './schemas/index.js';

export interface EmitProjectConventionsInput {
  architectureDoc: string;
  constraintsDoc: string;
  profile: ProjectProfile;
  cwd?: string;
}

export function emitProjectConventions(input: EmitProjectConventionsInput): string[] {
  const { profile, cwd = process.cwd() } = input;
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

  const files = [
    { name: 'tech-stack.md', content: techStackContent },
    { name: 'allowed-paths.md', content: allowedPathsContent },
    { name: 'coding-standards.md', content: codingStandardsContent },
    { name: 'test-tiers.md', content: testTiersContent },
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

  return {
    allowed_paths: allowedPaths,
    allowed_dependencies: [],
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
