self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows){
      if("focus"in client&&client.url.includes("agenda_movil.html"))return client.focus();
    }
    if(clients.openWindow)return clients.openWindow("./agenda_movil.html");
  })());
});