import {readAdminRecords} from './admin-records.js';
import {normalizeRecords} from './admin-analytics.js';
let lastRows,lastEvents;
export function adminDataset(){const snapshot=readAdminRecords();if(snapshot.rows!==lastRows){lastRows=snapshot.rows;lastEvents=normalizeRecords(snapshot.rows);}return{...snapshot,events:lastEvents};}
