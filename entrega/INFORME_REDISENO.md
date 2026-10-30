# Gestión de Eventos: informe de rediseño

Entrega: 27 de octubre de 2026.

Se aplicó el rediseño sobre el proyecto adjunto, conservando su estructura HTML/CSS/JavaScript. Se retiraron únicamente los módulos Respaldos, Diagnóstico, Equipos y Auditoría. Agenda Móvil y sus dependencias de funcionamiento y presentación permanecen idénticas al original.

La verificación comparativa confirma la conservación de los flujos probados de Eventos, Minuta, Excel, usuarios, validación y Laboratorio. La conexión con Firebase real, la instalación en dispositivos y la apertura operativa offline completa quedan pendientes de validación en el entorno de producción; no se presentan como pruebas aprobadas.

## Cambios visuales

- Identidad azul petróleo y azul medio, fondos claros, textos legibles y estados de éxito, advertencia y error diferenciados.
- Inicio con encabezado, navegación, iconos SVG coherentes y tres accesos compactos: Agenda de eventos, Minuta y Agenda Móvil.
- Agrupación de sincronización, información local y herramientas administrativas existentes. No se añadieron indicadores, cálculos ni funciones.
- Formularios, tablas, filtros, botones y modales con una presentación consistente. Mayor legibilidad de Eventos y Minuta en pantalla.
- Tablas anchas con desplazamiento dentro de su contenedor en pantallas pequeñas; navegación superior desplazable cuando es necesario.
- Foco de teclado visible y adaptación a la preferencia de movimiento reducido.

El diseño nuevo se activa mediante `data-ui="corporate"` en ocho páginas y una hoja `corporate-ui.css` limitada a `screen`. Los CSS originales se conservan. Las páginas que ya utilizaban `professional-ui.css` siguen cargándolo exclusivamente para impresión. Agenda Móvil no carga ni activa los estilos nuevos.

## Archivos modificados

El ZIP original contiene 98 archivos. Antes de añadir esta documentación, el proyecto actualizado contiene 91: **75 idénticos, 15 modificados, 1 nuevo y 8 eliminados**.

| Archivo | Cambio |
| --- | --- |
| `index.html` | Nueva distribución del inicio, tarjetas operativas e iconos; retirada de accesos y bloques de las secciones eliminadas. |
| `eventos.html` | Solo atributo de activación visual y enlace al CSS de pantalla. |
| `minuta.html` | Solo atributo de activación visual y enlace al CSS de pantalla. |
| `login.html` | Activación visual, color de interfaz del navegador y conservación del estilo de impresión. |
| `usuarios.html` | Activación visual y retirada de enlaces a Equipos y Respaldos. |
| `configuracion.html` | Activación visual; retirada de enlaces y opciones de mantenimiento de las cuatro secciones eliminadas. |
| `validacion.html` | Activación visual y navegación hacia los módulos conservados. |
| `laboratorio.html` | Activación visual y limpieza de navegación. |
| `js/index.js` | Eliminación exclusiva de la consulta y presentación de Auditoría, sus contadores y su pestaña. Se mantienen los registros operativos de sincronización. |
| `js/configuracion.js` | Retirada de las cuatro etiquetas que generaban opciones visibles de mantenimiento. El resto de la lógica permanece igual. |
| `js/system-version.js` | Actualización de las dos huellas HTML de Eventos y Minuta; versión y funciones sin cambios. |
| `PROTECTED_MODULES.json` | Actualización de las mismas dos huellas HTML. |
| `manifest.webmanifest` | Colores corporativos y descripción sin referencia al módulo retirado. No es el manifest de Agenda Móvil. |
| `sw.js` | Nuevo nombre de caché, incorporación del CSS y retirada de los ocho recursos eliminados. Algoritmos de instalación, actualización, lectura offline y notificaciones idénticos. |
| `README.txt` | Documentación actual, instalación, conservación de datos y recuperación. |

Archivo nuevo de aplicación: `css/corporate-ui.css`.

