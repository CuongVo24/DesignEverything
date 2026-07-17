#!/usr/bin/env node
/**
 * Sinh lại ảnh chụp docs-generated/ của ba phiên dogfood Month3.
 *
 * Chạy có chủ đích (`npm run dogfood:regen`), không nằm trong `npm test`. Test
 * hồi quy chỉ đọc và so cấu trúc với các thư mục này; chỉ chạy script khi bạn
 * thật sự muốn cập nhật ảnh chụp sau một thay đổi emit có chủ ý.
 *
 * Lưu ý: docs-generated/ là chứng cứ của nghiên cứu dogfood — proj-01 còn có
 * docs-handfixed/ và docs-diff.md phân tích tỷ lệ sinh tự động theo từng file.
 * Sinh lại xong, hãy soát lại docs-diff.md và measurement-report.md xem các con
 * số còn khớp không.
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

import { emitTree } from '../dist/src/core/index.js';
import { dogfoodProjects, TEMPLATES_REL_DIR } from '../dist/test/regression/dogfood-projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const templatesDir = join(projectRoot, TEMPLATES_REL_DIR);

let total = 0;

for (const project of dogfoodProjects) {
  const outputDocsDir = join(projectRoot, project.docsRelDir);
  const docs = emitTree(project.answers, project.branch, templatesDir);
  const docFilesOnly = docs.filter((d) => !d.file.startsWith('.design-everything/'));

  mkdirSync(outputDocsDir, { recursive: true });
  for (const doc of docFilesOnly) {
    const filePath = join(outputDocsDir, doc.file);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, doc.content, 'utf8');
  }

  total += docFilesOnly.length;
  console.log(`${project.id} (${project.title}): ghi ${docFilesOnly.length} tệp -> ${project.docsRelDir}`);
}

console.log(`\nXong. Tổng ${total} tệp.`);
console.log('Nhắc: soát lại docs-diff.md / measurement-report.md nếu nội dung sinh ra đã đổi.');
