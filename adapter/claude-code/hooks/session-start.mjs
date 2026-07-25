#!/usr/bin/env node
// SessionStart — recover/migrate/health-check canonical interview state (P2.2a) in the target workspace.
import { pathToFileURL } from 'url';
import { readStdinJson, workspaceRootFrom, emitJson, resolveModule } from './_shared.mjs';

const input = await readStdinJson();
const workspaceRoot = workspaceRootFrom(input);

try {
  const { onSessionStart } = await import(
    pathToFileURL(resolveModule('adapters/claude/sessionStart.js')).href
  );
  onSessionStart({ workspaceRoot });

  // Status line for the injected context — reads the canonical interview
  // store only (never progress.json). SessionStart itself never fabricates
  // state, so an uninvolved workspace is reported honestly, not as a fake
  // in-progress interview.
  const { ensureCanonicalStore } = await import(
    pathToFileURL(resolveModule('core/index.js')).href
  );
  const outcome = ensureCanonicalStore(workspaceRoot);

  let statusLine;
  if (outcome.status === 'ready') {
    const progress = outcome.envelope.payload.progress;
    statusLine =
      `Trạng thái: phase=${progress.phase}, branch=${progress.branch ?? 'chưa chọn'}, ` +
      `bước hiện tại=${progress.current_step ?? 'đã xong phỏng vấn'}.`;
  } else if (outcome.status === 'corrupt') {
    statusLine = `Trạng thái phỏng vấn bị lỗi: ${outcome.message}. Chạy lệnh repair để khôi phục.`;
  } else {
    statusLine = 'Dự án chưa được khởi tạo với DesignEverything. Chạy lệnh init để bắt đầu.';
  }

  emitJson({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        `[DesignEverything] Phiên phỏng vấn thiết kế đang hoạt động trong dự án này.\n` +
        `${statusLine}\n` +
        `Người dùng gõ /design-everything để bắt đầu hoặc tiếp tục phỏng vấn. ` +
        `Khi phỏng vấn chưa xong, hook PreToolUse sẽ chặn mọi thao tác sinh code.`,
    },
  });
} catch (err) {
  // Không phá phiên: báo lỗi rõ ràng để người dùng sửa artifact.
  console.error(`[DesignEverything SessionStart] ${err.message}`);
  process.exit(1);
}
