import {HttpClient} from '@angular/common/http';
import {Component, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';

import {type PullState, pullStateLabel} from './pull-state';

interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: PullState;
  author: string | null;
  updatedAt: string;
}

interface PullListBody {
  repository: string;
  pulls: PullRequest[];
}

const updatedAtFormat = new Intl.DateTimeFormat('ru', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

@Component({
  selector: 'app-pull-list',
  imports: [RouterLink],
  template: `
    <main class="wide">
      <h1>Список MR</h1>
      @if (status() === 'loading') {
        <p>Список ещё не пришёл.</p>
      } @else if (status() === 'error') {
        <p>Список не загрузился.</p>
      } @else {
        <p class="repo">{{ repository() }}</p>
        @if (pulls().length === 0) {
          <p>В проекте нет MR.</p>
        } @else {
          <ul class="pulls">
            @for (pull of pulls(); track pull.number) {
              <li>
                <a [routerLink]="['/pulls', pull.number]">{{ pull.title }}</a>
                <p>{{ meta(pull) }}</p>
              </li>
            }
          </ul>
        }
      }
    </main>
  `,
})
export class PullList {
  private readonly http = inject(HttpClient);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly repository = signal('');
  protected readonly pulls = signal<PullRequest[]>([]);

  constructor() {
    void this.load();
  }

  protected meta(pull: PullRequest): string {
    const parts = [`#${String(pull.number)}`, pullStateLabel[pull.state]];

    if (pull.author) {
      parts.push(pull.author);
    }

    parts.push(updatedAtFormat.format(new Date(pull.updatedAt)));

    return parts.join(' · ');
  }

  private async load(): Promise<void> {
    try {
      const body = await firstValueFrom(this.http.get<PullListBody>('/pulls'));
      this.repository.set(body.repository);
      this.pulls.set(body.pulls);
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }
}
