export const SYSTEM_VERSION = '4.9.3';
export const RELEASE_DATE = '2026-11-01';
export const RELEASE_NAME = 'Operación y administración técnica';
export const PROTECTED_MODULES = Object.freeze({
  "eventos.html": "e9f813f81845e3985864e65b95ebee46e188e477d0f75f9241a5e3ed65d00125",
  "js/eventos.js": "cc0b9392c5c91ace26eca4289c7696bc555f2c03738b0a21dd9a5bba7f263e60",
  "css/eventos.css": "9f01c8cc6b63fce8add3694d8a81c5d47a7859b394f622be0097b5c516aecba9",
  "minuta.html": "c90802740fa09ba586e1a40043688a3bd41a3cac043451e58569acf0f878b278",
  "js/minuta.js": "c34668a73e7a88d3ccbafa3e7574e2f8e906603c592e1fc134e826b084a6612b",
  "css/minuta.css": "9c9074cfc87e5334ac936f8c91662568658356a535f9fac2fe0eea279d21cbd3"
});
export function versionLabel(){
  return `Versión ${SYSTEM_VERSION} · ${RELEASE_DATE}`;
}
