import {Routes} from '@angular/router';

import {PullList} from './pull-list';
import {PullPage} from './pull-page';

export const routes: Routes = [
  {path: '', component: PullList},
  {path: 'pulls/:number', component: PullPage},
  {path: '**', redirectTo: ''},
];
