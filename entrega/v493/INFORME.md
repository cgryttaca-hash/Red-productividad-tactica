# Informe de corrección — Gestión de Eventos 4.9.3

1 de noviembre de 2026 · America/Bogota · Base preservada: 4.9.2.

## Resultado

Se corrige el ciclo de preparación, cancelación y reintento del actualizador. Solo se modifican tres archivos funcionales del sistema de actualizaciones. Los módulos operativos y sus fuentes de datos mantienen sus archivos idénticos a 4.9.2.

## Defectos reproducidos en 4.9.2

- Dos solicitudes podían comprobar que no había otra operación antes de una espera y terminar iniciando dos activaciones a la vez.
- Una ventana inactiva podía conservar el foco en una búsqueda sin cambios y rechazar la actualización como si siguiera editándose.
- Una respuesta negativa del gestor podía retirar el bloqueo sin finalizar el estado «preparing», dejando la pantalla en preparación.

Esto demuestra defectos del código de la copia local. No identifica por sí solo qué ventana o versión concreta está bloqueando la instalación publicada del usuario; no se pudo recuperar esa publicación con la herramienta web.

## Archivos funcionales modificados

| Archivo | Corrección |
| --- | --- |
| js/release-worker.js | Comparte una única transacción entre solicitudes simultáneas, mantiene compatibilidad con clientes antiguos, identifica páginas que rechazan/no responden y comunica la cancelación. Vuelve a comprobar los votos antes de activar. |
| js/pwa-release.js | Finaliza los intentos cancelados o fallidos, muestra el motivo, conserva bloqueos de otras transacciones y recupera el control al vencer una preparación. Incluye motivos en el voto, sin datos del formulario. |
| js/update-safety.js | Considera el foco de edición solo si la ventana está activa; mantiene las comprobaciones de cambios y tareas reales. Impide duplicar la capa de bloqueo y comunica su vencimiento. |

`js/release-info.js`, `js/system-version.js`, `VERSION.txt`, `package.json`, `release.json`, `sw.js` y las copias correspondientes en `dist/` se actualizan como metadatos y compilación de 4.9.3. Se añade `tests/v493/updater.cjs` y esta documentación. El CSV enumera todos los archivos nuevos o modificados, con sus huellas anteriores y actuales.

## Conservación

Se compararon los 177 recursos de ejecución con la versión anterior: 172 permanecen idénticos; cambian los tres archivos del actualizador y dos de versión. Agenda de Eventos, Minuta, Agenda Móvil, los dos campos originales de servicios, Ctrl + A y Ctrl + M permanecen intactos.

El lector Excel, su frecuencia y su handle, los permisos, los usuarios, las credenciales y las conexiones Firebase no cambian. Reglas y funciones de Firebase permanecen idénticas. La lógica de notificaciones push incluida al final de `sw.js` es idéntica. No se elimina ningún archivo original ni se reintroduce autorización de dispositivos.

La firma SHA-256 de los recursos, la exigencia de una versión completa, la versión anterior y la recuperación no se desactivan. Los cambios reales sin guardar o las ventanas sin respuesta siguen deteniendo la activación.

## Pruebas

**17 comprobaciones funcionales aprobadas**, después de reproducir los tres defectos anteriores. Incluyen concurrencia, cancelación y reintento, una ventana sin respuesta, cambios de ventanas durante la espera, revocación del consentimiento, protocolo antiguo, recuperación de la versión anterior, formularios pendientes, tareas Excel/Firebase y los temporizadores de preparación y desbloqueo.

Las pruebas de interfaz se ejecutaron en Chrome real sin acceso a red, con formularios y DOM reales. El protocolo del worker se ejecutó en Node con clientes y cachés simulados. Se controló el reloj para comprobar diez y noventa segundos sin esperar el tiempo físico. No equivalen a probar una migración real del service worker en la PWA del usuario.

Comprobaciones estructurales aprobadas: sintaxis de 90 scripts, referencias de 16 páginas, seis archivos protegidos, dos manifiestos PWA, las huellas de 177 recursos y la sintaxis del worker generado. Cada entrada del ZIP se valida con CRC y se compara con el archivo de origen durante el empaquetado.

No se repiten ni se presentan como actuales las pruebas funcionales de los módulos operativos de entregas anteriores. Su conservación en este parche se verifica byte por byte.

## Publicación y límites

No se ha publicado en GitHub ni se ha accedido al Excel operativo, Firebase o la PWA personal. Para que tu instalación reciba el arreglo debe publicarse el ZIP de la web estática. Las ventanas antiguas conservan su código hasta recargarse: guarda y cierra las ventanas adicionales antes de comprobar por primera vez.

No se borran datos del sitio ni se desinstala la PWA. Consulta GUIA.md para publicar y aplicar la corrección. PRUEBAS.json y las evidencias incluidas detallan el alcance de la verificación.
