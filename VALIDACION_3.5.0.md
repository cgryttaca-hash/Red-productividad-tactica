# Validación 3.5.0

Fecha: 2026-08-27

## Acceso y roles
- Login Administrador: validado.
- Creación de Usuario y Administrador: validada con prueba aislada de almacenamiento local.
- Usuario normal no puede ejecutar acciones de administración desde `local-auth.js`.
- Cambio de contraseña propia: validado.
- Contraseña nunca se imprime en mensajes posteriores a creación/cambio.
- Recuperación pública desde `login.html`: retirada.

## Sesión
- Expiración por 1 hora de inactividad: validada.
- Expiración por límite de medianoche: validada.
- Aviso visual cinco minutos antes: implementado en `auth-guard.js`.
- Actualización de estado/rol entre pestañas: implementada mediante evento `storage`.

## Portal de Usuario
- Inicio independiente sin sidebar ni panel técnico.
- Accesos: Eventos, Minuta y Agenda Móvil.
- Mensaje motivacional determinístico que cambia por fecha.
- Notificaciones generales y contador de no leídos.
- Sincronización automática de publicación Firebase hacia `eventData` mediante `viewer-sync.js`.
- `eventDataUpdated` se emite para que Eventos y Minuta refresquen su lógica existente.

## Integridad
- 40 archivos JavaScript pasan `node --check`.
- 15 páginas HTML sin referencias locales faltantes ni IDs duplicados.
- 15 CSS con llaves balanceadas.
- 2 manifest válidos.
- Eventos y Minuta conservan los SHA-256 definidos en `PROTECTED_MODULES.json`.

## Nota de arquitectura
Las cuentas de acceso permanecen locales al navegador. La información operativa del usuario sí se actualiza automáticamente desde Firebase. La centralización de cuentas entre dispositivos requiere autenticación central con backend/Firebase Auth y administración segura de roles.
