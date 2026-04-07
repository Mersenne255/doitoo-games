import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  { path: 'numbers', loadComponent: () => import('./games/numbers/numbers-game.component').then(m => m.NumbersGameComponent) },
  { path: 'nback', loadComponent: () => import('./games/nback/nback-game.component').then(m => m.NbackGameComponent) },
  { path: 'multitask', loadComponent: () => import('./games/multitask/multitask-game.component').then(m => m.MultitaskGameComponent) },
  { path: 'mindflow', loadComponent: () => import('./games/mindflow/mindflow-game.component').then(m => m.MindflowGameComponent) },
  { path: 'chromaclash', loadComponent: () => import('./games/chromaclash/chromaclash-game.component').then(m => m.ChromaclashGameComponent) },
  { path: 'phantomlink', loadComponent: () => import('./games/phantomlink/phantomlink-game.component').then(m => m.PhantomlinkGameComponent) },
  { path: 'matrixiq', loadComponent: () => import('./games/matrixiq/matrixiq-game.component').then(m => m.MatrixiqGameComponent) },
  { path: 'synapsort', loadComponent: () => import('./games/synapsort/synapsort-game.component').then(m => m.SynapsortGameComponent) },
  { path: 'focusforge', loadComponent: () => import('./games/focusforge/focusforge-game.component').then(m => m.FocusforgeGameComponent) },
  { path: '**', redirectTo: '' },
];
