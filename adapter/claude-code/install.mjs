#!/usr/bin/env node
// Installer — cài adapter Claude Code của DesignEverything vào một dự án đích.
//
//   node adapter/claude-code/install.mjs <đường-dẫn-dự-án-đích>
//
// Cài gì vào dự án đích:
//   .claude/settings.json        — wiring 3 hook (SessionStart, UserPromptSubmit, PreToolUse)
//   .claude/skills/design/SKILL.md — skill /design
//   Design/Content/interview-script/{script.yaml,gate-policy.yaml,shapes.yaml}
//   Design/Content/doc-templates/*  — lõi nội dung mà hook/CLI đọc tại workspace
// Engine (dist/ + node_modules) vẫn nằm ở repo này; hooks trỏ đường dẫn tuyệt đối về đây.
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from 'fs';

const ADAPTER_DIR = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = resolve(ADAPTER_DIR, '..', '..');

const target = process.argv[2];
if (!target) {
  console.error('Cách dùng: node adapter/claude-code/install.mjs <đường-dẫn-dự-án-đích>');
  process.exit(1);
}
const targetRoot = resolve(target);
if (resolve(targetRoot) === ENGINE_ROOT) {
  console.error('Không cài vào chính repo DesignEverything — gate sẽ chặn việc phát triển engine. Chọn dự án đích khác.');
  process.exit(1);
}
mkdirSync(targetRoot, { recursive: true });

if (!existsSync(join(ENGINE_ROOT, 'dist/src/core/index.js'))) {
  console.error('Chưa có dist/. Chạy "npm run build" trong repo DesignEverything trước.');
  process.exit(1);
}

// Đường dẫn trong settings.json dùng forward-slash để an toàn shell trên mọi nền tảng.
const hooksDir = join(ENGINE_ROOT, 'adapter/claude-code/hooks').replace(/\\/g, '/');
const hookCmd = (file) => `node "${hooksDir}/${file}"`;

// 1. .claude/settings.json — merge nếu đã tồn tại.
const claudeDir = join(targetRoot, '.claude');
mkdirSync(claudeDir, { recursive: true });
const settingsPath = join(claudeDir, 'settings.json');
let settings = {};
if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    console.error(`settings.json hiện tại không parse được (${e.message}); sửa tay rồi chạy lại.`);
    process.exit(1);
  }
}
settings.hooks = settings.hooks ?? {};
const ensureHook = (event, matcher, command) => {
  const entries = (settings.hooks[event] = settings.hooks[event] ?? []);
  const already = entries.some((en) =>
    (en.hooks ?? []).some((h) => typeof h.command === 'string' && h.command.includes('adapter/claude-code/hooks'))
  );
  if (!already) {
    const entry = { hooks: [{ type: 'command', command }] };
    if (matcher) entry.matcher = matcher;
    entries.push(entry);
  }
};
ensureHook('SessionStart', null, hookCmd('session-start.mjs'));
ensureHook('UserPromptSubmit', null, hookCmd('user-prompt-submit.mjs'));
ensureHook('PreToolUse', 'Write|Edit|MultiEdit|NotebookEdit|Bash', hookCmd('pre-tool-use.mjs'));
writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

// 2. Skill /design and /build
const skillDir = join(claudeDir, 'skills', 'design');
mkdirSync(skillDir, { recursive: true });
const skillTemplate = readFileSync(join(ADAPTER_DIR, 'skill', 'SKILL.md'), 'utf8');
writeFileSync(
  join(skillDir, 'SKILL.md'),
  skillTemplate.replaceAll('__ENGINE_ROOT__', ENGINE_ROOT.replace(/\\/g, '/')),
  'utf8'
);

const buildSkillDir = join(claudeDir, 'skills', 'build');
mkdirSync(buildSkillDir, { recursive: true });
const buildSkillTemplate = readFileSync(join(ADAPTER_DIR, 'skill', 'build', 'SKILL.md'), 'utf8');
writeFileSync(
  join(buildSkillDir, 'SKILL.md'),
  buildSkillTemplate.replaceAll('__ENGINE_ROOT__', ENGINE_ROOT.replace(/\\/g, '/')),
  'utf8'
);

// 3. Lõi nội dung (script + gate policy + shapes + templates)
const copyInto = (srcDir, dstDir, files = null) => {
  mkdirSync(dstDir, { recursive: true });
  const list = files ?? readdirSync(srcDir).filter((f) => !f.startsWith('.'));
  for (const f of list) {
    const src = join(srcDir, f);
    if (!existsSync(src)) {
      console.error(`Thiếu file lõi: ${src}`);
      process.exit(1);
    }
    copyFileSync(src, join(dstDir, f));
  }
};
copyInto(
  join(ENGINE_ROOT, 'Design/Content/interview-script'),
  join(targetRoot, 'Design/Content/interview-script'),
  ['script.yaml', 'gate-policy.yaml', 'shapes.yaml']
);
copyInto(join(ENGINE_ROOT, 'Design/Content/doc-templates'), join(targetRoot, 'Design/Content/doc-templates'));

console.log(`✅ Đã cài DesignEverything (adapter Claude Code) vào: ${targetRoot}

Cài đặt gồm:
  .claude/settings.json                    (3 hooks → engine tại ${ENGINE_ROOT})
  .claude/skills/design/SKILL.md           (skill /design)
  .claude/skills/build/SKILL.md            (skill /build)
  Design/Content/interview-script/         (script.yaml, gate-policy.yaml, shapes.yaml)
  Design/Content/doc-templates/            (templates docs đầu ra)

Cách test:
  1. cd "${targetRoot}"
  2. Mở phiên Claude Code MỚI (hooks chỉ nạp lúc khởi động phiên).
  3. Gõ: /design  → trả lời phỏng vấn từng câu.
  4. Thử bảo Claude viết code ngay → PreToolUse phải chặn với thông báo gate.
  5. Xong phỏng vấn → docs/ được sinh → gate mở.
  6. Gõ: /build   → bắt đầu chu trình thực thi các task và milestone.`);
