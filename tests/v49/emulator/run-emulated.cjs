const path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9098');
const env={...process.env,TEST_AUTH_SDK:path.join(__dirname,'browser-sdk.js'),NODE_PATH:[path.join(__dirname,'node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)};
const result=spawnSync(process.execPath,[path.join(__dirname,'../reopen-real.cjs')],{env,stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status===null?1:result.status);
