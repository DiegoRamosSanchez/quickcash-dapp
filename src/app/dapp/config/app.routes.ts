import { Routes } from '@angular/router';
import { DashboardComponent } from '../components/pages/dashboard/dashboard.component';
import { HomeComponent } from '../components/auth/home/home.component';
import { AuthGuard } from '../services/guard/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];