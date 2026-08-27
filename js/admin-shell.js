const header=document.querySelector('.tool-header');
if(header){
  document.body.classList.add('admin-suite');
  const nav=header.querySelector('.tool-nav');
  const brand=header.querySelector('.tool-brand');
  const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const icon=(name)=>({
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M9 21v-7h6v7"/></svg>',
    agenda:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h7"/></svg>',
    users:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6M16 6.5a3 3 0 0 1 0 5.5M16 14c2.8.4 4.3 2.4 4.5 6"/></svg>',
    config:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    audit:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5h6M8.5 9h7M8.5 13h7M8.5 17h4"/></svg>',
    diag:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17V7M4 17h16"/><path d="m7 14 3-4 3 2 4-6"/><circle cx="17" cy="6" r="1.5"/></svg>',
    backup:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5"/><path d="M20 4v4.5h-4.5M12 8v5l3 2"/></svg>',
    devices:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="14" height="11" rx="2"/><path d="M8 20h4M10 15v5"/><rect x="18" y="9" width="3" height="9" rx="1"/></svg>',
    validate:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
    lab:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7 16h10"/></svg>'
  }[name]||'');

  const links=[
    ['Operación',[
      ['index.html','Inicio','Vista general','home'],
      ['agenda_movil.html','Agenda móvil','Operación en vivo','agenda']
    ]],
    ['Administración',[
      ['usuarios.html','Usuarios','Accesos locales','users'],
      ['configuracion.html','Configuración','Sistema y apariencia','config'],
      ['auditoria.html','Auditoría','Trazabilidad','audit'],
      ['diagnostico.html','Diagnóstico','Estado técnico','diag'],
      ['respaldos.html','Respaldos','Copias de seguridad','backup'],
      ['equipos.html','Equipos','Dispositivos','devices'],
      ['validacion.html','Validación','Calidad del Excel','validate'],
      ['laboratorio.html','Laboratorio','Pruebas de archivo','lab']
    ]]
  ];
  if(nav){
    nav.innerHTML=links.map(([group,items])=>`<div class="admin-nav-group"><span class="admin-nav-label">${group}</span>${items.map(([href,label,meta,key])=>`<a href="${href}" class="${current===href?'active':''}"><i class="admin-nav-icon">${icon(key)}</i><span class="admin-nav-copy"><strong>${label}</strong><small>${meta}</small></span></a>`).join('')}</div>`).join('');
  }
  if(brand && !brand.querySelector('img')){
    const img=document.createElement('img');img.src='assets/icon-192.png';img.alt='';img.width=42;img.height=42;brand.prepend(img);
  }
  const toggle=document.createElement('button');
  toggle.className='admin-menu-toggle';toggle.type='button';toggle.setAttribute('aria-label','Abrir menú');toggle.setAttribute('aria-expanded','false');
  toggle.innerHTML='<span></span><span></span><span></span>';
  const backdrop=document.createElement('button');backdrop.className='admin-menu-backdrop';backdrop.type='button';backdrop.setAttribute('aria-label','Cerrar menú');backdrop.hidden=true;
  document.body.prepend(toggle);document.body.append(backdrop);
  const close=()=>{document.body.classList.remove('admin-menu-open');toggle.setAttribute('aria-expanded','false');backdrop.hidden=true;};
  const open=()=>{document.body.classList.add('admin-menu-open');toggle.setAttribute('aria-expanded','true');backdrop.hidden=false;};
  toggle.addEventListener('click',()=>document.body.classList.contains('admin-menu-open')?close():open());
  backdrop.addEventListener('click',close);nav?.addEventListener('click',event=>{if(event.target.closest('a')&&innerWidth<980)close();});
  addEventListener('keydown',event=>{if(event.key==='Escape')close();});
}
