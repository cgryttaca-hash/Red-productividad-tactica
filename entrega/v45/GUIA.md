# Gestión de Eventos 4.5 — Leer primero

Entrega del 30 de octubre de 2026, America/Bogota. Se trabajó sobre la versión real 4.4, sin reconstruir la aplicación.

**Minuta y Agenda de Eventos conservan sus archivos y funcionamiento.** La alimentación móvil muestra las dos líneas indicadas por el usuario:

```text
7:00 AM ESTACION DE CAFÉ ESTACION DE CAFÉ SENCILLA
9:30 AM - REFRIGERIO AM PASTEL POLLO Y JUGO
```

El texto repetido de café pertenece al original y se respeta. No se mueve pastel/jugo al primer horario ni se inventan servicios. La aplicación utiliza los datos del evento, no estas líneas como contenido fijo.

## Centro de control

Inicia sesión con tu cuenta administradora local actual. Fuera de un campo de texto, pulsa **Ctrl + M** e introduce la contraseña actual de esa misma cuenta. No hay contraseña, usuario ni rol nuevo. Al volver a la operación se cierra el permiso administrativo de esa pestaña; repite Ctrl + M para regresar.

El centro organiza siete secciones: **Resumen, Estadísticas, Asistente IA, Calidad de datos, Informes, Sistema y Administración**. Solo aparece una a la vez.

- Estadísticas permite hoy, semana, mes, año y rango personalizado, con categorías de eventos, personas, empresas, espacios y alimentación. Las cifras proceden de los registros existentes en el navegador; se identifica la fuente. PAX significa cantidad registrada/programada, no asistencia comprobada.
- Calidad de datos señala campos vacíos, alimentación incompleta y posibles duplicados. Nunca corrige, fusiona ni elimina registros automáticamente.
- Informes genera texto y CSV con filtros. Las cifras se calculan con reglas de lectura; no se presentan conclusiones inventadas por un modelo.
- Asistente conserva la consulta local y la integración externa existentes, con acciones rápidas. **La IA externa sigue pendiente de configuración**; no se simula que esté conectada. La consulta local funciona sin esa integración.
- Sistema mantiene Excel, sincronización, actividad y actualizaciones originales. Si una fuente ya está vinculada, sus motores continúan trabajando en segundo plano aunque estés en Resumen. Sin fuente vinculada se cargan al abrir Sistema.
- Administración conserva Usuarios, Configuración, Validación Excel y Laboratorio.

Inicio mantiene sus tres módulos y Agenda Móvil mantiene acceso público. Ctrl + Q, la impresión, el día siguiente y todas las filas de Coworking se conservan. No se envían imágenes automáticamente a WhatsApp Web cuando el navegador no lo permite.

## Entrega y publicación

`Eventos-4.5-Completo.zip` contiene el proyecto completo, backend, herramientas, pruebas y documentación. `Publicacion-Eventos-4.5.zip` contiene solo el sitio estático de `dist`. `Recuperacion-Eventos-4.4.zip` es una copia íntegra de la versión anterior; no sustituye un respaldo de los datos guardados en tu navegador.

Esta entrega **no está publicada automáticamente**. Para actualizar el sitio, publica el contenido del ZIP de publicación en la ubicación existente. `index.html`, `sw.js` y `release.json` deben quedar junto a `css`, `js`, `assets` y `data`, sin una carpeta extra intermedia. Incluye `.gitattributes` y `.nojekyll`. No publiques `functions`, los informes o las pruebas como archivos del sitio. El flujo existente de publicación del repositorio completo también puede generar y publicar `dist` con sus verificaciones.

Conserva los bytes de la versión generada; no edites recursos después de calcular sus huellas ni mezcles versiones. El sistema mantiene la espera mínima de diez segundos después de verificar, la coordinación de pestañas y la protección de ediciones pendientes. No borres el almacenamiento del navegador: conserva usuarios y datos locales.

Tras publicar, entra con Ctrl + M, abre Sistema y «Consultar cambios y progreso». La versión instalada debe ser **4.5.0**, con **149 recursos verificados**. Revisa alimentación con tus eventos reales, Minuta/Ctrl + Q y las agendas antes de dar por validado el sitio en producción.

La clave de un proveedor de IA se configura únicamente en el backend seguro, nunca en el HTML ni JavaScript público. Consulta `docs/CONFIGURACION_IA.md` y `functions/.env.ai.example`. La cuenta Firebase autorizada para consumir IA es independiente de la revalidación administradora local. La integración de Push conserva sus requisitos previos en `entrega/DESPLIEGUE_PUSH.md`. Si ya tienes un servidor de avisos desplegado, actualiza también ese backend con los archivos del proyecto completo para que use la correspondencia corregida de alimentación. Publicar el ZIP estático no actualiza Firebase Functions. La nueva acción de estadísticas de IA también requiere desplegar el backend actualizado cuando se habilite.

Las pruebas físicas en Android/iPhone, la recepción de avisos con la aplicación cerrada y las conexiones reales de producción deben comprobarse tras configurar/publicar en ese entorno. El informe detalla los resultados locales y estas limitaciones.
