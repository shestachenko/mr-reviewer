import {changeFile, onlyChange, openMeaning, type PullMeaning} from '../domain/meaning.js';

import {type MrMeaningSource, MrMeaningSourceError} from './mr-meaning.port.js';

export class MrMeaningNotFound extends Error {}

export class MrMeaningFailed extends Error {}

export async function mrMeaning(source: MrMeaningSource, number: number): Promise<PullMeaning> {
  try {
    const tree = await source.read(number);

    if (!tree) {
      throw new MrMeaningNotFound();
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
    if (error instanceof MrMeaningNotFound) {
      throw error;
    }

    if (error instanceof MrMeaningSourceError) {
      throw new MrMeaningFailed(error.message);
    }

    throw error;
  }
}
