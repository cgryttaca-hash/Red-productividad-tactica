# Gestión de Eventos 4.3.0

La guía vigente es este archivo y el informe vigente está en entrega/v43/INFORME.md. Los documentos 4.2 anteriores se conservan como historial. La entrega implementa el complemento funcional sobre 4.2.2.

## Publicación

Publicar TODO el contenido de dist/ en la carpeta que sirve el sitio actual. Publicacion-Eventos-4.3.zip contiene esos archivos directamente en su raíz; no añadir una carpeta adicional delante. Mantener .gitattributes y .nojekyll cuando corresponda. El proyecto completo incluye fuentes, backend, herramientas, pruebas e informes; esos archivos privados de desarrollo no forman parte del ZIP público.

Conservar una copia previa y los datos actuales. Publicar el conjunto completo de forma atómica si el alojamiento lo admite; en una copia manual, subir sw.js al final. No editar un recurso después de calcular sus huellas. Si se modifica, ejecutar pnpm build y pnpm check y publicar otra vez el conjunto coherente. El formato LF se aplica antes de calcular SHA-256 para evitar el fallo CRLF/LF ya identificado.

Si se utiliza el backend de notificaciones existente, actualizar también functions/food-alerts-core.mjs en su despliegue habitual para mantener la lectura de alimentación coherente. Las conexiones, reglas y demás funciones conservan su configuración. No se crea una base de datos nueva.

Después del despliegue, guardar las ediciones abiertas y confirmar Versión instalada 4.3.0. Con la preferencia automática habilitada, las páginas detectan la publicación sin entrar manualmente a Actualizaciones. La comprobación periódica visible es de un minuto; también se revisa al volver a la aplicación o recuperar conexión. Se conserva cualquier preferencia anterior deshabilitada expresamente.

La actualización espera a que no haya trabajo pendiente, coordina las pestañas, muestra al menos diez segundos después de verificar y recarga automáticamente. Un error conserva la versión funcional. No borrar datos del sitio, localStorage, IndexedDB ni Firebase para actualizar.

## Uso

Agenda Móvil abre directamente desde agenda_movil.html y desde el acceso instalado. Su ámbito público no entra a Inicio ni a las herramientas privadas. Una sesión de escritorio de otra pestaña sigue siendo independiente y conserva sus credenciales. Los módulos privados mantienen su login.

En Agendas, seleccionar una fila abre la plantilla existente. Ejecutivo, Correo y Teléfono quedan vacíos si faltan datos y se guardan al escribir. Las observaciones conservan sus permisos de edición anteriores. El guardado se realiza en este navegador, sin cambiar Excel/Firebase ni compartir automáticamente los campos internos con otros dispositivos. Al cerrar/copiar se espera a completar el guardado; si falla, el texto permanece en pantalla y puede reintentarse.

Los eventos se organizan por piso, fecha, salón y hora según la sección. Los indicadores operativos usan la hora de Bogotá. Si el origen actualiza el evento, las listas y el detalle se actualizan; la edición interna guardada no se reemplaza por un vacío de Excel.

Ctrl+Q en Minuta prepara mañana de Bogotá con todos los registros de Coworking de la impresión actual. Revisar PNG y texto en la vista existente. Abrir WhatsApp Web evita exigir Desktop; el menú nativo permite elegir aplicaciones cuando es compatible. Si se bloquea la ventana, usar el enlace manual que aparece. Adjuntar los PNG si se abre únicamente el texto y confirmar el envío en WhatsApp. Abrir WhatsApp no significa que se haya enviado el mensaje.

## Verificación y recuperación

Node >=22, dependencias declaradas y Chromium de Playwright: pnpm install --frozen-lockfile y pnpm exec playwright install chromium. CHROME_PATH permite usar Chrome propio. Comandos: pnpm check, pnpm test:v43, pnpm test:sharing, pnpm test:automatic, pnpm test:updates, pnpm test:integrity, pnpm test:publication, pnpm test:food, pnpm test:offline, pnpm test:responsive, pnpm test:reopen y pnpm test:performance. La prueba automática espera realmente el minuto de comprobación. La prueba opcional node tests/migration.cjs requiere ORIGINAL_PROJECT_PATH apuntando a la entrega anterior 4.2 extraída.

Para comprobar el alojamiento sin modificarlo: node tools/audit-publication.cjs https://cgryttaca-hash.github.io/Red-productividad-tactica/ informe.json. La nueva publicación debe verificar los 130 recursos y mostrar versión 4.3.0.

La recuperación desde el área privada utiliza una versión completa anterior si existe en ese navegador. Recuperacion-Eventos-4.2.2.zip conserva la entrega anterior del proyecto para recuperar sus archivos. Una recuperación de archivos no restaura ni borra los datos de trabajo; volver a 4.2.2 también restaura su requisito anterior de login móvil. No reutilizar un manifiesto de otra versión.

Esta intervención no publicó el sitio ni envió mensajes o avisos reales. Las capturas y resultados proceden de pruebas locales. La instalación física iOS/Android, Firebase de producción y recepción real de notificaciones requieren su comprobación de operación.
