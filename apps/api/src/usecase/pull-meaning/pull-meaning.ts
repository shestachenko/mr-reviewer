import {changeFile, onlyChange, openMeaning, type PullMeaning} from '../../domain/meaning.js';

import {type PullMeaningSource, PullMeaningSourceError} from './pull-meaning.port.js';

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

    const [proposal, yaml] = await Promise.all([
      tree.read(changeFile(change.root, 'proposal.md')),
      tree.read(changeFile(change.root, '.openspec.yaml')),
    ]);

    return openMeaning(change, proposal, yaml);
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
