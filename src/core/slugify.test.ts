import { describe, it, expect } from 'vitest';
import { slugify, slugifyList } from './slugify.js';

// Logic slug cũ (inline trong synthesizeExecutionPlan) — dùng làm chuẩn byte-identical
// CHỈ cho input không dấu. Input có dấu tiếng Việt đổi hành vi có chủ đích (fix bug xoá
// nguyên âm có dấu thay vì chuyển về không dấu) — xem describe block riêng bên dưới.
const legacy = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

describe('slugify', () => {
  it('byte-identical với logic cũ cho input không dấu', () => {
    for (const s of ['Shopping List', 'API Gateway', 'Login', '  spaced out  ', 'a---b', 'v2 API']) {
      expect(slugify(s)).toBe(legacy(s));
    }
  });

  it('tiếng Việt có dấu → chuyển về không dấu, không xoá nguyên âm', () => {
    expect(slugify('Đăng nhập')).toBe('dang-nhap');
    expect(slugify('Tìm kiếm')).toBe('tim-kiem');
    expect(slugify('Xem công thức')).toBe('xem-cong-thuc');
    expect(slugify('Tạo công thức')).toBe('tao-cong-thuc');
    expect(slugify('Phỏng vấn thiết kế')).toBe('phong-van-thiet-ke');
  });

  it('chuỗi không còn ký tự [a-z0-9] → rỗng', () => {
    expect(slugify('文字だけ')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});

describe('slugifyList', () => {
  it('slug rỗng → item-<index>', () => {
    expect(slugifyList(['Đăng nhập', '###'])).toEqual(['dang-nhap', 'item-1']);
  });

  it('trùng slug → hậu tố -2, -3 theo thứ tự', () => {
    expect(slugifyList(['Login', 'login', 'LOGIN'])).toEqual(['login', 'login-2', 'login-3']);
  });

  it('không trùng → giữ nguyên slug đơn', () => {
    expect(slugifyList(['Đăng nhập', 'Tìm kiếm'])).toEqual(['dang-nhap', 'tim-kiem']);
  });
});
