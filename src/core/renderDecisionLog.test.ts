import { expect, test, describe } from 'vitest';
import { renderDecisionTable, collectDecisions } from './renderDecisionLog.js';

const webSlots: Record<string, string> = {
  client_and_rendering_strategy: 'Next.js SSR cho SEO',
  architecture_overview: 'Responsive mobile-first',
  hosting_strategy: 'Vercel free tier',
  auth_and_access_strategy: 'NextAuth Google OAuth',
  realtime_push_or_sync_strategy: 'Không realtime ở MVP',
  data_sensitivity_and_security: 'Chỉ email đăng nhập; băm mật khẩu.',
  expected_scale_and_performance: 'Vài trăm người dùng năm đầu.',
};

describe('collectDecisions', () => {
  test('nhánh web gom đủ quyết định lõi và quyết định web', () => {
    const ds = collectDecisions({ branch: 'web', slots: webSlots });
    const ids = ds.map((d) => d.id);

    expect(ids).toContain('D-shape');
    expect(ids).toContain('D-security');
    expect(ids).toContain('D-scale');
    expect(ids).toContain('D-rendering');
    expect(ids).toContain('D-hosting');
    // Quyết định của nhánh khác không được lọt vào.
    expect(ids).not.toContain('D-interface');
  });

  test('mỗi quyết định nối được về câu phỏng vấn và file chi tiết', () => {
    const ds = collectDecisions({ branch: 'web', slots: webSlots });
    const auth = ds.find((d) => d.id === 'D-auth');

    expect(auth?.source_question).toBe('W4');
    expect(auth?.detail_doc).toBe('05-architecture.md');
    expect(auth?.value).toBe('NextAuth Google OAuth');
  });

  test('hình-hài lấy thẳng từ branch, không phải từ slot', () => {
    const ds = collectDecisions({ branch: 'cli', slots: {} });
    expect(ds.find((d) => d.id === 'D-shape')?.value).toBe('cli');
  });

  test('nhánh cli dùng đúng bộ quyết định riêng', () => {
    const ids = collectDecisions({ branch: 'cli', slots: {} }).map((d) => d.id);
    expect(ids).toContain('D-config');
    expect(ids).toContain('D-distribution');
    expect(ids).not.toContain('D-rendering');
  });

  test('hybrid gộp web+mobile, id trùng chỉ xuất hiện một lần', () => {
    const ds = collectDecisions({ branch: 'hybrid', slots: webSlots });
    const ids = ds.map((d) => d.id);

    expect(ids).toContain('D-rendering');
    expect(ids).toContain('D-platform');
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('renderDecisionTable', () => {
  test('render bảng có đủ cột truy vết và ngày chốt', () => {
    const md = renderDecisionTable({ branch: 'web', slots: webSlots, today: '2026-07-17' });

    expect(md).toContain('Chốt ngày 2026-07-17');
    expect(md).toContain('| Mã | Quyết định | Đã chốt là | Nối từ câu | Chi tiết tại |');
    expect(md).toContain('| D-auth | Xác thực và phân quyền | NextAuth Google OAuth | W4 | `05-architecture.md` |');
    expect(md).toContain('| D-shape | Hình-hài dự án | web | S7 | `06-constraints.md` |');
  });

  test('slot chưa có thì ghi rõ chưa chốt, không để ô trống mập mờ', () => {
    const md = renderDecisionTable({ branch: 'web', slots: {}, today: '2026-07-17' });
    expect(md).toContain('_(chưa chốt)_');
  });

  test('giá trị nhiều dòng bị ép về một dòng để không vỡ bảng', () => {
    const md = renderDecisionTable({
      branch: 'web',
      slots: { auth_and_access_strategy: 'Dòng một\nDòng hai' },
      today: '2026-07-17',
    });
    expect(md).toContain('Dòng một Dòng hai');
    expect(md.split('\n').filter((l) => l.startsWith('| D-auth'))).toHaveLength(1);
  });

  test('dấu | trong nội dung được escape để không tách cột giả', () => {
    const md = renderDecisionTable({
      branch: 'web',
      slots: { auth_and_access_strategy: 'OAuth | email' },
      today: '2026-07-17',
    });
    expect(md).toContain('OAuth \\| email');
  });

  test('giá trị quá dài bị cắt để bảng còn đọc được', () => {
    const md = renderDecisionTable({
      branch: 'web',
      slots: { auth_and_access_strategy: 'x'.repeat(400) },
      today: '2026-07-17',
    });
    const row = md.split('\n').find((l) => l.startsWith('| D-auth'))!;
    expect(row).toContain('…');
    expect(row.length).toBeLessThan(260);
  });

  test('comment anchor trong slot không lọt vào ô bảng', () => {
    const md = renderDecisionTable({
      branch: 'web',
      slots: { auth_and_access_strategy: 'OAuth <!-- anchor: id=x --> Google' },
      today: '2026-07-17',
    });
    expect(md).not.toContain('anchor:');
    expect(md).toContain('OAuth  Google');
  });
});
