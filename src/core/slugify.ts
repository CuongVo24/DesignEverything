/**
 * Slug helper dùng chung — trích từ logic inline trước đây lặp 3 chỗ trong
 * synthesizeExecutionPlan.ts. Giữ NGUYÊN phép biến đổi cũ để output byte-identical.
 */

/** Chuẩn hoá một chuỗi thành slug. Có thể trả '' nếu chuỗi không còn ký tự [a-z0-9]. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Slug hoá một danh sách, khoá 2 luật:
 *  - slug rỗng sau chuẩn hoá → `item-<index>` (index theo vị trí trong danh sách gốc);
 *  - trùng slug trong cùng danh sách → hậu tố `-2`, `-3`… theo thứ tự xuất hiện.
 */
export function slugifyList(items: string[]): string[] {
  const seen = new Map<string, number>();
  const out: string[] = [];
  items.forEach((item, index) => {
    let base = slugify(item);
    if (!base) base = `item-${index}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    out.push(count === 0 ? base : `${base}-${count + 1}`);
  });
  return out;
}
