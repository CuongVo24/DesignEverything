#!/usr/bin/env node
// UserPromptSubmit — rate-limit một-bước-mỗi-lượt + inject câu hỏi hiện tại.
// Hook KHÔNG advance state; commit là việc của skill qua cli.mjs (mô hình hai lớp).
import { pathToFileURL } from 'url';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { ENGINE_ROOT, readStdinJson, workspaceRootFrom, emitJson } from './_shared.mjs';

const input = await readStdinJson();
const workspaceRoot = workspaceRootFrom(input);

// Nếu dự án chưa được SessionStart khởi tạo (vd hook mới cài giữa phiên) thì đứng ngoài.
if (!existsSync(join(workspaceRoot, 'progress.json'))) {
  process.exit(0);
}

const userTurnId = `turn-${Date.now()}-${randomBytes(3).toString('hex')}`;

try {
  const { onUserPromptSubmit } = await import(
    pathToFileURL(join(ENGINE_ROOT, 'dist/src/adapters/claude/userPromptSubmit.js')).href
  );
  const result = onUserPromptSubmit({ workspaceRoot, userTurnId });

  if (result.decision === 'block') {
    emitJson({ decision: 'block', reason: `[DesignEverything] ${result.message}` });
    process.exit(0);
  }

  if (result.injectedContext) {
    const cliPath = join(ENGINE_ROOT, 'adapter/claude-code/cli.mjs').replace(/\\/g, '/');
    emitJson({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext:
          result.injectedContext +
          `\n\n[Cách commit bước (bắt buộc dùng CLI, không tự sửa progress.json)]\n` +
          `TURN_ID của lượt này: ${userTurnId}\n` +
          `Sau khi người dùng xác nhận bản dịch ngược (và critic-pass nếu có), chạy:\n` +
          `  node "${cliPath}" commit --turn ${userTurnId} --answer "<câu trả lời đã chuẩn hoá>"\n` +
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
