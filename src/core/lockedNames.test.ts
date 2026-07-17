import { test, expect, describe } from 'vitest';
import {
  pascalCase,
  camelCase,
  snakeCase,
  lockedSignature,
  buildChecklist,
  synthesizeFeatureContracts,
} from './synthesizeFeatureContracts.js';
import { ProjectProfile } from './schemas/index.js';

describe('chuẩn hoá tên định danh', () => {
  test('bỏ dấu tiếng Việt để thành định danh code hợp lệ', () => {
    expect(pascalCase('Người dùng')).toBe('NguoiDung');
    expect(pascalCase('Đơn hàng')).toBe('DonHang');
    expect(camelCase('Thêm sách')).toBe('themSach');
    expect(snakeCase('Thêm sách')).toBe('them_sach');
  });

  test('tên tiếng Anh giữ nguyên nghĩa', () => {
    expect(pascalCase('ShoppingList')).toBe('Shoppinglist');
    expect(pascalCase('shopping list')).toBe('ShoppingList');
    expect(camelCase('Search recipe')).toBe('searchRecipe');
  });

  test('ký tự lạ và khoảng trắng thừa không tạo định danh hỏng', () => {
    expect(pascalCase('  Tìm-kiếm  sách!  ')).toBe('TimKiemSach');
    expect(camelCase('a/b c')).toBe('aBC');
  });
});

describe('lockedSignature', () => {
  test('data: khóa tên interface theo thực thể (TypeScript)', () => {
    const sig = lockedSignature({ type: 'data', must: 'Thêm sách', entities: ['Book'], language: 'typescript' });
    expect(sig).toBe('export interface Book');
  });

  test('data: nhiều thực thể thì khóa hết, không bỏ sót', () => {
    const sig = lockedSignature({
      type: 'data',
      must: 'Đăng nhập',
      entities: ['User', 'Session'],
      language: 'typescript',
    });
    expect(sig).toContain('export interface User');
    expect(sig).toContain('export interface Session');
  });

  test('data: Python dùng class thay vì interface', () => {
    const sig = lockedSignature({ type: 'data', must: 'x', entities: ['Người dùng'], language: 'python' });
    expect(sig).toBe('class NguoiDung');
  });

  test('data: không khớp entity nào thì khóa theo tên Must, không để trống', () => {
    const sig = lockedSignature({ type: 'data', must: 'Thêm sách', entities: [], language: 'typescript' });
    expect(sig).toBe('export interface ThemSach');
  });

  test('logic: khóa tên hàm theo Must và nhận kiểu đã khóa làm tham số', () => {
    expect(lockedSignature({ type: 'logic', must: 'Thêm sách', entities: ['Book'], language: 'typescript' })).toBe(
      'export function themSach(input: Book)'
    );
    expect(lockedSignature({ type: 'logic', must: 'Thêm sách', entities: ['Book'], language: 'python' })).toBe(
      'def them_sach(payload: Book)'
    );
  });

  test('surface: khóa tên view/màn hình', () => {
    expect(lockedSignature({ type: 'surface', must: 'Thêm sách', entities: [], language: 'typescript' })).toBe(
      'export function ThemSachView()'
    );
  });

  test('javascript không có interface nên dùng JSDoc typedef', () => {
    const sig = lockedSignature({ type: 'data', must: 'x', entities: ['Book'], language: 'javascript' });
    expect(sig).toBe('@typedef {object} Book');
  });
});

describe('buildChecklist', () => {
  test('nêu đích danh tên đã khóa và khóa dependency', () => {
    const items = buildChecklist({
      type: 'data',
      signature: 'export interface Book',
      entities: ['Book'],
      conventionsRef: 'docs/conventions/',
    });

    expect(items[0]).toContain('export interface Book');
    expect(items.some((i) => i.includes('03-data-model.md'))).toBe(true);
    expect(items.some((i) => i.includes('docs/conventions/'))).toBe(true);
  });

  test('mỗi tầng có tiêu chí nghiệm thu riêng', () => {
    const surface = buildChecklist({ type: 'surface', signature: 's', entities: [], conventionsRef: 'c' });
    expect(surface.some((i) => i.includes('04-flows.md'))).toBe(true);

    const logic = buildChecklist({ type: 'logic', signature: 's', entities: [], conventionsRef: 'c' });
    expect(logic.some((i) => i.includes('nhánh lỗi'))).toBe(true);
  });
});

describe('synthesizeFeatureContracts — tên khóa đi vào hợp đồng thật', () => {
  const profile: ProjectProfile = {
    workspace_kind: 'empty',
    target: 'node-cli',
    runtime: 'node',
    package_manager: 'npm',
    framework: 'none',
    language: 'typescript',
    source_root: 'src',
    manifest_paths: ['package.json'],
    capabilities: ['node-npm-project'],
    confirmation: { confirmed: true },
    evidence: [],
  };

  const docs = [
    { file: '03-data-model.md', content: '## Thực Thể Chính\nBook, User\n' },
    { file: '04-flows.md', content: '## Luồng Điển Hình\nĐăng nhập -> Thêm sách\n' },
  ];

  test('hợp đồng không còn signature placeholder kiểu slug_type_entry()', () => {
    const contracts = synthesizeFeatureContracts({
      answers: { S3: 'Must: Thêm sách, Đăng nhập.' },
      profile,
      docs,
      conventionsRef: 'docs/conventions/',
    });

    expect(contracts.length).toBeGreaterThan(0);
    for (const c of contracts) {
      for (const i of c.interfaces) {
        expect(i.signature).not.toMatch(/_entry\(\)$/);
        expect(i.signature).not.toMatch(/_(data|logic|surface)_(a|b)\(\)$/);
        expect(i.signature).toBeTruthy();
      }
    }
  });

  test('checklist nhắc đích danh tên đã khóa thay vì "Verify ... works"', () => {
    const contracts = synthesizeFeatureContracts({
      answers: { S3: 'Must: Thêm sách.' },
      profile,
      docs,
      conventionsRef: 'docs/conventions/',
    });

    for (const c of contracts) {
      expect(c.checklist.join(' ')).not.toContain('works');
      expect(c.checklist.length).toBeGreaterThan(0);
    }
  });

  test('hợp đồng data khóa đúng tên thực thể lấy từ 03-data-model', () => {
    const contracts = synthesizeFeatureContracts({
      answers: { S3: 'Must: Book.' },
      profile,
      docs,
      conventionsRef: 'docs/conventions/',
    });

    const dataContract = contracts.find((c) => c.id.endsWith('-data'));
    expect(dataContract?.interfaces[0].signature).toContain('interface Book');
  });
});
