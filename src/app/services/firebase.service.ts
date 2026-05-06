import { Injectable, signal } from '@angular/core';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer, setDoc, getDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  public app: FirebaseApp;
  public auth: Auth;
  public db: Firestore;

  constructor() {
    console.log('Initializing Firebase Protocol...');
    this.app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    this.auth = getAuth(this.app);
    // Ensure persistence is set to local (survives refresh)
    setPersistence(this.auth, browserLocalPersistence).catch(err => {
      console.warn('Auth persistence initialization error:', err);
    });
    this.db = getFirestore(this.app, (firebaseConfig as any).firestoreDatabaseId);
    this.testConnection();
  }

  updateSessionTimestamp() {
    localStorage.setItem('flexflow_last_active', Date.now().toString());
  }

  isSessionExpired(): boolean {
    const lastActive = localStorage.getItem('flexflow_last_active');
    if (!lastActive) return false;
    const thirtyMinutes = 30 * 60 * 1000;
    return (Date.now() - parseInt(lastActive, 10)) > thirtyMinutes;
  }

  clearSession() {
    localStorage.removeItem('flexflow_last_active');
    return this.auth.signOut();
  }

  handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: this.auth.currentUser?.uid,
        email: this.auth.currentUser?.email,
        emailVerified: this.auth.currentUser?.emailVerified,
        isAnonymous: this.auth.currentUser?.isAnonymous,
        tenantId: this.auth.currentUser?.tenantId,
        providerInfo: this.auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    }
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  public isConnected = signal<boolean | null>(null);

  async testConnection() {
    try {
      // Probing connection
      const snap = await getDocFromServer(doc(this.db, 'test', 'connection'));
      this.isConnected.set(true);
      console.log('Firebase Protocol: Link Synchronized');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // If we get permission denied, the server IS reached but blocking this specific path
        // This confirms the connection is active
        this.isConnected.set(true);
        console.log('Firebase Protocol: Link Reached (Secured Path)');
      } else if (error.message?.includes('the client is offline') || error.code === 'unavailable') {
        this.isConnected.set(false);
        console.warn('Firebase Protocol: Link Offline');
      } else {
        this.isConnected.set(false);
        console.error('Firebase Protocol: Handshake Failed', error);
      }
    }
  }

  async getProfile(uid: string) {
    const path = `profiles/${uid}`;
    try {
      const snap = await getDoc(doc(this.db, path));
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      this.handleFirestoreError(err, OperationType.GET, path);
      return null;
    }
  }

  async saveProfile(uid: string, data: any) {
    const path = `profiles/${uid}`;
    try {
      const existing = await this.getProfile(uid);
      const isNew = !existing;
      const wasAlreadyCounted = existing && (existing as any).isCounted;
      
      const profileData = { 
        ...data, 
        uid, 
        updatedAt: new Date().toISOString(),
        isCounted: isNew || wasAlreadyCounted ? true : false // We will set it to true if we increment
      };

      if (isNew || !wasAlreadyCounted) {
        profileData.isCounted = true;
        await this.incrementUserCount();
      }

      await setDoc(doc(this.db, path), profileData, { merge: true });
    } catch (err) {
      this.handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  async checkIn(uid: string) {
    const p = await this.getProfile(uid);
    if (p && !(p as any).isCounted) {
      // User has profile but wasn't counted (migration case)
      await updateDoc(doc(this.db, `profiles/${uid}`), { isCounted: true });
      await this.incrementUserCount();
    }
  }

  async incrementUserCount() {
    const path = 'stats/global';
    const docRef = doc(this.db, path);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, { userCount: 1 });
      } else {
        await updateDoc(docRef, { userCount: increment(1) });
      }
    } catch (err) {
      console.warn('Could not increment user count:', err);
    }
  }

  watchUserCount(callback: (count: number) => void) {
    const path = 'stats/global';
    return onSnapshot(doc(this.db, path), (snap) => {
      if (snap.exists()) {
        callback(snap.data()['userCount'] || 0);
      } else {
        callback(0);
      }
    }, (err) => {
      console.warn('Watch user count failed:', err);
    });
  }
}
