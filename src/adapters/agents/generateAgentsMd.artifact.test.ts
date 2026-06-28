import { expect, test, describe } from 'vitest';
import { generateAgentsMd } from './generateAgentsMd.js';
import { loadScript } from '../../core/loadScript.js';
import { loadGatePolicy } from '../../core/loadGatePolicy.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

describe('generateAgentsMd artifact drift guard', () => {
  const scriptPath = join(projectRoot, 'Design/Content/interview-script/script.yaml');
  const policyPath = join(projectRoot, 'Design/Content/interview-script/gate-policy.yaml');
  const artifactPath = join(projectRoot, 'Design/Adapters/generated/AGENTS.sample.md');

  test('should generate markdown matching the committed AGENTS.sample.md exactly', () => {
    const script = loadScript(scriptPath);
    const policy = loadGatePolicy(policyPath);

    const generated = generateAgentsMd({ script, policy });

    // Optional auto-generate if file doesn't exist or REGENERATE_ARTIFACTS is set
    if (!existsSync(artifactPath) || process.env.REGENERATE_ARTIFACTS) {
      mkdirSync(dirname(artifactPath), { recursive: true });
      const fileHeader = `<!--\n  CẢNH BÁO: ĐÂY LÀ FILE SINH TỰ ĐỘNG, KHÔNG SỬA TAY.\n  Nếu cần cập nhật nội dung file này, vui lòng thay đổi\n  lõi script/policy/generator và chạy lệnh test để cập nhật.\n-->\n`;
      writeFileSync(artifactPath, fileHeader + generated, 'utf8');
    }

    const committed = readFileSync(artifactPath, 'utf8');
    
    // Strip the auto-generated header warning for comparison
    const committedContent = committed.replace(/^<!--[\s\S]*?-->(\r?\n)+/, '');

    const normalizedGenerated = generated.replace(/\r\n/g, '\n').trim();
    const normalizedCommitted = committedContent.replace(/\r\n/g, '\n').trim();

    expect(normalizedGenerated).toBe(normalizedCommitted);
  });
});
