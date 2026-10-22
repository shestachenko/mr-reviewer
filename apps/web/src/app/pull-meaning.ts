import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Component, effect, inject, input, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';

import {positiveInteger} from './positive-integer';

interface ProposalSections {
  why: string | null;
  whatChanges: string | null;
  capabilities: string | null;
  impact: string | null;
}

interface BlockedMeaning {
  status: 'blocked';
  reason: 'missing' | 'several';
  changes: string[];
}

interface OpenMeaning {
  status: 'open';
  change: string;
  proposal: string;
  skipSpecs: boolean;
  sections: ProposalSections;
}

type MeaningBody = BlockedMeaning | OpenMeaning;

interface MeaningQuote {
  label: string;
  text: string | null;
}

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
            <p class="sha">{{ meaning.proposal }}</p>
            @if (meaning.skipSpecs) {
              <p>This change has no behavior contract. That is intentional.</p>
            }
            @for (quote of quotes(meaning); track quote.label) {
              <h2>{{ quote.label }}</h2>
              @if (quote.text) {
                <pre class="quote">{{ quote.text }}</pre>
              } @else {
                <p>This section is missing.</p>
              }
            }
          </details>
          <p class="next"><a [routerLink]="['/pulls', number(), 'units', 1]">Units</a></p>
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
    if (!(event.target instanceof HTMLDetailsElement)) {
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

  protected quotes(meaning: OpenMeaning): MeaningQuote[] {
    return [
      {label: 'Why', text: meaning.sections.why},
      {label: 'What Changes', text: meaning.sections.whatChanges},
      {label: 'Capabilities', text: meaning.sections.capabilities},
      {label: 'Impact', text: meaning.sections.impact},
    ];
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
