import { Progress, Script } from '../../../core/schemas/index.js';
import { deriveAnswerText } from '../../../core/interactionChoices.js';
import { buildQuestionCard } from '../../../core/buildQuestionCard.js';

/**
 * Builds the injected context text from current progress and interview script.
 * Following the 4 Golden Rules of phỏng vấn.
 *
 * H4 — renders from buildQuestionCard's Core-owned card instead of re-reading
 * `question`/`critics` directly: `status --json` (cliOps/status.ts) builds
 * the identical card from the same function, so the two surfaces (inject
 * context vs. status output) can no longer independently drift on
 * ask/options/recommendation/translate_back.
 *
 * B24d (D59/D60/D61) — this only ever renders the HEAD question of the
 * current batch (whatever `progress.current_step` is at the moment it's
 * called). It does not walk the rest of `pending_turn_capability.question_ids`
 * itself — the capability section below tells the model to call
 * `status --json` between commits inside the same batch instead, which reads
 * the identical card off the (now-advanced) `current_step` via H4's
 * `buildQuestionCard` — one card-building path, never two.
 */
export function renderInject(
  progress: Progress,
  script: Script,
  capabilityToken?: string,
  committedAnswers: Record<string, string> = {},
): string {
  const card = buildQuestionCard(progress.current_step, script, committedAnswers);
  if (!card) {
    return '';
  }

  const targetDocText = card.target_doc
    ? card.target_doc
    : 'Không có (meta question)';

  // B24b (D60) — the token's batch may cover more than just this head
  // question. `question_ids` is only absent for a pre-B24b token shape;
  // a freshly issued one always has it, with `card.id` as the first entry.
  const batchIds = progress.pending_turn_capability?.question_ids ?? [card.id];
  const restOfBatch = batchIds.filter((id) => id !== card.id);

  const capabilitySection = capabilityToken
    ? `\n[Capability Token — chỉ dùng cho lượt này, không hiển thị lại cho người dùng]
${capabilityToken}
Token này bao phủ đúng batch: ${batchIds.join(', ')}. Dùng cờ --capability-token khi commit CHÍNH
XÁC những câu trong danh sách đó, không hơn — commit một câu ngoài danh sách này bị deny.${restOfBatch.length > 0 ? ` Sau khi
commit xong câu ${card.id}, gọi lại \`status --json\` (KHÔNG cần chờ người dùng gõ thêm — đây vẫn
là cùng một lượt) để lấy đúng \`data.questionCard\` của câu kế tiếp trong batch (${restOfBatch.join(', ')}),
rồi commit tiếp bằng CÙNG token này.` : ''} Khi đã commit hết batch, token hết hiệu lực; chờ token
mới ở lượt kế tiếp — KHÔNG tự bịa token, KHÔNG commit câu ngoài batch đang cầm.
`
    : '';

  const critic = card.critic;
  const criticSection = critic
    ? `\n[Yêu cầu Phản biện (Critic-pass)]
Câu hỏi này yêu cầu chạy qua Critic-pass trước khi commit:
Challenge: ${critic.challenge}
Ack prompt: ${critic.ack_prompt}
`
    : '';

  const interaction = card.interaction;
  const multiSelectNote = (interaction.kind === 'static' || interaction.kind === 'hints') && interaction.multiSelect
    ? ' Câu này cho phép chọn NHIỀU lựa chọn (multi_select) — nếu người dùng chọn hơn một, nối các dòng --answer đã chọn lại bằng "; " theo đúng thứ tự đã hiển thị, thành MỘT --answer duy nhất (đây chính là deriveMultiAnswerText ở Core, không tự nối kiểu khác).'
    : '';
  const interactionSection = interaction.kind === 'static'
    ? `\n[Lựa chọn (options)]${multiSelectNote}\n${interaction.options.map((option) => {
      const recommended = interaction.recommendation.mode === 'fixed' && interaction.recommendation.value === option.value;
      return `- ${option.label}${recommended ? ' (Khuyến nghị)' : ''} [value nội bộ: ${option.value}]: ${option.description}\n  --answer "${deriveAnswerText(option)}"`;
    }).join('\n')}\n${interaction.recommendation.mode === 'contextual' ? 'Khuyến nghị phụ thuộc ngữ cảnh — không preselect lựa chọn nào.\n' : ''}Người dùng có thể dùng Other để tự nhập câu trả lời; không được ép chọn danh sách. Dòng --answer ở trên là văn bản CHÍNH XÁC phải truyền cho commit khi người dùng chọn đúng lựa chọn đó — value nội bộ KHÔNG BAO GIỜ đi vào --answer (chỉ dùng cho --branch/--calibrate ở câu S7/CAL0, xem [Hướng dẫn cho Skill]).\n`
    : interaction.kind === 'hints'
      ? `\n[Gợi ý lựa chọn — tổng hợp từ answers đã commit]${multiSelectNote}\nTạo đúng ${interaction.hintCount} lựa chọn theo: ${interaction.hintStyle}\n${interaction.sources.map((source) => `- ${source.id}: ${source.value ?? '⚠ unknown — cần hỏi người, không tự bịa'}`).join('\n')}\nNếu nguồn thiếu, không tạo lựa chọn giả; dùng Other/free-text.\n`
      : '';
  return `[Mục tiêu phiên]
