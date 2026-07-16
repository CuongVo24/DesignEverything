import { expect, test, describe } from 'vitest';
import { emitTree } from './emit.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '../../Design/Content/doc-templates');

const baseAnswers: Record<string, string> = {
  S0: 'Công cụ CLI nghe nhạc YouTube trong terminal',
  S1: 'Quảng cáo cắt ngang khi nghe nhạc; trình duyệt ngốn RAM.',
  S2: 'Chủ dự án, quen terminal, nghe nhạc nền khi làm việc.',
  S3: 'Must: Tìm bài, Phát nhạc, Điều khiển phát. Should: Queue.',
  S4: 'Track, Playlist, Queue',
  S5: 'Gõ lệnh -> chọn bài -> nhạc phát ra loa',
  S6: 'Solo, 1.5 tháng, ngân sách 0',
  C2: 'flags/arguments và menu chọn kết quả',
  C3: 'tách config/data/cache theo platformdirs',
  C4: 'Windows cho MVP',
  C5: 'chạy cục bộ từ nguồn',
};

function emitIntoEmptyWorkspace(answers: Record<string, string>) {
  const ws = mkdtempSync(join(tmpdir(), 'de-greenfield-'));
  const docs = emitTree(answers, 'cli', templatesDir, { workspaceDir: ws });
  const plan = JSON.parse(docs.find((d) => d.file === '.design-everything/execution-plan.json')!.content);
  const profile = JSON.parse(readFileSync(join(ws, '.design-everything/project-profile.json'), 'utf8'));
  return { docs, plan, profile };
}

describe('Greenfield stack inference at emit time', () => {
  test('empty workspace + Python CLI interview answers → unblocked python-cli plan, pip build notes, .py anchors', () => {
    const { docs, plan, profile } = emitIntoEmptyWorkspace({
      ...baseAnswers,
      C1: 'Python 3, dùng yt-dlp như thư viện và python-mpv điều khiển mpv',
    });

    expect(profile.target).toBe('python-cli');
    expect(profile.language).toBe('python');
    expect(plan.discovery_status).not.toBe('blocked');

    const readme = docs.find((d) => d.file === 'README.md')!.content;
    expect(readme).toContain('pip install -e .');
    expect(readme).not.toContain('npm install');

    const vision = docs.find((d) => d.file === '00-vision.md')!.content;
    expect(vision).toContain('src=src/features/vision/vision.py::project_vision');
    expect(vision).not.toContain('.ts::');

    const dataModel = docs.find((d) => d.file === '03-data-model.md')!.content;
    expect(dataModel).toContain('src=src/features/data_model/data_model.py::core_entities');

    const plan09 = docs.find((d) => d.file === '09-execution-plan.md')!.content;
    expect(plan09).not.toContain('Workspace target is unsupported');
  });

  test('empty workspace + Node CLI interview answers → unblocked node-cli plan, npm build notes, .ts anchors', () => {
    const { docs, plan, profile } = emitIntoEmptyWorkspace({
      ...baseAnswers,
      C1: 'Node.js (TypeScript) với thư viện commander',
    });

    expect(profile.target).toBe('node-cli');
    expect(plan.discovery_status).not.toBe('blocked');

    const readme = docs.find((d) => d.file === 'README.md')!.content;
    expect(readme).toContain('npm install');

    const vision = docs.find((d) => d.file === '00-vision.md')!.content;
    expect(vision).toContain('src=src/features/vision/vision.ts::projectVision');
  });

  test('empty workspace with no stack signal → still blocked, guidance mentions emit (not doctor)', () => {
    const { docs, plan, profile } = emitIntoEmptyWorkspace({
      ...baseAnswers,
      C1: 'chưa quyết định công nghệ',
    });

    expect(profile.target).toBeNull();
    expect(plan.discovery_status).toBe('blocked');

    const plan09 = docs.find((d) => d.file === '09-execution-plan.md')!.content;
    expect(plan09).not.toContain('doctor');
    expect(plan09).toContain('emit');
  });

  test('stale null-target profile from an earlier emit gets re-inspected with interview inference', () => {
    const ws = mkdtempSync(join(tmpdir(), 'de-greenfield-'));
    // Lần emit 1: không có tín hiệu stack → profile kẹt null-target.
    emitTree({ ...baseAnswers, C1: 'chưa quyết định công nghệ' }, 'cli', templatesDir, { workspaceDir: ws });
    let profile = JSON.parse(readFileSync(join(ws, '.design-everything/project-profile.json'), 'utf8'));
    expect(profile.target).toBeNull();

    // Lần emit 2 (sau khi phỏng vấn chốt Python): profile phải được cập nhật.
    const docs = emitTree(
      { ...baseAnswers, C1: 'Python 3 với yt-dlp và python-mpv' },
      'cli',
      templatesDir,
      { workspaceDir: ws }
    );
    profile = JSON.parse(readFileSync(join(ws, '.design-everything/project-profile.json'), 'utf8'));
    expect(profile.target).toBe('python-cli');

    const plan = JSON.parse(docs.find((d) => d.file === '.design-everything/execution-plan.json')!.content);
    expect(plan.discovery_status).not.toBe('blocked');
  });
});
