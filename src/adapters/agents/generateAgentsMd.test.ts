import { expect, test, describe } from 'vitest';
import { generateAgentsMd } from './generateAgentsMd.js';
import { loadScript } from '../../core/loadScript.js';
import { loadGatePolicy } from '../../core/loadGatePolicy.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

describe('generateAgentsMd adapter', () => {
  const scriptPath = join(projectRoot, 'Design/Content/interview-script/script.yaml');
  const policyPath = join(projectRoot, 'Design/Content/interview-script/gate-policy.yaml');

  test('should generate markdown with 5 required sections and soft enforcement statements', () => {
    const script = loadScript(scriptPath);
    const policy = loadGatePolicy(policyPath);

    const markdown = generateAgentsMd({ script, policy });

    // Assert 5 headings are present
    expect(markdown).toContain('## 1. Tại sao repo này dùng chế độ phỏng vấn trước');
    expect(markdown).toContain('## 2. Nguồn sự thật phải đọc');
    expect(markdown).toContain('## 3. Cách hỏi từng bước');
    expect(markdown).toContain('## 4. Gate mềm trước khi code');
    expect(markdown).toContain('## 5. Cách emit docs');

    // Assert soft enforcement disclaimer is present
    expect(markdown).toContain(
      'Trên harness chỉ đọc `AGENTS.md`, gate là chỉ dẫn mạnh chứ không phải chặn cứng bằng cơ chế.'
    );
    expect(markdown).toContain('nhịp một-bước-mỗi-lượt chỉ là chỉ dẫn best-effort');

    // Assert scope-locked gate requirements are correctly listed
    expect(markdown).toContain('Gate `scope-locked`');
    expect(markdown).toContain('`00-vision.md`');
    expect(markdown).toContain('`01-personas.md`');
    expect(markdown).toContain('`02-scope.md`');
  });
});
