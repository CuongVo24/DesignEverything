#!/usr/bin/env node
// UserPromptSubmit — rate-limit một-bước-mỗi-lượt + inject câu hỏi hiện tại.
// Hook KHÔNG advance state; commit là việc của skill qua cli.mjs (mô hình hai lớp).
import { pathToFileURL } from 'url';
import { join } from 'path';
import { existsSync } from 'fs';
import { readStdinJson, workspaceRootFrom, emitJson, resolveModule, resolveCliLauncherPath } from './_shared.mjs';

const input = await readStdinJson();
const workspaceRoot = workspaceRootFrom(input);

// Nếu dự án chưa được khởi tạo DesignEverything (canonical store chưa tồn
// tại, và không còn legacy progress.json nào) thì đứng ngoài. P2.2a: canonical
// interview-state.json là nguồn thật; progress.json chỉ còn kiểm tra cho
// tương thích ngược với workspace chưa migrate.
if (
  !existsSync(join(workspaceRoot, '.design-everything/interview-state.json')) &&
  !existsSync(join(workspaceRoot, 'progress.json'))
) {
  process.exit(0);
}

try {
  const { onUserPromptSubmit } = await import(
    pathToFileURL(resolveModule('adapters/claude/userPromptSubmit.js')).href
  );
  // No caller-supplied turn identifier: the only thing that authorizes a
  // commit is the capability Core issues below (result.capabilityToken).
  const result = onUserPromptSubmit({ workspaceRoot });

  if (result.decision === 'block') {
    emitJson({ decision: 'block', reason: `[DesignEverything] ${result.message}` });
    process.exit(0);
  }

  if (result.injectedContext) {
    const cliPath = resolveCliLauncherPath().replace(/\\/g, '/');
    const commitLine = result.capabilityToken
      ? `  node "${cliPath}" commit --capability-token ${result.capabilityToken} --answer "<câu trả lời đã chuẩn hoá>"\n`
      : '';
    emitJson({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext:
          result.injectedContext +
          `\n\n[Cách commit bước (bắt buộc dùng CLI, không tự sửa trạng thái)]\n` +
          `Sau khi người dùng xác nhận bản dịch ngược (và critic-pass nếu có), chạy:\n` +
          commitLine +
          `Token ở trên chỉ dùng được một lần cho đúng câu này; KHÔNG tự bịa token hoặc tái dùng token cũ.\n` +
          `Tuỳ chọn: --calibrate deep|fast (chỉ CAL0), --branch <shape> (chỉ S7), ` +
          `--slots-file <file.json> (giá trị slot chi tiết, xem SKILL.md).\n` +
          `Xem trạng thái: node "${cliPath}" status`,
      },
    });
  }
  process.exit(0);
} catch (err) {
  console.error(`[DesignEverything UserPromptSubmit] ${err.message}`);
  process.exit(1);
}
