export const SYSTEM_VERSION = '4.8.0';
export const RELEASE_DATE = '2026-11-01';
export const RELEASE_NAME = 'Operación y administración técnica';
export const PROTECTED_MODULES = Object.freeze({
  "eventos.html": "57136dba64307eef1863f5d1989b7bf3da747f375216adbbc1d6cf9c1f95896b",
  "js/eventos.js": "334d4ba5c3cf730377b76bbf60b7111e9dce472dfc5a6084a753d7e547e7d4db",
  "css/eventos.css": "9f01c8cc6b63fce8add3694d8a81c5d47a7859b394f622be0097b5c516aecba9",
  "minuta.html": "a839450381bf79f88549b1dbe7809ae0b396573f1475ccfc310dba88357b0cf0",
  "js/minuta.js": "3b4499e08e341e31bcdbbacadf96f66d8ca60282044c86c78bb2fa779a328dc0",
  "css/minuta.css": "9c9074cfc87e5334ac936f8c91662568658356a535f9fac2fe0eea279d21cbd3"
});
export function versionLabel(){
  return `Versión ${SYSTEM_VERSION} · ${RELEASE_DATE}`;
}