Hiện tại bạn đang ở trong phiên phỏng vấn thiết kế dự án DesignEverything.

[Câu hỏi hiện tại]
ID câu hỏi: ${card.id}
Loại câu hỏi (kind): ${card.kind}
Câu hỏi (ask): ${card.ask}
Đề xuất mặc định (default): ${card.default ?? 'Không có'}
File đích (target_doc): ${targetDocText}
Dịch ngược (translate_back): ${card.translate_back}
${interactionSection}${criticSection}${capabilitySection}
[4 Quy tắc vàng của phỏng vấn]
1. Một lượt = một batch: hỏi và commit đúng những câu token đang cầm liệt kê ở trên, không hơn — không tự gộp thêm câu ngoài batch.
2. Luôn có đề xuất mặc định thông minh: Giúp người dùng dễ dàng trả lời nhanh.
3. Commit ngay, in dịch ngược cùng lúc: Không chặn commit chờ xác nhận trước — tóm câu trả lời theo translate_back và in kèm ngay kết quả commit, kèm một dòng nhắc lệnh \`undo\` nếu người dùng muốn sửa lại.
4. Mỗi câu neo vào đúng 1 ô tài liệu đầu ra: Ghi nhận câu hỏi này phục vụ trực tiếp cho file tài liệu đích nào.

[Hướng dẫn cho Skill]
- Commit bước phỏng vấn hiện tại bằng token đang cầm NGAY sau khi nhận được câu trả lời hợp lệ — không chờ người dùng xác nhận bản dịch ngược trước (D59). Ngay sau khi commit thành công, in bản dịch ngược (translate_back) đã tóm cùng kết quả, kèm một dòng ngắn: "Gõ \`undo\` nếu muốn sửa lại câu này."
${interaction.kind === 'static' ? `- Với options: gọi AskUserQuestion một câu, header bằng ID, multiSelect=${interaction.multiSelect}; mỗi choice label lấy từ block trên. Không tự thêm Other (host đã có sẵn). Khi người dùng chọn, dùng ĐÚNG (các) dòng --answer in kèm lựa chọn đó ở block trên (nối bằng "; " nếu chọn nhiều — xem ghi chú multi_select ở trên) — không bao giờ truyền value nội bộ vào --answer. timeout/dismiss/label lạ không được commit.${card.id === 'S7' ? ' Riêng S7: thêm cờ --branch <value nội bộ> (vd --branch web) CÙNG với --answer, không thay thế nhau.' : ''}${card.id === 'CAL0' ? ' Riêng CAL0: thêm cờ --calibrate <value nội bộ> (vd --calibrate fast) CÙNG với --answer, không thay thế nhau.' : ''}\n` : ''}${interaction.kind === 'hints' ? `- Với option_hints: gọi AskUserQuestion một câu, header bằng ID, multiSelect=${interaction.multiSelect}; các choice do bạn tự soạn tại chỗ theo chỉ dẫn ở block trên (không viết cứng). --answer truyền đúng nội dung gợi ý người dùng đã chọn (văn xuôi, không phải nhãn rút gọn; nối bằng "; " nếu chọn nhiều). Không tự thêm Other. timeout/dismiss/label lạ không được commit.\n` : ''}${critic ? '- Vì câu hỏi này có Critic-pass, PHẢI đưa ra [Yêu cầu Phản biện (Critic-pass)] ở trên (gồm Challenge và Ack prompt) và chờ người dùng phản hồi đồng ý hoặc điều chỉnh TRƯỚC KHI gọi commitStep — đây là ngoại lệ duy nhất vẫn chặn trước commit, không đổi bởi D59.\n' : ''}- Chỉ được commit đúng những câu nằm trong \`question_ids\` của token đang cầm — không commit câu ngoài batch, không prefetch/giữ câu trả lời của câu ngoài batch để dùng sau.`;
}
