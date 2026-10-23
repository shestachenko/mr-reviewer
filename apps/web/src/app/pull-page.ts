import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Component, effect, inject, input, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';

import {positiveInteger} from './positive-integer';
import {PullChange} from './pull-change';
import {PullMap} from './pull-map';
import {PullMeaning} from './pull-meaning';
import {type PullState, pullStateLabel} from './pull-state';

interface PullCommit {
  sha: string;
  message: string;
  author: string | null;
  committedAt: string;
}

interface PullDetails {
  number: number;
  title: string;
  url: string;
  state: PullState;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  base: string;
  head: string;
  commit: PullCommit;
}

const whenFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-pull-page',
  imports: [RouterLink, PullMeaning, PullMap, PullChange],
  template: `
    <main class="wide">
      <p class="back"><a routerLink="/">Back</a></p>
      @if (status() === 'loading') {
        <p>The pull request has not arrived.</p>
      } @else if (status() === 'missing') {
        <p>There is no such pull request.</p>
      } @else if (status() === 'error') {
        <p>The pull request did not load.</p>
      } @else if (pull(); as pull) {
        <details class="pull">
          <summary>
            <h1>{{ pull.title }}</h1>
            <span class="meta">{{ summary(pull) }}</span>
          </summary>
          <p>Opened {{ when(pull.createdAt) }} · Updated {{ when(pull.updatedAt) }}</p>
          <p class="sha">{{ branches(pull) }}</p>
          <p>
            <span class="sha" [title]="pull.commit.sha">{{ shortSha(pull.commit.sha) }}</span>
            @if (pull.commit.message) {
              {{ pull.commit.message }}
            }
          </p>
          <p class="note">{{ commitMeta(pull.commit) }}</p>
          <p><a [href]="pull.url" target="_blank" rel="noopener noreferrer">GitHub</a></p>
        </details>
        <app-pull-meaning [number]="number()" />
        <app-pull-map [number]="number()" />
        <app-pull-change [number]="number()" />
      } @else {
        <p>The pull request did not load.</p>
      }
    </main>
  `,
})
export class PullPage {
  private readonly http = inject(HttpClient);
  protected readonly number = input.required<string>();
  private requestId = 0;
  protected readonly status = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly pull = signal<PullDetails | null>(null);

  constructor() {
    effect(() => {
      const number = this.number();
      void this.load(number);
    });
  }

  protected summary(pull: PullDetails): string {
    return `#${String(pull.number)} · ${pullStateLabel[pull.state]} · ${this.author(pull)}`;
  }

  protected author(pull: PullDetails): string {
    return pull.author ?? 'not set';
  }

  protected when(value: string): string {
    return formatWhen(value);
  }

  protected branches(pull: PullDetails): string {
    return `${pull.head} into ${pull.base}`;
  }

  protected shortSha(sha: string): string {
    return sha.slice(0, 7);
  }

  protected commitMeta(commit: PullCommit): string {
    const when = formatWhen(commit.committedAt);

    if (commit.author) {
      return `${commit.author} · ${when}`;
    }

    return when;
  }

  private async load(rawNumber: string): Promise<void> {
    const requestId = ++this.requestId;
    const number = positiveInteger(rawNumber);
    this.status.set('loading');
    this.pull.set(null);

    if (number === null) {
      this.status.set('missing');

      return;
    }

    try {
      const body = await firstValueFrom(this.http.get<PullDetails>(`/pulls/${String(number)}`));

      if (requestId !== this.requestId) {
        return;
      }

      this.pull.set(body);
      this.status.set('ready');
    } catch (error) {
      if (requestId !== this.requestId) {
        return;
      }

      if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 404)) {
        this.status.set('missing');

        return;
      }

      this.status.set('error');
    }
  }
}

function formatWhen(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return whenFormat.format(date);
}
