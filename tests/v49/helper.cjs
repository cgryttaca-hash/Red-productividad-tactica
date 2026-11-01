const fs=require('node:fs'),path=require('node:path');process.env.TEST_VENDOR_PATH=path.resolve(__dirname,'../../assets/vendor');const h=require('../v44/helper.cjs');
const out=path.resolve(__dirname,'../../test-results/v49');fs.mkdirSync(out,{recursive:true});
function save(name,value){fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2));}
async function select(page,key){await page.locator('[data-control-section='+key+']').click();await page.waitForFunction(key=>document.documentElement.dataset.currentControlSection===key,key);}
module.exports={...h,out,save,select};
