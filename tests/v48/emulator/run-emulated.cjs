const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9098');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8089');
for(const file of ['rules.cjs','reopen-real.cjs']){
 const result=spawnSync(process.execPath,[file],{cwd:__dirname,env:process.env,stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
