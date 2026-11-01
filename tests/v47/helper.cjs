const fs=require('node:fs'),path=require('node:path'),h=require('../v46/helper.cjs');
const out=path.resolve(__dirname,'../../test-results/v47');fs.mkdirSync(out,{recursive:true});
function save(name,value){fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2));}
module.exports={...h,out,save};
