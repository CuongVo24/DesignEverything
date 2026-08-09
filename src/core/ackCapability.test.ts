import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { issueAckCapability, consumeAckCapability } from './ackCapability.js';
import { verifyAckCapability, type AckExpectation } from './ackCapabilityVerify.js';
import { ACK_STORE_REL_PATH } from './ackCapabilityStore.js';

describe('A1-01 — Ack capability token (Wave A1, 8.1.0 rollout)', () => {
  let root: string;

  const warnings = [
    { id: 'S2_GENERIC_PERSONA', message: 'Persona too generic' },
    { id: 'M2_OFFLINE_SYNC', message: 'Offline/sync chosen' },
  ];

  const baseExpectation = (overrides: Partial<AckExpectation> = {}): AckExpectation => ({
    workspaceRoot: root,
    sessionId: 'session-1',
    warnings,
    interviewStateRevision: 3,
    inputDigest: 'digest-abc',
    generationId: 'gen-1',
    ...overrides,
  });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ack-capability-test-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('issue then verify with matching expectation succeeds', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const result = verifyAckCapability(token, baseExpectation());
    expect(result.valid).toBe(true);
    expect(result.reason_code).toBe('VALID');
  });

  test('missing token is rejected', () => {
    const result = verifyAckCapability(null, baseExpectation());
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_MISSING');
  });

  test('forged/unknown token is rejected', () => {
    issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
    });
    const result = verifyAckCapability('not-a-real-token', baseExpectation({ generationId: null }));
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_FORGED');
  });

  test('consume is single-use — second consume of the same token replays', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const first = consumeAckCapability(token, baseExpectation());
    expect(first.valid).toBe(true);

    const second = consumeAckCapability(token, baseExpectation());
    expect(second.valid).toBe(false);
    expect(second.reason_code).toBe('ACK_TOKEN_REPLAY');
  });

  test('concurrent consume of the same token: exactly one winner', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const results = [
      consumeAckCapability(token, baseExpectation()),
      consumeAckCapability(token, baseExpectation()),
      consumeAckCapability(token, baseExpectation()),
    ];
    const winners = results.filter((r) => r.valid);
    expect(winners.length).toBe(1);
  });

  test('expired token is rejected', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
      ttlSeconds: -1, // already expired the instant it's issued
    });

    const result = verifyAckCapability(token, baseExpectation());
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_EXPIRED');
  });

  test('wrong workspace is rejected', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const otherRoot = mkdtempSync(join(tmpdir(), 'ack-capability-test-other-'));
    try {
      // Verifying against a store that has no matching record at all —
      // simulates presenting a token issued for a different workspace.
      const result = verifyAckCapability(token, baseExpectation({ workspaceRoot: otherRoot }));
      expect(result.valid).toBe(false);
      expect(result.reason_code).toBe('ACK_TOKEN_FORGED');
    } finally {
      rmSync(otherRoot, { recursive: true, force: true });
    }
  });

  test('wrong session is rejected', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const result = verifyAckCapability(token, baseExpectation({ sessionId: 'session-attacker' }));
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_WRONG_SESSION');
  });

  test('warning set changed after issuance invalidates the token', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const result = verifyAckCapability(
      token,
      baseExpectation({ warnings: [{ id: 'S2_GENERIC_PERSONA', message: 'Persona too generic' }] })
    );
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_WARNING_MISMATCH');
  });

  test('interview revision advanced after issuance invalidates the token', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const result = verifyAckCapability(token, baseExpectation({ interviewStateRevision: 4 }));
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_REVISION_MISMATCH');
  });

  test('input digest changed after issuance invalidates the token', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const result = verifyAckCapability(token, baseExpectation({ inputDigest: 'digest-changed' }));
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_WARNING_MISMATCH');
  });

  test('generation mismatch is rejected', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const result = verifyAckCapability(token, baseExpectation({ generationId: 'gen-2' }));
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_GENERATION_MISMATCH');
  });

  test('corrupt store file is treated as empty rather than crashing the caller', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    writeFileSync(join(root, ACK_STORE_REL_PATH), 'not json{{{', 'utf8');

    const result = verifyAckCapability(token, baseExpectation());
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('ACK_TOKEN_FORGED');
  });

  test('the plaintext token is never stored on disk — only its hash', () => {
    const { token } = issueAckCapability({
      workspaceRoot: root,
      sessionId: 'session-1',
      warnings,
      interviewStateRevision: 3,
      inputDigest: 'digest-abc',
      generationId: 'gen-1',
    });

    const raw = readFileSync(join(root, ACK_STORE_REL_PATH), 'utf8');
    expect(raw.includes(token)).toBe(false);
  });
});