Los archivos adicionales de `entrega/` contienen únicamente el informe, inventarios, evidencias e instrucciones de verificación; no forman parte de la ejecución de la aplicación.

## Módulos eliminados

Se eliminaron las cuatro páginas y sus controladores exclusivos:

- `respaldos.html` y `js/respaldos.js`.
- `diagnostico.html` y `js/diagnostico.js`.
- `equipos.html` y `js/equipos.js`.
- `auditoria.html` y `js/auditoria.js`.

También se retiraron sus accesos del inicio y menús, las opciones de mantenimiento y los bloques visibles de Auditoría del panel. No quedan enlaces HTML a esas páginas.

Se conservaron `audit-store.js`, `backup-store.js`, `device-registry.js` y `device-heartbeat.js`: son servicios compartidos que el lector Excel y el control de acceso utilizan. Eliminarlos habría alterado procesos existentes. Las copias automáticas internas, el registro interno de cambios y la comprobación de dispositivos continúan disponibles para sus consumidores, sin sus módulos administrativos.

## Funciones conservadas

- Lectura de Excel, identificación de hojas mensuales, campos, normalización, fechas, diferencias, validaciones y sincronización existentes.
- Eventos: búsqueda, pisos, fechas, medio de pago, alimentación, restablecimiento, vista previa, gráficos existentes e impresión.
- Minuta: selección de fecha, días anterior y siguiente, distribución por pisos, exclusión de cancelados, próximos eventos, edición y persistencia de coworking e impresión.
- Acceso local, administración de usuarios y restricciones por rol.
- Configuración de mantenimiento de módulos conservados, preferencias de avisos, validación y exportación CSV, Laboratorio y publicación móvil existentes.
- Configuración Firebase, reglas Firestore, bibliotecas, estructuras de almacenamiento y datos incluidos en el ZIP.

`js/eventos.js`, `js/minuta.js`, `js/excel-sync.js`, `css/eventos.css` y `css/minuta.css` son idénticos al original. No se cambiaron fórmulas, nombres de campos, rutas conservadas ni reglas de negocio.

## Protección de Agenda Móvil

Se compararon por SHA-256 **22 archivos**: página, CSS, JavaScript, manifest propio, requisitos de instalación, recordatorios, iconos, notificaciones, PWA, monitor, configuración y sincronización Firebase, puente de datos, mantenimiento y pantalla offline. Todas las huellas coinciden con el original; el detalle está en `evidencias/resultados.json`.

El único recurso compartido modificado es `sw.js`, por la distribución del nuevo diseño y la retirada de las páginas solicitadas. Su código de comportamiento, desde los manejadores de instalación en adelante, es exactamente igual al original. No se modificaron los recursos de Agenda Móvil dentro de su lista.

En navegador, tanto la pantalla de requisitos como la agenda operativa a 390 × 844 coincidieron **píxel a píxel**. También coincidieron los resultados de filtros, búsqueda, fecha, detalle, tamaño de texto, actualización y preferencias. Para la pantalla operativa se simularon únicamente la instalación, el permiso de notificación y Firebase en el entorno de prueba; el código de la aplicación permaneció intacto.

## Pruebas y resultados

Entorno: Windows, Chrome 155.0.8059.85, automatización local con Playwright, zona horaria America/Bogota y fecha de prueba fijada al 27 de octubre de 2026. No se accedió a Firebase de producción.

Se ejecutaron **25 grupos de comprobación**, más la comparación visual de impresiones. La comprobación offline solo acredita la caché y la igualdad de estado descritas a continuación, no una apertura operativa completa.

