const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../dist'));
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(JSON.stringify({version:release.version,assets:release.assets})),release.digest);
assert(release.assets.length>0);const seen=new Set();
for(const asset of release.assets){assert(!seen.has(asset.path));seen.add(asset.path);assert(!asset.path.includes('..')&&!path.isAbsolute(asset.path));assert.equal(hash(fs.readFileSync(path.join(root,asset.path))),asset.sha256,asset.path);}
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');const embedded=JSON.parse(worker.match(/^const RELEASE = (.+);/)[1]);assert.deepEqual(embedded,release);
assert(!fs.existsSync(path.join(root,'functions')));assert(!fs.existsSync(path.join(root,'.env')));
const allowed=new Set([...release.assets.map(asset=>asset.path),'sw.js','release.json','data/eventos_publicos.json']);
function checkFiles(directory,prefix=''){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=prefix+entry.name;if(entry.isDirectory())checkFiles(path.join(directory,entry.name),file+'/');else assert(allowed.has(file),'Archivo no permitido en la publicación: '+file);}}
checkFiles(root);
for(const file of ['manifest.webmanifest','agenda.webmanifest']){const manifest=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));assert(manifest.name&&manifest.short_name&&manifest.scope&&manifest.start_url&&manifest.id);for(const icon of manifest.icons)assert(fs.existsSync(path.join(root,icon.src)));}
assert.equal(fs.readFileSync(path.join(root,'js/assistant-core.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../functions/assistant-core.js'),'utf8'));
console.log(JSON.stringify({result:'PASS',version:release.version,resources:release.assets.length,workerDigest:release.digest,manifests:2}));
