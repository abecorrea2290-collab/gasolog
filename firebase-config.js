const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAwdgOnjndks2PSgB5YRS8CZH5byHZ32S4",
  authDomain:        "gasolog.firebaseapp.com",
  projectId:         "gasolog",
  storageBucket:     "gasolog.firebasestorage.app",
  messagingSenderId: "719015795873",
  appId:             "1:719015795873:web:630024c8d535872ad024e0",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Reglas de Firestore (pega en Firebase Console → Firestore → Reglas):
//
//  rules_version = '2';
//  service cloud.firestore {
//    match /databases/{database}/documents {
//      match /users/{userId}/{document=**} {
//        allow read, write: if request.auth != null && request.auth.uid == userId;
//      }
//    }
//  }
// ─────────────────────────────────────────────────────────────────────────────
