const fs=require('node:fs'),path=require('node:path');process.env.TEST_VENDOR_PATH=path.resolve(__dirname,'../../assets/vendor');
const h=require('../v44/helper.cjs'),out=path.resolve(__dirname,'../../test-results/v48');fs.mkdirSync(out,{recursive:true});
async function contextFor(version,options={}){
 const {owner=false,deviceStatus='approved',deviceUid='qa-device-current',...rest}=options,context=await h.contextFor(version,rest),records=new Map();
 if(deviceStatus!==null)records.set(deviceUid,{schema:2,deviceId:deviceUid,authUid:deviceUid,deviceName:'Dispositivo de ensayo',status:deviceStatus,authorized:deviceStatus==='approved',revoked:deviceStatus==='revoked',clientCreatedAt:'2026-10-27T15:00:00Z',clientLastSeenAt:'2026-10-27T15:00:00Z'});
 await context.exposeBinding('__qaDeviceServer',async(_source,method,input={})=>{
  const id=input.id;
  if(method==='get')return records.get(id)||null;
  if(method==='list'){if(!owner)throw Error('permission-denied');return [...records].map(([id,data])=>({id,data}));}
  if(method==='set'){
   const previous=records.get(id),data=input.data;
   if(input.dbName==='[DEFAULT]'&&owner)records.set(id,{...previous,...data});
   else{if(id!==deviceUid)throw Error('permission-denied');if(!previous){if(data.status!=='pending'||data.authorized!==false||data.revoked!==false)throw Error('permission-denied');records.set(id,data);}
   else{const keys=Object.keys(data);if(keys.some(key=>!['lastSeenAt','clientLastSeenAt','localUsername','localDisplayName'].includes(key)))throw Error('permission-denied');records.set(id,{...previous,...data});}}
   return true;
  }throw Error('Método de prueba desconocido.');
 });
 const uid=fs.readFileSync(path.resolve(__dirname,'../../js/firebase-config.js'),'utf8').match(/FIREBASE_OWNER_UID\s*=\s*"([^"]+)"/)[1];
 await context.addInitScript(({uid,owner,deviceUid})=>{window.__qaDeviceUid=deviceUid;if(owner)window.__qaOwner={uid,email:'owner@example.invalid',isAnonymous:false};},{uid,owner,deviceUid});
 await context.route('**/firebase-auth.js',route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:h.authMock.replace('currentUser:null',"currentUser:app.name==='rpt-device-registry'?{uid:window.__qaDeviceUid,isAnonymous:true}:(window.__qaOwner||null)")}));
 let mock=h.firestoreMock.replace('export const getFirestore=()=>({});','export const getFirestore=app=>({dbName:app.name});').replace("export const doc=(database,name,id)=>({path:id?name+'/'+id:(database.path?database.path+'/'+name:name)});","export const doc=(database,name,id)=>({dbName:database.dbName,path:id?name+'/'+id:(database.path?database.path+'/'+name:name)});");
 mock="function deviceSnap(id,data){return{id,exists:()=>Boolean(data),data:()=>data,metadata:{fromCache:false,hasPendingWrites:false}};}\n"+mock;
 mock=mock.replace('export const getDoc=async ref=>{',"export const getDoc=async ref=>{if(ref.path.startsWith('equipos_autorizados/'))return deviceSnap(ref.path.split('/')[1],await window.__qaDeviceServer('get',{id:ref.path.split('/')[1]}));");
 mock=mock.replace('export const getDocs=async()=>({docs:window.__testEvents.map',"export const getDocs=async ref=>ref?.path==='equipos_autorizados'?{docs:(await window.__qaDeviceServer('list')).map(item=>({id:item.id,data:()=>item.data}))}:({docs:window.__testEvents.map");
 mock=mock.replace("if(typeof options==='function')callback=options;listeners.set", "if(typeof options==='function')callback=options;if(ref.path.startsWith('equipos_autorizados/')){let active=true;window.__qaDeviceNotify=async()=>{if(active)callback(await getDoc(ref));};queueMicrotask(window.__qaDeviceNotify);return()=>{active=false;};}listeners.set");
 mock=mock.replace('export async function setDoc(ref,value,options){',"export async function setDoc(ref,value,options){if(ref.path.startsWith('equipos_autorizados/')){await window.__qaDeviceServer('set',{id:ref.path.split('/')[1],data:value,dbName:ref.dbName});await window.__qaDeviceNotify?.();return;}");
 mock+='\nexport const getDocsFromServer=getDocs;';
 await context.route('**/firebase-firestore.js',route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:mock}));
 context.qaRecords=records;context.qaApprove=async(id,status)=>{records.set(id,{...records.get(id),status,authorized:status==='approved',revoked:status==='revoked'});for(const page of context.pages())if(!page.isClosed())await page.evaluate(()=>window.__qaDeviceNotify?.()).catch(()=>{});};
 return context;
}
function save(name,value){fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2));}
async function select(page,key){await page.locator(`[data-control-section=${key}]`).click();await page.waitForFunction(key=>document.documentElement.dataset.currentControlSection===key,key);}
module.exports={...h,contextFor,save,out,select};
