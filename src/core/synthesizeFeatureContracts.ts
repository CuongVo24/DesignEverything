import { parseDataModel } from './parseDataModel.js';
import { parseFlows } from './parseFlows.js';
import { extractMustFeatures, extractWontFeatures } from './validatePlan.js';
import { ProjectProfile, Contract } from './schemas/index.js';

export interface SynthesizeFeatureContractsInput {
  answers: Record<string, string>;
  profile: ProjectProfile;
  docs: Array<{ file: string; content: string }>;
  conventionsRef: string;
}

/** Bỏ dấu tiếng Việt để tên thực thể thành định danh code hợp lệ. */
function toAscii(s: string): string {
  return s
    .normalize('NFD')
    // Dấu tổ hợp (combining diacritical marks) tách ra sau NFD.
    .replace(/[̀-ͯ]/g, '')
    // đ/Đ không tách được bằng NFD, phải thay tay.
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function words(s: string): string[] {
  return toAscii(s)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** 'Người dùng' → 'NguoiDung' */
export function pascalCase(s: string): string {
  return words(s)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/** 'Thêm sách' → 'themSach' */
export function camelCase(s: string): string {
  const p = pascalCase(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** 'Thêm sách' → 'them_sach' */
export function snakeCase(s: string): string {
  return words(s)
    .map((w) => w.toLowerCase())
    .join('_');
}

/**
 * Tên kiểu/hàm KHÓA cho một hợp đồng, suy từ thực thể trong 03-data-model và
 * tên Must trong 02-scope.
 *
 * Đây là phần biến hợp đồng từ "sửa file nào" thành "khai đúng cái gì": tên kiểu
 * được chốt ngay ở hợp đồng, nên executor không tự đặt `BookItem`, `BookData`,
 * `IBook` mỗi chỗ một kiểu rồi docs và code gọi cùng một thứ bằng ba cái tên.
 */
export function lockedSignature(input: {
  type: 'data' | 'logic' | 'surface';
  must: string;
  entities: string[];
  language: string;
}): string {
  const { type, must, entities, language } = input;
  const isPython = language === 'python';
  const isTs = language === 'typescript';

  if (type === 'data') {
    // Không khớp được entity nào → khóa theo chính tên Must, còn hơn để trống.
    const names = entities.length > 0 ? entities : [must];
    return names
      .map((e) => {
        const t = pascalCase(e);
        if (isPython) return `class ${t}`;
        if (isTs) return `export interface ${t}`;
        return `@typedef {object} ${t}`;
      })
      .join('; ');
  }

  if (type === 'logic') {
    const fn = isPython ? snakeCase(must) : camelCase(must);
    const arg = entities.length > 0 ? pascalCase(entities[0]) : 'Input';
    if (isPython) return `def ${fn}(payload: ${arg})`;
    if (isTs) return `export function ${fn}(input: ${arg})`;
    return `export function ${fn}(input)`;
  }

  // surface — màn hình/điểm chạm của feature.
  const view = `${pascalCase(must)}View`;
  if (isPython) return `def render_${snakeCase(must)}()`;
  return `export function ${view}()`;
}

/**
 * Checklist nghiệm thu của hợp đồng. Nêu đích danh tên đã khóa để "xong" là thứ
 * kiểm được, không phải "code xong thì thôi".
 */
export function buildChecklist(input: {
  type: 'data' | 'logic' | 'surface';
  signature: string;
  entities: string[];
  conventionsRef: string;
}): string[] {
  const items = [`Khai đúng tên đã khóa: ${input.signature}`];

  if (input.entities.length > 0) {
    items.push(
      `Tên thực thể khớp 03-data-model.md (${input.entities.join(', ')}) — không đặt tên khác cho cùng một thứ`
    );
  }
  if (input.type === 'data') {
    items.push('Chỉ khai field mà tính năng Must này thực sự dùng; chưa dùng thì chưa thêm');
  }
  if (input.type === 'logic') {
    items.push('Xử lý được cả nhánh lỗi, không chỉ nhánh chạy đúng');
  }
  if (input.type === 'surface') {
    items.push('Bước tương ứng trong 04-flows.md bấm được thật, không phải mock');
  }

  items.push(`Không thêm dependency ngoài danh sách khóa tại ${input.conventionsRef}`);
  return items;
}

export function synthesizeFeatureContracts(input: SynthesizeFeatureContractsInput): Contract[] {
  const { answers, profile, docs, conventionsRef } = input;
  const musts = extractMustFeatures(answers).filter(
    (must) => !extractWontFeatures(answers).includes(must)
  );

  const dataModelDoc = docs.find((d) => d.file.endsWith('03-data-model.md'))?.content || '';
  const flowsDoc = docs.find((d) => d.file.endsWith('04-flows.md'))?.content || '';

  const parsedModel = parseDataModel(dataModelDoc);
  const parsedFlows = parseFlows(flowsDoc);

  const contracts: Contract[] = [];

  const lang = profile.language || 'typescript';
  let ext = 'js';
  if (lang === 'typescript') {
    ext = profile.target === 'vite-web' ? 'tsx' : 'ts';
  } else if (lang === 'python') {
    ext = 'py';
  }

  for (const must of musts) {
    const slug = must
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const matchedEntities = parsedModel.entities.filter(
      (e) => must.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(must.toLowerCase())
    );
    const matchedFlowSteps = parsedFlows
      .flatMap((f) => f.steps)
      .filter((s) => must.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(must.toLowerCase()));

    const weight = 1 + matchedEntities.length + matchedFlowSteps.length;

    // Types of contracts to generate
    const types: Array<'data' | 'logic' | 'surface'> = ['logic'];
    if (weight >= 2 && matchedEntities.length > 0) {
      types.push('data');
    }
    if (weight >= 3 || matchedFlowSteps.length > 0 || profile.target === 'vite-web') {
      types.push('surface');
    }

    for (const type of types) {
      const contractId = `C-${slug}-${type}`;
      const pathPrefix = type === 'data' ? 'models' : type === 'logic' ? 'services' : 'views';
      const changeType = 'NEW' as const;

      // est_lines phải phản ánh độ phức tạp khớp được (D42): feature chạm nhiều
      // entity/flow-step thì hợp đồng lớn hơn, để ngưỡng auto-split ~200 dòng
      // thực sự có thể kích hoạt thay vì là hằng số chết.
      const complexity = matchedEntities.length + matchedFlowSteps.length;
      let estLines = 120 + complexity * 30;
      if (type === 'data') estLines = 100 + matchedEntities.length * 45;
      if (type === 'logic') estLines = 150 + complexity * 30;

      // Tên kiểu/hàm được KHÓA ngay tại hợp đồng, suy từ thực thể đã chốt ở
      // 03-data-model — không để executor tự đặt tên mỗi chỗ một kiểu.
      const signature = lockedSignature({
        type,
        must,
        entities: matchedEntities,
        language: lang,
      });

      const interfaces = [
        {
          path: `src/${pathPrefix}/${slug}.${ext}`,
          change: changeType,
          signature,
          est_lines: estLines,
        },
      ];

      const verification = [
        {
          id: `verify-${slug}-${type}`,
          argv: profile.package_manager === 'pip' ? ['pytest'] : [profile.package_manager || 'npm', 'test'],
          expected: { kind: 'exit-code-zero' as const },
        },
      ];

      // Auto-split logic if est_lines > 200 or multi-layer
      // (For unit test trigger: if we manually set est_lines to be large, or if total est_lines of interfaces > 200)
      const totalEstLines = interfaces.reduce((sum, item) => sum + item.est_lines, 0);

      if (totalEstLines > 200) {
        // Split into -a and -b
        const halfLines = Math.ceil(totalEstLines / 2);
        const contractA: Contract = {
          id: `${contractId}-a`,
          feature_milestone: `M4-${slug}`,
          layer: 'app',
          micro_task: `[Part A] Implement ${type} for ${must}`,
          scope: {
            in: [interfaces[0].path],
            out: [],
          },
          checklist: buildChecklist({ type, signature, entities: matchedEntities, conventionsRef }),
          interfaces: [
            {
              path: interfaces[0].path,
              change: changeType,
              signature,
              est_lines: halfLines,
            },
          ],
          risks: [],
          verification,
          status: 'WAITING_FOR_APPROVAL',
          conventions_ref: conventionsRef,
          derived_from: {
            must_id: must,
            entity_ids: matchedEntities,
            flow_id: parsedFlows[0]?.flow_id || null,
          },
        };

        const contractB: Contract = {
          id: `${contractId}-b`,
          feature_milestone: `M4-${slug}`,
          layer: 'app',
          micro_task: `[Part B] Implement ${type} for ${must}`,
          scope: {
            in: [`src/${pathPrefix}/${slug}-helper.${ext}`],
            out: [],
          },
          checklist: [
            `Phần phụ trợ cho ${signature} — không khai lại kiểu đã khóa ở Part A`,
            `Không thêm dependency ngoài danh sách khóa tại ${conventionsRef}`,
          ],
          interfaces: [
            {
              path: `src/${pathPrefix}/${slug}-helper.${ext}`,
              change: changeType,
              signature: `${lang === 'python' ? snakeCase(must) + '_helper' : camelCase(must) + 'Helper'}()`,
              est_lines: totalEstLines - halfLines,
            },
          ],
          risks: [],
          verification: [
            {
              id: `verify-${slug}-${type}-b`,
              argv:
                profile.package_manager === 'pip' ? ['pytest'] : [profile.package_manager || 'npm', 'test'],
              expected: { kind: 'exit-code-zero' as const },
            },
          ],
          status: 'WAITING_FOR_APPROVAL',
          conventions_ref: conventionsRef,
          derived_from: {
            must_id: must,
            entity_ids: matchedEntities,
            flow_id: parsedFlows[0]?.flow_id || null,
          },
        };

        contracts.push(contractA, contractB);
      } else {
        const contract: Contract = {
          id: contractId,
          feature_milestone: `M4-${slug}`,
          layer: 'app',
          micro_task: `Implement ${type} for ${must}`,
          scope: {
            in: interfaces.map((i) => i.path),
            out: [],
          },
          checklist: buildChecklist({ type, signature, entities: matchedEntities, conventionsRef }),
          interfaces,
          risks: [],
          verification,
          status: 'WAITING_FOR_APPROVAL',
          conventions_ref: conventionsRef,
          derived_from: {
            must_id: must,
            entity_ids: matchedEntities,
            flow_id: parsedFlows[0]?.flow_id || null,
          },
        };
        contracts.push(contract);
      }
    }
  }

  return contracts;
}
