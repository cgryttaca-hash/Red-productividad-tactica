# Gestión de Eventos 4.2.0

Entrega sobre la versión 4.1.0. La guía vigente es este archivo y el informe actual está en entrega/v42/INFORME.md. Los documentos anteriores son históricos.

## Qué cambia

Se retiran Avisos, su administración y la ventana separada de generación. Inicio recupera sus tres accesos originales: Agenda de eventos, Minuta y Agenda Móvil. Agendas sigue disponible en la navegación. En Eventos desaparecen los botones individuales añadidos; en Agendas se abre la plantilla al seleccionar una fila o presionar Enter sobre ella. La función original de generación, copia e impresión del documento se conserva.

La plantilla mantiene su encabezado y organiza información general, servicios y observaciones. Cada horario se muestra al lado de su alimento. Si el horario incluye un nombre, se busca su descripción por ese nombre, aunque el orden de las descripciones sea distinto. Cuando las dos celdas contienen líneas paralelas sin etiquetas y con igual cantidad, se conserva ese orden de líneas. Una descripción compartida se identifica como tal. Los detalles ambiguos se conservan sin asignarlos arbitrariamente a una hora. No se recibió un Excel adicional de operación: se revisó el importador y los encabezados existentes y se probaron XLSX reales generados solo para las pruebas.

Las observaciones continúan con guardado local explícito, bloqueo de escritura y control de conflictos. No se simula modificar Excel ni Firebase. La copia local no se sincroniza entre dispositivos y el origen permanece intacto.

## Alimentación

Es la única notificación visible permitida. Usa la fecha del evento y cada hora válida menos quince minutos, en America/Bogota; se excluyen cancelados y servicios sin datos suficientes. No hay recordatorios de fin, próximos eventos, actualización de Excel, publicación o prueba. El control de verificación del proveedor es silencioso y se integra en Comprobar estado.

La aplicación abierta conserva el mecanismo nativo existente y necesita instalación, permiso y publicación reciente para avisos del sistema. La entrega con la aplicación cerrada conserva el backend existente; requiere su URL, credenciales y despliegue real. No se agregó infraestructura nueva ni se comprobó recepción en un teléfono físico. Si utilizas ese backend, publica también functions/food-alerts-core.mjs actualizado, para que el emparejamiento del servicio coincida con el navegador; conserva su configuración y reglas actuales.

## Login y Agenda Móvil

Usuarios, contraseñas, hashes, roles y Firebase Authentication se conservan. Agenda Móvil usa las mismas credenciales locales existentes mediante el login actual, en un ámbito móvil separado. La sesión administrativa mantiene rptAuthSessionV1; la móvil usa rptMobileAuthSessionV1 y su contexto de navegación queda en la pestaña. Acceder desde una pestaña móvil a una ruta administrativa exige volver al login móvil, sin convertirla en una sesión administrativa ni cerrar el escritorio.

Se valida usuario activo, dispositivo, revocación y expiresAt si existe, tanto al entrar como al volver a la pestaña. No se inventó una caducidad nueva para sesiones antiguas: las que no tienen vencimiento conservan la política heredada hasta cierre/revocación. Se probó la caducidad explícita y la persistencia al cerrar y reabrir Chrome. Las cuentas siguen siendo locales a cada navegador, como en el sistema anterior; no se crearon perfiles remotos ni se cambió Firebase Auth. Los controles de ruta del navegador complementan las reglas del servidor; no convierten los HTML estáticos o la agenda publicada en contenido privado del servidor.

## Actualizaciones

La aplicación descarga y verifica SHA-256 de todos los recursos de la versión. Por defecto aplica automáticamente cuando no hay formularios ni operaciones pendientes; si los hay, informa y conserva el trabajo. Desde Configuración puedes abrir la página existente de Actualizaciones. Muestra versión activa, candidato disponible, conexión, comprobación, archivos verificados y tiempos medidos; no inventa porcentajes.

Al aplicar con clientes 4.2 muestra la cuenta de 00:10 a 00:00, mantiene las pestañas protegidas y espera a que la activación esté lista. Todas recargan a la versión completa; se conserva la anterior para recuperación. Guardar y regresar persiste la preferencia automática y vuelve a un origen válido del mismo sistema. La restauración revierte archivos de la aplicación, no datos de Excel/Firebase ni almacenes locales.

**Primer salto desde 4.1:** el JavaScript que ya tiene abierto el navegador no puede incorporar retroactivamente la nueva pantalla de cuenta regresiva. Para ese primer salto se conserva la coordinación compatible y segura de 4.1. Después de cargar 4.2, las actualizaciones siguientes usan la cuenta y los controles nuevos. Abre primero una ruta conocida, como index.html, guarda el trabajo y aplica la actualización. No entres por una ventana retirada mientras siga activa la versión antigua. Volver a 4.1 restaura también los comportamientos de navegación de esa versión.

## Publicación completa y recuperación

Publica el contenido de dist/ en el mismo origen y ruta. No publiques la carpeta fuente completa, pues contiene informes y el backend. Si tu alojamiento copia archivos sin eliminar los retirados, elimina expresamente de su carpeta pública: avisos.html, generacion_agenda.html, js/notice-center.js, js/notices-page.js, js/notices-store.js y css/notices.css. No borres localStorage, IndexedDB ni datos de Firebase para actualizar. La entrega pública nueva ya excluye esos seis archivos. Con el worker nuevo activo, las dos páginas retiradas responden como retiradas, sin ejecutarse.

El ZIP Recuperacion-Eventos-4.1.zip conserva la referencia anterior completa. Para restauración global, vuelve a publicar su dist/ siguiendo el mismo origen y ruta. La copia 4.2 completa permite regresar después. No se realizó un despliegue durante este trabajo.

## Verificación

Informe, matriz, archivos modificados/retirados y pruebas realmente ejecutadas están en entrega/v42/. Se probaron navegador real, worker, actualización automática, dos pestañas, diez segundos, corrupción, rollback, sesiones separadas, expiración, cierre/reapertura, offline, Excel, Minuta, Coworking y comparación de impresión. Firebase y los proveedores externos se controlaron con dobles de prueba aislados, sin escribir producción ni enviar avisos físicos.

Pruebas incluidas: pnpm test, pnpm test:updates, pnpm test:v42, pnpm test:responsive, pnpm test:offline, pnpm test:performance y pnpm test:reopen. Requieren las dependencias declaradas y Chromium instalado con pnpm exec playwright install chromium; CHROME_PATH permite usar Chrome propio. pnpm build genera dist/ y pnpm check verifica la publicación. La regresión comparativa opcional tests/v42/tests-regression.cjs requiere ORIGINAL_PROJECT_PATH apuntando al proyecto 4.1 extraído. No se agregaron bibliotecas de ejecución.
