export const SYSTEM_VERSION = '4.0.0';
export const RELEASE_DATE = '2026-10-30';
export const RELEASE_NAME = 'Operación, versiones seguras y asistente';
export const PROTECTED_MODULES = Object.freeze({
  "eventos.html": "e5a189bb555e11521dcbb04882820ca98dc2438a6159b73df01b2be730f35d0a",
  "js/eventos.js": "c9bb432e971ba7c62c720b31178aa2e30f3f827f016aabad0820494041dd8867",
  "css/eventos.css": "9f01c8cc6b63fce8add3694d8a81c5d47a7859b394f622be0097b5c516aecba9",
  "minuta.html": "4c7f28e71638eb035c65305bee39fa1c843f5038532d94faf80c2bcc500f3e13",
  "js/minuta.js": "7cff23054925c8563d8314366aaf79e21f751dffffdf2dd1b5c9ebd43e098cdd",
  "css/minuta.css": "9c9074cfc87e5334ac936f8c91662568658356a535f9fac2fe0eea279d21cbd3"
});
export function versionLabel(){
  return `Versión ${SYSTEM_VERSION} · ${RELEASE_DATE}`;
}
