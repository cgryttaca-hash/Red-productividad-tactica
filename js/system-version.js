export const SYSTEM_VERSION = '3.0.0';
export const RELEASE_DATE = '2026-08-01';
export const RELEASE_NAME = 'Plataforma operativa estable';
export const PROTECTED_MODULES = Object.freeze({
  "eventos.html": "7578841e926b73ce4ee705c0722b047078625d63228f50be830f24905a23547a",
  "js/eventos.js": "c9bb432e971ba7c62c720b31178aa2e30f3f827f016aabad0820494041dd8867",
  "css/eventos.css": "9f01c8cc6b63fce8add3694d8a81c5d47a7859b394f622be0097b5c516aecba9",
  "minuta.html": "6bf152c3a8462a17216acc60affd963344db4c8b2b58c210111948dd755141ea",
  "js/minuta.js": "5cf2f7fc3af195651be8b4595822b01762bd883da0f6876e3a7d56dc5c7b2933",
  "css/minuta.css": "9c9074cfc87e5334ac936f8c91662568658356a535f9fac2fe0eea279d21cbd3"
});
export function versionLabel(){
  return `Versión ${SYSTEM_VERSION} · ${RELEASE_DATE}`;
}
