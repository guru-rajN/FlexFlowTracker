import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { GeminiService } from '../../services/gemini.service';
import { signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { LucideAngularModule } from 'lucide-angular';
import { Flame, Utensils, Award, Plus, Trash2, ChevronRight, Activity, Camera, User as UserIcon, Settings, LogOut, Dumbbell, Shield, Linkedin, Star } from 'lucide-angular';

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
    ReactiveFormsModule, 
    LucideAngularModule
  ],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28">
      <!-- Toast Notifications -->
      <div class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        <div *ngFor="let t of toasts()" 
             class="p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
             [class.bg-emerald-500/10]="t.type === 'success'"
             [class.border-emerald-500/20]="t.type === 'success'"
             [class.text-emerald-400]="t.type === 'success'"
             [class.bg-red-500/10]="t.type === 'error'"
             [class.border-red-500/20]="t.type === 'error'"
             [class.text-red-400]="t.type === 'error'"
             [class.bg-blue-500/10]="t.type === 'info'"
             [class.border-blue-500/20]="t.type === 'info'"
             [class.text-blue-400]="t.type === 'info'">
          <div class="flex items-center gap-3">
             <lucide-icon [name]="t.type === 'success' ? 'award' : (t.type === 'error' ? 'shield' : 'activity')" size="18"></lucide-icon>
             <span class="text-xs font-black uppercase tracking-widest">{{ t.message }}</span>
          </div>
          <button (click)="removeToast(t.id)" class="opacity-50 hover:opacity-100">
             <lucide-icon name="plus" class="rotate-45" size="14"></lucide-icon>
          </button>
        </div>
      </div>
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
          <div class="md:col-span-4 grid grid-cols-2 md:grid-cols-6 gap-4 mb-2">
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
                <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Engagement</p>
                <div class="flex items-end justify-between">
                   <p class="text-2xl font-black text-lime-400 tracking-tighter">{{ protocolEngagement() }}%</p>
                   <lucide-icon name="activity" size="12" class="text-lime-400 animate-pulse mb-1"></lucide-icon>
                </div>
             </div>
             <div class="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Net Flow</p>
                <p class="text-2xl font-black text-blue-400 tracking-tighter">{{ todayCalories() - todayCaloriesBurned() }}<span class="text-[10px] ml-1 text-slate-500 uppercase">net</span></p>
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
                  <p class="text-6xl font-black tracking-tighter text-white leading-none">{{ todayCalories() | number }}</p>
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
              <p class="text-4xl font-bold text-white tracking-tighter">{{ todayProtein() }}g</p>
              <p class="text-[10px] text-slate-500 mt-1 font-mono uppercase">TARGET: {{ profile().dailyProteinGoal }}g</p>
            </div>
            <div class="h-1 w-full bg-slate-800 rounded-full mt-4">
              <div class="h-full bg-blue-400" [style.width.%]="(todayProtein() / profile().dailyProteinGoal) * 100"></div>
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

          <!-- Weight Delta (New) -->
          <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between group">
             <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" [class.bg-red-400]="weightTrend() > 0" [class.bg-emerald-400]="weightTrend() <= 0"></div>
                <span class="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Weight Delta</span>
             </div>
             <div>
                <p class="text-4xl font-bold text-white tracking-tighter">
                   {{ weightTrend() > 0 ? '+' : '' }}{{ weightTrend() }}kg
                </p>
                <p class="text-[9px] text-slate-500 mt-1 font-mono uppercase">
                   {{ weightTrend() > 0 ? 'Surplus' : 'Deficit' }} detected
                </p>
             </div>
             <div class="flex gap-1 mt-4">
                <div *ngFor="let w of weightLogs().slice(-5)" class="flex-1 bg-slate-800 h-8 rounded-md relative flex items-end overflow-hidden group-hover:bg-slate-700 transition-colors">
                   <div [style.height.%]="(w.weight / 150) * 100" class="w-full bg-blue-500/40"></div>
                </div>
             </div>
          </div>

          <!-- Recent Activity (Wide) -->
          <div class="md:col-span-2 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex flex-col gap-4">
            <!-- Protocol Breakdown Header -->
            <div class="flex justify-between items-center px-2">
              <h3 class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Protocol Intake</h3>
              <div class="flex gap-1.5 h-6 items-end">
                <div class="w-1 bg-lime-400 h-full"></div>
                <div class="w-1 bg-blue-400 h-2/3"></div>
                <div class="w-1 bg-red-400 h-1/2"></div>
              </div>
            </div>
            
            <div class="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              @for (cat of ['breakfast', 'lunch', 'dinner', 'snacks']; track cat) {
                <div class="space-y-2">
                  <div class="flex justify-between items-center border-b border-slate-800 pb-1">
                    <span class="text-[9px] font-black uppercase tracking-[0.2em]" [class.text-orange-400]="cat === 'breakfast'" [class.text-lime-400]="cat === 'lunch'" [class.text-blue-400]="cat === 'dinner'" [class.text-fuchsia-400]="cat === 'snacks'">
                      {{ cat }}
                    </span>
                    <span class="text-[9px] font-mono text-slate-500">{{ getCaloriesByCategory(cat) }} KCAL</span>
                  </div>
                  
                  <div class="space-y-1">
                    @for (meal of recentMeals(); track meal.id) {
                      @if (meal.category === cat) {
                        <div class="flex justify-between items-center text-[10px] p-2 bg-slate-950/30 rounded-lg border-l-2" 
                             [class.border-orange-400]="cat === 'breakfast'" 
                             [class.border-lime-400]="cat === 'lunch'" 
                             [class.border-blue-400]="cat === 'dinner'" 
                             [class.border-fuchsia-400]="cat === 'snacks'">
                          <span class="font-medium text-slate-300 truncate max-w-[150px] uppercase font-mono">{{ meal.name }}</span>
                          <span class="font-mono text-slate-500 lowercase">{{ meal.calories }}k</span>
                        </div>
                      }
                    } @empty {
                       <p class="text-[8px] text-slate-800 italic uppercase tracking-widest px-2">No entries logged</p>
                    }
                  </div>
                </div>
              }
            </div>
            <ng-template #noRecent>
              <p class="text-slate-600 text-xs italic">Awaiting telemetry data...</p>
            </ng-template>
          </div>

          <!-- Testimonials section -->
          <div class="md:col-span-4 mt-8">
             <div class="flex justify-between items-center mb-6 px-4">
                <div>
                   <h3 class="text-white text-xl font-black uppercase italic tracking-tighter">System_Reviews</h3>
                   <p class="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">High-Efficiency Protocol Testimonials</p>
                </div>
                <div class="flex gap-2">
                   <button (click)="showTestimonyForm.set(!showTestimonyForm())" class="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded-xl font-bold uppercase tracking-widest hover:text-white hover:border-slate-700 transition-all flex items-center gap-2">
                      <lucide-icon [name]="showTestimonyForm() ? 'plus' : 'award'" [class.rotate-45]="showTestimonyForm()" size="12"></lucide-icon>
                      {{ showTestimonyForm() ? 'Cancel' : 'Submit Review' }}
                   </button>
                   @if (testimonials().length === 0) {
                      <button (click)="seedTestimonials()" class="text-[9px] bg-lime-400 text-black px-4 py-2 rounded-xl font-bold uppercase tracking-widest hover:bg-white transition-all">Initialize Logs</button>
                   }
                </div>
             </div>
             
             <!-- Submission Form -->
             @if (showTestimonyForm()) {
              <div class="mb-8 p-8 bg-slate-900 border border-lime-400/20 rounded-[2.5rem] animate-in zoom-in duration-300">
                  <h4 class="text-white text-sm font-black uppercase italic mb-4">New_Protocol_Feedback</h4>
                  <div class="space-y-4" [formGroup]="testimonyForm">
                    <textarea formControlName="content" placeholder="DESCRIBE YOUR PROTOCOL EXPERIENCE..." class="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-xs text-white font-mono placeholder:text-slate-800 focus:border-lime-400 outline-none transition-all uppercase" rows="3"></textarea>
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                          <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Score:</span>
                          <div class="flex gap-1">
                              @for (s of [1,2,3,4,5]; track s) {
                                <button (click)="testimonyRating.set(s)" class="p-1 hover:scale-110 transition-transform">
                                  <lucide-icon name="star" size="14" [class.text-lime-400]="s <= testimonyRating()" [class.text-slate-800]="s > testimonyRating()"></lucide-icon>
                                </button>
                              }
                          </div>
                        </div>
                        <button (click)="submitTestimony()" [disabled]="testimonyForm.invalid" class="px-8 py-3 bg-lime-400 text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all disabled:opacity-20 active:scale-95">Upload Review</button>
                    </div>
                  </div>
              </div>
             }

             <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                @for (test of displayedTestimonials(); track test.id) {
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] space-y-4 hover:border-lime-400/30 transition-all group animate-in fade-in zoom-in duration-500">
                        <div class="flex justify-between items-start">
                           <div class="flex items-center gap-3">
                              <div class="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg text-lime-400 font-black shadow-inner">
                                 {{ test.userName.charAt(0) }}
                              </div>
                              <div>
                                 <p class="text-xs font-black text-white uppercase tracking-tight">{{ test.userName }}</p>
                                 <p class="text-[8px] font-mono text-slate-600 uppercase">{{ test.role || 'Protocol User' }}</p>
                              </div>
                           </div>
                           <div class="flex gap-0.5">
                              @for (star of [1,2,3,4,5]; track star) {
                                 <lucide-icon name="star" size="10" [class.text-lime-400]="star <= test.rating" [class.text-slate-800]="star > test.rating"></lucide-icon>
                              }
                           </div>
                        </div>
                        
                        <div class="min-h-[60px]">
                           <p class="text-xs text-slate-400 leading-relaxed italic line-clamp-3">"{{ test.content }}"</p>
                        </div>

                        <div class="pt-4 border-t border-slate-800/50 flex justify-between items-center">
                           <span class="text-[8px] font-mono text-slate-700 uppercase tracking-widest">VERIFICATION: {{ test.id.slice(0, 8) }}</span>
                           <lucide-icon name="shield" size="12" class="text-slate-800 group-hover:text-lime-400/50 transition-colors"></lucide-icon>
                        </div>
                    </div>
                } @empty {
                   <div class="md:col-span-3 p-16 bg-slate-950/20 rounded-[3rem] border border-dashed border-slate-800 flex flex-col items-center justify-center text-center gap-6">
                      <div class="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 relative">
                         <lucide-icon name="award" size="40"></lucide-icon>
                         <div class="absolute inset-0 bg-lime-400/5 blur-xl rounded-full"></div>
                      </div>
                      <div>
                         <p class="text-lg font-black text-slate-500 uppercase tracking-tighter italic leading-none">Awaiting Signal Verification</p>
                         <p class="text-[10px] font-mono text-slate-700 uppercase tracking-[0.3em] mt-3">Initialized logs required for protocol validation</p>
                      </div>
                   </div>
                }
             </div>
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

              <!-- Weight Trend Chart (New Section) -->
           <div class="bg-slate-900 border border-slate-800 p-8 rounded-[3rem]">
              <div class="flex justify-between items-center mb-10">
                 <div>
                    <h2 class="text-3xl font-black tracking-tighter text-white uppercase italic">Weight_Path</h2>
                    <p class="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">30 Day Gravity Drift</p>
                 </div>
                 <div class="text-right">
                    <p class="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Net Progress</p>
                    <p class="text-xl font-black" [class.text-red-400]="weightTrend() > 0" [class.text-emerald-400]="weightTrend() <= 0">
                       {{ weightTrend() > 0 ? '+' : '' }}{{ weightTrend() }}kg 
                       <span class="text-[10px]">{{ weightTrend() > 0 ? 'SURPLUS' : 'DEFICIT' }}</span>
                    </p>
                 </div>
              </div>

              <!-- Mini Line-esque Chart -->
              <div class="h-32 flex items-end gap-1 mb-6">
                 <div *ngFor="let log of weightLogs()" class="flex-1 bg-blue-500/5 rounded-full flex flex-col justify-end items-center relative group min-w-[20px]">
                    <div 
                      [style.height.%]="((log.weight - 40) / 110) * 100" 
                      class="w-full bg-blue-500/40 rounded-full transition-all duration-1000 group-hover:bg-blue-400"
                    ></div>
                    <div class="absolute bottom-0 w-full h-1 bg-blue-500 rounded-full opacity-20"></div>
                    
                    <div class="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20">
                       <span class="text-[10px] font-black text-white bg-slate-950 px-2 py-1 border border-slate-800 rounded-lg shadow-xl mb-1 whitespace-nowrap">
                          {{ log.weight }} kg
                       </span>
                       <span class="text-[8px] font-mono text-slate-500 uppercase">{{ log.day }}</span>
                    </div>
                 </div>

                 <div *ngIf="weightLogs().length === 0" class="w-full h-full flex items-center justify-center border border-dashed border-slate-800 rounded-2xl">
                    <p class="text-[10px] font-mono text-slate-700 uppercase">Awaiting weigh-in data sessions</p>
                 </div>
              </div>
              <div class="flex justify-between text-[8px] font-mono text-slate-700 uppercase tracking-widest px-2">
                 <span>T-30D</span>
                 <span>REALTIME_CALIBRATION</span>
                 <span>T-NOW</span>
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
          <div [class.bg-white]="!isManualMode" [class.text-slate-950]="!isManualMode" [class.bg-slate-900]="isManualMode" [class.text-white]="isManualMode" class="p-10 rounded-[3rem] shadow-2xl relative overflow-hidden min-h-[460px] flex flex-col justify-end transition-colors duration-500">
            
            <div *ngIf="!isManualMode" class="relative z-10 space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-slate-400 font-mono">
                  <lucide-icon name="utensils" size="14"></lucide-icon>
                  <span class="text-[10px] uppercase tracking-[0.2em] font-bold">Neural Scan Alpha</span>
                </div>
                <button (click)="isManualMode = true" class="text-[9px] font-black uppercase text-slate-400 border border-slate-200 px-3 py-1 rounded-full hover:bg-slate-50 transition-all">
                  Manual Entry
                </button>
              </div>

              <h2 class="text-6xl font-black tracking-tighter leading-[0.8] uppercase italic">Visual<br/>Input</h2>
              
              <!-- Category Selector -->
              <div class="flex gap-2 mb-2 p-1 bg-slate-100 rounded-xl w-fit">
                <button *ngFor="let cat of ['breakfast', 'lunch', 'dinner', 'snacks']" 
                        (click)="mealCategory = cat"
                        [class.bg-slate-950]="mealCategory === cat"
                        [class.text-white]="mealCategory === cat"
                        [class.bg-transparent]="mealCategory !== cat"
                        [class.text-slate-400]="mealCategory !== cat"
                        class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                  {{ cat }}
                </button>
              </div>
              
              <!-- Last Result Card -->
              <div *ngIf="lastAnalysis" class="bg-lime-400/10 border border-lime-400/20 p-6 rounded-3xl animate-in fade-in zoom-in duration-500">
                 <div class="flex justify-between items-start mb-4">
                    <div>
                       <p class="text-[8px] font-bold text-lime-600 uppercase tracking-widest">Protocol Verified</p>
                       <p class="text-2xl font-black text-slate-900 uppercase italic">{{ lastAnalysis.name }}</p>
                    </div>
                    <button (click)="lastAnalysis = null" class="p-1 hover:bg-lime-400/20 rounded-full transition-colors">
                       <lucide-icon name="plus" class="rotate-45 text-slate-400" size="16"></lucide-icon>
                    </button>
                 </div>
                 <div class="grid grid-cols-4 gap-2">
                    <div class="text-center">
                       <p class="text-[7px] text-slate-500 font-bold uppercase">Kcal</p>
                       <p class="text-sm font-black text-slate-900">{{ lastAnalysis.calories }}</p>
                    </div>
                    <div class="text-center">
                       <p class="text-[7px] text-slate-500 font-bold uppercase">Prot</p>
                       <p class="text-sm font-black text-slate-900">{{ lastAnalysis.protein }}g</p>
                    </div>
                    <div class="text-center">
                       <p class="text-[7px] text-slate-500 font-bold uppercase">Carb</p>
                       <p class="text-sm font-black text-slate-900">{{ lastAnalysis.carbs }}g</p>
                    </div>
                    <div class="text-center">
                       <p class="text-[7px] text-slate-500 font-bold uppercase">Fat</p>
                       <p class="text-sm font-black text-slate-900">{{ lastAnalysis.fats }}g</p>
                    </div>
                 </div>
                 <p class="text-[9px] text-slate-500 mt-4 leading-tight italic">{{ lastAnalysis.explanation }}</p>
              </div>

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

            <!-- Manual Entry Interface -->
            <div *ngIf="isManualMode" class="relative z-10 space-y-6 animate-in slide-in-from-right-4 duration-500">
               <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-slate-500 font-mono text-balance">
                    <lucide-icon name="plus" size="14"></lucide-icon>
                    <span class="text-[10px] uppercase tracking-[0.2em] font-bold">Manual override</span>
                  </div>
                  <button (click)="isManualMode = false" class="text-[9px] font-black uppercase text-slate-500 border border-slate-800 px-3 py-1 rounded-full hover:text-white transition-all">
                    Back to Scan
                  </button>
                </div>
                
                <h2 class="text-5xl font-black tracking-tighter leading-[0.8] uppercase italic text-white">Manual<br/>Log</h2>
                
                <!-- Category Selector (Manual) -->
                <div class="flex gap-2 mb-2 p-1 bg-slate-800 rounded-xl w-fit">
                  <button *ngFor="let cat of ['breakfast', 'lunch', 'dinner', 'snacks']" 
                          (click)="mealCategory = cat"
                          [class.bg-white]="mealCategory === cat"
                          [class.text-slate-950]="mealCategory === cat"
                          [class.bg-transparent]="mealCategory !== cat"
                          [class.text-slate-500]="mealCategory !== cat"
                          class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                    {{ cat }}
                  </button>
                </div>
                
                <div class="space-y-4">
                  <input type="text" [(ngModel)]="manualName" placeholder="Meal Name..." class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-mono placeholder:text-slate-800 focus:border-lime-400 outline-none transition-colors uppercase" />
                  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div class="space-y-1">
                      <label class="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-2">Kcal</label>
                      <input type="number" [(ngModel)]="manualCalories" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-center focus:border-lime-400 outline-none" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-2">Prot (g)</label>
                      <input type="number" [(ngModel)]="manualProtein" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-center focus:border-lime-400 outline-none" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-2">Carb (g)</label>
                      <input type="number" [(ngModel)]="manualCarbs" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-center focus:border-lime-400 outline-none" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-2">Fat (g)</label>
                      <input type="number" [(ngModel)]="manualFats" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-center focus:border-lime-400 outline-none" />
                    </div>
                  </div>
                </div>

                <button 
                  (click)="manualLog()" 
                  [disabled]="!manualName"
                  class="w-full bg-blue-500 text-slate-950 px-8 py-5 rounded-2xl font-black tracking-widest uppercase italic hover:bg-white transition-all disabled:opacity-20 active:scale-95"
                >
                  Log Entry
                </button>
            </div>

            <div class="absolute -right-12 -top-12 text-slate-100 rotate-12 opacity-5 pointer-events-none transition-opacity duration-500" [class.opacity-[0.15]]="!isManualMode">
               <lucide-icon name="flame" size="340"></lucide-icon>
            </div>
          </div>

          <!-- Quick Actions -->
          <div *ngIf="!isManualMode" class="grid grid-cols-2 gap-4">
             <div class="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Suggestions</p>
                <div class="flex flex-wrap gap-2">
                   <button (click)="mealInput = 'Chicken Salad'" class="px-3 py-2 bg-slate-950 rounded-xl text-[10px] font-mono text-slate-300 border border-slate-800 uppercase">Chicken Salad</button>
                   <button (click)="mealInput = 'Oatmeal with Blueberries'" class="px-3 py-2 bg-slate-950 rounded-xl text-[10px] font-mono text-slate-300 border border-slate-800 uppercase">Oatmeal</button>
                   <button (click)="mealInput = 'Protein Shake'" class="px-3 py-2 bg-slate-950 rounded-xl text-[10px] font-mono text-slate-300 border border-slate-800 uppercase">Protein Shake</button>
                </div>
             </div>
             <div (click)="isManualMode = true" class="bg-slate-950/30 border border-slate-900 p-6 rounded-3xl flex flex-col justify-center items-center text-center cursor-pointer hover:bg-slate-900 transition-colors">
                <lucide-icon name="plus" class="text-slate-800 mb-2" size="32"></lucide-icon>
                <p class="text-[9px] font-bold text-slate-700 uppercase tracking-widest leading-tight">Manual entry<br/>Enabled</p>
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

           <!-- Weigh-In Ritual (New) -->
           <div class="bg-blue-500/10 border border-blue-500/20 p-8 rounded-[2.5rem] space-y-6 mt-6">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-blue-500 rounded-full border-4 border-slate-900"></div>
                <h2 class="text-2xl font-black tracking-tighter text-white uppercase italic">Weigh_In Ritual</h2>
              </div>
              <p class="text-slate-500 text-[10px] font-mono tracking-widest uppercase mb-4">Log current mass for protocol calibration</p>
              
              <div class="flex gap-4">
                 <div class="flex-1 relative">
                   <input 
                     type="number" 
                     [(ngModel)]="newWeight" 
                     placeholder="ENTER KG..." 
                     class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-2xl font-black text-blue-400 placeholder:text-slate-800 focus:border-blue-500 focus:outline-none transition-all uppercase"
                   />
                   <span class="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-700">KG_MEASURE</span>
                 </div>
                 <button 
                   (click)="logWeight()" 
                   [disabled]="!newWeight"
                   class="bg-blue-500 text-slate-950 px-8 py-5 rounded-2xl font-black tracking-widest uppercase italic hover:bg-white transition-all disabled:opacity-20 active:scale-95"
                 >
                   Log
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
                <div *ngFor="let w of recentWorkouts()" class="bg-slate-950 border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center">
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
                <div *ngIf="recentWorkouts().length === 0" class="py-8 text-center text-slate-700">
                   <p class="text-[10px] font-mono uppercase tracking-widest">No protocol entries detected</p>
                </div>
             </div>
          </div>
        </section>

        <!-- Login Prompt (Trendy Version) -->
        <div *ngIf="!user" class="min-h-[80vh] flex flex-col justify-center items-center relative overflow-hidden px-4">
           <!-- Aesthetic Background Elements -->
           <div class="absolute top-1/4 -left-20 w-96 h-96 bg-lime-400/20 blur-[120px] rounded-full animate-pulse"></div>
           <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full delay-1000 animate-pulse"></div>
           
           <div class="relative z-10 text-center space-y-8 max-w-2xl">
              <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 mb-4">
                 <div class="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping"></div>
                 <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol_v2.0.4 Online</span>
              </div>

              <h2 class="text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] text-white uppercase italic text-balance">
                 Elevate<br/>
                 <span class="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-blue-500">Your</span><br/>
                 Prime
              </h2>
              
              <div class="space-y-4">
                <p class="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-widest max-w-md mx-auto leading-relaxed px-4">
                   The ultimate bio-optimization engine for high-performance humans. 
                   Sync your metabolism with the cloud.
                </p>
              </div>

              <div class="pt-8 flex flex-col items-center gap-6">
                 <button (click)="login()" class="group relative px-12 py-6 bg-white text-slate-950 rounded-[2rem] font-black tracking-widest hover:bg-lime-400 transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] uppercase italic">
                   <div class="absolute inset-0 bg-lime-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-[2rem] -z-10"></div>
                   <span class="relative flex items-center gap-3">
                      Initialize Uplink
                      <lucide-icon name="chevron-right" size="18"></lucide-icon>
                   </span>
                 </button>
                 
                 <div class="flex items-center gap-8 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                    <lucide-icon name="shield" size="20"></lucide-icon>
                    <lucide-icon name="activity" size="20"></lucide-icon>
                    <lucide-icon name="award" size="20"></lucide-icon>
                 </div>
              </div>
           </div>

           <!-- Scanline Effect -->
           <div class="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
        </div>

        <!-- Footer Item -->
        <footer class="mt-20 pb-12 border-t border-slate-900 pt-12 text-center space-y-4">
          <div class="flex flex-col items-center gap-2">
            <div class="bg-lime-400 p-1.5 rounded-lg text-slate-950 flex items-center justify-center">
              <lucide-icon name="flame" size="14"></lucide-icon>
            </div>
            <p class="text-[10px] font-black tracking-[0.4em] text-white uppercase italic">FlexFlow Protocol</p>
          </div>
          <div class="space-y-1">
            <p class="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              Neural Optimization for High-Performance Humans
            </p>
            <a href="https://www.linkedin.com/in/guru-raj-n-741a65145/" target="_blank" class="text-[9px] font-mono text-slate-400 uppercase tracking-widest hover:text-lime-400 transition-colors flex items-center justify-center gap-2 group">
              Founder & Architect: <span class="text-lime-400 font-bold border-b border-transparent group-hover:border-lime-400/30 transition-all">Guru_Raj_N</span>
              <lucide-icon name="linkedin" size="10"></lucide-icon>
            </a>
            <p class="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
              Global Protocol Connections: <span class="text-white font-bold">{{ userCount() }}</span>
            </p>
          </div>
          <p class="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
            © 2026 FlexFlow. Encrypted & Secure. All rights reserved.
          </p>
        </footer>
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
        <a href="https://www.linkedin.com/in/guru-raj-n-741a65145/" target="_blank" class="hover:text-lime-400 transition-colors pointer-events-auto flex items-center gap-2">
          FlexFlow Protocol v2.5.0 // Architect: Guru_Raj_N
          <lucide-icon name="linkedin" size="8" class="mb-0.5"></lucide-icon>
        </a>
        <span class="text-lime-500/50">ACTIVE_NODES: {{ userCount() }} // BMI_ENG_INIT: SUCCESS</span>
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
  userCount = signal<number>(0);
  testimonials = signal<any[]>([]);
  activeTestimonyIndex = signal<number>(0);
  displayedTestimonials = computed(() => {
    const all = this.testimonials();
    if (all.length === 0) return [];
    if (all.length <= 3) return all;
    // Window rotation by 1 every tick
    const start = this.activeTestimonyIndex();
    const result = [];
    for (let i = 0; i < 3; i++) {
      result.push(all[(start + i) % all.length]);
    }
    return result;
  });
  showTestimonyForm = signal<boolean>(false);
  testimonyRating = signal<number>(5);
  testimonyForm = new FormGroup({
    content: new FormControl('', [Validators.required, Validators.maxLength(1000)])
  });
  mealInput: string = '';
  mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snacks' = 'breakfast';
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
  lastAnalysis: any = null;
  recentMeals = signal<any[]>([]);
  recentWorkouts = signal<any[]>([]);
  weightLogs = signal<{date: string, weight: number, day: string}[]>([]);
  toasts = signal<{id: number, message: string, type: 'success' | 'error' | 'info'}[]>([]);
  todayCalories = signal<number>(0);
  todayProtein = signal<number>(0);
  todayCaloriesBurned = signal<number>(0);
  todayStr = new Date().toISOString().split('T')[0];
  newWeight: number = 0;

  // Manual entry fields
  manualName: string = '';
  manualCalories: number = 0;
  manualProtein: number = 0;
  manualCarbs: number = 0;
  manualFats: number = 0;
  isManualMode: boolean = false;

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

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const id = Date.now();
    this.toasts.update(current => [...current, { id, message, type }]);
    setTimeout(() => this.removeToast(id), 5000);
  }

  removeToast(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

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
    return Math.min(100, Math.round((this.todayCalories() / goal) * 100));
  });

  remainingCalories = computed(() => {
    const rem = this.profile().dailyCalorieGoal - this.todayCalories();
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

  weightTrend = computed(() => {
    const logs = this.weightLogs();
    if (logs.length < 2) return 0;
    const latest = logs[logs.length - 1].weight;
    const earliest = logs[0].weight;
    return Number((latest - earliest).toFixed(1));
  });

  constructor(
    private firebase: FirebaseService,
    private gemini: GeminiService
  ) {}

  ngOnInit() {
    this.firebase.watchUserCount(count => {
       this.userCount.set(count);
    });
    this.firebase.auth.onAuthStateChanged(u => {
      if (u) {
        // Check if session has expired (30 mins of inactivity)
        if (this.firebase.isSessionExpired()) {
           this.logout();
           this.showToast('Protocol session expired', 'info');
           return;
        }
        this.user = u;
        this.firebase.updateSessionTimestamp();
        this.loadProfile();
        this.loadData();
        this.firebase.checkIn(u.uid);

        // Fetch Testimonials
        onSnapshot(collection(this.firebase.db, 'testimonials'), (snap: QuerySnapshot<DocumentData>) => {
          const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Sort by high rating first
          const sorted = all.sort((a: any, b: any) => b.rating - a.rating);
          this.testimonials.set(sorted);
        });

                // Testimonial Rotation Logic
                const interval = setInterval(() => {
                  const count = this.testimonials().length;
                  if (count > 3) {
                    this.activeTestimonyIndex.update(i => (i + 1) % count);
                  }
                }, 8000);
                
                // Cleanup interval on logout or destroy if we had a way, 
                // but for now it's okay in this component
      } else {
        this.user = null;
      }
    });

    // Pulse check for session survival
    setInterval(() => {
      if (this.user && this.firebase.isSessionExpired()) {
        this.logout();
        this.showToast('Session timed out', 'info');
      }
    }, 60000); // Check every minute
  }

  async login() {
    try {
      const provider = new GoogleAuthProvider();
      // Adding custom parameters can sometimes help with popup window issues
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(this.firebase.auth, provider);
      this.firebase.updateSessionTimestamp();
    } catch (e: any) { 
      console.error('Login Error:', e);
      // Fallback for COOP/Popup issues in some dev environments
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user' || e.message?.includes('Cross-Origin-Opener-Policy')) {
        this.showToast('Auth error detected. Please try again or check browser settings.', 'error');
      }
    }
  }

  logout() { this.firebase.clearSession(); }

  async loadProfile() {
    if (!this.user) return;
    const p = await this.firebase.getProfile(this.user.uid);
    if (p) {
      this.profile.set(p as UserProfile);
      this.profileEdit = { ...this.profile() };
    } else {
      // Initialize protocol for new human connection
      const defaultProfile: UserProfile = {
        uid: this.user.uid,
        weight: 75,
        height: 180,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        dailyCalorieGoal: 2500,
        dailyProteinGoal: 150
      };
      await this.firebase.saveProfile(this.user.uid, defaultProfile);
      this.profile.set(defaultProfile);
      this.profileEdit = { ...defaultProfile };
      this.showToast('Human protocol initiated', 'success');
    }
  }

  async saveProfile() {
    if (!this.user) return;
    this.firebase.updateSessionTimestamp();
    try {
      const calories = this.calculatedCalories();
      const protein = Math.round(this.profileEdit.weight * 2); // 2g per kg rule of thumb
      this.profileEdit.dailyCalorieGoal = calories;
      this.profileEdit.dailyProteinGoal = protein;
      
      await this.firebase.saveProfile(this.user.uid, this.profileEdit);
      this.profile.set({ ...this.profileEdit });
      this.activeTab = 'dash';
      this.showToast('Profile protocol updated');
    } catch (e) {
      this.showToast('Profile update failed', 'error');
    }
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

  async seedTestimonials() {
    const dummy = [
      { userName: 'Alex_V', content: 'Protocol maximized my neural output during fasting windows.', rating: 5, createdAt: new Date().toISOString() },
      { userName: 'Sarah_K', content: 'The intake breakdown is essential for my prep season.', rating: 5, createdAt: new Date().toISOString() },
      { userName: 'Unit_042', content: 'Cleanest interface in the ecosystem. 10/10 optimization.', rating: 4, createdAt: new Date().toISOString() }
    ];
    for (const d of dummy) {
      await addDoc(collection(this.firebase.db, 'testimonials'), d);
    }
  }

  protocolEngagement = computed(() => {
    let score = 0;
    if (this.todayCalories() > 0) score += 35;
    if (this.recentWorkouts().length > 0) score += 35;
    if (this.weightLogs().length > 0) score += 30;
    return score;
  });

  async submitTestimony() {
    if (!this.user || this.testimonyForm.invalid) return;
    try {
      await addDoc(collection(this.firebase.db, 'testimonials'), {
        userName: this.user.displayName || 'Anonymous_Human',
        content: this.testimonyForm.value.content,
        rating: this.testimonyRating(),
        role: 'Verified Human',
        createdAt: new Date().toISOString()
      });
      this.showTestimonyForm.set(false);
      this.testimonyForm.reset();
      this.testimonyRating.set(5);
      this.showToast('Testimony uploaded to protocol');
    } catch (e) {
      this.showToast('Upload failed', 'error');
    }
  }

  async analyzeMeal() {
    if ((!this.mealInput && !this.selectedImage) || !this.user) return;
    this.firebase.updateSessionTimestamp();
    this.isAnalyzing = true;
    this.lastAnalysis = null;
    try {
      let res;
      if (this.selectedImage) {
        const base64Data = this.selectedImage.split(',')[1];
        res = await this.gemini.analyzeMealImage(base64Data, this.selectedImageMime);
      } else {
        res = await this.gemini.analyzeMeal(this.mealInput);
      }

      if (res && res.calories) {
        this.lastAnalysis = res;
        await addDoc(collection(this.firebase.db, 'meals'), {
          userId: this.user.uid,
          name: res.name,
          category: this.mealCategory,
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
        this.showToast(`Logged: ${res.name} (${res.calories} kcal)`);
      }
    } catch (e) { 
      console.error(e);
      this.showToast('Bio-analysis failed', 'error');
    }
    finally { this.isAnalyzing = false; }
  }

  async manualLog() {
    if (!this.manualName || !this.user) return;
    this.firebase.updateSessionTimestamp();
    try {
      await addDoc(collection(this.firebase.db, 'meals'), {
        userId: this.user.uid,
        name: this.manualName,
        category: this.mealCategory,
        calories: this.manualCalories,
        protein: this.manualProtein,
        carbs: this.manualCarbs,
        fats: this.manualFats,
        createdAt: Timestamp.now(),
        date: new Date().toISOString().split('T')[0]
      });
      this.showToast(`Logged: ${this.manualName}`);
      this.loadData();
      this.isManualMode = false;
      this.manualName = '';
      this.manualCalories = 0;
      this.manualProtein = 0;
      this.manualCarbs = 0;
      this.manualFats = 0;
      this.activeTab = 'dash';
    } catch (e) {
      this.showToast('Manual log failed', 'error');
    }
  }

  async createWorkout() {
    if (!this.workoutName || !this.user) return;
    this.firebase.updateSessionTimestamp();
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
      this.showToast('Training session recorded');
    } catch (e) { 
      console.error(e);
      this.showToast('Commit failed', 'error');
    }
  }

  resetWorkoutForm() {
    this.workoutName = '';
    this.workoutSets = 3;
    this.workoutReps = 10;
    this.workoutWeight = 0;
  }

  async logWeight() {
    if (!this.user || this.newWeight <= 0) return;
    try {
      await addDoc(collection(this.firebase.db, 'weightLogs'), {
        userId: this.user.uid,
        weight: this.newWeight,
        date: new Date().toISOString().split('T')[0],
        createdAt: Timestamp.now()
      });
      // Also update profile current weight
      this.profileEdit.weight = this.newWeight;
      await this.saveProfile();
      this.loadData();
      this.newWeight = 0;
      this.showToast('Weight log synced to protocol');
    } catch (e) { 
      console.error(e);
      this.showToast('Weight log failed', 'error');
    }
  }

  async loadData() {
    if (!this.user) return;
    const mealsRef = collection(this.firebase.db, 'meals');
    
    this.todayCalories.set(0);
    this.todayProtein.set(0);
    this.todayCaloriesBurned.set(0);
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
        this.todayCalories.update(v => v + (data['calories'] || 0));
        this.todayProtein.update(v => v + (data['protein'] || 0));
      }
    });

    this.recentMeals.set(mealLogs.filter(m => m.date === todayStr));

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
    this.recentWorkouts.set(wSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

    // Load weight history
    const weightQ = query(
      collection(this.firebase.db, 'weightLogs'),
      where('userId', '==', this.user.uid),
      orderBy('date', 'asc')
    );
    const weightSnapshot = await getDocs(weightQ);
    const wl: any[] = [];
    weightSnapshot.forEach(d => {
      const data = d.data();
      wl.push({
        date: data['date'],
        weight: data['weight'],
        day: new Date(data['date']).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
      });
    });
    this.weightLogs.set(wl);

    const todayWQ = query(collection(this.firebase.db, 'workouts'), where('userId', '==', this.user.uid), where('date', '==', todayStr));
    const todayWSnapshot = await getDocs(todayWQ);
    todayWSnapshot.forEach(d => {
      this.todayCaloriesBurned.update(v => v + (d.data()['caloriesBurned'] || 0));
    });
  }

  getCaloriesByCategory(category: string): number {
    return this.recentMeals()
      .filter(m => m.category === category)
      .reduce((sum, m) => sum + (m.calories || 0), 0);
  }
}
