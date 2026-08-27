# Historial de cambios

## 3.2.0 — 2026-08-26
- Rediseño completo del Inicio con barra lateral, centro de control, métricas y flujo visual Excel → Firebase.
- Rediseño completo de Agenda Móvil con resumen del día, buscador fijo, filtros en panel, navegación inferior y vista adaptada a teléfonos.
- PWA independiente para Agenda Móvil: al instalar desde esa página abre directamente `agenda_movil.html`.
- Menos trabajo en el primer render: auditoría, Excel, notificaciones y módulos secundarios se cargan de forma diferida.
- Agenda usa `content-visibility` para no dibujar grupos fuera de pantalla y reduce trabajo al buscar.
- Notificaciones de Excel incluyen, cuando existe, usuario/equipo, fecha/hora y el primer cambio detectado.
- Apariencia global o por página conserva sincronización en Firebase y añade tema Oscuro profesional.
- Caché PWA renovada a 3.2.0.
- Eventos y Minuta permanecen byte a byte sin modificaciones.

## 3.1.1 — 2026-08-26
- Corrección de acceso local de administrador con migración de usuarios guardados por versiones anteriores.
- Inicio de sesión ahora reconoce `username` aunque falte el campo interno `normalizedUsername`.
- Recuperación visible y confirmada de la cuenta local `Admin`; restablece a `Admin2026` solo cuando el administrador lo solicita.
- Caché PWA actualizada para evitar conservar una pantalla de acceso antigua.
- Eventos y Minuta permanecen sin modificaciones.

## 3.1.0 — 2026-08-26
- `index.html` simplificado y menú administrativo agrupado.
- Excel y Firebase arrancan después del primer render para reducir bloqueo inicial.
- Auditoría del Inicio limitada y cargada bajo demanda para reducir DOM y memoria.
- Agenda Móvil con loader ligero, instalación PWA visible y panel de cambios recientes en tiempo real.
- Temas globales y por página para Inicio, Agenda Móvil y Configuración, guardados en Firebase.
- Service Worker reducido a la carcasa esencial; el resto se almacena al usarse.
- Notificaciones con detalle del cambio cuando está disponible.
- Eventos y Minuta conservados byte a byte según hashes protegidos.

## 3.0.0 — 2026-08-01
- Centro de diagnóstico y reparación.
- Copias automáticas y restauración.
- Auditoría consultable y exportable.
- Validación avanzada del Excel.
- PWA instalable y caché offline.
- Métricas de rendimiento.
- Registro de equipos.
- Notificaciones operativas.
- Mantenimiento programable.
- Mejoras de filtros y accesibilidad en Agenda Móvil.
- Eventos y Minuta conservados sin cambios.
