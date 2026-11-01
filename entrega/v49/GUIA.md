# Gestión de Eventos 4.9 — Recuperación y publicación

Entrega del 1 de noviembre de 2026 · America/Bogota. Esta guía sustituye las instrucciones 4.8 de autorización de equipos. No se debe aprobar ningún equipo para usar 4.9.

## Qué recupera

Se retiraron de la ejecución la pantalla nueva «ACCESO NO AUTORIZADO», la consulta obligatoria de aprobación en Firebase, la carga de scripts condicionada por esa decisión y las comprobaciones nuevas que bloqueaban Excel y publicación. No es una pantalla escondida: los módulos vuelven a cargarse directamente con el acceso local anterior.

No se borran usuarios, eventos, contraseñas, datos del navegador, referencias al Excel ni documentos de Firebase. Los cuatro archivos nuevos del bloqueo se conservan únicamente como referencia en `entrega/v49/codigo-retirado/v48`, fuera del sitio estático y sin ejecutarse. Las copias anteriores del proyecto permanecen intactas.

## Publicar en GitHub Pages

1. Utiliza `Publicacion-Eventos-4.9.zip` para el sitio publicado. Extrae su contenido en la misma carpeta que GitHub Pages ya publica. `index.html`, `release.json` y `sw.js` deben quedar en la raíz de esa publicación, junto a `js`, `css`, `assets` y `data`. No añadas otra carpeta intermedia ni mezcles recursos de versiones diferentes.
2. Incluye `.gitattributes` y `.nojekyll`. Confirma los cambios de la publicación en la rama/carpeta que usa GitHub Pages y espera a que termine su despliegue.
3. Comprueba que `release.json` de la dirección publicada indique `4.9.0`. La aplicación debe informar versión instalada y verificada **4.9.0**, con 177 recursos.

`Eventos-4.9-Completo.zip` es el proyecto completo con herramientas, backend, reglas, pruebas y documentación. Su sitio estático preparado está dentro de `dist`. No es necesario publicar las carpetas de pruebas, informes, backend ni el código retirado para usar la web.

## Si el navegador o la PWA siguen mostrando el bloqueo viejo

Una página 4.8 que bloquea la carga antes de ejecutar su gestor puede seguir sirviéndose desde su caché anterior. Mostrar un archivo nuevo no acredita que el worker instalado haya cambiado. No borres los datos del sitio para salir de ese estado.

1. Después de publicar 4.9, guarda el trabajo y cierra las otras pestañas/ventanas de la aplicación.
2. Abre la dirección habitual en Chrome o Edge y realiza una recarga forzada con **Ctrl + Shift + R** o **Ctrl + F5**, para obtener los archivos actuales. Este paso inicial puede ser necesario en un perfil que quedó bloqueado en 4.8.
3. Cuando vuelva el inicio habitual, entra con tu cuenta local actual. Pulsa **Ctrl + M**, introduce su contraseña actual y abre **Actualizaciones → Comprobar ahora**.
4. Espera a que termine la verificación y, si las preferencias lo requieren, usa el aviso existente «Aplicar actualización». Confirma **Versión instalada y verificada: 4.9.0**. No te guíes únicamente por «Versión de estos archivos».
5. Cierra y vuelve a abrir la aplicación normalmente. No debe aparecer la pantalla de aprobación de equipos. En una PWA instalada, realiza primero esta recuperación desde el navegador de su mismo perfil/origen y después vuelve a abrir la PWA.

En el ensayo local se probó la descarga inicial sin el worker antiguo mediante la herramienta de red de Chrome, la comprobación original, la activación de 4.9 y la reapertura con worker normal. Se conservaron los usuarios, sesión y datos. No se probó el atajo físico en el computador del usuario.

## Firebase y Archivo Maestro: procedimiento anterior

1. Inicia sesión con la cuenta administradora local que ya utilizabas.
2. Pulsa **Ctrl + M** fuera de un campo de texto y escribe su contraseña actual.
3. En **Archivos y conexiones**, abre el control original de Firebase o el del Archivo Maestro cuando necesites configurar, conectar o cambiar la fuente. No se abren automáticamente al entrar al Centro Operativo.
4. Si ya estaba configurado, conserva el mismo perfil y dirección: la lectura del Excel, su handle y la sesión Firebase utilizan los mecanismos anteriores. Si el navegador perdió el permiso, usa **Reconectar** en el control original de Excel dentro de Ctrl + M. No se creó otro almacén ni otro Excel.

No se requiere crear una colección de aprobación, dar de alta equipos ni reemplazar credenciales.

## Reglas de Firebase

Se comprobó que 4.8 había cambiado el bloque `equipos_autorizados` del archivo de reglas. Esta entrega incluye `firestore.rules` idéntico al original 4.6. El resto de las reglas de eventos y publicación no cambia.

**Solo si llegaste a desplegar las reglas 4.8**, restaura ese archivo original incluido en el mismo proyecto Firebase existente. No borres documentos ni colecciones. Si no desplegaste aquellas reglas, no hace falta cambiar las de producción. Publicar el ZIP estático no despliega reglas ni funciones y esta entrega no las ha cambiado en tu servidor.

## Navegación solicitada

El Centro Operativo muestra únicamente **Agenda de Eventos, Minuta y Agenda Móvil**. Super Administrador no tiene menú lateral y ofrece únicamente **Archivos y conexiones, Actualizaciones y Log interno**. El log consulta entradas reales y es de solo lectura.

Los módulos que dejan de aparecer en el menú conservan sus archivos y datos; no se crean módulos, estadísticas ni registros ficticios. Las reglas de mantenimiento y los procesos existentes se conservan.

## Verificación y recuperación

Los resultados y sus límites están en `entrega/v49/PRUEBAS.json`. Se compararon los núcleos operativos con 4.6 y se probaron acceso local en dos perfiles, Ctrl + M, Excel, publicación simulada, reapertura real de Chrome y Auth Emulator, móvil, impresión, PWA sin conexión y migración. No se ha verificado la instalación física del usuario ni la entrega real de Push.

`Recuperacion-Eventos-4.6.zip` conserva el ZIP original intacto como referencia de recuperación. No sustituye un respaldo de los datos del navegador o del Excel operativo.
