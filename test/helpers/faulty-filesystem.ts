import fs from 'fs';

export interface FaultConfig {
  targetMethod: 'writeFileSync' | 'renameSync' | 'copyFileSync' | 'unlinkSync' | 'mkdirSync';
  pathSubstring?: string;
  errorCode?: 'ENOSPC' | 'EACCES' | 'EBUSY' | 'EIO';
  errorMessage?: string;
  failAfterCount?: number;
}

type FsFn = (...args: unknown[]) => unknown;
const originals: Record<string, FsFn> = {};

/**
 * Injects a filesystem error when a specific fs method is called on a path matching pathSubstring.
 */
export function injectFsFault(config: FaultConfig): void {
  const method = config.targetMethod;
  if (!originals[method]) {
    originals[method] = (fs as unknown as Record<string, FsFn>)[method];
  }

  const orig = originals[method];
  const code = config.errorCode || 'EIO';
  const msg = config.errorMessage || `Simulated ${code} fault injection on ${method}`;
  let callCount = 0;

  (fs as unknown as Record<string, FsFn>)[method] = function (...args: unknown[]) {
    const hasMatch = args.some((arg) => {
      const str = (typeof arg === 'string' ? arg : String(arg)).replace(/\\/g, '/');
      return !config.pathSubstring || str.includes(config.pathSubstring);
    });

    if (hasMatch) {
      callCount++;
      if (!config.failAfterCount || callCount >= config.failAfterCount) {
        const err = new Error(msg) as Error & { code?: string };
        err.code = code;
        throw err;
      }
    }
    return orig.apply(fs, args);
  };
}

/**
 * Restores all injected fs mocks.
 */
export function restoreFsFaults(): void {
  for (const method of Object.keys(originals)) {
    (fs as unknown as Record<string, FsFn>)[method] = originals[method];
    delete originals[method];
  }
}
