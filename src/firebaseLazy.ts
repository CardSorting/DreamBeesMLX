import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

export type FirebaseClient = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let clientPromise: Promise<FirebaseClient> | null = null;
let functionsPromise: Promise<Functions> | null = null;

export const getFirebaseClient = () => {
  clientPromise ??= Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]).then(([appModule, authModule, firestoreModule]) => {
    const app = appModule.getApps().length
      ? appModule.getApp()
      : appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);

    let db: Firestore;
    try {
      db = firestoreModule.initializeFirestore(app, {
        localCache: firestoreModule.persistentLocalCache({
          tabManager: firestoreModule.persistentMultipleTabManager()
        })
      });
    } catch {
      db = firestoreModule.getFirestore(app);
    }

    return { app, auth, db };
  });

  return clientPromise;
};

export const getFunctionsInstance = () => {
  functionsPromise ??= Promise.all([
    getFirebaseClient(),
    import('firebase/functions'),
  ]).then(([client, { getFunctions }]) => getFunctions(client.app));

  return functionsPromise;
};

