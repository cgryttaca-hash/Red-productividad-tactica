# Corrección de PWA, notificaciones y diseño premium

29 de octubre de 2026 · eventos en America/Bogota.

Proyecto completo actualizado a partir del ZIP premium anterior. La consulta móvil ahora funciona en navegador, la activación de avisos exige abrir la PWA instalada y la interfaz usa un tema común en las doce páginas. **El backend real de Firebase/FCM sigue pendiente de configuración y despliegue; no se declara operativo ni probado en teléfonos físicos.**

## Problemas encontrados

1. PUSH_CONFIG.apiBaseUrl estaba vacío. Ese valor provocaba exactamente el mensaje de servicio no configurado. No se proporcionaron una URL desplegada verificada, claves VAPID reales ni acceso administrativo. El campo histórico FIREBASE_VAPID_KEY tampoco conectaba al cliente actual.
2. La pantalla móvil bloqueaba la consulta hasta instalar y conceder permisos. Su botón podía pedir autorización desde el navegador. El módulo Push comprobaba y podía renovar el registro al arrancar sin exigir contexto instalado.
3. Existían dos manejadores del evento de instalación. Los módulos ES se cargaban con y sin parámetros de versión, lo que podía evaluar dos veces servicios compartidos. La configuración Push tenía caché permanente hasta cambiar el worker.
4. Una suscripción guardada se mostraba como activa sin verificar un envío. No había una prueba autenticada por dispositivo que distinguiera aceptación del proveedor de recepción física.
5. La Agenda acumulaba reglas visuales que producían cabecera y tarjetas altas. El tema premium solo cubría parte del sistema; mantenimiento y modo sin conexión aún mantenían estilos anteriores.

## Cambios implementados

- Consulta libre de Agenda Móvil antes de instalar, con ayuda de instalación en un panel compacto. Se conservan datos, fechas, búsqueda, filtros, pisos, detalle y copia.
- Instalación centralizada en pwa.js, con un único registro y guía específica para Safari. appinstalled se diferencia de abrir desde el icono. Conceder permiso continúa siendo una acción independiente.
- Antes de abrir la PWA instalada: cero solicitudes de permiso, tokens FCM o registros Push. La configuración del servidor tampoco se consulta como requisito para navegar.
- Después de abrirla: se valida la configuración pública, el botón pide permiso durante el clic, se obtiene el token con el worker existente y se guarda el registro. La activación verifica una prueba de envío. El estado registrado permanece distinto de activo cuando el proveedor no confirma.
- /test verifica sesión, origen y pertenencia del dispositivo, reserva el intento y limita pruebas repetidas. Los registros distinguen requested, accepted y failed. Un token cambiado invalida la verificación anterior. La aceptación no se presenta como recepción física.
- Los errores reales de configuración se muestran dentro de la PWA instalada. Falta de URL, variables incompletas y par VAPID incorrecto tienen mensajes concretos. La agenda continúa funcionando. Configuración también admite navegadores sin la API Notification.
- Las doce páginas comparten colores, tipografía, radios, estados y acentos. El inicio agrupa sus cuatro módulos en controles proporcionados; se conservan nombres, enlaces y funciones.
- CSS móvil compacto, con encabezado, tarjetas y detalle reorganizados. Las acciones principales mantienen tamaño táctil. No se oculta el desbordamiento para encubrir fallos; se corrigen sus distribuciones.
- Nuevas hojas solo para pantalla. Impresión y documentos permanecen iguales. El manifiesto principal usa iconos premium reales y maskable separados; los doce HTML incorporan metadatos Apple y favicons coherentes.
- La actualización precarga recursos, espera aceptación y conserva datos. La configuración pública Push usa red primero con respaldo offline. No se añadieron intervalos agresivos. El enfoque repetido no repite las solicitudes de estado.

## Alimentación y funciones protegidas

El código de cálculo y coordinación de alimentación se conserva idéntico al ZIP base: horario independiente HORARIO AYB, menos 15 minutos, Bogotá, empresa/servicio reales, cambios, cancelaciones, control de duplicados y vencimientos. No depende de que la página esté abierta. Permanecen retiradas las notificaciones de finalización y del día siguiente; el filtro Próximos continúa disponible.

