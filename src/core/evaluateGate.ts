import type { Gate, GatePolicy } from './schemas/index.js';
import { basename } from 'path';

const getBasename = (p: string): string => basename(p.replace(/\\/g, '/'));

export function evaluateGate(
  gate: Gate,
  existingDocs: string[]
): { open: boolean; missing: string[] } {
  const existingBasenames = existingDocs.map((doc) => getBasename(doc));
  const missing = gate.requires_docs.filter((reqDoc) => !existingBasenames.includes(reqDoc));

  return {
    open: missing.length === 0,
    missing,
  };
}

export function isBlocked(
  gate: Gate,
  tool: 'Write' | 'Edit' | 'Bash',
  existingDocs: string[]
): boolean {
  const { open } = evaluateGate(gate, existingDocs);
  if (open) {
    return false;
  }
  return gate.blocks.includes(tool);
}

export function passedGates(policy: GatePolicy, existingDocs: string[]): string[] {
  const passed: string[] = [];
  for (const gate of policy.gates) {
    const { open } = evaluateGate(gate, existingDocs);
    if (open) {
      passed.push(gate.id);
    }
  }
  return passed;
}
