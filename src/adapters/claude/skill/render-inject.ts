import { Progress, Script } from '../../../core/schemas/index.js';

/**
 * Builds the injected context text from current progress and interview script.
 * Following the 4 Golden Rules of phỏng vấn.
 */
export function renderInject(progress: Progress, script: Script): string {
  if (progress.current_step === null) {
    return '';
  }

  const question = script.questions.find((q) => q.id === progress.current_step);
  if (!question) {
    throw new Error(`Question with ID ${progress.current_step} not found in script`);
  }

  const targetDocText = question.target_doc
    ? question.target_doc
    : 'Không có (meta question)';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const critic = (script as any).critics?.[question.id];
  const criticSection = critic
    ? `\n[Yêu cầu Phản biện (Critic-pass)]
Câu hỏi này yêu cầu chạy qua Critic-pass trước khi commit:
Challenge: ${critic.challenge.trim()}
Ack prompt: ${critic.ack_prompt.trim()}
`
    : '';

  return `[Mục tiêu phiên]
Hiện tại bạn đang ở trong phiên phỏng vấn thiết kế dự án DesignEverything.

[Câu hỏi hiện tại]
ID câu hỏi: ${question.id}
Loại câu hỏi (kind): ${question.kind ?? 'anchored'}
Câu hỏi (ask): ${question.ask}
Đề xuất mặc định (default): ${question.default ?? 'Không có'}
File đích (target_doc): ${targetDocText}
Dịch ngược (translate_back): ${question.translate_back}
${criticSection}
[4 Quy tắc vàng của phỏng vấn]
1. Hỏi từng câu một: Không hỏi gộp nhiều câu cùng lúc.
2. Luôn có đề xuất mặc định thông minh: Giúp người dùng dễ dàng trả lời nhanh.
3. Dịch ngược ngôn ngữ chuẩn: Tóm tắt lại câu trả lời theo ngôn ngữ hệ thống để người dùng xác nhận.
4. Mỗi câu neo vào đúng 1 ô tài liệu đầu ra: Ghi nhận câu hỏi này phục vụ trực tiếp cho file tài liệu đích nào.

[Hướng dẫn cho Skill]
- Chỉ tiến hành commit bước phỏng vấn hiện tại bằng cách gọi \`commitStep\` SAU KHI người dùng đã xác nhận rõ ràng bản dịch ngược (translate_back) cho câu hỏi hiện tại.
${critic ? '- Vì câu hỏi này có Critic-pass, sau khi người dùng đồng ý bản dịch ngược, bạn phải đưa ra [Yêu cầu Phản biện (Critic-pass)] ở trên (gồm Challenge và Ack prompt) và chờ người dùng phản hồi đồng ý hoặc điều chỉnh rồi mới gọi commitStep.\n' : ''}- Mỗi lượt tương tác của người dùng chỉ được phép commit tối đa một bước (không commit gộp nhiều bước).`;
}
