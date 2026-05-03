import { Injectable } from '@angular/core';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer, setDoc, getDoc } from 'firebase/firestore';
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
    this.db = getFirestore(this.app, (firebaseConfig as any).firestoreDatabaseId);
    this.testConnection();
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

  async testConnection() {
    try {
      await getDocFromServer(doc(this.db, 'test', 'connection'));
      console.log('Firebase connection successful');
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
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
      await setDoc(doc(this.db, path), { ...data, uid, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      this.handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}
