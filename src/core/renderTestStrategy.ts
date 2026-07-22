import type { Tier2RenderInput, RenderedArtifact } from './schemas/tier2Render.js';
import { assembleArtifact, findTier1Doc, answerBlock, type BlockSpec } from './tier2RenderHelpers.js';
import { parseFlows } from './parseFlows.js';

const WHY =
  'Tài liệu này xác định phạm vi, các tầng kiểm thử và tích hợp CI/CD, cùng các kịch bản rủi ro ' +
  'cần phủ test trước — để viết test đúng trọng tâm và giữ độ bền vững của dự án.';

/** design/test-strategy.md — DS4 (rủi ro) + 04-flows (e2e) + conventions/test-tiers (nếu có). */
export function renderTestStrategy(input: Tier2RenderInput): RenderedArtifact[] {
  const blocks: BlockSpec[] = [];

  const testTiersDoc = findTier1Doc(input.tier1Docs, 'conventions/test-tiers.md');
  if (testTiersDoc) {
    blocks.push({
      title: '1. Phạm Vi & Các Tầng Kiểm Thử',
      body: 'Theo quy chuẩn tầng test của dự án.',
      anchorId: 'design-test-strategy/scope',
      src: 'src/features/test-strategy/strategy.ts::testScope',
      source: 'doc:docs/conventions/test-tiers.md#test-tiers/tiers',
    });
  } else {
    blocks.push({
      title: '1. Phạm Vi & Các Tầng Kiểm Thử',
      body: '',
      anchorId: 'design-test-strategy/scope',
      src: 'src/features/test-strategy/strategy.ts::testScope',
      source: null,
      unknownBody:
        'Chưa chốt bộ công cụ và tầng kiểm thử — cần hỏi người dùng và ghi vào docs/conventions/test-tiers.md.',
    });
  }

  blocks.push(
    answerBlock(input.answers, 'DS4a', {
      title: '2. Kịch Bản Rủi Ro Cao Nhất',
      anchorId: 'design-test-strategy/priority-cases',
      src: 'src/features/test-strategy/strategy.ts::priorityCases',
      unknownBody: 'Chưa xác định kịch bản lỗi/tính năng ảnh hưởng nghiêm trọng nhất (câu DS4a).',
    })
  );
  blocks.push(
    answerBlock(input.answers, 'DS4b', {
      title: '3. Vùng Code Nhạy Cảm Khi Refactor',
      anchorId: 'design-test-strategy/fragile-areas',
      src: 'src/features/test-strategy/strategy.ts::fragileAreas',
      unknownBody: 'Chưa xác định phần mã lo ngại nhất khi chỉnh sửa/refactor (câu DS4b).',
    })
  );

  const flowDoc = findTier1Doc(input.tier1Docs, '04-flows.md');
  const flows = flowDoc ? parseFlows(flowDoc) : [];
  if (flows.length > 0) {
    blocks.push({
      title: '4. Ca E2E Trọng Tâm',
      body: flows[0].steps.join(' → '),
      anchorId: 'design-test-strategy/e2e',
      src: 'src/features/test-strategy/strategy.ts::e2eScenarios',
      source: 'doc:docs/04-flows.md#04-flows/main-flow-steps',
    });
  }

  return [assembleArtifact('design/test-strategy.md', 'Chiến Lược Kiểm Thử (Test Strategy)', WHY, blocks)];
}
