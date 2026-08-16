import { Progress, Script } from '../../../core/schemas/index.js';
import { resolveQuestionInteraction, deriveAnswerText } from '../../../core/interactionChoices.js';

/**
 * Builds the injected context text from current progress and interview script.
 * Following the 4 Golden Rules of phỏng vấn.
 */
export function renderInject(
  progress: Progress,
  script: Script,
  capabilityToken?: string,
  committedAnswers: Record<string, string> = {},
): string {
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

  const capabilitySection = capabilityToken
    ? `\n[Capability Token — chỉ dùng cho lượt này, không hiển thị lại cho người dùng]
${capabilityToken}
Dùng đúng token này với cờ --capability-token khi gọi lệnh commit cho câu ${question.id}. Token chỉ
dùng được một lần; hết lượt này token cũ không còn hiệu lực và bạn sẽ nhận token mới ở lượt kế tiếp.
`
    : '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const critic = (script as any).critics?.[question.id];
  const criticSection = critic
    ? `\n[Yêu cầu Phản biện (Critic-pass)]
Câu hỏi này yêu cầu chạy qua Critic-pass trước khi commit:
Challenge: ${critic.challenge.trim()}
Ack prompt: ${critic.ack_prompt.trim()}
`
    : '';

  const interaction = resolveQuestionInteraction(question, committedAnswers);
  const interactionSection = interaction.kind === 'static'
    ? `\n[Lựa chọn (options)]\n${interaction.options.map((option) => {
      const recommended = interaction.recommendation.mode === 'fixed' && interaction.recommendation.value === option.value;
      return `- ${option.label}${recommended ? ' (Khuyến nghị)' : ''} [value nội bộ: ${option.value}]: ${option.description}\n  --answer "${deriveAnswerText(option)}"`;
    }).join('\n')}\n${interaction.recommendation.mode === 'contextual' ? 'Khuyến nghị phụ thuộc ngữ cảnh — không preselect lựa chọn nào.\n' : ''}Người dùng có thể dùng Other để tự nhập câu trả lời; không được ép chọn danh sách. Dòng --answer ở trên là văn bản CHÍNH XÁC phải truyền cho commit khi người dùng chọn đúng lựa chọn đó — value nội bộ KHÔNG BAO GIỜ đi vào --answer (chỉ dùng cho --branch/--calibrate ở câu S7/CAL0, xem [Hướng dẫn cho Skill]).\n`
    : interaction.kind === 'hints'
      ? `\n[Gợi ý lựa chọn — tổng hợp từ answers đã commit]\nTạo đúng ${interaction.hintCount} lựa chọn theo: ${interaction.hintStyle}\n${interaction.sources.map((source) => `- ${source.id}: ${source.value ?? '⚠ unknown — cần hỏi người, không tự bịa'}`).join('\n')}\nNếu nguồn thiếu, không tạo lựa chọn giả; dùng Other/free-text.\n`
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
${interactionSection}${criticSection}${capabilitySection}
[4 Quy tắc vàng của phỏng vấn]
1. Hỏi từng câu một: Không hỏi gộp nhiều câu cùng lúc.
2. Luôn có đề xuất mặc định thông minh: Giúp người dùng dễ dàng trả lời nhanh.
3. Dịch ngược ngôn ngữ chuẩn: Tóm tắt lại câu trả lời theo ngôn ngữ hệ thống để người dùng xác nhận.
4. Mỗi câu neo vào đúng 1 ô tài liệu đầu ra: Ghi nhận câu hỏi này phục vụ trực tiếp cho file tài liệu đích nào.

[Hướng dẫn cho Skill]
- Chỉ tiến hành commit bước phỏng vấn hiện tại bằng cách gọi \`commitStep\` SAU KHI người dùng đã xác nhận rõ ràng bản dịch ngược (translate_back) cho câu hỏi hiện tại.
${interaction.kind === 'static' ? `- Với options: gọi AskUserQuestion một câu, header bằng ID, multiSelect=false; mỗi choice label lấy từ block trên. Không tự thêm Other (host đã có sẵn). Khi người dùng chọn, dùng ĐÚNG dòng --answer in kèm lựa chọn đó ở block trên — không bao giờ truyền value nội bộ vào --answer. timeout/dismiss/label lạ không được commit.${question.id === 'S7' ? ' Riêng S7: thêm cờ --branch <value nội bộ> (vd --branch web) CÙNG với --answer, không thay thế nhau.' : ''}${question.id === 'CAL0' ? ' Riêng CAL0: thêm cờ --calibrate <value nội bộ> (vd --calibrate fast) CÙNG với --answer, không thay thế nhau.' : ''}\n` : ''}${interaction.kind === 'hints' ? '- Với option_hints: gọi AskUserQuestion một câu, header bằng ID, multiSelect=false; các choice do bạn tự soạn tại chỗ theo chỉ dẫn ở block trên (không viết cứng). --answer truyền đúng nội dung gợi ý người dùng đã chọn (văn xuôi, không phải nhãn rút gọn). Không tự thêm Other. timeout/dismiss/label lạ không được commit.\n' : ''}${critic ? '- Vì câu hỏi này có Critic-pass, sau khi người dùng đồng ý bản dịch ngược, bạn phải đưa ra [Yêu cầu Phản biện (Critic-pass)] ở trên (gồm Challenge và Ack prompt) và chờ người dùng phản hồi đồng ý hoặc điều chỉnh rồi mới gọi commitStep.\n' : ''}- Mỗi lượt tương tác của người dùng chỉ được phép commit tối đa một bước (không commit gộp nhiều bước).`;
}
