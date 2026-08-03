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
  // R03 — recover_error/migrate_error/health are real results now, not
  // discarded; a broken health status is surfaced to the user instead of
  // silently vanishing into an empty catch inside onSessionStart.
  const sessionResult = onSessionStart({ workspaceRoot });

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

  const extraLines = [];
  if (sessionResult.health.status === 'broken') {
    const firstIssue = sessionResult.health.issues.find((i) => i.severity === 'error');
    extraLines.push(
      `[Cảnh báo runtime] Trạng thái runtime bị hỏng (${firstIssue?.reason_code ?? 'UNKNOWN'}): ` +
        `${firstIssue?.detail ?? 'xem chi tiết bằng lệnh status.'} Lệnh khắc phục: ${firstIssue?.safe_next_command ?? 'status'}.`
    );
  }
  if (sessionResult.recover_error) {
    extraLines.push(`[Cảnh báo] Khôi phục emit dở dang thất bại: ${sessionResult.recover_error}`);
  }
  if (sessionResult.migrate_error) {
    extraLines.push(`[Cảnh báo] Di chuyển state cũ thất bại: ${sessionResult.migrate_error}`);
  }

  emitJson({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        `[DesignEverything] Phiên phỏng vấn thiết kế đang hoạt động trong dự án này.\n` +
        `${statusLine}\n` +
        (extraLines.length > 0 ? `${extraLines.join('\n')}\n` : '') +
        `Người dùng gõ /design-everything để bắt đầu hoặc tiếp tục phỏng vấn. ` +
        `Khi phỏng vấn chưa xong, hook PreToolUse sẽ chặn mọi thao tác sinh code.`,
    },
  });
} catch (err) {
  // Không phá phiên: báo lỗi rõ ràng để người dùng sửa artifact.
  console.error(`[DesignEverything SessionStart] ${err.message}`);
  process.exit(1);
}
