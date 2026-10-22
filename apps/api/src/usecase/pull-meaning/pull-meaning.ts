import {changeFile, onlyChange, openMeaning, type PullMeaning, specPaths} from '../../domain/meaning.js';

import {type ChangeTree, type PullMeaningSource, PullMeaningSourceError} from './pull-meaning.port.js';

export class PullMeaningNotFound extends Error {}

export class PullMeaningFailed extends Error {}

export async function pullMeaning(source: PullMeaningSource, number: number): Promise<PullMeaning> {
  try {
    const tree = await source.read(number);

    if (!tree) {
      throw new PullMeaningNotFound();
    }

    const change = onlyChange(tree.paths);

    if ('status' in change) {
      return change;
    }

    const [proposal, yaml, design, specs] = await Promise.all([
      tree.read(changeFile(change.root, 'proposal.md')),
      tree.read(changeFile(change.root, '.openspec.yaml')),
      tree.read(changeFile(change.root, 'design.md')),
      readSpecs(tree, specPaths(change.root, tree.paths)),
    ]);

    return openMeaning(change, {proposal, yaml, design, specs});
  } catch (error) {
    if (error instanceof PullMeaningNotFound) {
      throw error;
    }

    if (error instanceof PullMeaningSourceError) {
      throw new PullMeaningFailed(error.message);
    }

    throw error;
  }
}

async function readSpecs(tree: ChangeTree, paths: readonly string[]): Promise<string[]> {
  const texts = await Promise.all(paths.map((path) => tree.read(path)));

  return texts.flatMap((text) => (text === null ? [] : [text]));
}
