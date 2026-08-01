/**
 * Configuración pública de Firebase.
 * La seguridad real se aplica mediante Authentication y firestore.rules.
 */
export const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyDHLGK-gODEXTtqC1EfSTEm2Hp7HlzF92M",
  authDomain: "red-productividad-tactica.firebaseapp.com",
  projectId: "red-productividad-tactica",
  storageBucket: "red-productividad-tactica.firebasestorage.app",
  messagingSenderId: "866011817933",
  appId: "1:866011817933:web:c5ebf9f13652c58598c684"
});

export const FIREBASE_OWNER_UID = "Nxsbigjez6eBRMiZZdTzHv3oINn1";
export const FIREBASE_COLLECTION = "eventos_publicos";
export const FIREBASE_META_COLLECTION = "eventos_meta";
export const FIREBASE_META_DOCUMENT = "publicacion";
export const FIREBASE_CHANGES_COLLECTION = "eventos_cambios";

export function isFirebaseConfigured(){
  return Object.values(FIREBASE_CONFIG).every(Boolean) && Boolean(FIREBASE_OWNER_UID);
}
