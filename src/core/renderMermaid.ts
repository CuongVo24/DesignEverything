/**
 * Sơ đồ mermaid dẫn xuất từ 03-data-model và 04-flows.
 *
 * Nguyên tắc: sơ đồ chỉ được vẽ lại ĐÚNG những gì người dùng đã nói. Không suy
 * ra cardinality (1-1, 1-n, n-n) khi họ chưa nói — vẽ sai quan hệ dữ liệu còn
 * tệ hơn không vẽ, vì người mới sẽ tin cái hình hơn tin đoạn text.
 */

/** Cắt danh sách kiểu 'User, Recipe' hoặc bullet list thành từng mục sạch. */
function splitItems(raw: string): string[] {
  return (raw || '')
    .split(/[,\n;]/)
    .map((s) =>
      s
        .replace(/^[-*+\d.\s]+/, '')
        .replace(/\.$/, '')
        .trim()
    )
    .filter((s) => s.length > 0 && !s.startsWith('<!--') && !s.startsWith('{{'));
}

/** Nhãn mermaid: bọc trong "..." nên phải bỏ dấu " bên trong. */
function escapeLabel(text: string): string {
  return text.replace(/"/g, "'").trim();
}

/**
 * ID node mermaid phải là ký tự an toàn — tên thực thể tiếng Việt có dấu và
 * khoảng trắng nên luôn dùng ID sinh (E0, E1) và đặt tên thật vào nhãn.
 */
function nodeId(prefix: string, index: number): string {
  return `${prefix}${index}`;
}

/** Bỏ tên thực thể khỏi câu quan hệ, còn lại thường là động từ ('có nhiều'). */
function stripEntities(relation: string, entities: string[]): string {
  let text = relation;
  for (const e of entities) {
    text = text.replace(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  // Bỏ nốt dấu câu trơ lại để '- User.' không bị coi là còn nội dung.
  return text.replace(/[.,;:–-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function renderEntityDiagram(input: { entities: string[]; relations: string[] }): string {
  const entities = input.entities.map((e) => e.trim()).filter(Boolean);
  const relations = input.relations.map((r) => r.trim()).filter(Boolean);

  if (entities.length === 0) {
    return 'Chưa đủ dữ liệu để vẽ sơ đồ — mục "Thực Thể Chính" ở trên chưa liệt kê được thực thể nào.';
  }

  const idOf = new Map<string, string>();
  entities.forEach((e, i) => idOf.set(e, nodeId('E', i)));

  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('graph LR');
  for (const entity of entities) {
    lines.push(`  ${idOf.get(entity)}["${escapeLabel(entity)}"]`);
  }

  const unmapped: string[] = [];
  for (const relation of relations) {
    // Tìm các thực thể được nhắc trong câu quan hệ này.
    const mentioned = entities.filter((e) =>
      relation.toLowerCase().includes(e.toLowerCase())
    );

    // Phần chữ còn lại sau khi bỏ tên thực thể — chính là động từ quan hệ.
    const leftover = stripEntities(relation, mentioned);

    if (mentioned.length !== 2) {
      // Chỉ là tên thực thể được nhắc lại, không mang quan hệ nào (hay gặp khi
      // slot quan hệ chưa được điền và fallback về chính danh sách thực thể).
      // Bỏ qua im lặng — báo "quan hệ hỏng" ở đây là báo động giả.
      if (leftover.length === 0) continue;

      // Có chữ nhưng không định vị được đúng hai đầu → không vẽ, giữ nguyên câu.
      unmapped.push(relation);
      continue;
    }

    const [from, to] = mentioned;
    lines.push(`  ${idOf.get(from)} -->|"${escapeLabel(leftover || 'liên quan')}"| ${idOf.get(to)}`);
  }

  lines.push('```');
  lines.push('');
  lines.push(
    'Sơ đồ vẽ lại đúng quan hệ bạn đã mô tả, **chưa khai cardinality** (một-một, một-nhiều, ' +
      'nhiều-nhiều) vì phần đó chưa được chốt trong phỏng vấn. Khi dựng schema thật ở milestone ' +
      'M0, bổ sung cardinality vào đây — đó là lúc bạn biết chắc.'
  );

  if (unmapped.length > 0) {
    lines.push('');
    lines.push('Quan hệ chưa vẽ được (không xác định rõ hai thực thể ở hai đầu — hãy viết lại rõ hơn khi chốt schema):');
    for (const r of unmapped) {
      lines.push(`- ${r}`);
    }
  }

  return lines.join('\n');
}

export function renderFlowDiagram(input: { steps: string[] }): string {
  const steps = input.steps.map((s) => s.trim()).filter(Boolean);

  if (steps.length === 0) {
    return 'Chưa đủ dữ liệu để vẽ sơ đồ — mục "Các Bước Chính" ở trên chưa tách được bước nào.';
  }

  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('graph LR');
  steps.forEach((step, i) => {
    lines.push(`  ${nodeId('S', i)}["${escapeLabel(step)}"]`);
  });
  for (let i = 0; i < steps.length - 1; i++) {
    lines.push(`  ${nodeId('S', i)} --> ${nodeId('S', i + 1)}`);
  }
  lines.push('```');
  lines.push('');
  lines.push(
    'Đây là luồng chính — cũng chính là thứ phải chạy được end-to-end ở milestone M0 ' +
      '(xem `08-build-plan.md`). Mỗi lần xong một milestone, chạy lại đúng luồng này như một người dùng thật.'
  );

  return lines.join('\n');
}

/** Tách entity/relation từ nội dung slot thô của S4. */
export function entityDiagramFromSlots(input: { coreEntities: string; entityRelationships: string }): string {
  return renderEntityDiagram({
    entities: splitItems(input.coreEntities),
    relations: splitItems(input.entityRelationships),
  });
}

/** Tách bước từ nội dung slot thô của S5 ('A -> B -> C' hoặc bullet list). */
export function flowDiagramFromSlots(input: { mainFlowSteps: string }): string {
  const raw = input.mainFlowSteps || '';
  const steps = raw.includes('->')
    ? raw
        .split('->')
        .map((s) => s.replace(/^[-*+\d.\s]+/, '').trim())
        .filter(Boolean)
    : splitItems(raw);
  return renderFlowDiagram({ steps });
}
