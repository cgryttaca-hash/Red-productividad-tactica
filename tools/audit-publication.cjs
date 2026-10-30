// Lectura del alojamiento; no publica, modifica archivos ni utiliza credenciales.
const fs=require('node:fs'),crypto=require('node:crypto');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main(){
 const input=process.argv[2];if(!input)throw Error('Uso: node tools/audit-publication.cjs https://sitio/ruta/ [informe.json]');
 const base=new URL(input);if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||!base.pathname.endsWith('/'))throw Error('Usa la dirección pública de la carpeta, terminada en / y sin parámetros.');
 const report={origin:base.href,checkedAt:new Date().toISOString(),version:null,errors:[],verified:0,total:0};
 async function get(file,digest){const url=new URL(file,base);if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||file.includes('..')||file.startsWith('/'))throw Error('Ruta fuera de la aplicación');if(digest)url.searchParams.set('__rpt_release',digest);const response=await fetch(url,{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);return{response,bytes:Buffer.from(await response.arrayBuffer())};}
 const{bytes}=await get('release.json');const release=JSON.parse(bytes.toString('utf8'));report.version=release.version;
 if(!Array.isArray(release.assets)||hash(JSON.stringify({version:release.version,assets:release.assets}))!==release.digest)throw Error('El manifiesto tiene una huella inválida.');
 report.total=release.assets.length;
 const worker=await get('sw.js'),embedded=worker.bytes.toString('utf8').match(/^const RELEASE = (.+);/);if(!embedded||JSON.stringify(JSON.parse(embedded[1]))!==JSON.stringify(release))report.errors.push({resource:'sw.js',cause:'El worker y release.json pertenecen a publicaciones distintas'});
 let next=0;await Promise.all(Array.from({length:4},async()=>{while(next<release.assets.length){const asset=release.assets[next++];try{const value=await get(asset.path,release.digest),received=hash(value.bytes);if(received!==asset.sha256)report.errors.push({resource:asset.path,cause:'INTEGRITY',expected:asset.sha256,received});else report.verified++;}catch(error){report.errors.push({resource:asset.path,cause:error.message});}}}));
 report.result=report.errors.length?'FAIL':'PASS';if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length)process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
