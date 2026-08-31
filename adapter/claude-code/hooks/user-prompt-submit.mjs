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
          // B24d (D59/D60) — commit ngay khi có câu trả lời hợp lệ, không
          // chờ xác nhận trước (chỉ câu có Critic-pass vẫn chặn trước commit
          // — xem [Yêu cầu Phản biện] trong ngữ cảnh ở trên nếu có). Token
          // bao phủ cả batch (`question_ids` liệt kê ở trên), không phải chỉ
          // một câu — commit xong một câu, nếu batch còn câu kế thì gọi lại
          // status --json rồi commit tiếp bằng CÙNG token này.\n` +
          `Commit ngay khi có câu trả lời hợp lệ (không chờ xác nhận trước — trừ câu có Critic-pass):\n` +
          commitLine +
          `Token ở trên bao phủ cả batch \`question_ids\` liệt kê ở trên, không chỉ một câu — dùng lại ` +
          `CÙNG token đó cho từng câu trong batch (gọi \`status --json\` giữa các lần commit để lấy card ` +
          `câu kế tiếp); hết batch mới hết hiệu lực. KHÔNG tự bịa token, KHÔNG commit câu ngoài batch.\n` +
          `Tuỳ chọn: --calibrate deep|fast (chỉ CAL0), --branch <shape> (chỉ S7), ` +
          `--slots-file <file.json> (giá trị slot chi tiết, xem SKILL.md).\n` +
          `Hoàn tác câu vừa commit gần nhất: node "${cliPath}" undo\n` +
          `Xem trạng thái: node "${cliPath}" status`,
      },
    });
  }
  process.exit(0);
} catch (err) {
  console.error(`[DesignEverything UserPromptSubmit] ${err.message}`);
  process.exit(1);
}
