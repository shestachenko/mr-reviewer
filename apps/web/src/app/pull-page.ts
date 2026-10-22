import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Component, effect, inject, input, signal} from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {firstValueFrom} from 'rxjs';

import {positiveInteger} from './positive-integer';
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

const whenFormat = new Intl.DateTimeFormat('ru', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-pull-page',
  imports: [RouterLink, RouterOutlet],
  template: `
    <main class="wide">
      <p class="back"><a routerLink="/">Назад</a></p>
      @if (status() === 'loading') {
        <p>MR ещё не пришёл.</p>
      } @else if (status() === 'missing') {
        <p>Такого MR нет.</p>
      } @else if (status() === 'error') {
        <p>MR не загрузился.</p>
      } @else if (pull(); as pull) {
        <h1>{{ pull.title }}</h1>
        <p class="meta">{{ heading(pull) }}</p>
        <section class="panel">
          <dl class="facts">
            <div>
              <dt>Автор</dt>
              <dd>{{ author(pull) }}</dd>
            </div>
            <div>
              <dt>Открыт</dt>
              <dd>{{ when(pull.createdAt) }}</dd>
            </div>
            <div>
              <dt>Обновлён</dt>
              <dd>{{ when(pull.updatedAt) }}</dd>
            </div>
            <div>
              <dt>Ветки</dt>
              <dd class="sha">{{ branches(pull) }}</dd>
            </div>
            <div>
              <dt>Последний коммит</dt>
              <dd>
                <p>
                  <span class="sha" [title]="pull.commit.sha">{{ shortSha(pull.commit.sha) }}</span>
                  @if (pull.commit.message) {
                    {{ pull.commit.message }}
                  }
                </p>
                <p class="note">{{ commitMeta(pull.commit) }}</p>
              </dd>
            </div>
            <div>
              <dt>GitHub</dt>
              <dd>
                <a [href]="pull.url" target="_blank" rel="noopener noreferrer">Открыть</a>
              </dd>
            </div>
          </dl>
        </section>
        <router-outlet />
      } @else {
        <p>MR не загрузился.</p>
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

  protected heading(pull: PullDetails): string {
    return `#${String(pull.number)} · ${pullStateLabel[pull.state]}`;
  }

  protected author(pull: PullDetails): string {
    return pull.author ?? 'не указан';
  }

  protected when(value: string): string {
    return formatWhen(value);
  }

  protected branches(pull: PullDetails): string {
    return `${pull.head} в ${pull.base}`;
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
