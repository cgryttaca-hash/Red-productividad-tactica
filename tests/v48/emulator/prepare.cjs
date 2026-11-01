const fs=require('node:fs'),path=require('node:path');
fs.copyFileSync(path.resolve(__dirname,'../../../firestore.rules'),path.join(__dirname,'firestore.rules'));
require('./build-sdk.cjs');
