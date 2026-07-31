window.addEventListener("load",()=>setTimeout(()=>document.getElementById("loader")?.classList.add("is-hidden"),180));
function formatDateTime(value){
  if(!value)return"Sin carga";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"Sin carga":date.toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});
}
function refreshLocalStatus(){
  const updatedAt=localStorage.getItem("eventDataUpdatedAt");
  const fileName=localStorage.getItem("excelSync:fileName");
  const device=localStorage.getItem("rpt:deviceName");
  document.getElementById("currentDeviceName").textContent=device||"Pendiente de autorización";
  document.getElementById("localUpdatedAt").textContent=formatDateTime(updatedAt);
  document.getElementById("localFileName").textContent=fileName||"Archivo maestro pendiente";
  const indicator=document.getElementById("dataStatusIndicator");
  indicator.classList.toggle("is-current",Boolean(updatedAt));
  indicator.classList.toggle("is-outdated",!updatedAt);
  indicator.querySelector("span").textContent=updatedAt?"Datos actualizados":"Datos sin verificar";
}
function clock(){
  const now=new Date();
  document.getElementById("todayLabel").textContent=now.toLocaleDateString("es-CO",{weekday:"short",day:"2-digit",month:"short"});
  document.getElementById("reloj").textContent=now.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"});
}
clock();setInterval(clock,30000);refreshLocalStatus();
window.addEventListener("eventDataUpdated",refreshLocalStatus);
window.addEventListener("firebaseEventsPublished",refreshLocalStatus);
window.addEventListener("storage",refreshLocalStatus);
