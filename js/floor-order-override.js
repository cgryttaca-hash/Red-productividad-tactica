(function(){
  if(typeof normalize!=="function") return;
  window.detectPiso=function(salon){
    const s=normalize(salon);
    return /TERCER|PISO 3|PISO TRES|\b3\d{2}\b/.test(s)?"tercero":"segundo";
  };
  window.scenarioSortKey=function(salon){
    const s=normalize(salon);
    if(/TERCER|PISO 3|PISO TRES|\b3\d{2}\b/.test(s)) return {group:2,order:9999,label:s};
    let order=50;
    if(/\bSALON\s*1\b/.test(s)) order=1;
    else if(/\bSALON\s*2\b/.test(s)&&!/\b2\s*(\+|Y)\s*3\b/.test(s)) order=2;
    else if(/\bSALON\s*3\b/.test(s)&&!/\b2\s*(\+|Y)\s*3\b/.test(s)) order=3;
    else if(/\b2\s*(\+|Y)\s*3\b/.test(s)) order=4;
    else if(/COMPLETO/.test(s)) order=5;
    return {group:1,order,label:s};
  };
  window.sortForMinute=function(a,b){
    const ka=scenarioSortKey(a.salon),kb=scenarioSortKey(b.salon);
    if(ka.group!==kb.group) return ka.group-kb.group;
    if(ka.group===1&&ka.order!==kb.order) return ka.order-kb.order;
    const salonCompare=ka.label.localeCompare(kb.label,"es",{sensitivity:"base",numeric:true});
    if(salonCompare!==0) return salonCompare;
    return text(a.horario).localeCompare(text(b.horario),"es",{sensitivity:"base",numeric:true});
  };
})();