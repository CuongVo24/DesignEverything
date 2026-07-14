/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { ExecutionState } from './schemas/index.js';

export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const properties = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return '{' + properties.join(',') + '}';
}

export function calculatePlanDigest(plan: any): string {
  return createHash('sha256').update(stableStringify(plan).trim()).digest('hex');
}

export function calculateDocsDigest(docs: Array<{ file: string; content: string }>): string {
  const filtered = docs.filter((d) => d.file !== '.design-everything/execution-state.json');
  const sorted = [...filtered].sort((a, b) => a.file.localeCompare(b.file));
  const payload = sorted.map((d) => `${d.file}:${d.content.trim()}`).join('\n');
  return createHash('sha256').update(payload).digest('hex');
}

export function calculateValidationResultDigest(result: any): string {
  return createHash('sha256').update(stableStringify(result).trim()).digest('hex');
}

export function loadEmittedDocs(workspaceRoot: string, execPlanPath: string): Array<{ file: string; content: string }> {
  const emittedDocs: Array<{ file: string; content: string }> = [];
  const docsDir = join(workspaceRoot, 'docs');
  if (existsSync(docsDir)) {
    const getFilesRecursive = (dir: string): string[] => {
      let results: string[] = [];
      const list = readdirSync(dir);
      for (const file of list) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFilesRecursive(filePath));
        } else {
          results.push(filePath);
        }
      }
      return results;
    };
    const files = getFilesRecursive(docsDir);
    for (const f of files) {
      const rel = relative(docsDir, f).replace(/\\/g, '/');
      emittedDocs.push({
        file: rel,
        content: readFileSync(f, 'utf8'),
      });
    }
  }
  if (existsSync(execPlanPath)) {
    emittedDocs.push({
      file: '.design-everything/execution-plan.json',
      content: readFileSync(execPlanPath, 'utf8'),
    });
  }
  return emittedDocs;
}

export function assertValidatedSnapshot(input: {
  docs: Array<{ file: string; content: string }>;
  plan: any;
  state: ExecutionState;
}): void {
  const currentPlanDigest = calculatePlanDigest(input.plan);
  const currentDocsDigest = calculateDocsDigest(input.docs);

  if (
    input.state.validated_plan_digest !== currentPlanDigest ||
    input.state.validated_docs_digest !== currentDocsDigest
  ) {
    input.state.phase = 'blocked';
    input.state.block_reason = 'Kế hoạch hoặc tài liệu thiết kế đã bị thay đổi kể từ lần xác thực cuối cùng. Vui lòng chạy lại lệnh "validate" để cập nhật snapshot.';
    input.state.updated_at = new Date().toISOString();
    throw new Error('snapshot-stale: Kế hoạch hoặc tài liệu thiết kế đã thay đổi. Vui lòng chạy lại validate.');
  }
}
