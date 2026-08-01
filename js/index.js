(function(){
  "use strict";

  const $=id=>document.getElementById(id);
  const runtime={file:null,cloud:null};

  const format=value=>{
    if(!value)return"Sin actualización";
    const date=new Date(value);
    return Number.isNaN(date.getTime())?"Sin actualización":date.toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});
  };

  function toast(message,type=""){
    const host=$("toastContainer");
    if(!host)return;
    const item=document.createElement("div");
    item.className=`toast ${type?`is-${type}`:""}`;
    item.textContent=message;
    host.appendChild(item);
    setTimeout(()=>item.remove(),4500);
  }

  function clock(){
    const now=new Date();
    $("todayLabel").textContent=now.toLocaleDateString("es-CO",{weekday:"short",day:"2-digit",month:"short"});
    $("reloj").textContent=now.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"});
  }

  function refreshHeroStatus(){
    const target=$("heroOperationalStatus");
    if(!target)return;
    const fileReady=runtime.file?.status==="ready";
    const cloudReady=runtime.cloud?.status==="ready";
    const cloudSession=Boolean(runtime.cloud?.user);
    if(fileReady&&cloudReady)target.textContent="Sistema sincronizado";
    else if(fileReady&&cloudSession)target.textContent="Archivo listo · publicación pendiente";
    else if(fileReady)target.textContent="Archivo listo · nube desconectada";
    else target.textContent="Configuración inicial pendiente";
  }

  async function refreshLocal(){
    const data=await EventDataStore.load();
    const updated=data.updatedAt||localStorage.getItem("eventDataUpdatedAt");
    const count=data.count||data.rows?.length||0;
    $("localEventCount").textContent=`${count} eventos`;
    $("lastLocalUpdate").textContent=format(updated);
    $("fileCardDescription").textContent=data.fileName?`${data.fileName} · ${count} eventos`:"Selecciona el Excel durante la primera autorización del equipo.";

    const device=localStorage.getItem("rpt:deviceName")||"Equipo sin autorizar";
    $("deviceNameLabel").textContent=device;
    $("headerDeviceName").textContent=device;

    const status=$("dataStatusIndicator");
    status.className=`status-chip ${updated?"is-ready":"is-warning"}`;
    status.querySelector("span").textContent=updated?"Datos actualizados":"Datos sin verificar";

    if(EventDataStore.estimate){
      const estimate=await EventDataStore.estimate();
      if(estimate?.quota){
        const pct=Math.min(100,Math.max(3,(estimate.usage/estimate.quota)*100));
        $("storageMeterBar").style.width=`${pct}%`;
        $("storageInfo").textContent=`${(estimate.usage/1048576).toFixed(1)} MB usados de ${(estimate.quota/1048576).toFixed(0)} MB disponibles`;
      }
    }
    refreshHeroStatus();
  }

  function updateFile(state){
    runtime.file=state||{};
    const ready=state.status==="ready";
    const permission=state.status==="permission";
    const error=state.status==="error";
    $("fileStatusButton").className=`status-chip ${ready?"is-ready":error?"is-error":"is-warning"}`;
    $("fileStatusButton").querySelector("span").textContent=ready?"Archivo conectado":permission?"Reconectar archivo":error?"Revisar archivo":"Archivo no vinculado";
    $("fileCardTitle").textContent=ready?state.fileName||"Archivo conectado":permission?"Permiso requerido":error?"Archivo no disponible":"Sin vincular";
    $("fileCardDescription").textContent=state.message||"Selecciona el archivo maestro.";
    $("filePrimaryAction").textContent=permission?"Reconectar":"Vincular o cambiar";
    $("fileRefreshAction").hidden=!ready;
    refreshHeroStatus();
  }

  function updateCloud(state){
    runtime.cloud=state||{};
    const publishing=state.status==="publishing";
    const connected=Boolean(state.user);
    const ready=state.status==="ready";
    const degraded=connected&&state.status==="error";

    const chip=$("cloudStatusButton");
    chip.className=`status-chip ${ready?"is-ready":degraded?"is-warning":state.status==="error"?"is-error":"is-warning"}`;
    chip.querySelector("span").textContent=publishing?"Publicando":ready?"Nube conectada":degraded?"Sesión activa":"Nube pendiente";

    $("cloudCardTitle").textContent=publishing?"Publicando cambios":ready?"Firebase conectado":degraded?"Publicación pendiente":"Esperando conexión";
    $("cloudCardDescription").textContent=degraded
      ?"El propietario está conectado. Puedes reintentar la publicación sin volver a escribir la contraseña."
      :(state.message||"La sesión del propietario se conserva en este navegador.");

    $("cloudPrimaryAction").textContent=connected?"Ver conexión":"Conectar nube";
    $("publishAction").hidden=!connected;
    $("publishAction").disabled=publishing;

    const last=state.lastPublished||localStorage.getItem("firebase:lastPublishedAt");
    $("lastCloudUpdate").textContent=format(last);
    refreshHeroStatus();
  }

  async function setupSubmit(event){
    event.preventDefault();
    const message=$("setupMessage");
    message.hidden=true;
    const button=event.currentTarget.querySelector("button[type=submit]");
    button.disabled=true;
    button.textContent="Procesando…";
    try{
      if(!window.ExcelFileSync)throw new Error("El módulo del archivo todavía no está listo.");
      const fileOk=await (ExcelFileSync.hasHandle()?ExcelFileSync.refresh():ExcelFileSync.chooseFile());
      if(!fileOk)throw new Error("No se seleccionó el archivo maestro.");

      const waitStart=Date.now();
      while(!window.FirebaseEventPublisher&&Date.now()-waitStart<10000)await new Promise(resolve=>setTimeout(resolve,100));
      if(!window.FirebaseEventPublisher)throw new Error("Firebase todavía no está listo.");

      await FirebaseEventPublisher.signInOwner($("setupEmail").value.trim(),$("setupPassword").value);
      const name=$("setupDeviceName").value.trim()||"Equipo principal";
      FirebaseEventPublisher.setDeviceAuthorized(name);

      if($("setupNotifications").checked&&"Notification"in window&&Notification.permission==="default"){
        try{await Notification.requestPermission();}catch(_){}
      }

      localStorage.setItem("firebase:ownerEmail",$("setupEmail").value.trim());
      $("setupModal").classList.remove("is-open");
      $("setupModal").setAttribute("aria-hidden","true");
      document.body.classList.remove("modal-open");
      toast("Equipo autorizado, archivo conectado y sesión guardada.","success");
      refreshLocal();
    }catch(error){
      console.error(error);
      message.hidden=false;
      message.textContent=error.message||"No fue posible completar la autorización.";
    }finally{
      button.disabled=false;
      button.textContent="Autorizar y seleccionar Excel";
    }
  }

  function maybeOpenSetup(){
    if(localStorage.getItem("rpt:deviceAuthorized")==="1")return;
    $("setupDeviceName").value=localStorage.getItem("rpt:deviceName")||`${navigator.userAgentData?.platform||navigator.platform||"Equipo"} principal`;
    $("setupEmail").value=localStorage.getItem("firebase:ownerEmail")||"cgryttaca@gmail.com";
    $("setupModal").classList.add("is-open");
    $("setupModal").setAttribute("aria-hidden","false");
    document.body.classList.add("modal-open");
  }

  document.addEventListener("DOMContentLoaded",()=>{
    clock();
    setInterval(clock,30000);
    refreshLocal();

    $("setupForm").addEventListener("submit",setupSubmit);
    $("fileStatusButton").onclick=()=>ExcelFileSync?.openPanel();
    $("filePrimaryAction").onclick=()=>ExcelFileSync?.chooseFile().catch(error=>toast(error.message,"error"));
    $("fileRefreshAction").onclick=()=>ExcelFileSync?.refresh().catch(error=>toast(error.message,"error"));
    $("cloudStatusButton").onclick=()=>FirebaseEventPublisher?.openPanel();
    $("cloudPrimaryAction").onclick=()=>FirebaseEventPublisher?.openPanel();
    $("publishAction").onclick=()=>FirebaseEventPublisher?.publish({manual:true});

    setTimeout(maybeOpenSetup,900);
    setTimeout(()=>$("loader")?.classList.add("is-hidden"),250);
  });

  window.addEventListener("excelSyncState",event=>{updateFile(event.detail);refreshLocal();});
  window.addEventListener("firebasePublisherState",event=>updateCloud(event.detail));
  window.addEventListener("eventDataUpdated",()=>refreshLocal());
  window.addEventListener("firebaseEventsPublished",event=>{
    refreshLocal();
    const detail=event.detail||{};
    toast(`Agenda móvil actualizada: ${detail.updated||0} modificados, ${detail.created||0} nuevos.`,"success");
  });
})();