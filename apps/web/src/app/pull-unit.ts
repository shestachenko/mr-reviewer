import {Component, computed, input} from '@angular/core';

import {positiveInteger} from './positive-integer';

@Component({
  selector: 'app-pull-unit',
  template: `
    <section class="panel unit">
      @if (place() === null) {
        <p>В адресе нет юнита.</p>
      } @else {
        <h2>Юнит {{ place() }}</h2>
        <p>Нарезки ещё нет.</p>
      }
    </section>
  `,
})
export class PullUnit {
  protected readonly unit = input.required<string>();
  protected readonly place = computed(() => positiveInteger(this.unit()));
}
