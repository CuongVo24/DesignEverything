import type { RenderedArtifact } from './schemas/tier2Render.js';

export const UNKNOWN_FLAG = '> ⚠ unknown — cần hỏi người';

/** Một khối nội dung tầng 2: heading + body + anchor + đúng một dòng SourceRef. */
export interface BlockSpec {
  title: string;
  /** Nội dung khi có nguồn. */
  body: string;
  anchorId: string;
  /** Giá trị field `src=` trong anchor. */
  src: string;
  /**
   * Payload SourceRef sau "Nguồn: " (vd 'answers:DS2a@ng-nh-p' hoặc
   * 'doc:docs/02-scope.md#02-scope/must-have'). null → khối fail-closed unknown.
   */
  source: string | null;
  /** Body dùng khi unknown (mô tả cái còn thiếu, KHÔNG bịa nội dung). */
  unknownBody?: string;
}

/** Tìm nội dung một doc tầng 1 theo đuôi tên file (chấp path phân tách \ hoặc /). */
export function findTier1Doc(tier1Docs: Record<string, string>, name: string): string | undefined {
  for (const [path, content] of Object.entries(tier1Docs || {})) {
    if (path.replace(/\\/g, '/').endsWith(name)) return content;
  }
  return undefined;
}

/**
 * Lấy answer theo key instance. Trả về khối có nguồn `answers:<key>` khi có, ngược
 * lại khối unknown (fail-closed). KHÔNG bao giờ bịa body.
 */
export function answerBlock(
  answers: Record<string, string>,
  key: string,
  spec: { title: string; anchorId: string; src: string; unknownBody: string }
): BlockSpec {
  const text = (answers || {})[key];
  const has = typeof text === 'string' && text.trim().length > 0;
  return {
    title: spec.title,
    body: has ? text.trim() : spec.unknownBody,
    anchorId: spec.anchorId,
    src: spec.src,
    source: has ? `answers:${key}` : null,
    unknownBody: spec.unknownBody,
  };
}

/** Ráp một artifact hoàn chỉnh; đếm sources + unknown_blocks. */
export function assembleArtifact(
  path: string,
  title: string,
  why: string,
  blocks: BlockSpec[]
): RenderedArtifact {
  const lines: string[] = [`# ${title}`, '', '## Tại sao cần file này', why, '', '---'];
  const sources: string[] = [];
  let unknown = 0;

  for (const b of blocks) {
    lines.push('', `## ${b.title}`);
    if (b.source === null) {
      lines.push(b.unknownBody ?? b.body);
      lines.push(`<!-- anchor: id=${b.anchorId}  src=${b.src}  rev=  status=planned -->`);
      lines.push(UNKNOWN_FLAG);
      unknown += 1;
    } else {
      lines.push(b.body);
      lines.push(`<!-- anchor: id=${b.anchorId}  src=${b.src}  rev=  status=planned -->`);
      lines.push(`> Nguồn: ${b.source}`);
      sources.push(b.source);
    }
  }

  return { path, content: lines.join('\n') + '\n', sources, unknown_blocks: unknown };
}
