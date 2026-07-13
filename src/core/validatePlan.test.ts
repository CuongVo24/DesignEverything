import { expect, test, describe } from 'vitest';
import { validatePlan } from './validatePlan.js';
import { ValidatorInput } from './schemas/planValidation.js';

describe('validatePlan core logic', () => {
  const baseInput: ValidatorInput = {
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
    emittedDocs: [
      { file: '00-vision.md', content: 'vision' },
      { file: '01-personas.md', content: 'personas' },
      { file: '02-scope.md', content: 'scope' },
      { file: '03-data-model.md', content: 'data model' },
      { file: '04-flows.md', content: 'flows' },
      { file: '05-architecture.md', content: 'architecture' },
      { file: '06-constraints.md', content: 'constraints' },
      { file: '07-distribution.md', content: 'distribution' },
      { file: '08-build-plan.md', content: 'build plan' },
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
- README.md
`,
      },
    ],
    executionPlan: {
      milestones: [
        {
          id: 'M0',
          title: 'Feasibility Spike',
          tasks: [
            {
              id: 'T0',
              title: 'Spike: check compatibility',
              scopeMapped: ['Khảo sát môi trường'],
              filesToModify: ['package.json'],
              verificationCommands: ['npm install'],
              verificationExpected: 'Succeeds without error',
            },
          ],
        },
        {
          id: 'M1',
          title: 'Core implementation',
          tasks: [
            {
              id: 'T1',
              title: 'Add formulas and view list',
              scopeMapped: ['Thêm công thức', 'Xem danh sách công thức'],
              filesToModify: ['src/core/emit.ts', 'src/core/emit.test.ts'],
              verificationCommands: ['npm test'],
              verificationExpected: 'Tests run green',
            },
          ],
        },
      ],
      risksAcknowledged: [],
    },
  };

  test('should pass a valid input matching CLI shape with happy path', () => {
    const result = validatePlan(baseInput);
    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('should fail when a required doc for the shape is missing', () => {
    const invalidInput = {
      ...baseInput,
      emittedDocs: baseInput.emittedDocs.filter((d) => d.file !== '07-distribution.md'),
    };
    const result = validatePlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'invalid-shape-docs')).toBe(true);
  });

  test('should fail when a release doc from another shape is included', () => {
    const invalidInput = {
      ...baseInput,
      emittedDocs: [
        ...baseInput.emittedDocs,
        { file: '07-deployment.md', content: 'deployment' },
      ],
    };
    const result = validatePlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'invalid-shape-docs')).toBe(true);
  });

  test('should fail when README.md does not list all expected files', () => {
    const invalidInput = {
      ...baseInput,
      emittedDocs: baseInput.emittedDocs.map((d) =>
        d.file === 'README.md' ? { file: 'README.md', content: 'missing everything' } : d
      ),
    };
    const result = validatePlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'readme-mismatch')).toBe(true);
  });

  test('should fail when a Must-have feature is missing from execution plan', () => {
    const invalidInput = {
      ...baseInput,
      answers: {
        ...baseInput.answers,
        S3: 'Must: Thêm công thức, Xem danh sách công thức, Tìm kiếm. Should: Sắp xếp. Won\'t: Sync.',
      },
    };
    const result = validatePlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'traceability-missing')).toBe(true);
  });

  test('should fail when verificationExpected is empty or too short', () => {
    const invalidInput = {
      ...baseInput,
      executionPlan: {
        ...baseInput.executionPlan,
        milestones: [
          {
            ...baseInput.executionPlan.milestones[0],
            tasks: [
              {
                ...baseInput.executionPlan.milestones[0].tasks[0],
                verificationExpected: '  ',
              },
            ],
          },
        ],
      },
    };
    const result = validatePlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'traceability-missing')).toBe(true);
  });

  test('should fail when a Won\'t-have feature leaks into execution plan', () => {
    const invalidInput = {
      ...baseInput,
      executionPlan: {
        ...baseInput.executionPlan,
        milestones: [
          ...baseInput.executionPlan.milestones,
          {
            id: 'M2',
            title: 'Leaked task',
            tasks: [
              {
                id: 'T2',
                title: 'Add cloud sync',
                scopeMapped: ['Đồng bộ đám mây'],
                filesToModify: ['src/core/sync.ts'],
                verificationCommands: ['npm test'],
                verificationExpected: 'Sync works',
              },
            ],
          },
        ],
      },
    };
    const result = validatePlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'scope-leak')).toBe(true);
  });

  test('should warning when risk keywords are present but no spike task exists', () => {
    const inputWithRisk = {
      ...baseInput,
      answers: {
        ...baseInput.answers,
        S3: 'Must: Thêm công thức. Rủi ro: Có thể bị giới hạn bộ nhớ.',
      },
      executionPlan: {
        ...baseInput.executionPlan,
        milestones: [
          {
            id: 'M1',
            title: 'Implementation',
            tasks: [
              {
                id: 'T1',
                title: 'Implement core formulas',
                scopeMapped: ['Thêm công thức'],
                filesToModify: ['src/core/emit.ts'],
                verificationCommands: ['npm test'],
                verificationExpected: 'Green tests',
              },
            ],
          },
        ],
      },
    };
    const result = validatePlan(inputWithRisk);
    expect(result.pass).toBe(true); // Warnings do not block pass
    expect(result.issues.some((i) => i.id === 'risk-unresolved' && i.severity === 'warning')).toBe(true);
  });

  test('should fail when task modifies phantom files', () => {
    const invalidInput = {
      ...baseInput,
      executionPlan: {
        ...baseInput.executionPlan,
        milestones: [
          {
            ...baseInput.executionPlan.milestones[0],
            tasks: [
              {
                ...baseInput.executionPlan.milestones[0].tasks[0],
                filesToModify: ['/etc/passwd', 'ghost.txt'],
              },
            ],
          },
        ],
      },
    };
    const result = validatePlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'phantom-command')).toBe(true);
  });

  test('should fail when verification command is phantom', () => {
    const invalidInput = {
      ...baseInput,
      executionPlan: {
        ...baseInput.executionPlan,
        milestones: [
          {
            ...baseInput.executionPlan.milestones[0],
            tasks: [
              {
                ...baseInput.executionPlan.milestones[0].tasks[0],
                verificationCommands: ['formatCdrive --force'],
              },
            ],
          },
        ],
      },
    };
    const result = validatePlan(invalidInput);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'phantom-command')).toBe(true);
  });
});
