# Validación de optimización 3.1.0

- Fecha: 2026-08-26
- Alcance: Inicio, Agenda Móvil, Configuración, PWA y notificaciones.
- Firebase: configuración existente conservada.
- Excel: lógica de lectura/sincronización conservada; el lector se difiere en Inicio para no bloquear el primer render.
- Eventos y Minuta: no modificados. Sus hashes SHA-256 coinciden con `PROTECTED_MODULES.json`.
- Auditoría: fecha/hora, usuario, equipo, hoja, celda y valores se muestran en Inicio/Agenda según disponibilidad.
- IP pública: no se recopila ni se inventa; requeriría un servicio de red externo y una decisión explícita de privacidad.
- PWA: caché inicial reducida a la carcasa principal; archivos adicionales se cachean cuando se visitan.
- Validación estática: JavaScript modificado pasa comprobación de sintaxis; HTML sin IDs duplicados ni referencias `$()` faltantes.
