const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=path.resolve(process.env.ORIGINAL_PROJECT_PATH),out=path.join(root,'test-results/v48');fs.mkdirSync(out,{recursive:true});
const blocks=[
 ['js/excel-sync.js','  function parseExcelDate(','  function getStoredMeta('],
 ['js/firebase-sync.js','function normalizeDate(','function currentRows('],
 ['js/firebase-sync.js','async function commit(','export async function publishIfReady('],
 ['js/firebase-sync.js','  if(publishing||window.RPTUpdateGuard?.locked)','\nasync function initialize(){'],
 ['js/eventos.js','function startOfDay(d)','function loadWorkbookFromArrayBuffer('],
 ['js/minuta.js','function startOfDay(date)',null]
];
const evidence=[];for(const[file,start,end]of blocks){const get=folder=>{const text=fs.readFileSync(path.join(folder,file),'utf8'),from=text.indexOf(start),to=end?text.indexOf(end,from+start.length):text.length;assert(from>=0&&to>from,file+' '+start);return text.slice(from,to);};const original=get(base),actual=get(root);assert.equal(actual.replaceAll("window.RPTPageInit.onReady(", "document.addEventListener('DOMContentLoaded', "),original,file+' '+start);evidence.push({file,start,sha256:crypto.createHash('sha256').update(actual).digest('hex')});}
const passed=['Seis bloques completos idénticos a 4.7.0: lectura/normalización/guardado Excel, transformación y publicación Firebase, filtros/representación de Eventos y lógica completa de Minuta después del preloader'];fs.writeFileSync(path.join(out,'nucleos-operativos.json'),JSON.stringify({passed,evidence},null,2));console.log('PASS '+passed[0]);
