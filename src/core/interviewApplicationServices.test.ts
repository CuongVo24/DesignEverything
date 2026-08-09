import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, cpSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { initializeInterviewStore, loadInterviewStore } from './interviewStore.js';
import { issuePromptCapability, commitInterviewAnswer } from './interviewApplicationServices.js';
import { migrateInterviewStore } from './migrateInterviewStore.js';

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

    // P4.2/R07 — `vision_elevator_pitch` is used here (not an arbitrary made
    // up key) because the first commit's step is CAL0, which has no
    // `slot_keys` declared (anything is still accepted there), and the
    // second commit's step is S0, whose declared `slot_keys` genuinely
    // includes `vision_elevator_pitch` — the resubmission this test proves
    // must stay reachable under the new per-question key allowlist.
    const first = commitInterviewAnswer(tempDir, {
      capabilityToken: capRes1.token,
      answerText: 'Câu trả lời đầu tiên hợp lệ.',
      slotsPayload: { vision_elevator_pitch: 'Giá trị ban đầu.' },
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
      slotsPayload: { vision_elevator_pitch: 'Giá trị đã sửa lại.' },
    });
    expect(second.ok).toBe(true);

    const after = loadInterviewStore(tempDir);
    // Latest value wins in the live slots map...
    expect(after.payload.slots.vision_elevator_pitch.value).toBe('Giá trị đã sửa lại.');
    // ...but the value it replaced is preserved, not destroyed.
    expect(after.payload.corrections?.slots.vision_elevator_pitch).toEqual([
      expect.objectContaining({ previous_value: 'Giá trị ban đầu.' }),
    ]);
  });

  test('P4.2/R07 — a slot key outside the current question\'s declared slot_keys is denied, whole commit blocked', () => {
    initializeInterviewStore(tempDir);

    // Advance past CAL0 (no slot_keys declared there — not the case under
    // test) so the current step is S0, which declares slot_keys:
    // [vision_elevator_pitch].
    const capRes1 = issuePromptCapability(tempDir);
    expect(capRes1.ok).toBe(true);
    if (!capRes1.ok) return;
    const first = commitInterviewAnswer(tempDir, {
      capabilityToken: capRes1.token,
      answerText: 'Câu trả lời đầu tiên hợp lệ.',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const capRes2 = issuePromptCapability(tempDir);
    expect(capRes2.ok).toBe(true);
    if (!capRes2.ok) return;
    // issuePromptCapability is itself a CAS write (same as the first test in
    // this suite notes) — the revision to compare against is capRes2's, not
    // first.revision, since issuing the second capability already bumped it.
    const before = capRes2.revision;

    const result = commitInterviewAnswer(tempDir, {
      capabilityToken: capRes2.token,
      answerText: 'Một câu trả lời hợp lệ và đủ dài.',
      slotsPayload: {
        vision_elevator_pitch: 'Nội dung hợp lệ.', // allowed for S0
        not_a_real_slot_key: 'Không thuộc S0.', // not in S0's slot_keys
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason_code).toBe('SLOT_KEY_NOT_ALLOWLISTED');

    // Nothing committed — the whole commit is blocked, not just the bad key.
    const after = loadInterviewStore(tempDir);
    expect(after.state_revision).toBe(before);
    expect(after.payload.slots.vision_elevator_pitch).toBeUndefined();
  });

  test('B1a: a migrated legacy turn id is metadata, never a commit capability', () => {
    writeFileSync(
      join(tempDir, 'progress.json'),
      JSON.stringify({
        version: '0.1.0',
        phase: 'interview',
        branch: null,
        current_step: 'CAL0',
        answered: [],
        emitted_docs: [],
        gates_passed: [],
        // This legacy authority field must not become a capability. The old
        // progress format deliberately has no pending_turn_capability.
        last_user_turn_id: 'legacy-turn-42',
        answered_len_at_last_turn: 0,
        updated_at: new Date().toISOString(),
        calibrate_mode: null,
      })
    );

    expect(migrateInterviewStore(tempDir)).toBe('migrated');
    const migrated = loadInterviewStore(tempDir).payload.progress;
    expect(migrated.last_user_turn_id).toBe('legacy-turn-42');
    expect(migrated.pending_turn_capability).toBeNull();

    const forgedLegacyCommit = commitInterviewAnswer(tempDir, {
      capabilityToken: 'legacy-turn-42',
      calibrateChoice: 'fast',
    });
    expect(forgedLegacyCommit).toMatchObject({
      ok: false,
      reason_code: 'TURN_CAPABILITY_MISSING',
    });

    const issued = issuePromptCapability(tempDir);
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const acceptedCommit = commitInterviewAnswer(tempDir, {
      capabilityToken: issued.token,
      calibrateChoice: 'fast',
    });
    expect(acceptedCommit).toMatchObject({ ok: true, reason_code: 'COMMIT_SUCCESS' });
  });

  describe('A1-03b (Wave A1) — needs_user_ack is gated by a real single-use ack token, not a caller-set boolean', () => {
    function advanceToS0(): { token: string } {
      initializeInterviewStore(tempDir);
      const cal = issuePromptCapability(tempDir);
      if (!cal.ok) throw new Error('setup: could not issue CAL0 capability');
      const calCommit = commitInterviewAnswer(tempDir, { capabilityToken: cal.token, calibrateChoice: 'fast' });
      if (!calCommit.ok) throw new Error('setup: CAL0 commit failed');
      const s0 = issuePromptCapability(tempDir);
      if (!s0.ok) throw new Error('setup: could not issue S0 capability');
      return { token: s0.token };
    }

    const genericPitch = 'Nền tảng kết nối mọi người.'; // triggers S0's WARNING_RULES_TRIGGERED

    test('a warning-triggering answer with no ack token is refused and returns a fresh, usable ack_token', () => {
      const { token } = advanceToS0();
      const first = commitInterviewAnswer(tempDir, { capabilityToken: token, answerText: genericPitch });

      expect(first.ok).toBe(false);
      if (first.ok) return;
      expect(first.reason_code).toBe('ANSWER_NEEDS_USER_ACK');
      expect(typeof first.ack_token).toBe('string');
      expect((first.ack_token as string).length).toBeGreaterThan(0);
    });

    test('resubmitting the exact same answer with the issued ack_token commits successfully', () => {
      const { token } = advanceToS0();
      const first = commitInterviewAnswer(tempDir, { capabilityToken: token, answerText: genericPitch });
      expect(first.ok).toBe(false);
      if (first.ok) return;

      // Same capability token is still valid — commitStep hasn't consumed
      // it (the whole point of needs_user_ack is that nothing advanced yet).
      const second = commitInterviewAnswer(tempDir, {
        capabilityToken: token,
        answerText: genericPitch,
        ackToken: first.ack_token,
      });
      expect(second).toMatchObject({ ok: true, reason_code: 'COMMIT_SUCCESS' });
    });

    test('an ack_token is single-use — replaying it after a successful commit fails', () => {
      const { token } = advanceToS0();
      const first = commitInterviewAnswer(tempDir, { capabilityToken: token, answerText: genericPitch });
      expect(first.ok).toBe(false);
      if (first.ok) return;

      const second = commitInterviewAnswer(tempDir, {
        capabilityToken: token,
        answerText: genericPitch,
        ackToken: first.ack_token,
      });
      expect(second.ok).toBe(true);

      // S1 has no warning_rules — a throwaway valid answer to get past it
      // without needing its own ack, so S2 (which does warn on a generic
      // persona) is reachable next.
      const s1Cap = issuePromptCapability(tempDir);
      expect(s1Cap.ok).toBe(true);
      if (!s1Cap.ok) return;
      const s1Commit = commitInterviewAnswer(tempDir, {
        capabilityToken: s1Cap.token,
        answerText: 'Người dùng hiện đang gặp khó khăn khi làm thủ công.',
      });
      expect(s1Commit.ok).toBe(true);

      // Now at S2, try to replay the SAME already-consumed token rather
      // than requesting the new one this warning would actually need.
      const s2Cap = issuePromptCapability(tempDir);
      expect(s2Cap.ok).toBe(true);
      if (!s2Cap.ok) return;
      const replay = commitInterviewAnswer(tempDir, {
        capabilityToken: s2Cap.token,
        answerText: 'Ai cũng dùng được sản phẩm này.',
        ackToken: first.ack_token,
      });
      expect(replay.ok).toBe(false);
      if (replay.ok) return;
      expect(replay.reason_code).toBe('ANSWER_NEEDS_USER_ACK');
      expect(replay.ack_token).not.toBe(first.ack_token);
    });

    test('a forged/unknown ack token is rejected the same as presenting none, with a fresh token reissued', () => {
      const { token } = advanceToS0();
      const result = commitInterviewAnswer(tempDir, {
        capabilityToken: token,
        answerText: genericPitch,
        ackToken: 'not-a-real-token',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason_code).toBe('ANSWER_NEEDS_USER_ACK');
      expect(typeof result.ack_token).toBe('string');
    });

    test('an ack token issued for different answer text does not cover a changed answer', () => {
      const { token } = advanceToS0();
      const first = commitInterviewAnswer(tempDir, { capabilityToken: token, answerText: genericPitch });
      expect(first.ok).toBe(false);
      if (first.ok) return;

      const changedText = 'Ứng dụng kết nối mọi người.'; // also matches S0_GENERIC_PITCH, different text/digest
      const result = commitInterviewAnswer(tempDir, {
        capabilityToken: token,
        answerText: changedText,
        ackToken: first.ack_token,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason_code).toBe('ANSWER_NEEDS_USER_ACK');
    });
  });
});
