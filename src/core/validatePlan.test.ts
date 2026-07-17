import { expect, test, describe } from 'vitest';
import { validateExecutionPlan } from './validatePlan.js';
import { PlanValidationInput } from './schemas/planValidation.js';
import { createHash } from 'crypto';

describe('validateExecutionPlan core logic', () => {
  const mockPlan = {
    metadata: {
      version: '4.0.0',
      updated_at: new Date().toISOString(),
    },
    trace_links: [
      {
        must_id: 'Thêm công thức',
        flow_id: 'Mở terminal -> gõ lệnh search',
        task_ids: ['T1'],
      },
      {
        must_id: 'Xem danh sách công thức',
        flow_id: 'Mở terminal -> gõ lệnh search',
        task_ids: ['T1'],
      },
    ],
    risks: [],
    milestones: [
      {
        id: 'M0',
        title: 'Feasibility Spike',
        tasks: ['T0'],
      },
      {
        id: 'M1',
        title: 'Core implementation',
        tasks: ['T1'],
      },
    ],
    tasks: {
      T0: {
        id: 'T0',
        type: 'spike',
        milestone: 'M0',
        intent: 'Spike: check compatibility',
        depends_on: [],
        allowed_paths: ['package.json'],
        preconditions: [],
        commands: [
          {
            id: 'npm-install',
            argv: ['npm', 'install'],
            expected: { kind: 'exit-code-zero' },
          }
        ],
        expected_result: 'Succeeds without error',
        evidence_required: ['T0-evidence.txt'],
        failure_policy: 'abort',
        requires_capability: 'node-npm-project',
      },
      T1: {
        id: 'T1',
        type: 'implementation',
        milestone: 'M1',
        intent: 'Add formulas and view list',
        depends_on: ['T0'],
        allowed_paths: ['src/core/emit.ts', 'src/core/emit.test.ts'],
        preconditions: ['T0'],
        commands: [
          {
            id: 'npm-test',
            argv: ['npm', 'test'],
            expected: { kind: 'exit-code-zero' },
          }
        ],
        expected_result: 'Tests run green',
        evidence_required: ['T1-evidence.txt'],
        failure_policy: 'abort',
        requires_capability: 'node-npm-project',
      },
    },
    capabilities_evidence: [
      {
        id: 'node-npm-project',
        name: 'Node.js NPM Project Manifest',
        source: 'existing-manifest',
        checked_at: new Date().toISOString(),
      }
    ],
    discovery_status: 'pass',
  };

  const planJsonStr = JSON.stringify(mockPlan, null, 2);
  const planDigest = createHash('sha256').update(planJsonStr.trim()).digest('hex');

  const baseInput: PlanValidationInput = {
    shape: 'cli',
    answers: {
      S3: 'Must: Thêm công thức, Xem danh sách công thức. Should: Sắp xếp theo ngày. Won\'t: Đồng bộ đám mây.',
      S5: 'Mở terminal -> gõ lệnh search -> xem công thức -> xuất file',
      C1: 'architecture details',
      C2: 'flags and arguments',
      C3: 'auth details',
      C4: 'cross-platform',
      C5: 'NPM registry',
    },
    emitted_docs: [
      { file: '00-vision.md', content: 'vision' },
      { file: '01-personas.md', content: 'personas' },
      { file: '02-scope.md', content: 'scope' },
      { file: '03-data-model.md', content: 'data model' },
      { file: '04-flows.md', content: 'flows' },
      { file: '05-architecture.md', content: 'architecture' },
      { file: '06-constraints.md', content: 'constraints' },
      { file: '07-distribution.md', content: 'distribution' },
      { file: '08-build-plan.md', content: 'build plan' },
      { file: '09-execution-plan.md', content: `# Plan\n\n<!-- plan-digest: ${planDigest} -->` },
      { file: 'decisions.md', content: 'decisions' },
      { file: '.design-everything/execution-plan.json', content: planJsonStr },
      {
        file: 'README.md',
        content: `
- 00-vision.md
- 01-personas.md
- 02-scope.md
- 03-data-model.md
- 04-flows.md
- 05-architecture.md
- 06-constraints.md
- 07-distribution.md
- 08-build-plan.md
- 09-execution-plan.md
- decisions.md
- .design-everything/execution-plan.json
- README.md
`,
      },
    ],
    execution_plan: mockPlan,
  };

  test('should pass a valid input matching CLI shape with happy path', () => {
    const result = validateExecutionPlan(baseInput);
    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('should fail when a required doc for the shape is missing', () => {
    const invalidInput = {
      ...baseInput,
      emitted_docs: baseInput.emitted_docs.filter((d) => d.file !== '07-distribution.md'),
    };
    const result = validateExecutionPlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'invalid-shape-docs')).toBe(true);
  });

  test('should fail when a release doc from another shape is included', () => {
    const invalidInput = {
      ...baseInput,
      emitted_docs: [
        ...baseInput.emitted_docs,
        { file: '07-deployment.md', content: 'deployment' },
      ],
    };
    const result = validateExecutionPlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'invalid-shape-docs')).toBe(true);
  });

  test('should fail when README.md does not list all expected files', () => {
    const invalidInput = {
      ...baseInput,
      emitted_docs: baseInput.emitted_docs.map((d) =>
        d.file === 'README.md' ? { file: 'README.md', content: 'missing everything' } : d
      ),
    };
    const result = validateExecutionPlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'readme-mismatch')).toBe(true);
  });

  test('should fail when a Must-have feature is missing from execution plan trace links', () => {
    const invalidInput = {
      ...baseInput,
      answers: {
        ...baseInput.answers,
        S3: 'Must: Thêm công thức, Xem danh sách công thức, Tìm kiếm. Should: Sắp xếp. Won\'t: Sync.',
      },
    };
    const result = validateExecutionPlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'traceability-missing')).toBe(true);
  });

  test('should fail when expected_result is empty or too short', () => {
    const badPlan = JSON.parse(JSON.stringify(mockPlan));
    badPlan.tasks.T1.expected_result = '  ';
    const badPlanStr = JSON.stringify(badPlan, null, 2);
    const badDigest = createHash('sha256').update(badPlanStr.trim()).digest('hex');

    const invalidInput = {
      ...baseInput,
      execution_plan: badPlan,
      emitted_docs: baseInput.emitted_docs.map((d) => {
        if (d.file === '.design-everything/execution-plan.json') {
          return { file: d.file, content: badPlanStr };
        }
        if (d.file === '09-execution-plan.md') {
          return { file: d.file, content: `# Plan\n\n<!-- plan-digest: ${badDigest} -->` };
        }
        return d;
      }),
    };

    const result = validateExecutionPlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'traceability-missing')).toBe(true);
  });

  test('should fail when a Won\'t-have feature leaks into execution plan', () => {
    const badPlan = JSON.parse(JSON.stringify(mockPlan));
    badPlan.tasks.T2 = {
      id: 'T2',
      type: 'implementation',
      milestone: 'M1',
      intent: 'Đồng bộ đám mây',
      depends_on: ['T1'],
      allowed_paths: ['src/core/sync.ts'],
      preconditions: ['T1'],
      commands: [
        {
          id: 'npm-test',
          argv: ['npm', 'test'],
          expected: { kind: 'exit-code-zero' },
        }
      ],
      expected_result: 'Sync works',
      evidence_required: ['T2-evidence.txt'],
      failure_policy: 'abort',
    };
    badPlan.milestones[1].tasks.push('T2');
    const badPlanStr = JSON.stringify(badPlan, null, 2);
    const badDigest = createHash('sha256').update(badPlanStr.trim()).digest('hex');

    const invalidInput = {
      ...baseInput,
      execution_plan: badPlan,
      emitted_docs: baseInput.emitted_docs.map((d) => {
        if (d.file === '.design-everything/execution-plan.json') {
          return { file: d.file, content: badPlanStr };
        }
        if (d.file === '09-execution-plan.md') {
          return { file: d.file, content: `# Plan\n\n<!-- plan-digest: ${badDigest} -->` };
        }
        return d;
      }),
    };

    const result = validateExecutionPlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'scope-leak')).toBe(true);
  });

  test('should error (block) when risk keywords are present but no spike task exists', () => {
    const badPlan = JSON.parse(JSON.stringify(mockPlan));
    // Remove spike task
    delete badPlan.tasks.T0;
    badPlan.milestones[0].tasks = [];
    badPlan.tasks.T1.depends_on = [];
    badPlan.tasks.T1.preconditions = [];
    const badPlanStr = JSON.stringify(badPlan, null, 2);
    const badDigest = createHash('sha256').update(badPlanStr.trim()).digest('hex');

    const inputWithRisk = {
      ...baseInput,
      answers: {
        ...baseInput.answers,
        S3: 'Must: Thêm công thức. Rủi ro: Có thể bị giới hạn bộ nhớ.',
      },
      execution_plan: badPlan,
      emitted_docs: baseInput.emitted_docs.map((d) => {
        if (d.file === '.design-everything/execution-plan.json') {
          return { file: d.file, content: badPlanStr };
        }
        if (d.file === '09-execution-plan.md') {
          return { file: d.file, content: `# Plan\n\n<!-- plan-digest: ${badDigest} -->` };
        }
        return d;
      }),
    };
    const result = validateExecutionPlan(inputWithRisk);
    expect(result.pass).toBe(false); // Unresolved risk without a spike now blocks
    expect(result.issues.some((i) => i.id === 'risk-unresolved' && i.severity === 'error')).toBe(true);
  });

  test('should fail when task modifies phantom files', () => {
    const badPlan = JSON.parse(JSON.stringify(mockPlan));
    badPlan.tasks.T0.allowed_paths = ['/etc/passwd', 'ghost.txt'];
    const badPlanStr = JSON.stringify(badPlan, null, 2);
    const badDigest = createHash('sha256').update(badPlanStr.trim()).digest('hex');

    const invalidInput = {
      ...baseInput,
      execution_plan: badPlan,
      emitted_docs: baseInput.emitted_docs.map((d) => {
        if (d.file === '.design-everything/execution-plan.json') {
          return { file: d.file, content: badPlanStr };
        }
        if (d.file === '09-execution-plan.md') {
          return { file: d.file, content: `# Plan\n\n<!-- plan-digest: ${badDigest} -->` };
        }
        return d;
      }),
    };
    const result = validateExecutionPlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'phantom-command')).toBe(true);
  });

  test('should fail when verification command is phantom', () => {
    const badPlan = JSON.parse(JSON.stringify(mockPlan));
    badPlan.tasks.T0.commands = [
      {
        id: 'format-cdrive',
        argv: ['formatCdrive', '--force'],
        expected: { kind: 'exit-code-zero' },
      }
    ];
    const badPlanStr = JSON.stringify(badPlan, null, 2);
    const badDigest = createHash('sha256').update(badPlanStr.trim()).digest('hex');

    const invalidInput = {
      ...baseInput,
      execution_plan: badPlan,
      emitted_docs: baseInput.emitted_docs.map((d) => {
        if (d.file === '.design-everything/execution-plan.json') {
          return { file: d.file, content: badPlanStr };
        }
        if (d.file === '09-execution-plan.md') {
          return { file: d.file, content: `# Plan\n\n<!-- plan-digest: ${badDigest} -->` };
        }
        return d;
      }),
    };
    const result = validateExecutionPlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'phantom-command')).toBe(true);
  });
});
