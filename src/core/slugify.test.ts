import { describe, it, expect } from 'vitest';
import { slugify, slugifyList } from './slugify.js';

// Logic slug cũ (inline trong synthesizeExecutionPlan) — dùng làm chuẩn byte-identical.
const legacy = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

describe('slugify', () => {
  it('byte-identical với logic cũ trên các Must golden web', () => {
    for (const must of ['Đăng nhập', 'Xem công thức', 'Tạo công thức', 'Tìm kiếm', 'Shopping List', 'API Gateway']) {
      expect(slugify(must)).toBe(legacy(must));
    }
  });

  it('slug golden web khớp tên file thực tế', () => {
    expect(slugify('Đăng nhập')).toBe('ng-nh-p');
    expect(slugify('Tìm kiếm')).toBe('t-m-ki-m');
  });

  it('chuỗi không còn ký tự [a-z0-9] → rỗng', () => {
    expect(slugify('文字だけ')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});

describe('slugifyList', () => {
  it('slug rỗng → item-<index>', () => {
    expect(slugifyList(['Đăng nhập', '###'])).toEqual(['ng-nh-p', 'item-1']);
  });

  it('trùng slug → hậu tố -2, -3 theo thứ tự', () => {
    expect(slugifyList(['Login', 'login', 'LOGIN'])).toEqual(['login', 'login-2', 'login-3']);
  });

  it('không trùng → giữ nguyên slug đơn', () => {
    expect(slugifyList(['Đăng nhập', 'Tìm kiếm'])).toEqual(['ng-nh-p', 't-m-ki-m']);
  });
});
