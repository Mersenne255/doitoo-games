import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  { path: 'numbers', loadComponent: () => import('./games/numbers/numbers-game.component').then(m => m.NumbersGameComponent) },
  { path: 'nback', loadComponent: () => import('./games/nback/nback-game.component').then(m => m.NbackGameComponent) },
  { path: 'multitask', loadComponent: () => import('./games/multitask/multitask-game.component').then(m => m.MultitaskGameComponent) },
  { path: 'mindflow', loadComponent: () => import('./games/mindflow/mindflow-game.component').then(m => m.MindflowGameComponent) },
  { path: '**', redirectTo: '' },
];
