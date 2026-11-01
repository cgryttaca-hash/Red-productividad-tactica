const fs=require('node:fs'),path=require('node:path');
process.env.TEST_VENDOR_PATH=path.resolve(__dirname,'../../assets/vendor');
const h=require('../v44/helper.cjs'),out=path.resolve(__dirname,'../../test-results/v46');fs.mkdirSync(out,{recursive:true});
async function contextFor(version,options={}){
 const {owner=false,...rest}=options,context=await h.contextFor(version,rest);
 await context.route('**/firebase-firestore.js',route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:h.firestoreMock.replace('export const getDocFromServer=getDoc;','export const getDocFromServer=async ref=>{if(window.__qaServerUnavailable)throw Error("Servidor de ensayo desconectado");return getDoc(ref);};')}));
 if(owner){const uid=fs.readFileSync(path.resolve(__dirname,'../../js/firebase-config.js'),'utf8').match(/FIREBASE_OWNER_UID\s*=\s*"([^"]+)"/)[1];await context.addInitScript(uid=>window.__qaOwner={uid,email:'owner@example.invalid',isAnonymous:false},uid);await context.route('**/firebase-auth.js',route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:h.authMock.replace('currentUser:null','currentUser:window.__qaOwner||null')}));}
 return context;
}
async function select(page,name){await page.locator(`[data-control-section=${name}]`).click();await page.waitForFunction(name=>document.documentElement.dataset.currentControlSection===name&&!document.getElementById('admin-panel-'+name).hidden,name);}
function save(name,value){fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2));}
module.exports={...h,contextFor,select,save,out};
