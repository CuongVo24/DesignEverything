import type { ProjectProfile } from './index.js';

export interface Tier2RenderInput {
  /** Kho answers hiện hành: slot tầng 1 + DS theo key instance `<qid>` hoặc `<qid>@<sid>`. */
  answers: Record<string, string>;
  profile: ProjectProfile | null;
  /** path → nội dung docs/ tầng 1 đã emit. */
  tier1Docs: Record<string, string>;
  /** Từ listDeepenSubjects (B20a) — [] với module per_subject:none. */
  subjects: string[];
}

export interface RenderedArtifact {
  path: string;
  content: string;
  /** Mọi SourceRef xuất hiện (đúng grammar B19a), không tính khối unknown. */
  sources: string[];
  /** Số khối mang cờ unknown. */
  unknown_blocks: number;
}

export interface ConsistencyIssue {
  severity: 'error' | 'warning';
  code: string;
  path: string;
  message: string;
}