| Comprobación | Resultado y alcance |
| --- | --- |
| Inicio de sesión local | Aprobado en original y actualizado con el flujo real de autenticación local. |
| Tarjetas del inicio | Aprobado: navegación a Eventos y Minuta, regreso al inicio y Agenda Móvil en otra pestaña. |
| Eventos | Resultados idénticos para todos los eventos, pisos, búsqueda por empresa, pago, rango de fechas, alimentación y vista previa. |
| Minuta | Resultados idénticos para fechas, días contiguos, exclusión de cancelados, próximos eventos y alta, persistencia y eliminación de coworking. |
| Excel | XLSX de prueba real de cinco filas: lectura, hojas y columnas correctas; importación y repetición idénticas al original. |
| Servicios compartidos | Aprobado: copias automáticas internas y registro interno de Excel siguen respondiendo. |
| Laboratorio | Aprobado: lectura del XLSX sin reemplazar `eventData`. |
| Usuarios y roles | Aprobado: creación de usuario, acceso de consulta y bloqueo de administración según el rol. |
| Configuración | Aprobado: preferencias de avisos guardadas y opciones de módulos retirados ausentes. |
| Validación | Aprobado: informe de importación y descarga CSV. |
| Modales y actividad | Aprobado: paneles Excel/Firebase, pestañas de actividad y actualización del inicio. |
| Agenda Móvil | Código y recursos idénticos, comparación visual exacta y mismos resultados de los flujos probados con servicio simulado. |
| Impresión | Botones invocados; estilos y geometría de los elementos impresos idénticos. Los PDF de Eventos y Minuta, renderizados a PNG a 110 ppp, también coinciden exactamente con los originales. |
| Adaptación | **48 comprobaciones**: ocho pantallas en anchos 1440, 1366, 1024, 768, 390 y 360 píxeles, sin desbordamiento horizontal de la página. |
| JavaScript y rutas | 35 archivos JavaScript con sintaxis válida. En las pruebas principales: cero excepciones, cero errores de consola y cero recursos locales faltantes. En desconexión aparecen errores de red esperados en ambos proyectos. |
| Service worker real | Instalación y precarga comprobadas; el CSS nuevo se almacena y los módulos retirados quedan fuera de la caché. |
| Recarga offline | **Parcial:** el HTML de Agenda Móvil se devuelve desde caché con HTTP 200 en ambos proyectos; ambos quedan con `maintenance-pending` y el cuerpo oculto en esta prueba. La apertura operativa offline completa no queda validada. |

Las capturas usan datos sintéticos de verificación. Ningún evento de prueba se incorporó a los archivos de datos entregados.

## Límites y pendiente de verificar

- No se probó la cuenta propietaria real, publicación en Firebase, reglas desplegadas ni actualización entre dispositivos reales. Se mantuvieron sin cambios sus conexiones y código.
- El ZIP no incluye el Excel maestro real del usuario. Se verificó un XLSX generado para la prueba; quedan pendientes ese archivo y su autorización persistente de lectura en el navegador de trabajo.
- La limitación offline se reprodujo también en el ZIP original. Se conservó Agenda Móvil conforme a la instrucción de no modificarla. Debe comprobarse la PWA instalada y su caché en el dispositivo real; este rediseño no corrige ese comportamiento previo.
- No se verificaron instalación física, entrega de notificaciones en segundo plano ni navegadores distintos de Chrome. Los permisos y la condición de aplicación instalada se simularon donde fue necesario.
- La impresión se comparó con los datos de prueba. No se envió a una impresora física ni se probaron todos los tamaños posibles de minutas.

## Instalación y recuperación

El ZIP actualizado conserva una carpeta raíz llamada `Red-productividad-tactica-main`. Publica su contenido en la misma raíz y conserva las credenciales y reglas actuales. No borres los datos del sitio: contienen usuarios, eventos locales y la vinculación del Excel.

Si sustituyes archivos sobre un despliegue existente, elimina también las ocho rutas retiradas indicadas en este informe; copiar únicamente los archivos nuevos no elimina las páginas antiguas del servidor. Recarga el inicio para actualizar la caché.

Se entrega por separado el ZIP original completo, sin modificaciones, como copia recuperable. `INVENTARIO_SHA256.json` permite comprobar los archivos de aplicación entregados frente al original.

Las evidencias, capturas, impresiones y scripts de verificación están en `entrega/`. Los resultados detallados están en `evidencias/resultados.json` y `evidencias/pruebas-complementarias.json`.
