# Gestión de Eventos 4.4 — Guía de entrega

Inicio muestra Agenda de Eventos, Minuta y Agenda Móvil. La información técnica y sus herramientas están en el Centro de Administración.

## Entrar a administración

1. Inicia sesión con la cuenta administradora local que ya utilizas.
2. En Inicio, deja de escribir en cualquier campo y pulsa **Ctrl + M**.
3. Introduce la contraseña actual de esa misma cuenta. El sistema oculta los caracteres y comprueba el hash local existente.
4. Al validarse, verás registros, archivo, sincronización, actividad, Usuarios, Configuración, Validación Excel, Laboratorio y Actualizaciones.

No hay una contraseña nueva ni se ha creado otra cuenta. Una cuenta operativa no obtiene permisos de administrador con su contraseña. Al volver a la operación se termina el permiso administrativo de esa pestaña. Para entrar otra vez, repite Ctrl + M. Cerrar sesión o cambiar contraseña/rol también invalida el acceso. Dentro de las rutas administrativas se mantiene el permiso asociado a la sesión vigente.

Agenda Móvil conserva su acceso público y no abre este panel con el atajo. Ctrl + Q sigue disponible en Minuta; conserva todas las filas de Coworking que se imprimían antes.

## Archivos

- **Eventos-4.4-Completo.zip**: proyecto completo con código, backend existente, herramientas, pruebas, documentación, historial y carpeta `dist`.
- **Publicacion-Eventos-4.4.zip**: contenido de `dist` listo para el sitio estático; no incluye backend, informes ni pruebas.
- **Recuperacion-Eventos-4.3.zip**: copia íntegra anterior para recuperación; no es una copia de los datos guardados en tu navegador.
- **Informe-Eventos-4.4.md**, **Archivos-Eventos-4.4.csv** y **Pruebas-Eventos-4.4.json**: cambios y resultados verificables.

## Publicar

Esta entrega no se ha publicado automáticamente. Conserva una copia del sitio y de tus datos actuales. Publica el contenido de `Publicacion-Eventos-4.4.zip` en la misma ubicación que usa la aplicación: `index.html`, `sw.js` y `release.json` deben quedar en la raíz de esa ubicación, junto con `css`, `js`, `assets` y `data`. Incluye los archivos ocultos `.gitattributes` y `.nojekyll`. No subas `functions` ni documentos de entrega como archivos del sitio.

Si utilizas el repositorio completo, el procedimiento existente de publicación construye `dist` y lo publica tras sus comprobaciones y autorización. No cambies finales de línea ni edites un recurso publicado después de generar su SHA-256. No publiques una mezcla de versiones. La guía `PUBLICACION_SEGURA.md` conserva el procedimiento anterior.

Tras publicar, vuelve a Inicio con tu sesión administradora y usa Ctrl + M; entra a «Consultar cambios y progreso». Comprueba que la versión instalada es **4.4.0**, que se verifican **137 recursos** y que no quedan errores. La activación conserva la espera mínima de diez segundos y se aplaza mientras existan ediciones pendientes en otras pestañas. Prueba Agenda, Minuta/Ctrl + Q y Agenda Móvil con tus datos reales antes de dar por validada la publicación.

No borres el almacenamiento del navegador: contiene usuarios, sesión y registros locales existentes. Si no recuerdas tu contraseña administradora actual, esta entrega no la sustituye ni la restablece.

El acceso solicitado usa autenticación local del navegador, no una nueva validación de servidor. Las reglas originales de Firebase siguen siendo responsables del acceso remoto. Las pruebas de Push en teléfonos físicos y del sitio publicado deben completarse en ese entorno; no se enviaron mensajes ni se alteró producción durante la verificación.
