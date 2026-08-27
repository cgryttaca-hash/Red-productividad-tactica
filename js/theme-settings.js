const CACHE_KEY='rptAppearanceV1';
export const THEME_DOC_ID='apariencia';
export const THEMES={
  classic:'Clásico',
  ocean:'Azul profesional',
  forest:'Verde operativo',
  sand:'Arena cálida',
  night:'Oscuro profesional'
};

function safeParse(value,fallback){
  try{return JSON.parse(value)||fallback;}catch(_){return fallback;}
}
export function normalizeAppearance(value={}){
  const allowed=new Set(Object.keys(THEMES));
  const globalTheme=allowed.has(value.global)?value.global:'classic';
  const pages={};
  for(const [key,theme] of Object.entries(value.pages||{})){
    pages[key]=theme==='inherit'||allowed.has(theme)?theme:'inherit';
  }
  return{global:globalTheme,pages,updatedAt:value.updatedAt||value.clientUpdatedAt||''};
}
export function readAppearanceCache(){
  return normalizeAppearance(safeParse(localStorage.getItem(CACHE_KEY),{}));
}
export function writeAppearanceCache(value){
  const normalized=normalizeAppearance(value);
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(normalized));}catch(_){}
  window.dispatchEvent(new CustomEvent('rptAppearanceChanged',{detail:normalized}));
  return normalized;
}
export function resolveTheme(pageKey,value=readAppearanceCache()){
  const normalized=normalizeAppearance(value);
  const pageTheme=normalized.pages?.[pageKey];
  return pageTheme&&pageTheme!=='inherit'?pageTheme:normalized.global;
}
export function applyAppearance(pageKey,value=readAppearanceCache()){
  const theme=resolveTheme(pageKey,value);
  document.documentElement.dataset.uiTheme=theme;
  document.documentElement.dataset.uiPage=pageKey||'';
  const themeMeta=document.querySelector('meta[name="theme-color"]');
  const themeColors={classic:'#0f172a',ocean:'#12395b',forest:'#183e34',sand:'#514334',night:'#090e18'};
  if(themeMeta)themeMeta.setAttribute('content',themeColors[theme]||themeColors.classic);
  return theme;
}
