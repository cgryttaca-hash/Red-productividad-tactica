export const ICON_PATHS=Object.freeze({
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h3m3 0h2m-8 3h3"/>',
 minute:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v6h6M8 13h8m-8 4h6"/>',
 mobile:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2m-4-8 2 2 4-4"/>',
 shield:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7zM8 12l3 3 5-6"/>',
 update:'<path d="M20 7a9 9 0 0 0-16 3M4 17a9 9 0 0 0 16-3M3 3v7h7m11 11v-7h-7"/>',
 cloud:'<path d="M6 18a4 4 0 1 1 1-8 6 6 0 0 1 11-2 5 5 0 0 1 0 10M9 16l3-3 3 3m-3-3v8"/>',
 file:'<path d="M14 3H6v18h12V7zM14 3v5h4M9 12h6m-6 4h6"/>',
 users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/>',
 settings:'<path d="M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2"/><circle cx="12" cy="12" r="4"/>',
 building:'<path d="M3 21h18M5 21V5h14v16M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1"/>',
 payment:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3m4 0h3"/>',
 print:'<path d="M7 8V3h10v5M7 17H3V9h18v8h-4M7 14h10v7H7zM17 11h1"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 message:'<path d="M4 4h16v12H9l-5 4zM8 8h8m-8 4h5"/>',
 tools:'<path d="m14 7 3 3 4-4a7 7 0 0 1-9 9l-7 7-3-3 7-7a7 7 0 0 1 9-9z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 chart:'<path d="M4 21V11m8 10V3m8 18v-7M2 21h20"/>'
});
export const PAGE_ICONS=Object.freeze({index:'home',login:'shield',eventos:'calendar',minuta:'minute',minuta_compartir:'message',agenda_movil:'mobile',administracion:'shield',recuperacion:'update',configuracion:'settings',usuarios:'users',agendas:'calendar',validacion:'search',laboratorio:'tools',asistente:'message',mantenimiento:'tools',offline:'cloud'});
export function icon(name){const wrapper=document.createElement('span');wrapper.innerHTML=`<svg class="rpt-ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]||ICON_PATHS.file}</svg>`;return wrapper.firstElementChild;}
