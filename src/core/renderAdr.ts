import type { Tier2RenderInput, RenderedArtifact } from './schemas/tier2Render.js';
import { assembleArtifact, answerBlock, type BlockSpec } from './tier2RenderHelpers.js';
import { collectDecisions } from './renderDecisionLog.js';
import { deriveBranch } from './deepenState.js';
import { slugify } from './slugify.js';

const WHY =
  'Tài liệu ghi nhận quyết định kiến trúc (ADR): bối cảnh, quyết định cụ thể, lý do và hệ quả, ' +
  'cùng các phương án đã cân nhắc và loại — để hiểu lý do kỹ thuật và tránh đổi công nghệ không cơ sở.';

/** 1 artifact cho TỪNG quyết định trong 05-architecture. NNN theo thứ tự xuất hiện. */
export function renderAdr(input: Tier2RenderInput): RenderedArtifact[] {
  const branch = deriveBranch(input.tier1Docs);
  const decisions = collectDecisions({ branch, slots: input.answers }).filter(
    (d) => d.detail_doc === '05-architecture.md' && d.value.trim().length > 0
  );

  const artifacts: RenderedArtifact[] = [];
  decisions.forEach((decision, i) => {
    const nnn = String(i + 1).padStart(3, '0');
    const subject = `adr-${nnn}`;
    const slug = slugify(decision.value).split('-').slice(0, 4).join('-') || slugify(decision.title) || subject;
    const blocks: BlockSpec[] = [];

    blocks.push({
      title: '1. Trạng Thái',
      body: 'Đã chấp nhận (Accepted)',
      anchorId: `design-adr/status/ADR-${nnn}`,
      src: `src/features/adr/ADR-${nnn}.ts::status`,
      source: 'doc:docs/05-architecture.md#05-architecture/decision-rationale',
    });
    blocks.push({
      title: '2. Bối Cảnh & Vấn Đề',
      body: `Quyết định "${decision.title}" cần được chốt cho dự án (nối từ câu ${decision.source_question}).`,
      anchorId: `design-adr/context/ADR-${nnn}`,
      src: `src/features/adr/ADR-${nnn}.ts::context`,
      source: 'doc:docs/05-architecture.md#05-architecture/decision-rationale',
    });
    blocks.push({
      title: '3. Quyết Định & Giải Pháp',
      body: decision.value,
      anchorId: `design-adr/decision/ADR-${nnn}`,
      src: `src/features/adr/ADR-${nnn}.ts::decision`,
      source: 'doc:docs/05-architecture.md#05-architecture/decision-rationale',
    });
    blocks.push(
      answerBlock(input.answers, `DS3b@${subject}`, {
        title: '4. Lý Do Lựa Chọn & Hệ Quả',
        anchorId: `design-adr/rationale/ADR-${nnn}`,
        src: `src/features/adr/ADR-${nnn}.ts::rationale`,
        unknownBody: `Chưa ghi điều kiện xét lại/hệ quả cho quyết định "${decision.title}" (câu DS3b).`,
      })
    );
    blocks.push(
      answerBlock(input.answers, `DS3a@${subject}`, {
        title: '5. Các Phương Án Đã Cân Nhắc & Loại',
        anchorId: `design-adr/alternatives/ADR-${nnn}`,
        src: `src/features/adr/ADR-${nnn}.ts::alternatives`,
        unknownBody: `Chưa ghi phương án thay thế đã loại cho quyết định "${decision.title}" (câu DS3a).`,
      })
    );

    artifacts.push(
      assembleArtifact(`design/adr/ADR-${nnn}-${slug}.md`, `ADR-${nnn}: ${decision.title}`, WHY, blocks)
    );
  });

  return artifacts;
}
