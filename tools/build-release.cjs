const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),argumentsValue=process.argv.slice(2),candidate=argumentsValue.includes('--candidate');
const version=argumentsValue.includes('--version')?argumentsValue[argumentsValue.indexOf('--version')+1]:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
if(!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(version))throw new Error('Uso: node tools/build-release.cjs --version 4.0.0 [--candidate]');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const releaseDate=new Date(process.env.SOURCE_DATE_EPOCH?Number(process.env.SOURCE_DATE_EPOCH)*1000:Date.now()).toISOString().slice(0,10);
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);
const roots=fs.readdirSync(root).filter(file=>/\.(html|webmanifest)$/.test(file));
const runtime=[...roots,...['css','js','assets'].flatMap(folder=>walk(path.join(root,folder)).map(file=>path.relative(root,file).replaceAll('\\','/')))];
// Canonicalizar ANTES de calcular SHA-256. No se normalizan datos ni binarios.
for(const file of runtime){if(/\.(?:html|css|js|svg|txt|webmanifest)$/i.test(file)){const target=path.join(root,file),before=fs.readFileSync(target),after=Buffer.from(before.toString('utf8').replace(/\r\n/g,'\n'));if(!before.equals(after))fs.writeFileSync(target,after);}}
fs.copyFileSync(path.join(root,'js/food-alerts-core.js'),path.join(root,'functions/food-alerts-core.mjs'));
fs.writeFileSync(path.join(root,'js/release-info.js'),`export const RELEASE_VERSION='${version}';\n`);
fs.writeFileSync(path.join(root,'VERSION.txt'),version+'\n');
fs.copyFileSync(path.join(root,'js/assistant-core.js'),path.join(root,'functions/assistant-core.js'));
const hashes=JSON.parse(fs.readFileSync(path.join(root,'PROTECTED_MODULES.json')));
for(const file of Object.keys(hashes))hashes[file]=hash(fs.readFileSync(path.join(root,file)));
fs.writeFileSync(path.join(root,'PROTECTED_MODULES.json'),JSON.stringify(hashes,null,2)+'\n');
const oldVersion=fs.readFileSync(path.join(root,'js/system-version.js'),'utf8');
const updated=oldVersion.replace(/export const SYSTEM_VERSION = '[^']+';/,`export const SYSTEM_VERSION = '${version}';`).replace(/export const RELEASE_DATE = '[^']+';/,`export const RELEASE_DATE = '${releaseDate}';`).replace(/export const RELEASE_NAME = '[^']+';/,"export const RELEASE_NAME = 'Operación, versiones seguras y asistente';").replace(/export const PROTECTED_MODULES = Object.freeze\(\{[\s\S]*?\}\);/,'export const PROTECTED_MODULES = Object.freeze('+JSON.stringify(hashes,null,2)+');');
fs.writeFileSync(path.join(root,'js/system-version.js'),updated);
const assets=runtime.sort().map(file=>({path:file,sha256:hash(fs.readFileSync(path.join(root,file)))}));
const descriptor={version,assets};descriptor.digest=hash(JSON.stringify(descriptor));
fs.writeFileSync(path.join(root,'release.json'),JSON.stringify(descriptor,null,2)+'\n');
const workerPath=path.join(root,'sw.js'),source=fs.readFileSync(workerPath,'utf8');
const tail=source.slice(source.indexOf('function notificationUrl')).replace(/\r\n/g,'\n');
if(!tail.startsWith('function notificationUrl')||!tail.includes("self.addEventListener('push'"))throw new Error('No se encontró la lógica de notificaciones existente.');
const worker=`const RELEASE = ${JSON.stringify(descriptor)};\n${fs.readFileSync(path.join(root,'js/release-worker.js'),'utf8')}\n${tail}`;
const required=['js/release-worker.js','js/pwa-release.js','js/release-info.js','js/update-safety.js'];
if(required.some(file=>!fs.existsSync(path.join(root,file))))throw new Error('Faltan dependencias de actualización.');
fs.writeFileSync(path.join(root,candidate?'sw-candidate.js':'sw.js'),worker);
const destination=path.join(root,'dist');fs.mkdirSync(destination,{recursive:true});
for(const file of [...runtime,'release.json',...(fs.existsSync(path.join(root,'data/eventos_publicos.json'))?['data/eventos_publicos.json']:[])]){const target=path.join(destination,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
fs.writeFileSync(path.join(destination,'sw.js'),worker);
fs.writeFileSync(path.join(root,'.nojekyll'),'');fs.writeFileSync(path.join(destination,'.nojekyll'),'');fs.copyFileSync(path.join(root,'.gitattributes'),path.join(destination,'.gitattributes'));
console.log(JSON.stringify({version,resources:assets.length,digest:descriptor.digest,candidate,publicDirectory:'dist',excluded:['functions','entrega','tools','.github','secrets']}));
