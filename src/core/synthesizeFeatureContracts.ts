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

      const interfaces = [
        {
          path: `src/${pathPrefix}/${slug}.${ext}`,
          change: changeType,
          signature: `${slug}_${type}_entry()`,
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
          checklist: [`Verify ${type} part A works`],
          interfaces: [
            {
              path: interfaces[0].path,
              change: changeType,
              signature: `${slug}_${type}_a()`,
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
          checklist: [`Verify ${type} part B works`],
          interfaces: [
            {
              path: `src/${pathPrefix}/${slug}-helper.${ext}`,
              change: changeType,
              signature: `${slug}_${type}_b()`,
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
          checklist: [`Verify ${type} contract works`],
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
