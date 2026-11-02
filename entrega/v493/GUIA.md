# Gestión de Eventos 4.9.3 — actualización sin bloqueo permanente

Entrega del 1 de noviembre de 2026 · America/Bogota.

## Para salir del bloqueo actual

1. Guarda el trabajo abierto en Minuta, plantillas y formularios.
2. Cierra las otras ventanas del sistema, incluida Agendas de Ctrl + A y las pestañas de Chrome/Edge que tengan Gestión de Eventos abierta. Conserva una sola ventana para comprobar la actualización.
3. Vuelve a **Ctrl + M → Actualizaciones → Comprobar actualización** y aplica la versión disponible.

No desinstales la aplicación ni borres los datos del sitio: allí se conserva la configuración local y el vínculo con el Excel. Si aún no se ha publicado 4.9.3, esos pasos solo pueden aplicar la versión que esté publicada.

## Publicar este parche en el GitHub existente

Usa **Publicacion-Eventos-4.9.3.zip**. Extrae su contenido y reemplaza los archivos de la raíz de la publicación existente en una sola actualización/commit. El ZIP ya contiene los archivos de la web directamente, sin otra carpeta «dist» por encima.

Incluye el `sw.js`, el `release.json` y todos los recursos del ZIP de la misma versión. Conserva el archivo `.gitattributes` para respetar los finales de línea: modificar los archivos después de generar las huellas puede invalidar la comprobación. Espera a que termine la publicación de GitHub Pages antes de comprobar desde la PWA.

No hace falta cambiar Firebase, reglas, contraseñas, usuarios ni el Archivo Maestro. El ZIP completo es la entrega de fuentes y documentación; el ZIP de publicación contiene únicamente la web estática.

## Qué cambia

Las peticiones simultáneas esperan una misma actualización. Una ventana antigua que solicita actualizar no recibe un rechazo anticipado que le permita desbloquearse mientras otra actualización sigue en curso.

Una búsqueda sin cambios en una ventana inactiva deja de contar como edición en curso. Los formularios y Coworking con cambios reales, las plantillas sin guardar y las lecturas o publicaciones pendientes siguen protegidos.

Si una ventana impide continuar, el gestor identifica su página y muestra el motivo recibido. Si no responde, pide guardar y cerrar esa ventana. No fuerza la recarga ni elimina información.

Al cancelarse un intento se retira el bloqueo y se muestra «Nueva versión disponible», con el aviso correspondiente. No permanece en «Preparando actualización». Los intentos automáticos respetan una pausa de 30 segundos; el botón permite reintentar sin esperar esa pausa.

Si una preparación interrumpida alcanza los 90 segundos, la interfaz recupera el control y muestra que no se pudo confirmar el cambio. Se permite comprobar de nuevo; no se da por completada una actualización sin confirmación.

## Comprobación tras publicar

Verifica que Actualizaciones confirme **4.9.3** activa y recursos verificados. Abre una segunda ventana sin cambios y comprueba que no aparezca un bloqueo permanente. Si hay cambios reales pendientes, guárdalos antes de intentar actualizar.

Agenda de Eventos, Minuta, Agenda Móvil, Ctrl + A, Ctrl + M, conexión Firebase, lectura del Excel y notificaciones conservan su código de 4.9.2. No se ha reintroducido el control de dispositivos.

El sitio publicado y tu instalación personal no se han modificado desde esta entrega. El informe distingue las pruebas locales de las comprobaciones que corresponden a la publicación real.
