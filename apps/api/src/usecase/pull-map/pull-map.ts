import {onlyChange, specPaths} from '../../domain/meaning.js';
import {codePaths, type ProjectMap, projectMap, type SourceFile} from '../../domain/project-map.js';

import {type ProjectTree, type PullMapSource, PullMapSourceError} from './pull-map.port.js';

export class PullMapNotFound extends Error {}

export class PullMapFailed extends Error {}

export async function pullMap(source: PullMapSource, number: number): Promise<ProjectMap> {
  try {
    const project = await source.read(number);

    if (!project) {
      throw new PullMapNotFound();
    }

    const change = onlyChange(project.paths);

    if ('status' in change) {
      return change;
    }

    const [code, specFiles] = await Promise.all([
      readTexts(project, codePaths(project.tree)),
      readTexts(project, specPaths(change.root, project.paths)),
    ]);

    return projectMap(project.paths, project.patches, code, specFiles.map((file) => file.text));
  } catch (error) {
    if (error instanceof PullMapNotFound) {
      throw error;
    }

    if (error instanceof PullMapSourceError) {
      throw new PullMapFailed(error.message);
    }

    throw error;
  }
}

async function readTexts(project: ProjectTree, paths: readonly string[]): Promise<SourceFile[]> {
  const texts = await Promise.all(paths.map(async (path) => ({path, text: await project.read(path)})));

  return texts.flatMap((file) => (file.text === null ? [] : [{path: file.path, text: file.text}]));
}
