// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/dapp/config/app.config';

// Declaración global para TypeScript
declare global {
  interface Window {
    ethereum: any;
  }
}

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));