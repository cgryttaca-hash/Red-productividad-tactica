const USERS_KEY = 'rptAuthUsersV1';
const SESSION_KEY = 'rptAuthSessionV1';
const DEVICE_KEY = 'rptAuthDeviceV1';
const DEFAULT_ADMIN_USERNAME = 'Admin';
const DEFAULT_ADMIN_PASSWORD = 'Admin2026';
const PBKDF2_ITERATIONS = 120000;

const encoder = new TextEncoder();

function normalizeUsername(value){
  return String(value ?? '').trim().toLocaleLowerCase('es');
}

function readJson(key, fallback){
  try{
    const value = JSON.parse(localStorage.getItem(key) || '');
    return value ?? fallback;
  }catch(_){
    return fallback;
  }
}

function writeJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function bytesToBase64(bytes){
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value){
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function randomSalt(){
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

async function deriveHash(password, saltBase64){
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name:'PBKDF2',
      hash:'SHA-256',
      salt:base64ToBytes(saltBase64),
      iterations:PBKDF2_ITERATIONS
    },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

function deviceId(){
  let device = localStorage.getItem(DEVICE_KEY);
  if(device) return device;
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  device = `device_${bytesToBase64(bytes).replace(/[+/=]/g,'').slice(0,18)}`;
  localStorage.setItem(DEVICE_KEY, device);
  return device;
}

function cleanUser(user){
  if(!user) return null;
  const {passwordHash, salt, ...safe} = user;
  return safe;
}

export async function ensureDefaultAdmin(){
  const users = readJson(USERS_KEY, []);
  if(users.some(user => normalizeUsername(user.username) === normalizeUsername(DEFAULT_ADMIN_USERNAME))){
    return;
  }
  const salt = randomSalt();
  const passwordHash = await deriveHash(DEFAULT_ADMIN_PASSWORD, salt);
  const now = new Date().toISOString();
  users.push({
    id:`usr_${Date.now().toString(36)}`,
    username:DEFAULT_ADMIN_USERNAME,
    normalizedUsername:normalizeUsername(DEFAULT_ADMIN_USERNAME),
    displayName:'Administrador',
    role:'admin',
    active:true,
    salt,
    passwordHash,
    createdAt:now,
    updatedAt:now,
    lastLoginAt:null,
    passwordChangedAt:null
  });
  writeJson(USERS_KEY, users);
}

export function getSession(){
  const session = readJson(SESSION_KEY, null);
  if(!session || session.deviceId !== deviceId()) return null;
  const users = readJson(USERS_KEY, []);
  const user = users.find(item => item.id === session.userId && item.active);
  if(!user) return null;
  return {...session, user:cleanUser(user)};
}

export function isAuthenticated(){
  return Boolean(getSession());
}

export function logout(){
  const session=getSession();
  localStorage.removeItem(SESSION_KEY);
  import('./system-log.js').then(module=>module.addSystemLog({
    source:'Acceso',level:'info',title:'Sesión cerrada',
    detail:session?`${session.displayName||session.username} cerró sesión.`:'Sesión finalizada.'
  })).catch(()=>{});
}

export async function login(username, password){
  await ensureDefaultAdmin();
  const users = readJson(USERS_KEY, []);
  const normalizedUsername = normalizeUsername(username);
  const userIndex = users.findIndex(item => item.normalizedUsername === normalizedUsername);
  if(userIndex === -1) throw new Error('El usuario no existe.');
  const user = users[userIndex];
  if(!user.active) throw new Error('Este usuario está desactivado.');
  const passwordHash = await deriveHash(password, user.salt);
  if(passwordHash !== user.passwordHash) throw new Error('Usuario o contraseña incorrectos.');

  const now = new Date().toISOString();
  users[userIndex] = {...user, lastLoginAt:now};
  writeJson(USERS_KEY, users);

  const session = {
    userId:user.id,
    username:user.username,
    displayName:user.displayName,
    role:user.role,
    deviceId:deviceId(),
    loginAt:now
  };
  writeJson(SESSION_KEY, session);
  if(!localStorage.getItem('rpt:deviceName')){
    const platform=navigator.userAgentData?.platform||navigator.platform||'Equipo';
    const browser=navigator.userAgent.includes('Edg/')?'Edge':navigator.userAgent.includes('Chrome/')?'Chrome':navigator.userAgent.includes('Firefox/')?'Firefox':'Navegador';
    localStorage.setItem('rpt:deviceName',`${platform} · ${browser}`);
  }
  import('./system-log.js').then(module=>module.addSystemLog({
    source:'Acceso',level:'success',title:'Inicio de sesión',
    detail:`${user.displayName||user.username} ingresó desde ${localStorage.getItem('rpt:deviceName')||'este equipo'}.`
  })).catch(()=>{});
  return {...session, user:cleanUser(users[userIndex])};
}

export async function listUsers(){
  await ensureDefaultAdmin();
  return readJson(USERS_KEY, []).map(cleanUser);
}

export async function createUser({username, displayName, password, role='viewer'}){
  await ensureDefaultAdmin();
  const users = readJson(USERS_KEY, []);
  const normalizedUsername = normalizeUsername(username);
  if(!normalizedUsername) throw new Error('Escribe un nombre de usuario.');
  if(users.some(item => item.normalizedUsername === normalizedUsername)){
    throw new Error('Ese usuario ya existe.');
  }
  if(String(password).length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  const salt = randomSalt();
  const passwordHash = await deriveHash(password, salt);
  const now = new Date().toISOString();
  const user = {
    id:`usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,
    username:String(username).trim(),
    normalizedUsername,
    displayName:String(displayName || username).trim(),
    role:role === 'admin' ? 'admin' : 'viewer',
    active:true,
    salt,
    passwordHash,
    createdAt:now,
    updatedAt:now,
    lastLoginAt:null,
    passwordChangedAt:null
  };
  users.push(user);
  writeJson(USERS_KEY, users);
  return cleanUser(user);
}

export async function changePassword(userId, password){
  if(String(password).length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  const users = readJson(USERS_KEY, []);
  const index = users.findIndex(item => item.id === userId);
  if(index === -1) throw new Error('Usuario no encontrado.');
  const salt = randomSalt();
  const passwordHash = await deriveHash(password, salt);
  const now = new Date().toISOString();
  users[index] = {
    ...users[index],
    salt,
    passwordHash,
    passwordChangedAt:now,
    updatedAt:now
  };
  writeJson(USERS_KEY, users);
  return cleanUser(users[index]);
}

export async function updateUser(userId, changes){
  const users = readJson(USERS_KEY, []);
  const index = users.findIndex(item => item.id === userId);
  if(index === -1) throw new Error('Usuario no encontrado.');
  const current = users[index];
  const nextUsername = changes.username !== undefined ? String(changes.username).trim() : current.username;
  const normalizedUsername = normalizeUsername(nextUsername);
  if(!normalizedUsername) throw new Error('El usuario no puede quedar vacío.');
  if(users.some(item => item.id !== userId && item.normalizedUsername === normalizedUsername)){
    throw new Error('Ese usuario ya existe.');
  }
  const nextRole = changes.role === 'admin' ? 'admin' : changes.role === 'viewer' ? 'viewer' : current.role;
  const active = changes.active !== undefined ? Boolean(changes.active) : current.active;
  const adminCount = users.filter(item => item.role === 'admin' && item.active).length;
  if(current.role === 'admin' && current.active && (nextRole !== 'admin' || !active) && adminCount <= 1){
    throw new Error('Debe existir al menos un administrador activo.');
  }
  users[index] = {
    ...current,
    username:nextUsername,
    normalizedUsername,
    displayName:changes.displayName !== undefined ? String(changes.displayName).trim() : current.displayName,
    role:nextRole,
    active,
    updatedAt:new Date().toISOString()
  };
  writeJson(USERS_KEY, users);
  return cleanUser(users[index]);
}

export async function deleteUser(userId){
  const session = getSession();
  if(session?.userId === userId) throw new Error('No puedes eliminar tu propia sesión.');
  const users = readJson(USERS_KEY, []);
  const target = users.find(item => item.id === userId);
  if(!target) throw new Error('Usuario no encontrado.');
  const adminCount = users.filter(item => item.role === 'admin' && item.active).length;
  if(target.role === 'admin' && target.active && adminCount <= 1){
    throw new Error('No puedes eliminar el único administrador.');
  }
  writeJson(USERS_KEY, users.filter(item => item.id !== userId));
}

export async function resetDefaultAdmin(){
  await ensureDefaultAdmin();
  const users = readJson(USERS_KEY, []);
  const index = users.findIndex(item => item.normalizedUsername === normalizeUsername(DEFAULT_ADMIN_USERNAME));
  if(index === -1) throw new Error('No se encontró el usuario Admin.');
  const salt = randomSalt();
  const passwordHash = await deriveHash(DEFAULT_ADMIN_PASSWORD, salt);
  const now = new Date().toISOString();
  users[index] = {
    ...users[index],
    username:DEFAULT_ADMIN_USERNAME,
    normalizedUsername:normalizeUsername(DEFAULT_ADMIN_USERNAME),
    displayName:users[index].displayName || 'Administrador',
    role:'admin',
    active:true,
    salt,
    passwordHash,
    passwordChangedAt:now,
    updatedAt:now
  };
  writeJson(USERS_KEY, users);
  return cleanUser(users[index]);
}

export function getDefaultCredentials(){
  return {username:DEFAULT_ADMIN_USERNAME, password:DEFAULT_ADMIN_PASSWORD};
}
