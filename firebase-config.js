// ─────────────────────────────────────────────────────────────────────────────
//  GasoLog · Configuración de Firebase
//  Reemplaza los valores con los de tu proyecto en Firebase Console:
//  https://console.firebase.google.com → Configuración del proyecto → Tus apps
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  projectId:         "TU_PROYECTO_ID",
  storageBucket:     "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Reglas de Firestore recomendadas (pega esto en Firebase Console → Firestore → Reglas):
//
//  rules_version = '2';
//  service cloud.firestore {
//    match /databases/{database}/documents {
//      match /users/{userId}/{document=**} {
//        allow read, write: if request.auth != null && request.auth.uid == userId;
//      }
//    }
//  }
//
//  Servicios que debes activar en Firebase Console:
//    1. Authentication → Método de inicio de sesión → Correo/Contraseña → Activar
//    2. Firestore Database → Crear base de datos (modo producción)
// ─────────────────────────────────────────────────────────────────────────────
