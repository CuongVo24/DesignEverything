import type { Tier2RenderInput, RenderedArtifact } from './schemas/tier2Render.js';
import { assembleArtifact, findTier1Doc, answerBlock, type BlockSpec } from './tier2RenderHelpers.js';
import { parseDataModel } from './parseDataModel.js';

const WHY =
  'Tài liệu này định nghĩa chính xác các thực thể dữ liệu chính và thuật ngữ nghiệp vụ ' +
  'được sử dụng trong dự án, giúp đội ngũ và tác nhân AI giao tiếp nhất quán, tránh đặt tên/hiểu lệch.';

/** design/glossary.md — entity từ 03-data-model + thuật ngữ DS1. per_subject: none. */
export function renderGlossary(input: Tier2RenderInput): RenderedArtifact[] {
  const blocks: BlockSpec[] = [];

  const dataModelDoc = findTier1Doc(input.tier1Docs, '03-data-model.md');
  if (dataModelDoc) {
    const { entities } = parseDataModel(dataModelDoc);
    if (entities.length > 0) {
      blocks.push({
        title: 'Thực Thể Từ Data Model',
        body: entities.join(', '),
        anchorId: 'design-glossary/entities',
        src: 'src/features/glossary/glossary.ts::entities',
        source: 'doc:docs/03-data-model.md#03-data-model/core-entities',
      });
    }
  }

  blocks.push(
    answerBlock(input.answers, 'DS1a', {
      title: 'Thuật Ngữ Nghiệp Vụ Cần Chuẩn Hoá',
      anchorId: 'design-glossary/terms',
      src: 'src/features/glossary/glossary.ts::terms',
      unknownBody: 'Chưa thu thập danh sách thuật ngữ nghiệp vụ đặc thù (câu DS1a).',
    })
  );
  blocks.push(
    answerBlock(input.answers, 'DS1b', {
      title: 'Định Nghĩa Chuẩn',
      anchorId: 'design-glossary/definitions',
      src: 'src/features/glossary/glossary.ts::definitions',
      unknownBody: 'Chưa có định nghĩa chuẩn cho các thuật ngữ đã liệt kê (câu DS1b).',
    })
  );

  return [assembleArtifact('design/glossary.md', 'Thuật Ngữ Thiết Kế (Design Glossary)', WHY, blocks)];
}
