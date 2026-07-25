/* global process, console */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const args = process.argv.slice(2);
const parseArg = (name) => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};

const workspace = parseArg('workspace');
const action = parseArg('action');
const crashAt = parseArg('crash-at');

if (!workspace || !action || !crashAt) {
  console.error('Usage: node crash-worker.mjs --workspace=<path> --action=<commit|emit> --crash-at=<step>');
  process.exit(1);
}

function resolveModulePath(subpath) {
  const candidates = [
    path.join(process.cwd(), 'dist/src', subpath),
    path.join(process.cwd(), 'dist', subpath),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return pathToFileURL(c).href;
  }
  throw new Error(`Cannot resolve compiled module ${subpath} in dist/`);
}

// Intercept writeFileSync and renameSync to trigger hard process exit
const origWriteFileSync = fs.writeFileSync;
const origRenameSync = fs.renameSync;

if (action === 'commit') {
  fs.writeFileSync = function (filePath, data, options) {
    const p = String(filePath);
    if (crashAt === 'lock' && p.includes('.lock')) {
      origWriteFileSync.call(fs, filePath, data, options);
      console.error(`[CRASH-WORKER] Crashing process at step: ${crashAt}`);
      process.exit(137);
    }
    if (crashAt === 'temp-write' && p.includes('.tmp.')) {
      console.error(`[CRASH-WORKER] Crashing process before writeTmp at step: ${crashAt}`);
      process.exit(137);
    }
    return origWriteFileSync.call(fs, filePath, data, options);
  };

  fs.renameSync = function (oldPath, newPath) {
    if (crashAt === 'rename' && String(oldPath).includes('.tmp.')) {
      console.error(`[CRASH-WORKER] Crashing process before rename at step: ${crashAt}`);
      process.exit(137);
    }
    return origRenameSync.call(fs, oldPath, newPath);
  };

  // Import commit functions
  const interviewStoreUrl = resolveModulePath('core/interviewStore.js');
  const { transactInterviewStore } = await import(interviewStoreUrl);

  try {
    // P2.2a: transactInterviewStore requires a real expected revision — no
    // null CAS-bypass sentinel. The fixture this worker runs against always
    // seeds state_revision: 1.
    transactInterviewStore(workspace, 1, (env) => {
      env.payload.answers['S1'] = 'Dự án test crash';
      return env;
    });
    console.log('COMMIT_SUCCESS');
  } catch (err) {
    console.error('COMMIT_FAILED:', err.message);
    process.exit(1);
  }
} else if (action === 'emit') {
  fs.writeFileSync = function (filePath, data, options) {
    const p = String(filePath);
    if (p.includes('emit-journal.json')) {
      origWriteFileSync.call(fs, filePath, data, options);
      try {
        const journal = JSON.parse(String(data));
        if (journal.step === crashAt) {
          console.error(`[CRASH-WORKER] Crashing process at journal step: ${crashAt}`);
          process.exit(137);
        }
      } catch {
        // Ignore JSON parse error
      }
      return;
    }
    return origWriteFileSync.call(fs, filePath, data, options);
  };

  // Import emit functions and catalog loaders
  const emitTxUrl = resolveModulePath('core/emitTransaction.js');
  const catalogUrl = resolveModulePath('core/loadArtifactCatalog.js');
  const scriptUrl = resolveModulePath('core/loadScript.js');
  const shapesUrl = resolveModulePath('core/loadShapes.js');
  const compileCatalogUrl = resolveModulePath('core/compileRuntimeCatalog.js');

  const { prepareEmit, activateEmit, manifestPath } = await import(emitTxUrl);
  const { loadArtifactCatalog } = await import(catalogUrl);
  const { loadScript } = await import(scriptUrl);
  const { loadShapes } = await import(shapesUrl);
  const { compileRuntimeCatalog } = await import(compileCatalogUrl);

  const catalog = compileRuntimeCatalog({
    catalog: loadArtifactCatalog(path.join(process.cwd(), 'Design/Content/artifact-catalog.yaml')),
    script: loadScript(path.join(process.cwd(), 'Design/Content/interview-script/script.yaml')),
    shapes: loadShapes(path.join(process.cwd(), 'Design/Content/interview-script/shapes.yaml')),
  });

  try {
    const activeManifestPath = manifestPath(workspace, 'tier1');
    let activeGenId = null;
    if (fs.existsSync(activeManifestPath)) {
      activeGenId = JSON.parse(fs.readFileSync(activeManifestPath, 'utf8')).generation_id;
    }

    const docs = [
      { file: 'docs/00-vision.md', content: '# Vision Doc\nUpdated content from crash worker' },
    ];

    const staged = prepareEmit(workspace, { docs, shape: 'web', inputDigest: 'd'.repeat(64) }, catalog);
    const res = activateEmit(workspace, staged, activeGenId, 'tier1');
    console.log('EMIT_RESULT:', JSON.stringify(res));
  } catch (err) {
    console.error('EMIT_FAILED:', err.message);
    process.exit(1);
  }
} else {
  console.error(`Unknown action: ${action}`);
  process.exit(1);
}
