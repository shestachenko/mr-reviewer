import {Component, computed, input} from '@angular/core';
import {RouterLink} from '@angular/router';

import {positiveInteger} from './positive-integer';

@Component({
  selector: 'app-pull-unit',
  imports: [RouterLink],
  template: `
    <section class="panel unit">
      <p class="step"><a [routerLink]="['/pulls', number(), 'map']">Project map</a></p>
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
  protected readonly number = input.required<string>();
  protected readonly unit = input.required<string>();
  protected readonly place = computed(() => positiveInteger(this.unit()));
}
