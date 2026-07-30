/**
 * CONFIGURACIÓN DE FIREBASE
 * Proyecto: red-productividad-tactica
 *
 * La configuración Web de Firebase se publica en el navegador por diseño.
 * La protección real se realiza con Authentication y firestore.rules.
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

export function isFirebaseConfigured(){
  const required = [
    FIREBASE_CONFIG.apiKey,
    FIREBASE_CONFIG.authDomain,
    FIREBASE_CONFIG.projectId,
    FIREBASE_CONFIG.appId,
    FIREBASE_OWNER_UID
  ];
  return required.every(value => value && !String(value).includes("REEMPLAZAR"));
}
