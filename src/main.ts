import { bootstrapApplication } from '@angular/platform-browser';
import { Component, provideZonelessChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter, RouterOutlet, Routes } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LucideAngularModule, Flame, Utensils, Award, Plus, Trash2, ChevronRight, Activity, Camera, User, Settings, LogOut, Dumbbell, Shield, Linkedin, Star } from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {}

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./app/pages/home/home.component').then(m => m.HomeComponent),
  }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimations(),
    importProvidersFrom(LucideAngularModule.pick({ Flame, Utensils, Award, Plus, Trash2, ChevronRight, Activity, Camera, User, Settings, LogOut, Dumbbell, Shield, Linkedin, Star })),
  ],
}).catch((err) => console.error(err));
