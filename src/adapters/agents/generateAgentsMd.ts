import type { Script, GatePolicy } from '../../core/index.js';
import { deriveAnswerText } from '../../core/index.js';

/**
 * Generates the contents of AGENTS.md based on the script, gate policy, and conventions.
 */
export function generateAgentsMd(opts: { script: Script; policy: GatePolicy }): string {
  const { policy } = opts;

  // 1. Section 1: Tại sao repo này dùng chế độ phỏng vấn trước
  const section1 = `## 1. Tại sao repo này dùng chế độ phỏng vấn trước
Repo này buộc agent đi theo hướng phỏng vấn trước khi code để tránh nhảy cóc vào triển khai khi scope và tài liệu còn mơ hồ.`;

  // 2. Section 2: Nguồn sự thật phải đọc
  const section2 = `## 2. Nguồn sự thật phải đọc
- Design/VibeCode.md
- Design/Core/Contract.md
- Design/Content/interview-script/script.yaml
- Design/Content/taxonomy.md`;

  // 3. Section 3: Cách hỏi từng bước
  // B24e (8.2, D59/D60) — degradation text mirrors the Claude Code cadence
  // change: commit/ghi-nhận ngay rồi mới dịch ngược (không còn chặn trước),
  // và một lượt CÓ THỂ gộp nhiều câu liên quan (batch) — nhưng trên harness
  // rules-only không có checkRate/turnCapability ép buộc, nên đây vẫn chỉ
  // là chỉ dẫn best-effort, không phải cơ chế.
  const section3 = `## 3. Cách hỏi từng bước
1. Hỏi đúng câu \`script.yaml\` xác định cho bước hiện tại. Có thể gộp nhiều câu liên tiếp không
   phụ thuộc lẫn nhau vào cùng một lượt nếu chắc chắn hợp lý (nhịp "batch" của 8.2) — nhưng mặc
   định coi mỗi câu là một lượt riêng nếu không chắc, vì harness này không có cơ chế nào ép batch.
2. Nếu người dùng không rõ, dùng \`default\` như một đề xuất để xác nhận, không coi đó là sự thật tuyệt đối.
3. Ghi nhận câu trả lời ngay khi hợp lệ, rồi dịch ngược sang ngôn ngữ chuẩn và in kèm kết quả để
   người dùng đọc lại — không chặn việc ghi nhận để chờ xác nhận trước (không còn thẻ xác nhận
   trước khi ghi). Nếu người dùng muốn sửa lại, hoàn tác đúng câu vừa ghi nhận gần nhất (dùng cơ
   chế hoàn tác của harness nếu có) rồi hỏi lại từ đầu.
4. Mỗi câu trả lời sau khi được ghi nhận phải rót vào đúng file đích trong taxonomy.

> **Lưu ý về nhịp độ phỏng vấn:** Trên các harness mềm không có bộ giới hạn nhịp ép cứng — batch
> và "ghi nhận trước, dịch ngược sau" chỉ là chỉ dẫn best-effort cho agent, không có cơ chế
> token/checkRate nào ép buộc như ở Claude Code. Yêu cầu agent tự kỷ luật: không tự ý gộp nhiều
> câu không liên quan vào một lượt, không bỏ qua bước dịch ngược sau khi ghi nhận.`;

  // 4. Section 4: Gate mềm trước khi code
  let gatesDescription = '';
  for (const gate of policy.gates) {
    const docsList = gate.requires_docs.map((doc) => `\`${doc}\``).join(', ');
    gatesDescription += `- **Gate \`${gate.id}\`**: Không bắt đầu tạo hoặc sửa mã nguồn ứng dụng khi chưa có đầy đủ các tài liệu: ${docsList}.\n`;
  }

  const assistedQuestions = opts.script.questions.filter((question) => question.options || question.option_hints);
  const interactionCatalog = assistedQuestions.map((question) => {
    // B24e (8.2, D61) — multi_select degradation: no native multi-select
    // widget on a text-only harness, so the instruction is to accept
    // several picks and join them the same way deriveMultiAnswerText does
    // on the Claude Code side (Core-derived text, "; "-joined) — never a
    // list of raw values.
    const multiNote = question.multi_select
      ? ' (được chọn NHIỀU mục — nếu người dùng chọn hơn một, nối các dòng đã chọn lại bằng "; " theo đúng thứ tự, thành một câu trả lời duy nhất)'
      : '';
    if (question.options) {
      const choices = question.options.map((option) => {
        const recommended = question.recommendation?.mode === 'fixed'
          && question.recommendation.value === option.value
          ? ' **(khuyến nghị)**'
          : '';
        // D58 (DecisionLog.md): the committed answer text is deriveAnswerText's
        // output, never the raw value — Core owns this so Claude's cards
        // (render-inject.ts) and this text fallback can't independently drift.
        return `${deriveAnswerText(option)}${recommended}`;
      }).join('; ');
      const contextual = question.recommendation?.mode === 'contextual'
        ? ' Không có lựa chọn được khuyến nghị trước vì phụ thuộc ngữ cảnh.'
        : '';
      return `- **${question.id}**${multiNote}: ${choices}. Có thể tự nhập phương án khác.${contextual}`;
    }
    const hints = question.option_hints!;
    return `- **${question.id}**${multiNote}: tạo ${hints.hint_count} gợi ý theo “${hints.hint_style}” từ ${hints.synthesize_from.join(', ')} đã commit; nếu thiếu nguồn, ghi \`unknown\` và hỏi tự nhập.`;
  }).join('\n');
  const sectionChoices = `## 3a. Lựa chọn dạng text (fallback)
Harness này không có thẻ chọn native. Khi đến câu được hỗ trợ, hãy liệt kê các lựa chọn sau dạng text, cho phép người dùng tự nhập câu trả lời khác, ghi nhận ngay rồi dịch ngược và in kèm kết quả. Không được tuyên bố có AskUserQuestion/native card.

${interactionCatalog}`;

  const section4 = `## 4. Gate mềm trước khi code
Không được chủ động sinh code khi các file tài liệu bắt buộc cho gate hiện tại chưa tồn tại.

Các cổng chặn cụ thể:
${gatesDescription.trim()}

**Các chỉ dẫn an toàn bắt buộc:**
- Trước khi viết code, tự kiểm tra các doc bắt buộc của gate hiện tại đã tồn tại chưa.
- Nếu chưa đủ doc, tiếp tục phỏng vấn hoặc hoàn thiện docs thay vì tạo hoặc chỉnh sửa source code.
- Không được tự ý bỏ qua gate chỉ vì đoán rằng scope đã rõ.

> **Tuyên bố giới hạn:** Trên harness chỉ đọc \`AGENTS.md\`, gate là chỉ dẫn mạnh chứ không phải chặn cứng bằng cơ chế. Nếu cần enforcement deterministic, dùng Claude Code adapter.`;

  // 5. Section 5: Cách emit docs
  const section5 = `## 5. Cách emit docs
- Viết tài liệu đúng cây taxonomy được định nghĩa trong \`Design/Content/taxonomy.md\`.
- Mỗi file được tạo ra bắt buộc phải có phần tiêu đề mở đầu \`## Tại sao cần file này\`.
- Mỗi mục tài liệu phải được đính kèm mỏ neo ẩn ở dạng comment với trạng thái \`status=planned\` và \`rev\` để trống theo chuẩn mỏ neo truy vết.
- Không tự tiện tạo thêm file tài liệu mới nằm ngoài cấu trúc taxonomy trừ khi lõi hệ thống đã được cập nhật chính thức.`;

  // 6. Section 6: Quy trình thực thi V3 (soft enforcement)
  const section6 = `## 6. Quy trình thực thi V3 (Soft Enforcement)
Quy trình thực thi và ghi nhận bằng chứng ở các harness rules-only:
1. **Xác thực kế hoạch (Validate)**: Phải chạy validator thông qua tài liệu \`09-execution-plan.md\` và \`.design-everything/execution-plan.json\` trước khi code.
2. **Kích hoạt task (Start)**: Chỉ làm việc trên duy nhất một active task đang mở. Tự giới hạn phạm vi chỉnh sửa trong các tệp tin thuộc \`allowed_paths\` của task đó.
3. **Ghi nhận bằng chứng (Evidence & Repair)**: Sau khi chạy các lệnh kiểm chứng, ghi nhận kết quả (exit code, output) vào phần bằng chứng. Nếu lỗi xảy ra, giữ trạng thái ở chế độ sửa chữa (\`repairing\`) cho tới khi test pass hoàn toàn.
4. **Tuyên bố giới hạn (Self-reported Limitation)**: Chế độ Rules-Only là cơ chế ép buộc mềm. Agent và lập trình viên phải chủ động thực thi đúng kỷ luật và tự ghi nhận bằng chứng trung thực.`;

  // Assemble all sections
  return `# AGENTS

${section1}

${section2}

${section3}

${sectionChoices}

${section4}

${section5}

${section6}
`;
}
