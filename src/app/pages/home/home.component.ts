import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { GeminiService } from '../../services/gemini.service';
import { signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { LucideAngularModule } from 'lucide-angular';
import { Flame, Utensils, Award, Plus, Trash2, ChevronRight, Activity, Camera, User as UserIcon, Settings, LogOut, Dumbbell, Shield } from 'lucide-angular';

interface UserProfile {
  uid: string;
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule
  ],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28">
      <!-- Header -->
      <header class="p-6 flex justify-between items-end bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <div class="bg-lime-400 p-1.5 rounded-lg text-slate-950 flex items-center justify-center">
              <lucide-icon name="flame" size="20"></lucide-icon>
            </div>
            FlexFlow
          </h1>
          <p class="text-slate-500 text-[10px] font-mono uppercase tracking-widest mt-1">Status: Optimized</p>
        </div>
        
        <div *ngIf="!user">
          <button (click)="login()" class="px-5 py-2 bg-white text-slate-950 rounded-xl text-sm font-bold hover:bg-lime-400 transition-all active:scale-95">
            LOG IN
          </button>
        </div>
        
        <div *ngIf="user" class="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 pl-4 rounded-2xl">
          <div class="text-right">
             <p class="text-[9px] uppercase tracking-widest text-slate-500 font-bold">User session</p>
             <p class="text-xs font-mono text-lime-400">{{ user.displayName?.split(' ')[0] }}</p>
          </div>
          <img [src]="user.photoURL" class="w-8 h-8 rounded-lg border border-slate-800" referrerpolicy="no-referrer" />
          <button (click)="logout()" class="p-2 text-slate-500 hover:text-white transition-colors">
            <lucide-icon name="log-out" size="14"></lucide-icon>
          </button>
        </div>
      </header>

      <main class="max-w-4xl mx-auto p-6">
        <!-- Dashboard View -->
        <div *ngIf="user && activeTab === 'dash'" class="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <!-- BMI & Stats Row -->
          <div class="md:col-span-4 grid grid-cols-2 md:col-span-4 md:grid-cols-5 gap-4 mb-2">
             <div class="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">BMI Score</p>
                <p class="text-2xl font-black text-white tracking-tighter">{{ bmi().toFixed(1) }}</p>
                <p class="text-[9px] font-mono text-lime-400 underline decoration-lime-400/30 uppercase mt-1">{{ bmiStatus() }}</p>
             </div>
             <div class="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Activity</p>
                <p class="text-lg font-black text-white tracking-tighter leading-none mt-1 break-words uppercase">{{ profile().activityLevel.replace('_', ' ') }}</p>
             </div>
             <div class="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Weight</p>
                <p class="text-2xl font-black text-white tracking-tighter">{{ profile().weight }}<span class="text-xs ml-1 text-slate-500">kg</span></p>
             </div>
             <div class="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Height</p>
                <p class="text-2xl font-black text-white tracking-tighter">{{ profile().height }}<span class="text-xs ml-1 text-slate-500">cm</span></p>
             </div>
             <div class="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Net Flow</p>
                <p class="text-2xl font-black text-blue-400 tracking-tighter">{{ todayCalories - todayCaloriesBurned }}<span class="text-[10px] ml-1 text-slate-500 uppercase">net</span></p>
             </div>
          </div>

          <!-- Calorie KPI (Large Circle) -->
          <div class="md:col-span-2 md:row-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden group">
            <div class="absolute inset-0 bg-lime-400/[0.02] scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full"></div>
            
            <div class="relative z-10 w-full flex flex-col items-center">
              <div class="flex justify-between items-center w-full mb-8">
                <h3 class="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Energy Matrix</h3>
                <div class="flex flex-col items-end">
                   <span class="text-[10px] font-mono text-lime-400 leading-none">GOAL_SYNC</span>
                   <span class="text-[8px] font-mono text-slate-700 uppercase">{{ todayStr }}</span>
                </div>
              </div>

              <!-- Main Progress Circle -->
              <div class="relative w-64 h-64 flex items-center justify-center">
                <svg class="w-full h-full -rotate-90 transform">
                  <!-- Background Track -->
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="currentColor"
                    stroke-width="12"
                    fill="transparent"
                    class="text-slate-800/50"
                  />
                  <!-- Progress Glow -->
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="currentColor"
                    stroke-width="12"
                    fill="transparent"
                    [attr.stroke-dasharray]="circumference"
                    [attr.stroke-dashoffset]="strokeOffset()"
                    stroke-linecap="round"
                    class="text-lime-400/20 blur-sm transition-all duration-1000 ease-out"
                  />
                  <!-- Main Progress -->
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="currentColor"
                    stroke-width="12"
                    fill="transparent"
                    [attr.stroke-dasharray]="circumference"
                    [attr.stroke-dashoffset]="strokeOffset()"
                    stroke-linecap="round"
                    class="text-lime-400 transition-all duration-1000 ease-out"
                  />
                </svg>

                <!-- Center Content -->
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p class="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">Consumed</p>
                  <p class="text-6xl font-black tracking-tighter text-white leading-none">{{ todayCalories | number }}</p>
                  <div class="mt-2 h-[1px] w-12 bg-slate-800"></div>
                  <p class="text-[10px] font-mono text-slate-400 mt-2 uppercase tracking-tighter">
                    {{ remainingCalories() }} remaining
                  </p>
                </div>
              </div>

              <!-- Bottom Stats -->
              <div class="grid grid-cols-2 w-full mt-10 gap-4">
                 <div class="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                    <p class="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Target</p>
                    <p class="text-lg font-black text-white tracking-tighter">{{ profile().dailyCalorieGoal | number }}</p>
                 </div>
                 <div class="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                    <p class="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Completion</p>
                    <p class="text-lg font-black text-lime-400 tracking-tighter">{{ caloriePercentage() }}%</p>
                 </div>
              </div>
            </div>
          </div>

          <!-- Protein KPI -->
          <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span class="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Protein</span>
            </div>
            <div>
              <p class="text-4xl font-bold text-white tracking-tighter">{{ todayProtein }}g</p>
              <p class="text-[10px] text-slate-500 mt-1 font-mono uppercase">TARGET: {{ profile().dailyProteinGoal }}g</p>
            </div>
            <div class="h-1 w-full bg-slate-800 rounded-full mt-4">
              <div class="h-full bg-blue-400" [style.width.%]="(todayProtein / profile().dailyProteinGoal) * 100"></div>
            </div>
          </div>

          <!-- Activity Circle -->
          <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center relative group overflow-hidden">
            <lucide-icon name="award" class="text-slate-800 absolute -bottom-4 -right-4 translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500" size="80"></lucide-icon>
            <div class="relative z-10 text-center">
              <p class="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Status</p>
              <p class="text-2xl font-bold text-cyan-400 tracking-tighter uppercase">{{ bmiStatus() }}</p>
              <p class="text-[10px] font-mono text-slate-500 mt-1 uppercase">v{{ todayStr }}</p>
            </div>
          </div>

          <!-- Recent Activity (Wide) -->
          <div class="md:col-span-2 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex flex-col gap-4">
            <div class="flex justify-between items-center px-2">
              <h3 class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Entry History</h3>
              <div class="flex gap-1.5 h-6 items-end">
                <div class="w-4 bg-lime-400/80 rounded-t-sm h-[60%]"></div>
                <div class="w-4 bg-lime-400 rounded-t-sm h-[90%]"></div>
                <div class="w-4 bg-slate-800 rounded-t-sm h-[30%]"></div>
                <div class="w-4 bg-lime-400/60 rounded-t-sm h-[70%]"></div>
              </div>
            </div>
            <div *ngIf="recentMeals.length > 0; else noRecent" class="space-y-3">
               <div *ngFor="let meal of recentMeals | slice:0:3" class="flex justify-between items-center text-xs p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                 <span class="font-medium text-slate-300 truncate max-w-[120px] uppercase font-mono">{{ meal.name }}</span>
                 <span class="font-mono text-lime-400">{{ meal.calories }}k</span>
               </div>
            </div>
            <ng-template #noRecent>
              <p class="text-slate-600 text-xs italic">Awaiting telemetry data...</p>
            </ng-template>
          </div>
        </div>

        <!-- Insights View -->
        <section *ngIf="user && activeTab === 'insights'" class="space-y-6">
           <div class="bg-slate-900 border border-slate-800 p-8 rounded-[3rem]">
              <div class="flex justify-between items-start mb-10">
                 <div>
                   <h2 class="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">Bio<br/>Trends</h2>
                   <p class="text-slate-500 text-[10px] font-mono tracking-widest uppercase mt-2">Historical Efficiency Analysis</p>
                 </div>
                 <div class="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-right">
                    <p class="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Weekly</p>
                    <p class="text-xl font-black text-blue-400 tracking-tighter">{{ avgWeeklyCalories() | number }}<span class="text-[10px] ml-1">kcal</span></p>
                 </div>
              </div>

              <!-- Bar Chart -->
              <div class="h-64 flex items-end gap-3 px-2">
                 <div *ngFor="let day of weeklyData()" class="flex-1 flex flex-col items-center gap-4 group">
                    <div class="relative w-full flex flex-col justify-end items-center h-48">
                       <!-- Value Pulse -->
                       <div class="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono text-lime-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {{ day.kcal }}
                       </div>
                       <!-- Bar -->
                       <div 
                        [style.height.%]="(day.kcal / (profile().dailyCalorieGoal || 2500)) * 100"
                        [class.bg-lime-400]="day.kcal >= profile().dailyCalorieGoal"
                        [class.bg-slate-800]="day.kcal < profile().dailyCalorieGoal"
                        class="w-full rounded-t-xl transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-110 origin-bottom"
                       ></div>
                       <div 
                        *ngIf="day.kcal > profile().dailyCalorieGoal"
                        [style.height.%]="((day.kcal - profile().dailyCalorieGoal) / profile().dailyCalorieGoal) * 100"
                        class="absolute bottom-full w-full bg-red-500/40 rounded-t-sm"
                       ></div>
                    </div>
                    <p class="text-[9px] font-black tracking-widest text-slate-500 uppercase">{{ day.day }}</p>
                 </div>
              </div>

              <!-- Monthly Placeholder -->
              <div class="mt-12 p-6 bg-slate-950/50 border border-slate-800/50 rounded-2xl flex justify-between items-center">
                 <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Consistency</p>
                    <p class="text-xs text-slate-600 mt-1 uppercase italic">Monthly summary requires more data logs</p>
                 </div>
                 <lucide-icon name="shield" class="text-slate-800" size="24"></lucide-icon>
              </div>
           </div>

           <!-- Macro Breakdown Placeholder -->
           <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem]">
                 <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Top Nutrients</p>
                 <div class="space-y-4">
                    <div class="flex justify-between items-center">
                       <span class="text-xs font-mono text-white">PROTEIN_SYNTHESIS</span>
                       <span class="text-xs font-mono text-lime-400">OPTIMAL</span>
                    </div>
                    <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div class="h-full bg-lime-400 w-4/5"></div>
                    </div>
                 </div>
              </div>
              <div class="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center">
                 <p class="text-[9px] font-black text-slate-800 uppercase tracking-[0.3em]">Historical Archive</p>
                 <p class="text-[8px] text-slate-700 uppercase mt-2">Data retained for 365 days in Google Cloud Platform</p>
              </div>
           </div>
        </section>

        <!-- Scanner View (Eat) -->
        <section *ngIf="user && activeTab === 'eat'" class="space-y-6">
          <div class="bg-white text-slate-950 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden min-h-[460px] flex flex-col justify-end">
            <div class="relative z-10 space-y-6">
              <div class="flex items-center gap-2 text-slate-400 font-mono">
                <lucide-icon name="utensils" size="14"></lucide-icon>
                <span class="text-[10px] uppercase tracking-[0.2em] font-bold">Neural Scan Alpha</span>
              </div>
              <h2 class="text-6xl font-black tracking-tighter leading-[0.8] uppercase italic">Visual<br/>Input</h2>
              
              <div *ngIf="selectedImage" class="relative group w-40 h-40 bg-slate-100 rounded-3xl overflow-hidden shadow-lg mb-4 border-4 border-slate-200">
                 <img [src]="selectedImage" class="absolute inset-0 w-full h-full object-cover" />
                 <button (click)="selectedImage = null" class="absolute top-2 right-2 bg-slate-950/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <lucide-icon name="plus" class="rotate-45" size="16"></lucide-icon>
                 </button>
              </div>

              <div class="relative flex flex-col sm:flex-row gap-3">
                <div class="flex-1 relative">
                  <input 
                    [(ngModel)]="mealInput" 
                    placeholder="DESCRIBE MEAL OR UPLOAD PHOTO..."
                    class="w-full bg-slate-100 border-none rounded-2xl pl-6 pr-16 py-5 text-lg font-bold placeholder:text-slate-300 focus:ring-0 transition-all uppercase"
                    (keyup.enter)="analyzeMeal()"
                    [disabled]="isAnalyzing"
                  />
                  <div class="absolute right-3 top-3 flex gap-2">
                     <label class="bg-slate-200 text-slate-600 p-4 rounded-xl hover:bg-slate-300 transition-all flex items-center justify-center cursor-pointer">
                        <lucide-icon name="camera" size="20"></lucide-icon>
                        <input type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)" />
                     </label>
                  </div>
                </div>
                <button 
                  (click)="analyzeMeal()" 
                  [disabled]="isAnalyzing || (!mealInput && !selectedImage)"
                  class="bg-slate-950 text-white px-8 py-5 rounded-2xl hover:bg-lime-400 hover:text-slate-950 disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer font-black tracking-widest uppercase italic gap-3"
                >
                  <lucide-icon [name]="isAnalyzing ? 'activity' : 'chevron-right'" [class.animate-spin]="isAnalyzing"></lucide-icon>
                  <span>{{ isAnalyzing ? 'Processing' : 'Analyze' }}</span>
                </button>
              </div>
              <p *ngIf="isAnalyzing" class="text-xs font-mono text-slate-400 animate-pulse tracking-widest uppercase">Initializing multimodel analysis via Gemini_3.0...</p>
            </div>
            <div class="absolute -right-12 -top-12 text-slate-100 rotate-12 opacity-50 pointer-events-none">
               <lucide-icon name="flame" size="340"></lucide-icon>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-2 gap-4">
             <div class="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Suggestions</p>
                <div class="flex flex-wrap gap-2">
                   <button (click)="mealInput = 'Chicken Salad'" class="px-3 py-2 bg-slate-950 rounded-xl text-[10px] font-mono text-slate-300 border border-slate-800 uppercase">Chicken Salad</button>
                   <button (click)="mealInput = 'Oatmeal with Blueberries'" class="px-3 py-2 bg-slate-950 rounded-xl text-[10px] font-mono text-slate-300 border border-slate-800 uppercase">Oatmeal</button>
                   <button (click)="mealInput = 'Protein Shake'" class="px-3 py-2 bg-slate-950 rounded-xl text-[10px] font-mono text-slate-300 border border-slate-800 uppercase">Protein Shake</button>
                </div>
             </div>
             <div class="bg-slate-950/30 border border-slate-900 p-6 rounded-3xl flex flex-col justify-center items-center text-center">
                <lucide-icon name="plus" class="text-slate-800 mb-2" size="32"></lucide-icon>
                <p class="text-[9px] font-bold text-slate-700 uppercase tracking-widest leading-tight">Manual entry<br/>API disabled</p>
             </div>
          </div>
        </section>

        <!-- Profile View -->
        <section *ngIf="user && activeTab === 'goals'" class="space-y-6">
           <div class="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] space-y-8">
              <div>
                <h2 class="text-4xl font-black tracking-tighter text-white uppercase italic text-balance">Biometrics_V1</h2>
                <p class="text-slate-500 text-[10px] font-mono tracking-widest uppercase mt-1">Calibrate your physical profile</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block">Weight (kg)</label>
                  <input type="number" [(ngModel)]="profileEdit.weight" class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xl focus:border-lime-400 focus:outline-none transition-colors" />
                </div>
                
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block">Height (cm)</label>
                  <input type="number" [(ngModel)]="profileEdit.height" class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xl focus:border-lime-400 focus:outline-none transition-colors" />
                </div>

                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block">Age (yr)</label>
                  <input type="number" [(ngModel)]="profileEdit.age" class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xl focus:border-lime-400 focus:outline-none transition-colors" />
                </div>

                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block">Gender</label>
                  <select [(ngModel)]="profileEdit.gender" class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xl focus:border-lime-400 focus:outline-none transition-colors uppercase">
                    <option value="male">MALE</option>
                    <option value="female">FEMALE</option>
                    <option value="other">OTHER</option>
                  </select>
                </div>

                <div class="md:col-span-2 space-y-3">
                   <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block">Activity Level</label>
                   <select [(ngModel)]="profileEdit.activityLevel" class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xl focus:border-lime-400 focus:outline-none transition-colors uppercase">
                    <option value="sedentary">SEDENTARY (Office Job)</option>
                    <option value="light">LIGHT (1-3 days exercise)</option>
                    <option value="moderate">MODERATE (3-5 days exercise)</option>
                    <option value="active">ACTIVE (6-7 days exercise)</option>
                    <option value="very_active">VERY ACTIVE (Hard daily training)</option>
                  </select>
                </div>
              </div>

              <div class="p-6 bg-slate-950/50 rounded-3xl border border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div class="text-center md:text-left">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auto-Calculated Target</p>
                    <p class="text-4xl font-black text-lime-400 tracking-tighter">{{ calculatedCalories() }} <span class="text-xs uppercase text-slate-600 ml-1">kcal / day</span></p>
                 </div>
                 <button (click)="saveProfile()" class="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-lime-400 transition-all active:scale-95 shadow-xl shadow-lime-400/5 italic">
                    Sync Protocol
                 </button>
              </div>
           </div>
        </section>

        <!-- Workout View -->
        <section *ngIf="user && activeTab === 'work'" class="space-y-6">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 text-balance">
             <div class="flex items-center gap-2 text-balance">
              <div class="w-3 h-3 bg-blue-500 rounded-full border-4 border-slate-900"></div>
              <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Session Logger</span>
            </div>
            <div class="space-y-4">
              <h2 class="text-4xl font-black tracking-tighter text-white italic uppercase leading-none">Training<br/>Load</h2>
              
              <!-- Exercise Library -->
              <div class="space-y-4 mt-6 text-left">
                <div *ngFor="let cat of exerciseCategories" class="space-y-2">
                  <p class="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{{ cat.name }}</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button 
                      *ngFor="let item of cat.items" 
                      (click)="workoutName = item"
                      [class.bg-blue-500]="workoutName === item"
                      [class.bg-slate-950]="workoutName !== item"
                      [class.text-white]="workoutName === item"
                      [class.text-slate-400]="workoutName !== item"
                      [class.border-blue-500]="workoutName === item"
                      [class.border-slate-800]="workoutName !== item"
                      class="px-3 py-1.5 border rounded-lg text-[10px] font-mono hover:border-slate-600 transition-all uppercase"
                    >
                      {{ item }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="pt-4 space-y-6">
                <div class="grid grid-cols-3 gap-2">
                  <div class="space-y-2">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Sets</label>
                    <input type="number" [(ngModel)]="workoutSets" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:border-blue-500 outline-none text-center" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Reps</label>
                    <input type="number" [(ngModel)]="workoutReps" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:border-blue-500 outline-none text-center" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">KG</label>
                    <input type="number" [(ngModel)]="workoutWeight" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:border-blue-500 outline-none text-center" />
                  </div>
                </div>

                <div class="relative">
                  <input 
                    [(ngModel)]="workoutName" 
                    placeholder="OR ENTER CUSTOM WORKOUT..." 
                    class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-6 text-sm font-mono text-lime-400 placeholder:text-slate-700 focus:outline-none focus:border-lime-400 transition-colors uppercase"
                  />
                  <button 
                    *ngIf="workoutName" 
                    (click)="resetWorkoutForm()"
                    class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-500"
                  >
                    <lucide-icon name="plus" class="rotate-45" size="16"></lucide-icon>
                  </button>
                </div>

                <div class="bg-slate-950/50 p-4 rounded-2xl border border-dashed border-slate-800 flex justify-between items-center" *ngIf="workoutName">
                   <div class="text-left">
                      <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Est. Burned</p>
                      <p class="text-xl font-black text-blue-400 tracking-tighter">{{ estimateBurned() }} <span class="text-[10px]">KCAL</span></p>
                   </div>
                   <lucide-icon name="flame" class="text-blue-400/20" size="24"></lucide-icon>
                </div>

                <button (click)="createWorkout()" [disabled]="!workoutName" class="w-full bg-lime-400 text-slate-950 font-black py-4 rounded-2xl hover:bg-white active:scale-95 transition-all text-sm tracking-widest uppercase italic">
                  COMMIT TO DATABASE
                </button>
              </div>
            </div>
          </div>
          
          <div class="bg-slate-900/40 border border-slate-800/40 p-6 rounded-[2rem] space-y-4">
             <div class="flex justify-between items-center px-2">
                <p class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Historical Data</p>
                <lucide-icon name="activity" class="text-slate-800" size="16"></lucide-icon>
             </div>
             <div class="space-y-2">
                <div *ngFor="let w of recentWorkouts" class="bg-slate-950 border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center">
                   <div>
                      <p class="text-xs font-bold text-white uppercase">{{ w.name }}</p>
                      <p class="text-[9px] font-mono text-slate-500 uppercase">
                         {{ w.sets }} SETS × {{ w.reps }} REPS @ {{ w.weightLifted || 0 }} KG
                      </p>
                   </div>
                   <div class="text-right">
                      <p class="text-[10px] font-black text-blue-500">{{ w.caloriesBurned }} KCAL</p>
                      <p class="text-[8px] font-mono text-slate-700 uppercase">{{ w.date }}</p>
                   </div>
                </div>
                <div *ngIf="recentWorkouts.length === 0" class="py-8 text-center text-slate-700">
                   <p class="text-[10px] font-mono uppercase tracking-widest">No protocol entries detected</p>
                </div>
             </div>
          </div>
        </section>

        <!-- Login Prompt -->
        <div *ngIf="!user" class="text-center py-28 relative">
           <div class="absolute inset-0 bg-lime-400/5 blur-[120px] rounded-full"></div>
           <h2 class="text-7xl font-black tracking-tighter leading-[0.8] mb-8 relative z-10 uppercase transition-all italic text-balance">Fuel<br/>The<br/>Fire</h2>
           <p class="text-slate-500 max-w-xs mx-auto text-sm font-bold mb-10 relative z-10 uppercase tracking-widest leading-relaxed">BIO-OPTIMIZATION PROTOCOL V2.0.4</p>
           <button (click)="login()" class="relative z-10 px-10 py-5 bg-white text-slate-950 rounded-2xl font-black tracking-widest hover:bg-lime-400 active:scale-95 transition-all shadow-2xl shadow-white/10 uppercase italic">
             Begin Initialization
           </button>
        </div>
      </main>

      <!-- Glass Nav -->
      <nav *ngIf="user" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/40 backdrop-blur-2xl border border-white/5 px-2 py-2 flex gap-1 rounded-3xl z-50 shadow-2xl">
        <button *ngFor="let tab of navTabs" (click)="activeTab = tab.id" 
                [class.bg-white]="activeTab === tab.id" 
                [class.text-slate-950]="activeTab === tab.id" 
                [class.text-slate-500]="activeTab !== tab.id" 
                class="flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-300">
           <lucide-icon [name]="tab.icon" size="18"></lucide-icon>
           <span *ngIf="activeTab === tab.id" class="text-[10px] font-black uppercase tracking-widest leading-none">{{ tab.label }}</span>
        </button>
      </nav>
      
      <footer *ngIf="user" class="fixed bottom-0 left-0 right-0 p-4 flex justify-between text-[8px] font-mono text-slate-800 pointer-events-none tracking-[0.3em] uppercase">
        <span>FlexFlow Protocol v2.5.0</span>
        <span>BMI_ENG_INIT: SUCCESS</span>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `]
})
export class HomeComponent implements OnInit {
  user: User | null = null;
  activeTab: string = 'dash';
  mealInput: string = '';
  selectedImage: string | null = null;
  selectedImageMime: string = 'image/jpeg';
  workoutName: string = '';
  workoutSets: number = 3;
  workoutReps: number = 10;
  workoutWeight: number = 0;
  selectedExercise: string | null = null;
  exerciseCategories = [
    { name: 'Strength', icon: 'dumbbell', items: ['Bench Press', 'Squats', 'Deadlift', 'Overhead Press', 'Pull-ups', 'Push-ups', 'Bicep Curls', 'Lunges'] },
    { name: 'Cardio', icon: 'activity', items: ['Running', 'Cycling', 'Swimming', 'Jump Rope', 'Hike', 'Rowing'] },
    { name: 'Core', icon: 'shield', items: ['Plank', 'Leg Raises', 'Russian Twists', 'Sit-ups', 'Burpees'] }
  ];
  isAnalyzing: boolean = false;
  recentMeals: any[] = [];
  recentWorkouts: any[] = [];
  todayCalories: number = 0;
  todayProtein: number = 0;
  todayCaloriesBurned: number = 0;
  todayStr = new Date().toISOString().split('T')[0];

  profile = signal<UserProfile>({
    uid: '',
    weight: 75,
    height: 175,
    age: 25,
    gender: 'male',
    activityLevel: 'moderate',
    dailyCalorieGoal: 2500,
    dailyProteinGoal: 150
  });

  profileEdit: UserProfile = { ...this.profile() };

  bmi = computed(() => {
    const p = this.profile();
    if (p.height <= 0) return 0;
    return p.weight / Math.pow(p.height / 100, 2);
  });

  bmiStatus = computed(() => {
    const b = this.bmi();
    if (b < 18.5) return 'UNDERWEIGHT';
    if (b < 25) return 'NORMAL';
    if (b < 30) return 'OVERWEIGHT';
    return 'OBESE';
  });

  calculatedCalories = computed(() => {
    const p = this.profileEdit;
    let bmr = 0;
    if (p.gender === 'male') {
      bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + 5;
    } else {
      bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
    }
    
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    return Math.round(bmr * (multipliers[p.activityLevel] || 1.55));
  });

  estimateBurned = computed(() => {
    if (!this.workoutName) return 0;
    // Simple logic: strength ~ 8 kcal per set, cardio ~ 15 kcal per set/round, core ~ 5 kcal
    let base = 8;
    const cat = this.exerciseCategories.find(c => c.items.includes(this.workoutName));
    if (cat?.name === 'Cardio') base = 25;
    if (cat?.name === 'Core') base = 10;
    
    return this.workoutSets * base;
  });

  caloriePercentage = computed(() => {
    const goal = this.profile().dailyCalorieGoal;
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.todayCalories / goal) * 100));
  });

  remainingCalories = computed(() => {
    const rem = this.profile().dailyCalorieGoal - this.todayCalories;
    return Math.max(0, rem);
  });

  circumference = 2 * Math.PI * 110;
  strokeOffset = computed(() => {
    const percent = this.caloriePercentage();
    return this.circumference - (percent / 100) * this.circumference;
  });

  navTabs = [
    { id: 'dash', icon: 'flame', label: 'Dash' },
    { id: 'insights', icon: 'activity', label: 'Stats' },
    { id: 'work', icon: 'dumbbell', label: 'Work' },
    { id: 'eat', icon: 'utensils', label: 'Scanner' },
    { id: 'goals', icon: 'user', label: 'Profile' }
  ];

  weeklyData = signal<{date: string, kcal: number, day: string}[]>([]);
  avgWeeklyCalories = computed(() => {
    const data = this.weeklyData();
    if (data.length === 0) return 0;
    return Math.round(data.reduce((acc, curr) => acc + curr.kcal, 0) / data.length);
  });

  constructor(
    private firebase: FirebaseService,
    private gemini: GeminiService
  ) {}

  ngOnInit() {
    this.firebase.auth.onAuthStateChanged(u => {
      this.user = u;
      if (u) {
        this.loadProfile();
        this.loadData();
      }
    });
  }

  async login() {
    try {
      await signInWithPopup(this.firebase.auth, new GoogleAuthProvider());
    } catch (e) { console.error(e); }
  }

  logout() { this.firebase.auth.signOut(); }

  async loadProfile() {
    if (!this.user) return;
    const p = await this.firebase.getProfile(this.user.uid);
    if (p) {
      this.profile.set(p as UserProfile);
      this.profileEdit = { ...this.profile() };
    }
  }

  async saveProfile() {
    if (!this.user) return;
    const calories = this.calculatedCalories();
    const protein = Math.round(this.profileEdit.weight * 2); // 2g per kg rule of thumb
    this.profileEdit.dailyCalorieGoal = calories;
    this.profileEdit.dailyProteinGoal = protein;
    
    await this.firebase.saveProfile(this.user.uid, this.profileEdit);
    this.profile.set({ ...this.profileEdit });
    this.activeTab = 'dash';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageMime = file.type;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async analyzeMeal() {
    if ((!this.mealInput && !this.selectedImage) || !this.user) return;
    this.isAnalyzing = true;
    try {
      let res;
      if (this.selectedImage) {
        const base64Data = this.selectedImage.split(',')[1];
        res = await this.gemini.analyzeMealImage(base64Data, this.selectedImageMime);
      } else {
        res = await this.gemini.analyzeMeal(this.mealInput);
      }

      if (res && res.calories) {
        await addDoc(collection(this.firebase.db, 'meals'), {
          userId: this.user.uid,
          name: res.name,
          calories: res.calories,
          protein: res.protein,
          carbs: res.carbs,
          fats: res.fats,
          createdAt: Timestamp.now(),
          date: new Date().toISOString().split('T')[0]
        });
        this.mealInput = '';
        this.selectedImage = null;
        this.loadData();
        this.activeTab = 'dash';
      }
    } catch (e) { console.error(e); }
    finally { this.isAnalyzing = false; }
  }

  async createWorkout() {
    if (!this.workoutName || !this.user) return;
    try {
      const burned = this.estimateBurned();
      await addDoc(collection(this.firebase.db, 'workouts'), {
        userId: this.user.uid,
        name: this.workoutName,
        sets: this.workoutSets,
        reps: this.workoutReps,
        weightLifted: this.workoutWeight,
        caloriesBurned: burned,
        date: new Date().toISOString().split('T')[0],
        createdAt: Timestamp.now()
      });
      this.resetWorkoutForm();
      this.loadData();
    } catch (e) { console.error(e); }
  }

  resetWorkoutForm() {
    this.workoutName = '';
    this.workoutSets = 3;
    this.workoutReps = 10;
    this.workoutWeight = 0;
  }

  async loadData() {
    if (!this.user) return;
    const mealsRef = collection(this.firebase.db, 'meals');
    
    this.todayCalories = 0;
    this.todayProtein = 0;
    this.todayCaloriesBurned = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Load last 30 days for history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const historyQ = query(
      mealsRef, 
      where('userId', '==', this.user.uid), 
      where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
    );
    
    const historySnapshot = await getDocs(historyQ);
    const mealLogs: any[] = [];
    historySnapshot.forEach(doc => {
      const data = doc.data();
      mealLogs.push(data);
      if (data['date'] === todayStr) {
        this.todayCalories += data['calories'] || 0;
        this.todayProtein += data['protein'] || 0;
      }
    });

    this.recentMeals = mealLogs.filter(m => m.date === todayStr).slice(0, 5);

    // Process Weekly Data (last 7 days)
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const dayKcal = mealLogs
        .filter(m => m.date === dStr)
        .reduce((sum, m) => sum + (m.calories || 0), 0);
      weekDays.push({ date: dStr, kcal: dayKcal, day: dayName });
    }
    this.weeklyData.set(weekDays);

    const wq = query(collection(this.firebase.db, 'workouts'), where('userId', '==', this.user.uid), orderBy('createdAt', 'desc'), limit(5));
    const wSnapshot = await getDocs(wq);
    this.recentWorkouts = wSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const todayWQ = query(collection(this.firebase.db, 'workouts'), where('userId', '==', this.user.uid), where('date', '==', todayStr));
    const todayWSnapshot = await getDocs(todayWQ);
    todayWSnapshot.forEach(d => {
      this.todayCaloriesBurned += d.data()['caloriesBurned'] || 0;
    });
  }
}
