#!/usr/bin/env node
// SessionStart — khởi tạo/validate progress.json trong workspace của dự án đích.
import { pathToFileURL } from 'url';
import { join } from 'path';
import { ENGINE_ROOT, readStdinJson, workspaceRootFrom, emitJson } from './_shared.mjs';

const input = await readStdinJson();
const workspaceRoot = workspaceRootFrom(input);

try {
  const { onSessionStart } = await import(
    pathToFileURL(join(ENGINE_ROOT, 'dist/src/adapters/claude/sessionStart.js')).href
  );
  onSessionStart({ workspaceRoot });

  const { loadProgress } = await import(
    pathToFileURL(join(ENGINE_ROOT, 'dist/src/core/index.js')).href
  );
  const progress = loadProgress(join(workspaceRoot, 'progress.json'));

  emitJson({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        `[DesignEverything] Phiên phỏng vấn thiết kế đang hoạt động trong dự án này.\n` +
        `Trạng thái: phase=${progress.phase}, branch=${progress.branch ?? 'chưa chọn'}, ` +
        `bước hiện tại=${progress.current_step ?? 'đã xong phỏng vấn'}.\n` +
        `Người dùng gõ /design-everything để bắt đầu hoặc tiếp tục phỏng vấn. ` +
        `Khi phỏng vấn chưa xong, hook PreToolUse sẽ chặn mọi thao tác sinh code.`,
    },
  });
} catch (err) {
  // Không phá phiên: báo lỗi rõ ràng để người dùng sửa artifact.
  console.error(`[DesignEverything SessionStart] ${err.message}`);
  process.exit(1);
}
