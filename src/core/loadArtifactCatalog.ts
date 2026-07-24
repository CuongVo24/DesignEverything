import { readFileSync } from 'fs';
import YAML from 'yaml';
import { artifactCatalogSchema, type ArtifactCatalog } from './schemas/artifactCatalog.js';

export function loadArtifactCatalog(path: string): ArtifactCatalog {
  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to read artifact catalog at ${path}: ${(error as Error).message}`);
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = YAML.parse(fileContent);
  } catch (error: unknown) {
    throw new Error(`Failed to parse YAML at ${path}: ${(error as Error).message}`);
  }

  const parsed = artifactCatalogSchema.safeParse(parsedYaml);
  if (!parsed.success) {
    throw new Error(
      `Invalid artifact catalog schema at ${path}: ${JSON.stringify(parsed.error.format())}`
    );
  }

  const catalog = parsed.data;
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  const seenPathsLower = new Set<string>();

  for (const artifact of catalog.artifacts) {
    if (seenIds.has(artifact.id)) {
      throw new Error(`Duplicate artifact id in catalog: ${artifact.id}`);
    }
    seenIds.add(artifact.id);

    const key = artifact.path ?? artifact.path_pattern!;
    if (seenPaths.has(key)) {
      throw new Error(`Duplicate artifact path in catalog: ${key}`);
    }
    seenPaths.add(key);

    const lowerKey = key.toLowerCase();
    if (seenPathsLower.has(lowerKey)) {
      throw new Error(`Case-collision on artifact path in catalog: ${key}`);
    }
    seenPathsLower.add(lowerKey);

    if (artifact.path) {
      if (artifact.path.startsWith('/') || artifact.path.includes('..')) {
        throw new Error(`Artifact ${artifact.id} declares a path outside managed roots: ${artifact.path}`);
      }
      const isManagedRoot =
        artifact.path.startsWith('docs/') || artifact.path.startsWith('.design-everything/');
      if (!isManagedRoot) {
        throw new Error(`Artifact ${artifact.id} path must live under docs/ or .design-everything/: ${artifact.path}`);
      }
      if (artifact.kind === 'state' && artifact.path.startsWith('docs/')) {
        throw new Error(`Artifact ${artifact.id} is kind=state and must not live under docs/: ${artifact.path}`);
      }
    }
  }

  return catalog;
}
