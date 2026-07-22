import type { Tier2RenderInput, RenderedArtifact } from './schemas/tier2Render.js';
import { assembleArtifact, findTier1Doc, answerBlock, type BlockSpec } from './tier2RenderHelpers.js';
import { parseFlows } from './parseFlows.js';
import { extractMustFeatures } from './validatePlan.js';
import { slugify } from './slugify.js';

const WHY =
  'Tài liệu này đặc tả chi tiết một tính năng Must-have: mục tiêu, luồng điển hình, ca biên, ' +
  'trạng thái lỗi và tiêu chí nghiệm thu — căn cứ để hiện thực và viết kiểm thử.';

/** 1 artifact cho TỪNG Must (subject). DS2 lấy theo đúng instance {qid, subject}. */
export function renderFeatureSpec(input: Tier2RenderInput): RenderedArtifact[] {
  // Map slug → tên Must để đặt tiêu đề.
  const nameBySlug = new Map<string, string>();
  for (const name of extractMustFeatures(input.answers)) {
    nameBySlug.set(slugify(name), name);
  }

  const flowDoc = findTier1Doc(input.tier1Docs, '04-flows.md');
  const flows = flowDoc ? parseFlows(flowDoc) : [];
  const mainFlow = flows.length > 0 ? flows[0].steps.join(' → ') : '';

  const artifacts: RenderedArtifact[] = [];
  for (const slug of input.subjects) {
    const name = nameBySlug.get(slug) ?? slug;
    const blocks: BlockSpec[] = [];

    blocks.push({
      title: '1. Mục Tiêu & Mô Tả',
      body: `Tính năng Must-have: ${name}.`,
      anchorId: `design-feature-spec/goal/${slug}`,
      src: `src/features/${slug}/spec.ts::featureGoal`,
      source: 'doc:docs/02-scope.md#02-scope/must-have',
    });

    if (mainFlow) {
      blocks.push({
        title: '2. Luồng Nghiệp Vụ Điển Hình',
        body: mainFlow,
        anchorId: `design-feature-spec/flow/${slug}`,
        src: `src/features/${slug}/flow.ts::typicalFlow`,
        source: 'doc:docs/04-flows.md#04-flows/main-flow-steps',
      });
    }

    blocks.push(
      answerBlock(input.answers, `DS2a@${slug}`, {
        title: '3. Các Ca Biên & Lỗi',
        anchorId: `design-feature-spec/edge-cases/${slug}`,
        src: `src/features/${slug}/edge.ts::edgeCases`,
        unknownBody: `Chưa xác định ca biên/trạng thái lỗi cho "${name}" (câu DS2a).`,
      })
    );
    blocks.push(
      answerBlock(input.answers, `DS2b@${slug}`, {
        title: '4. Ứng Xử Khi Lỗi',
        anchorId: `design-feature-spec/error-handling/${slug}`,
        src: `src/features/${slug}/error.ts::errorHandling`,
        unknownBody: `Chưa xác định cách hệ thống phản hồi khi lỗi cho "${name}" (câu DS2b).`,
      })
    );
    blocks.push(
      answerBlock(input.answers, `DS2c@${slug}`, {
        title: '5. Tiêu Chí Nghiệm Thu',
        anchorId: `design-feature-spec/acceptance/${slug}`,
        src: `src/features/${slug}/acceptance.ts::acceptanceCriteria`,
        unknownBody: `Chưa có tiêu chí nghiệm thu cho "${name}" (câu DS2c).`,
      })
    );

    artifacts.push(assembleArtifact(`design/features/${slug}.md`, `Đặc Tả Tính Năng: ${name}`, WHY, blocks));
  }

  return artifacts;
}
