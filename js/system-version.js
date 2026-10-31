export const SYSTEM_VERSION = '4.5.0';
export const RELEASE_DATE = '2026-10-30';
export const RELEASE_NAME = 'Operación, versiones seguras y asistente';
export const PROTECTED_MODULES = Object.freeze({
  "eventos.html": "d78de619a1cc5575824cc36a6f2bd98e23ad959038d06e4641083643d5042a03",
  "js/eventos.js": "dfe08a510c49769124138c4a0edd527c3d74c67a4b8fb519256bcb8de4b77149",
  "css/eventos.css": "9f01c8cc6b63fce8add3694d8a81c5d47a7859b394f622be0097b5c516aecba9",
  "minuta.html": "8a2109f8256bdc3a741b62941a4c4274bbd079eeaccf5b20e741d4e6937305b3",
  "js/minuta.js": "7cff23054925c8563d8314366aaf79e21f751dffffdf2dd1b5c9ebd43e098cdd",
  "css/minuta.css": "9c9074cfc87e5334ac936f8c91662568658356a535f9fac2fe0eea279d21cbd3"
});
export function versionLabel(){
  return `Versión ${SYSTEM_VERSION} · ${RELEASE_DATE}`;
}