Agenda Móvil, Eventos, Minuta, importación Excel, publicación de datos, autenticación y generación/copia de Agendas mantienen sus controladores operativos. No se migraron datos ni se alteraron campos o cálculos. Las reglas Firestore y data/eventos_publicos.json son idénticas. Las cuatro secciones autorizadas continúan retiradas. Se trabajó en una copia y se mantuvo el ZIP de recuperación.

## Tamaño móvil medido

Mismo evento y pantalla de 390 px:

| Elemento | Antes | Ahora | Reducción de altura |
| --- | ---: | ---: | ---: |
| Tarjeta | 233.1 px | 137.0 px | 41.2% |
| Encabezado | 184.4 px | 101.0 px | 45.2% |

Se verificaron siete anchos/orientaciones de Agenda, entre 320 y 1440 px, y 60 revisiones de las doce páginas en cinco tamaños. La prueba operativa añade otras 40 revisiones de las páginas principales. Tablas con desplazamiento propio conservan su funcionamiento; no hay desplazamiento horizontal de la página.

## Pruebas realizadas

**40 comprobaciones agrupadas aprobadas**, más sintaxis de 48 scripts y 193 referencias locales verificadas.

| Área | Evidencia y alcance |
| --- | --- |
| Regresión | Comparación de filtros/datos de Eventos, fechas y coworking de Minuta, consulta/detalle móvil; XLSX real de ensayo, copia, alternativa manual e impresión de Agendas. |
| Permisos/FCM | Consulta sin instalar; cero permisos/tokens/registros antes de instalación; permiso tras clic real, clave validada, mismo worker y baja. Firebase, permisos y PushManager controlados. |
| Backend | Se ejecuta su configuración, almacén, API y proveedor reales con Firestore/FCM controlados: concurrencia, límites, rotación, errores de proveedor, CORS y VAPID inválido. Sin emulador ni infraestructura desplegada. |
| Alimentación | Pruebas conservadas y repetidas: Bogotá, medianoche, varias comidas, cancelación, cambios, reservas, token inválido, datos obsoletos y vencimientos. |
| Worker | Actualización real desde la versión anterior sobre el mismo origen local. Espera aceptación, un registro, retirada de caché antigua, filtros/datos conservados y reapertura sin conexión. |
| Manifiestos/iconos | Identidades, ámbitos y entradas estables; PNG existentes de los tamaños declarados, metadatos Apple y rutas correctas. No se probó instalación física. |
| Apple | WebKit 26.5 con perfiles iPhone/iPad en navegador y contexto instalado simulado: consulta sin permiso, instrucciones Safari, campos de 16 px, detalle y horizontal. |
| Impresión | 2 páginas de Eventos/Minuta rasterizadas y comparadas: píxeles idénticos frente al ZIP base. |
| Consola/red | Sin excepciones ni recursos locales inexistentes en los flujos verificados. Los rechazos y pérdidas de red inducidos para probar recuperación se registran como escenarios de prueba. |

Las capturas contienen datos ficticios de ensayo y no se publicaron. No se ha comprobado una instalación en un Android/iPhone físico ni una notificación recibida en esos dispositivos.

## Pendientes externos

Configurar la URL HTTPS real de agendaPush; PUSH_VAPID_PUBLIC_KEY; el secreto PUSH_VAPID_PRIVATE_KEY correspondiente; PUSH_CONTACT; PUSH_ALLOWED_ORIGINS; despliegue y permisos de Functions/FCM/Tasks/Scheduler. Se conserva la conexión Firebase existente. No se inventaron claves ni direcciones. La guía DESPLIEGUE_Y_PRUEBA.md explica dónde completar cada valor y cómo comprobar configuración, envío y recepción física.

La programación fija la hora del intento. El proveedor, la red y el sistema operativo pueden retrasar o impedir la recepción. La aceptación del proveedor y el registro confirmado no sustituyen una comprobación física.

## Entrega y recuperación

25 archivos de aplicación modificados, 4 nuevos, 108 idénticos y ninguno eliminado. ARCHIVOS_MODIFICADOS.md explica cada cambio; INVENTARIO_SHA256.json conserva las huellas. entrega/correccion-pwa/ contiene guías, pruebas y evidencias. Los documentos anteriores se conservan como historial.

El ZIP anterior Red-productividad-tactica-main-Agenda-Premium-FCM.zip sigue disponible como recuperación. Al actualizar, conserva el almacenamiento del sitio y acepta la actualización después de guardar el trabajo. Si reviertes el cliente, coordina también las funciones/tareas desplegadas para conservar un flujo de notificaciones coherente.
