import {HttpClient} from '@angular/common/http';
import {Component, inject, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';

@Component({
  selector: 'app-root',
  styles: `
    main {
      max-width: 40rem;
      margin: 4rem auto;
      padding: 0 1.5rem;
      font-family: system-ui, sans-serif;
    }
  `,
  template: `
    <main>
      <h1>MR Reviewer</h1>
      <p>{{ status() }}</p>
    </main>
  `,
})
export class App {
  private readonly http = inject(HttpClient);
  protected readonly status = signal('API ещё не ответил.');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const body = await firstValueFrom(
        this.http.get<{ok: boolean}>('/health'),
      );
      this.status.set(body.ok ? 'API отвечает.' : 'API ответил без ok.');
    } catch {
      this.status.set('API не отвечает.');
    }
  }
}
