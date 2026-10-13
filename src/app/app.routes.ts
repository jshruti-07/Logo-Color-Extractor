import { Routes } from '@angular/router';
import { ColorExtractorComponent } from './color-extractor.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: ColorExtractorComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: '**', redirectTo: '' }
];
