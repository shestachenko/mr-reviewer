import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Component, effect, inject, input, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';

import {positiveInteger} from './positive-integer';

interface MeaningScenario {
  name: string;
  text: string;
}

interface MeaningRequirement {
  name: string;
  text: string;
  scenarios: MeaningScenario[];
}

interface BlockedMeaning {
  status: 'blocked';
  reason: 'missing' | 'several';
  changes: string[];
}

interface OpenMeaning {
  status: 'open';
  change: string;
  skipSpecs: boolean;
  task: string | null;
  requirements: MeaningRequirement[];
  assumptions: string | null;
}

type MeaningBody = BlockedMeaning | OpenMeaning;

@Component({
  selector: 'app-pull-meaning',
  imports: [RouterLink],
  template: `
    @if (status() === 'loading') {
      <p>The meaning has not arrived.</p>
    } @else if (status() === 'missing') {
      <p>There is no such pull request.</p>
    } @else if (status() === 'error') {
      <p>The meaning did not load.</p>
    } @else if (meaning(); as meaning) {
      @if (meaning.status === 'blocked') {
        <section class="panel unit">
          <h2>Meaning</h2>
          <p>{{ blocked(meaning) }}</p>
          @if (meaning.changes.length > 0) {
            <ul class="changes">
              @for (change of meaning.changes; track change) {
                <li>{{ change }}</li>
              }
            </ul>
          }
        </section>
      } @else {
        <section class="panel meaning">
          <details [open]="expanded()" (toggle)="setExpanded($event)">
            <summary>
              <h2>Meaning</h2>
              <span class="meta">{{ meaning.change }}</span>
            </summary>
            @if (meaning.skipSpecs) {
              <p>This change has no behavior contract. That is intentional.</p>
            }
            <h2>Task</h2>
            @if (meaning.task) {
              <pre class="quote">{{ meaning.task }}</pre>
            } @else {
              <p>This section is missing.</p>
            }
            @if (!meaning.skipSpecs) {
              <h2>Expected behavior</h2>
              @if (meaning.requirements.length === 0) {
                <p>This section is missing.</p>
              } @else {
                <ul class="changes">
                  @for (requirement of meaning.requirements; track $index) {
                    <li>{{ requirement.name }}</li>
                  }
                </ul>
              }
              <h2>Acceptance criteria</h2>
              @if (!hasCriteria(meaning.requirements)) {
                <p>This section is missing.</p>
              } @else {
                @for (requirement of meaning.requirements; track $index) {
                  @for (scenario of requirement.scenarios; track $index) {
                    <p>{{ requirement.name }}: {{ scenario.name }}</p>
                    @if (scenario.text) {
                      <pre class="quote">{{ scenario.text }}</pre>
                    }
                  }
                }
              }
            }
            @if (meaning.assumptions) {
              <details>
                <summary><h2>Assumptions</h2></summary>
                <pre class="quote">{{ meaning.assumptions }}</pre>
              </details>
            }
          </details>
          <p class="next"><a [routerLink]="['/pulls', number(), 'map']">Project map</a></p>
        </section>
      }
    } @else {
      <p>The meaning did not load.</p>
    }
  `,
})
export class PullMeaning {
  private readonly http = inject(HttpClient);
  protected readonly number = input.required<string>();
  private requestId = 0;
  protected readonly status = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly meaning = signal<MeaningBody | null>(null);
  protected readonly expanded = signal(true);

  constructor() {
    effect(() => {
      const number = this.number();
      void this.load(number);
    });
  }

  protected setExpanded(event: Event): void {
    if (!(event.target instanceof HTMLDetailsElement) || event.target !== event.currentTarget) {
      return;
    }

    this.expanded.set(event.target.open);
  }

  protected blocked(meaning: BlockedMeaning): string {
    if (meaning.reason === 'missing') {
      return 'This pull request has no OpenSpec change, so the walkthrough stays closed.';
    }

    return 'This pull request has more than one OpenSpec change, so the walkthrough stays closed.';
  }

  protected hasCriteria(requirements: MeaningRequirement[]): boolean {
    return requirements.some((requirement) => requirement.scenarios.length > 0);
  }

  private async load(rawNumber: string): Promise<void> {
    const requestId = ++this.requestId;
    const number = positiveInteger(rawNumber);
    this.status.set('loading');
    this.meaning.set(null);

    if (number === null) {
      this.status.set('missing');

      return;
    }

    try {
      const body = await firstValueFrom(this.http.get<MeaningBody>(`/pulls/${String(number)}/meaning`));

      if (requestId !== this.requestId) {
        return;
      }

      this.meaning.set(body);
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
