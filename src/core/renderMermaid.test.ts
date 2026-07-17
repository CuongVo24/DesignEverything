import { expect, test, describe } from 'vitest';
import {
  renderEntityDiagram,
  renderFlowDiagram,
  entityDiagramFromSlots,
  flowDiagramFromSlots,
} from './renderMermaid.js';

describe('renderEntityDiagram', () => {
  test('vẽ node cho từng thực thể, tên thật nằm ở nhãn', () => {
    const md = renderEntityDiagram({ entities: ['User', 'Recipe'], relations: [] });

    expect(md).toContain('```mermaid');
    expect(md).toContain('graph LR');
    expect(md).toContain('E0["User"]');
    expect(md).toContain('E1["Recipe"]');
    expect(md).toContain('```');
  });

  test('nối hai thực thể và lấy động từ làm nhãn cạnh', () => {
    const md = renderEntityDiagram({
      entities: ['User', 'Recipe'],
      relations: ['User có nhiều Recipe'],
    });

    expect(md).toContain('E0 -->|"có nhiều"| E1');
  });

  test('không bịa cardinality — nói thẳng là chưa khai', () => {
    const md = renderEntityDiagram({ entities: ['User', 'Recipe'], relations: ['User có nhiều Recipe'] });

    expect(md).toContain('chưa khai cardinality');
    expect(md).not.toContain('||--o{');
  });

  test('quan hệ không rõ hai đầu thì liệt kê ra, không vẽ bừa', () => {
    const md = renderEntityDiagram({
      entities: ['User', 'Recipe', 'Tag'],
      relations: ['Mọi thứ liên kết với nhau', 'User có nhiều Recipe'],
    });

    expect(md).toContain('Quan hệ chưa vẽ được');
    expect(md).toContain('- Mọi thứ liên kết với nhau');
    expect(md).toContain('E0 -->|"có nhiều"| E1');
  });

  test('tên tiếng Việt có dấu và khoảng trắng không làm vỡ cú pháp mermaid', () => {
    const md = renderEntityDiagram({
      entities: ['Người dùng', 'Khoản chi'],
      relations: ['Người dùng ghi nhiều Khoản chi'],
    });

    expect(md).toContain('E0["Người dùng"]');
    expect(md).toContain('E1["Khoản chi"]');
    expect(md).toContain('E0 -->|"ghi nhiều"| E1');
  });

  // Khi slot quan hệ chưa được điền, emit fallback về chính câu S4 (danh sách
  // thực thể). Lúc đó "quan hệ" chỉ là tên thực thể lặp lại — không được báo
  // chúng là "quan hệ hỏng", vì đó là báo động giả làm người mới hoang mang.
  test('tên thực thể lặp lại không bị báo nhầm thành quan hệ hỏng', () => {
    const md = renderEntityDiagram({
      entities: ['User', 'Recipe', 'ShoppingList'],
      relations: ['User', 'Recipe', 'ShoppingList'],
    });

    expect(md).not.toContain('Quan hệ chưa vẽ được');
    expect(md).toContain('E0["User"]');
    expect(md).toContain('E2["ShoppingList"]');
  });

  test('tên thực thể kèm dấu câu cũng không bị báo nhầm', () => {
    const md = renderEntityDiagram({ entities: ['User'], relations: ['User.'] });
    expect(md).not.toContain('Quan hệ chưa vẽ được');
  });

  test('không có thực thể thì nói rõ thiếu, không sinh diagram rỗng', () => {
    const md = renderEntityDiagram({ entities: [], relations: [] });

    expect(md).not.toContain('```mermaid');
    expect(md).toContain('Chưa đủ dữ liệu');
  });

  test('dấu ngoặc kép trong tên không phá nhãn mermaid', () => {
    const md = renderEntityDiagram({ entities: ['Bài viết "nháp"'], relations: [] });
    expect(md).toContain("E0[\"Bài viết 'nháp'\"]");
  });
});

describe('renderFlowDiagram', () => {
  test('nối các bước thành chuỗi theo đúng thứ tự', () => {
    const md = renderFlowDiagram({ steps: ['Mở web', 'Xem công thức', 'Chọn món'] });

    expect(md).toContain('S0["Mở web"]');
    expect(md).toContain('S2["Chọn món"]');
    expect(md).toContain('S0 --> S1');
    expect(md).toContain('S1 --> S2');
    expect(md).not.toContain('S2 --> S3');
  });

  test('nối luồng chính với M0 để người mới biết dùng nó làm gì', () => {
    const md = renderFlowDiagram({ steps: ['A', 'B'] });
    expect(md).toContain('M0');
    expect(md).toContain('08-build-plan.md');
  });

  test('một bước duy nhất thì không có mũi tên nào', () => {
    const md = renderFlowDiagram({ steps: ['Chạy lệnh'] });
    expect(md).toContain('S0["Chạy lệnh"]');
    expect(md).not.toContain('-->');
  });

  test('không có bước thì nói rõ thiếu', () => {
    expect(renderFlowDiagram({ steps: [] })).toContain('Chưa đủ dữ liệu');
  });
});

describe('tách từ slot thô', () => {
  test('entity dạng danh sách phẩy', () => {
    const md = entityDiagramFromSlots({
      coreEntities: 'User, Recipe, ShoppingList',
      entityRelationships: 'User có nhiều Recipe',
    });
    expect(md).toContain('E2["ShoppingList"]');
    expect(md).toContain('E0 -->|"có nhiều"| E1');
  });

  test('entity dạng bullet list', () => {
    const md = entityDiagramFromSlots({
      coreEntities: '- User\n- Recipe\n',
      entityRelationships: '',
    });
    expect(md).toContain('E0["User"]');
    expect(md).toContain('E1["Recipe"]');
  });

  test('flow dạng mũi tên A -> B -> C', () => {
    const md = flowDiagramFromSlots({ mainFlowSteps: 'Mở web -> xem công thức -> chọn món' });
    expect(md).toContain('S0["Mở web"]');
    expect(md).toContain('S2["chọn món"]');
    expect(md).toContain('S1 --> S2');
  });

  test('flow dạng bullet list', () => {
    const md = flowDiagramFromSlots({ mainFlowSteps: '1. Đăng nhập\n2. Thêm sách\n' });
    expect(md).toContain('S0["Đăng nhập"]');
    expect(md).toContain('S1["Thêm sách"]');
  });
});
