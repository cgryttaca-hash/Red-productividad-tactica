export const SYSTEM_VERSION = '3.0.0';
export const RELEASE_DATE = '2026-08-01';
export const RELEASE_NAME = 'Plataforma operativa estable';
export const PROTECTED_MODULES = Object.freeze({
  "eventos.html": "d0f2a589f515fbd603d6029cbe2f55016ed54fcf33bdfe1df5aededdae0e02bc",
  "js/eventos.js": "c8af2388c832ecebbecfe80a5b37af4818ab04ba1334f6e5588efce552313395",
  "css/eventos.css": "9f01c8cc6b63fce8add3694d8a81c5d47a7859b394f622be0097b5c516aecba9",
  "minuta.html": "d02bec58ee1001fa6de94ce7c4ff1bcd0209f333c8c8b433afb8c71cd62d3168",
  "js/minuta.js": "5cf2f7fc3af195651be8b4595822b01762bd883da0f6876e3a7d56dc5c7b2933",
  "css/minuta.css": "9c9074cfc87e5334ac936f8c91662568658356a535f9fac2fe0eea279d21cbd3"
});
export function versionLabel(){
  return `Versión ${SYSTEM_VERSION} · ${RELEASE_DATE}`;
}
