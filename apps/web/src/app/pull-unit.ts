import {Component, computed, input} from '@angular/core';

import {positiveInteger} from './positive-integer';

@Component({
  selector: 'app-pull-unit',
  template: `
    <section class="panel unit">
      @if (place() === null) {
        <p>This address is not a unit.</p>
      } @else {
        <h2>Unit {{ place() }}</h2>
        <p>Units are not cut yet.</p>
      }
    </section>
  `,
})
export class PullUnit {
  protected readonly unit = input.required<string>();
  protected readonly place = computed(() => positiveInteger(this.unit()));
}
