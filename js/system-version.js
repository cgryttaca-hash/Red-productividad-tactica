export const SYSTEM_VERSION = '4.7.0';
export const RELEASE_DATE = '2026-11-01';
export const RELEASE_NAME = 'Operación y administración técnica';
export const PROTECTED_MODULES = Object.freeze({
  "eventos.html": "6ab000f5ced55b8b9e38488c120317b5ab387800f89b9250a14513c4363f9f7e",
  "js/eventos.js": "cc0b9392c5c91ace26eca4289c7696bc555f2c03738b0a21dd9a5bba7f263e60",
  "css/eventos.css": "9f01c8cc6b63fce8add3694d8a81c5d47a7859b394f622be0097b5c516aecba9",
  "minuta.html": "70fb090cfde6cdf10a05e5af91158ce03e65e1dd219f64d4dc5b8b08a415028f",
  "js/minuta.js": "c34668a73e7a88d3ccbafa3e7574e2f8e906603c592e1fc134e826b084a6612b",
  "css/minuta.css": "9c9074cfc87e5334ac936f8c91662568658356a535f9fac2fe0eea279d21cbd3"
});
export function versionLabel(){
  return `Versión ${SYSTEM_VERSION} · ${RELEASE_DATE}`;
}
