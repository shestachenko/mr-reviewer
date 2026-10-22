import {Routes} from '@angular/router';

import {PullList} from './pull-list';
import {PullPage} from './pull-page';
import {PullUnit} from './pull-unit';

export const routes: Routes = [
  {path: '', component: PullList},
  {
    path: 'pulls/:number',
    component: PullPage,
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'units/1'},
      {path: 'units/:unit', component: PullUnit},
    ],
  },
  {path: '**', redirectTo: ''},
];
