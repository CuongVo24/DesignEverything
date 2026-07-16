import { expect, test, describe } from 'vitest';
import { checkDocsConsistency } from './checkDocsConsistency.js';

const doc = (file: string, content: string) => ({ file, content });

describe('checkDocsConsistency', () => {
  test('flags files still using XDG-only paths after a Windows path decision (C4-style revision)', () => {
    const warnings = checkDocsConsistency([
      doc('03-data-model.md', 'Lưu file JSON dưới ~/.config/ của người dùng.'),
      doc(
        '05-architecture.md',
        'Dùng platformdirs: Windows là %APPDATA%\\ytm; sau này lên Linux tự khớp ~/.config.'
      ),
      doc('04-flows.md', 'Gõ lệnh, chọn bài, nghe nhạc.'),
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].id).toBe('path-convention-conflict');
    expect(warnings[0].files).toEqual(['03-data-model.md']);
  });

  test('no warning when all docs consistently use XDG (no Windows decision anywhere)', () => {
    const warnings = checkDocsConsistency([
      doc('03-data-model.md', 'Lưu JSON dưới ~/.config/.'),
      doc('05-architecture.md', 'Config theo chuẩn XDG_CONFIG_HOME, mặc định ~/.config.'),
    ]);
    expect(warnings).toHaveLength(0);
  });

  test('flags npm/node commands in docs of a python project, ignores prose mentions', () => {
    const warnings = checkDocsConsistency(
      [
        doc('README.md', 'Cài đặt dependencies: `npm install`. Chạy: `node bin/index.js`.'),
        doc('05-architecture.md', 'Đóng gói Python lằng nhằng hơn Node/Go nhưng chấp nhận được.'),
      ],
      { language: 'python' }
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0].id).toBe('stack-command-conflict');
    expect(warnings[0].files).toEqual(['README.md']);
  });

  test('flags pip/pytest commands in docs of a typescript project', () => {
    const warnings = checkDocsConsistency(
      [doc('07-distribution.md', 'Cài bằng `pip install -e .` rồi chạy `pytest`.')],
      { language: 'typescript' }
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].id).toBe('stack-command-conflict');
  });

  test('execution plan JSON is not scanned', () => {
    const warnings = checkDocsConsistency([
      doc('.design-everything/execution-plan.json', '"~/.config" %APPDATA%'),
    ]);
    expect(warnings).toHaveLength(0);
  });
});
