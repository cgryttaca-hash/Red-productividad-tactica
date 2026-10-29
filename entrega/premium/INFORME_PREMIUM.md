# Entrega de Agenda Móvil premium

29 de octubre de 2026 · America/Bogota, confirmada por el usuario.

Se entrega el proyecto completo, con identidad original, interfaz móvil premium, iconos exportados, FCM y programación de alimentación. **El código y las pruebas locales están terminados; el despliegue de Firebase, la asociación del par VAPID real y las pruebas físicas quedan pendientes.** No había credenciales administrativas, claves reales ni una sesión de despliegue en este equipo. No se modificó producción.

## Resultado

- 19 recursos de identidad: SVG, PNG, ICO con cuatro tamaños, iconos estándar, adaptables, Apple de 180 px y badge transparente. Letras vectorizadas, sin dependencia de fuentes.
- Tema azul oscuro, dorado y blanco limitado a Agenda Móvil: encabezado, filtros, botones, tarjetas, detalle, permisos, avisos y estados. Nombre, rutas y controles originales conservados.
- Un único service worker y caché versionada; recuperación offline, actualización voluntaria y navegación desde avisos limitada al ámbito permitido. No se declara una pantalla de inicio nativa uniforme.
- Registro FCM con getToken, VAPID pública y worker existente; renovación y baja. Web Push anterior se conserva como alternativa. Secrets y credenciales siguen en backend.
- Alertas calculadas desde HORARIO AYB/horarioAyB: menos 15 minutos, Bogotá, empresa y servicio reales. Cloud Tasks programa, la publicación reconcilia y Cloud Scheduler recupera pendientes. Se verifican cambios y cancelaciones antes del despacho.
- Identificadores y transacciones controlan duplicados; recibos persistentes en el worker controlan repeticiones. Los rechazos de proveedor, resultados desconocidos y vencimientos quedan diferenciados. Un envío aceptado no se presenta como recibido. La ventana de 45 segundos evita avisos viejos; se documenta su efecto sobre recuperación tardía.
- Se retiran reglas y textos de notificaciones de finalización y del día siguiente. El filtro Próximos se mantiene. No se alteran otras funciones operativas.

## Análisis y protección

La base fue la entrega anterior con mejoras administrativas y Agendas. Se revisaron la publicación Excel → bloques Firebase, la consulta móvil, sus filtros, caché, permisos, único worker y backend Web Push. El horario independiente ya existe como HORARIO AYB; no se reutilizó el horario general. Las nuevas colecciones solo guardan programación, suscripciones y resultados técnicos. Los eventos conservan la fuente y el esquema previos.

Se trabajó en una copia y se conservó el ZIP base. La última petición autoriza rediseñar Agenda Móvil y sustituir sus reglas de avisos; la protección inicial de sus reglas de negocio se mantiene. No se cambiaron cálculos, normalización, orden por piso/salón, filtros, búsqueda, asignación, datos de Minuta ni conexiones Excel/Firebase. Los archivos compartidos de autenticación, publicación y reglas de acceso permanecen iguales.

## Verificación local

35 comprobaciones agrupadas aprobadas, más validación de sintaxis de 47 scripts, 145 referencias locales existentes, revisión visual y comprobación del paquete.

| Área | Resultado y alcance |
| --- | --- |
| Regresión comparativa | Mismos resultados de Eventos, Minuta y Agenda Móvil frente a la base. Generación, copia y alternativa manual de Agendas conservadas. |
| Excel | Archivo XLSX real generado/importado en pruebas: cinco registros con identificadores únicos; sin publicar datos de ensayo. |
| Impresión | 2 páginas rasterizadas de Minuta/Eventos idénticas píxel a píxel. |
| Diseño | 40 revisiones de páginas administrativas; cinco anchos móviles premium entre 360 y 1440 px sin desbordamiento. Inspección de logo, tarjetas, detalle y pantalla de permisos. |
| Iconos/PWA | Dimensiones PNG/ICO, rutas, manifiesto, círculo seguro maskable, instalación real del worker local y caché offline. Instalación de la app en teléfono no probada. |
| Alimentación | Bogotá, medianoche, AM/PM, múltiples servicios, fechas imposibles, cancelación, retirada, cambios, reactivación, duplicados, concurrencia, fuente obsoleta, cuota, token revocado y expiración. Firestore/Tasks controlados, sin emulador ni servicios desplegados. |
| FCM | SDK/servidor controlados: token, worker compartido, renovación, baja y estado confirmado. Backend cargado con sus dependencias reales; cifrado Web Push construido localmente. |
| Worker | IndexedDB real en Chrome: dos solicitudes concurrentes generan una solicitud de visualización; alerta vencida y finalización descartadas. No acredita recepción del sistema operativo. |
| Apple | Motor WebKit 26.5 con perfiles de iPhone/iPad: instalación guiada, modo instalado simulado, campos sin zoom, filtros, detalle, orientación y copia/alternativa manual. No equivale a un iPhone físico. |
| Consola | Sin excepciones JavaScript, errores de consola ni recursos locales ausentes en los flujos principales. La prueba offline provoca los errores de red esperados y conserva la consulta. |

## Rendimiento medido

En la carga inicial controlada de cinco eventos y un bloque, la base hizo una consulta adicional a publicacion y dos lecturas del bloque. La versión premium utiliza el listener, no hace esa consulta adicional y lee el bloque una vez. La consulta de mantenimiento se conserva. Un refresco sin cambios conserva los nodos de las tarjetas; un bloque cuya huella no cambió se reutiliza. Estas mediciones no son un benchmark de latencia de producción.

La caché se identifica como copia guardada hasta una confirmación de red. Los avisos locales de alimentación exigen datos recientes y agenda visible. La planificación se reutiliza entre comprobaciones para no recalcular fechas cada segundo.

## Pendientes externos y límites

Faltan el par VAPID real asociado al proyecto, secretos, endpoint HTTPS de funciones, despliegue de índices/Functions/Tasks/Scheduler, verificación de cuentas y permisos y recepción en teléfonos físicos Android/iOS. Se incluyen instrucciones concretas en DESPLIEGUE_FIREBASE.md. El endpoint vacío provoca un estado de configuración pendiente; conceder permiso por sí solo no activa el backend.

Cloud Tasks fija la hora del intento; conectividad, proveedor y sistema operativo pueden retrasar o impedir la recepción. Reservas o respuestas ambiguas se conservan sin reenvío ciego para priorizar evitar duplicados. Una cancelación no puede retirar un mensaje ya aceptado por el proveedor. No se verificaron automatizaciones de un despliegue externo.

## Archivos y recuperación

13 archivos de aplicación modificados, 27 nuevos y 93 idénticos. Ningún archivo adicional eliminado. Consulta ARCHIVOS_MODIFICADOS.md e INVENTARIO_SHA256.json. Los cuatro módulos autorizados continúan retirados; se conservan servicios compartidos válidos. Los informes anteriores permanecen como historial.

El ZIP de recuperación Red-productividad-tactica-main-Agendas-PWA.zip permanece separado y sin modificar. No borres el almacenamiento del sitio al actualizar; conserva usuarios, Excel vinculado y registros. Para revertir, restaura los archivos de esa versión y revisa con el administrador las funciones/tareas de alimentación nuevas, de manera que no queden avisos activos tras volver al cliente anterior.

Los resultados detallados están en RESULTADOS_PREMIUM.json y evidencias/. El ZIP incluye código completo, guías y pruebas; no incluye node_modules, navegadores, secretos ni credenciales privadas.
