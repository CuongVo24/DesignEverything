/**
 * Bộ khung cấu trúc của một tài liệu phát hành: tiêu đề mục và mỏ neo ẩn.
 *
 * So sánh theo cấu trúc thay vì toàn văn là có chủ đích. Nội dung văn xuôi được
 * phép đổi khi template chau chuốt lại chữ, nhưng thêm/bớt/đảo mục hay lệch mỏ
 * neo là hồi quy thật. Cách này cũng bỏ qua <!-- plan-digest: ... --> ở cuối
 * 09-execution-plan.md — chữ ký đó băm cả execution-plan.json vốn nhúng
 * updated_at/checked_at, nên nó đổi sau mỗi lần emit dù đầu vào không đổi.
 */
export function getStructure(content: string) {
  const headings = (content.match(/^##\s+.+$/gm) || []).map((h) => h.trim());
  const anchors = (content.match(/<!-- anchor:\s*id=[\S]+/g) || []).map((a) =>
    a.replace(/<!-- anchor:\s*id=/, '').trim()
  );
  return { headings, anchors };
}
