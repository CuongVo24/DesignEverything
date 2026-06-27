import { join } from 'path';
import { existsSync } from 'fs';
import { loadProgress, saveProgress, loadScript, checkRate, stampTurn } from '../../core/index.js';

export function onUserPromptSubmit(ctx: {
  workspaceRoot: string;
  userTurnId: string;
}): { decision: 'allow' | 'block'; injectedContext?: string; message?: string } {
  const progressPath = join(ctx.workspaceRoot, 'progress.json');

  if (!existsSync(progressPath)) {
    return {
      decision: 'block',
      message: 'Failed to load progress state: progress.json does not exist in workspace root',
    };
  }

  // 1. Load state
  let progress;
  try {
    progress = loadProgress(progressPath);
  } catch (error: unknown) {
    return {
      decision: 'block',
      message: `Failed to load progress state: ${(error as Error).message}`,
    };
  }

  // 2. Check rate limit
  const rateCheck = checkRate(progress, progress.answered.length);
  if (!rateCheck.ok) {
    return {
      decision: 'block',
      message: `Rate limit violation: ${rateCheck.reason ?? 'vi phạm một-bước-mỗi-lượt'}`,
    };
  }

  // 3. Stamp turn and save progress
  const stampedProgress = stampTurn(progress, progress.answered.length);
  try {
    saveProgress(progressPath, stampedProgress);
  } catch (error: unknown) {
    return {
      decision: 'block',
      message: `Failed to save progress state: ${(error as Error).message}`,
    };
  }

  // 4. Inject context if current_step != null
  if (stampedProgress.current_step !== null) {
    const scriptPath = join(ctx.workspaceRoot, 'Design/Content/interview-script/script.yaml');
    let script;
    try {
      script = loadScript(scriptPath);
    } catch (error: unknown) {
      return {
        decision: 'block',
        message: `Failed to load interview script: ${(error as Error).message}`,
      };
    }

    const question = script.questions.find((q) => q.id === stampedProgress.current_step);
    if (!question) {
      return {
        decision: 'block',
        message: `Question with ID ${stampedProgress.current_step} not found in script`,
      };
    }

    const injectedContext = `[Mục tiêu phiên]
Hiện tại bạn đang ở trong phiên phỏng vấn thiết kế dự án DesignEverything.

[Câu hỏi hiện tại]
ID câu hỏi: ${question.id}
Câu hỏi (ask): ${question.ask}
Đề xuất mặc định (default): ${question.default ?? 'Không có'}
File đích (target_doc): ${question.target_doc}
Dịch ngược (translate_back): ${question.translate_back}

[4 Quy tắc vàng của phỏng vấn]
1. Hỏi từng câu một: Không hỏi gộp nhiều câu cùng lúc.
2. Luôn có đề xuất mặc định thông minh: Giúp người dùng dễ dàng trả lời nhanh.
3. Dịch ngược ngôn ngữ chuẩn: Tóm tắt lại câu trả lời theo ngôn ngữ hệ thống để người dùng xác nhận.
4. Mỗi câu neo vào đúng 1 ô tài liệu đầu ra: Ghi nhận câu hỏi này phục vụ trực tiếp cho file tài liệu đích nào.

[Hướng dẫn cho Skill]
- Chỉ tiến hành commit bước phỏng vấn hiện tại bằng cách gọi \`commitStep\` SAU KHI người dùng đã xác nhận rõ ràng bản dịch ngược (translate_back) cho câu hỏi hiện tại.
- Mỗi lượt tương tác của người dùng chỉ được phép commit tối đa một bước (không commit gộp nhiều bước).`;

    return {
      decision: 'allow',
      injectedContext,
    };
  }

  // 5. If current_step == null -> do not inject
  return {
    decision: 'allow',
  };
}
