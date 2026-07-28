import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { initializeInterviewStore, loadInterviewStore } from './interviewStore.js';
import { issuePromptCapability, commitInterviewAnswer } from './interviewApplicationServices.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

// P6 10.1 — commit --slots-file must land in the SAME CAS transaction as
// the main answer text, not a second, separately-committed write.
describe('P6 10.1 — commitInterviewAnswer atomically commits slots with the answer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-commit-slots-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
    mkdirSync(tempDir, { recursive: true });
    const designDir = join(tempDir, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(projectRoot, 'Design/Content/interview-script'), designDir, { recursive: true });
    return () => {
      if (existsSync(tempDir)) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore
        }
      }
    };
  });

  test('a commit with slotsPayload writes answers[stepId] and slots[key] in one revision bump', () => {
    initializeInterviewStore(tempDir);
    const capRes = issuePromptCapability(tempDir);
    expect(capRes.ok).toBe(true);
    if (!capRes.ok) return;
    // Baseline is captured AFTER capability issuance — issuePromptCapability
    // is itself a CAS write (it persists the pending capability), so the
    // revision commitInterviewAnswer starts from is capRes.revision, not
    // initializeInterviewStore's revision 0.
    const before = capRes.revision;

    const stepId = capRes.progress.current_step as string;

    const result = commitInterviewAnswer(tempDir, {
      capabilityToken: capRes.token,
      answerText: 'Một câu trả lời hợp lệ và đủ dài.',
      slotsPayload: {
        vision_elevator_pitch: 'Ứng dụng giúp X làm Y nhanh hơn.',
        current_workaround: 'Hiện tại làm thủ công bằng Excel.',
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Exactly one revision bump for the whole commit (progress+answer+slots
    // together), not one per field.
    expect(result.revision).toBe(before + 1);

    const after = loadInterviewStore(tempDir);
    expect(after.state_revision).toBe(before + 1);
    expect(after.payload.answers[stepId]).toBe('Một câu trả lời hợp lệ và đủ dài.');
    expect(after.payload.slots.vision_elevator_pitch).toMatchObject({
      value: 'Ứng dụng giúp X làm Y nhanh hơn.',
      provenance: `interview:${stepId}`,
    });
    expect(after.payload.slots.current_workaround).toMatchObject({
      value: 'Hiện tại làm thủ công bằng Excel.',
    });
  });

  test('an invalid slot value blocks the whole commit — no partial write of the answer or other slots', () => {
    initializeInterviewStore(tempDir);
    const capRes = issuePromptCapability(tempDir);
    expect(capRes.ok).toBe(true);
    if (!capRes.ok) return;
    const before = capRes.revision;

    const result = commitInterviewAnswer(tempDir, {
      capabilityToken: capRes.token,
      answerText: 'Một câu trả lời hợp lệ và đủ dài.',
      slotsPayload: {
        vision_elevator_pitch: 'Nội dung hợp lệ.',
        current_workaround: 'TBD', // placeholder — must fail validateAnswer
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason_code).toBe('PLACEHOLDER_ANSWER_DENIED');

    // Nothing committed at all — not the answer, not the valid sibling slot.
    const after = loadInterviewStore(tempDir);
    expect(after.state_revision).toBe(before);
    expect(after.payload.slots.vision_elevator_pitch).toBeUndefined();
  });

  test('P6 10.1 — resubmitting a slot key at a later step records a correction instead of silently overwriting it', () => {
    initializeInterviewStore(tempDir);

    const capRes1 = issuePromptCapability(tempDir);
    expect(capRes1.ok).toBe(true);
    if (!capRes1.ok) return;

    const first = commitInterviewAnswer(tempDir, {
      capabilityToken: capRes1.token,
      answerText: 'Câu trả lời đầu tiên hợp lệ.',
      slotsPayload: { shared_key: 'Giá trị ban đầu.' },
    });
    expect(first.ok).toBe(true);

    // A second, later step resubmits the SAME slot key with a different
    // value — nothing in loadSlotsFile/commitInterviewAnswer scopes a slot
    // key to the step that first wrote it, so this is a real, reachable
    // path (unlike re-committing an already-confirmed answers[stepId]).
    const capRes2 = issuePromptCapability(tempDir);
    expect(capRes2.ok).toBe(true);
    if (!capRes2.ok) return;

    const second = commitInterviewAnswer(tempDir, {
      capabilityToken: capRes2.token,
      answerText: 'Câu trả lời thứ hai hợp lệ.',
      slotsPayload: { shared_key: 'Giá trị đã sửa lại.' },
    });
    expect(second.ok).toBe(true);

    const after = loadInterviewStore(tempDir);
    // Latest value wins in the live slots map...
    expect(after.payload.slots.shared_key.value).toBe('Giá trị đã sửa lại.');
    // ...but the value it replaced is preserved, not destroyed.
    expect(after.payload.corrections?.slots.shared_key).toEqual([
      expect.objectContaining({ previous_value: 'Giá trị ban đầu.' }),
    ]);
  });
});
