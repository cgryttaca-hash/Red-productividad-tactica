# Gestión de Eventos 4.0.0

Esta entrega continúa el proyecto real de **Minuta WhatsApp v2**. Conserva los eventos, las columnas de Excel, los usuarios y roles actuales, la impresión, Ctrl + Q y todas las filas de Coworking. La copia estable de entrada se conserva sin modificaciones.

## Qué encontrarás

- Identidad azul marino, dorado y blanco compartida en las quince páginas; ajustes de navegación, formularios y tamaños móviles. Se mantienen los cuatro módulos operativos del inicio.
- **Asistente**, accesible desde Inicio: consultas locales, resumen, campos faltantes, posibles duplicados, preparación de mensajes y descarga de reportes. Funciona con los datos guardados, sin fingir respuestas de IA.
- Integración opcional de IA desde un backend autorizado. Se entrega desactivada, con los archivos necesarios para configurarla. No hay una clave de IA en el navegador.
- **Actualizaciones**, desde Inicio o Configuración: descarga y verificación automática, aplicación segura entre pestañas, versión activa comprobada y recuperación local de la anterior.
- Corrección de la hora inicial del mantenimiento, protección del texto remoto y actualización de sus contadores sin reconstruir toda la lista cada segundo.
- Publicación preparada desde `dist/`, pruebas reproducibles y flujos de revisión y publicación con aprobación humana.
- Excel 0.20.3 unificado, gráficos Chart.js 4.6.1 y etiquetas 2.2.0 locales, con licencias y huellas verificadas. No dependen de descargar esas bibliotecas desde un CDN al abrir las páginas.

## Empezar

La carpeta `Red-productividad-tactica-main` contiene los archivos fuente completos y `dist/` listo para un servidor estático. Para publicar, utiliza **el contenido de `dist/`**, no toda la carpeta del proyecto. Así el backend, los informes, los archivos de configuración privados y las herramientas no se sirven como archivos públicos.

Usa HTTPS. En pruebas locales puedes servir `dist/` mediante un servidor HTTP en localhost. No abras los HTML mediante doble clic.

Si ya tienes la aplicación instalada, guarda el trabajo, cierra las pestañas y ventanas del sistema y vuelve a abrirla después de publicar esta primera migración. **No borres los datos del sitio ni reinstales la aplicación.** La versión anterior no conoce el protocolo de activación segura; después de esta migración, las próximas versiones usan el aviso «Aplicar actualización».

La aplicación verifica los archivos antes de ofrecer la actualización. Si una pestaña está editando, generando una imagen, leyendo Excel o publicando información, la activación espera. Guarda o descarta los cambios y vuelve a intentarlo. La descarga no borra tus datos locales.

## Minuta y Coworking

En Minuta, Ctrl + Q sigue preparando **mañana en America/Bogota** como PNG a color, con el saludo correspondiente a Colombia. Mantiene **todas las filas manuales de Coworking**, incluidas otras fechas y fechas vacías, en su orden original. El selector de pantalla y los registros guardados no cambian al generar la copia.

La fecha inicial de las filas nuevas de Coworking sigue siendo mañana, editable. Las filas guardadas conservan su fecha. Día siguiente, Día anterior, Próximos eventos e Imprimir mantienen su comportamiento.

El usuario revisa la imagen y el destino de WhatsApp. Cuando el menú nativo no admite archivos y texto, puede descargar los PNG, copiar el mensaje y adjuntarlos personalmente. No hubo envíos reales en las pruebas.

## Asistente y servicios externos

La consulta local se identifica como **sin IA** y no cambia los registros. La IA externa interpreta una pregunta y devuelve un plan de consulta de solo lectura; los hechos del reporte se construyen con los eventos publicados y completos de Firebase. No genera hechos libres sobre empresas, horarios, PAX o servicios.

Se envían al proveedor únicamente la pregunta y los filtros que introduce el usuario. Si escribes información de clientes en esos campos, esa información forma parte de la solicitud enviada. Las filas completas de eventos no se mandan al modelo.

La IA exige una identidad Firebase real y autorizada, App Check por defecto y límites diarios de consumo. El usuario y contraseña locales existentes **no autorizan** llamadas de pago. Consulta [Configuración de IA](docs/CONFIGURACION_IA.md).

Push conserva el backend con Firebase, FCM/Web Push, Cloud Tasks y Scheduler: avisos de alimentación exactamente 15 minutos antes de la hora real, sin inventar horas y sin avisos de finalización o próximos eventos. La recepción física sigue dependiendo del proveedor y del sistema operativo. Su URL y sus claves VAPID de producción aún necesitan configuración; se detallan en [Publicación y servicios](docs/PUBLICACION_V4.md).

## Documentación y resultados

- [Configuración y publicación](docs/PUBLICACION_V4.md): Android, iPhone, Firebase, GitHub Pages, variables, pruebas y versiones.
- [Integración de IA](docs/CONFIGURACION_IA.md): permisos, secretos, costos y desactivación.
- [Mantenimiento asistido por IA](docs/MANTENIMIENTO_IA.md): rama de pruebas, revisión, aprobación, publicación y reversión.
- [Restauración](docs/RESTAURACION.md): recuperación local y recuperación global de una copia estable.
- [Informe y archivos](entrega/v4/INFORME.md), [pruebas](entrega/v4/PRUEBAS.json) e [inventario](entrega/v4/ARCHIVOS.json).

Las pruebas se ejecutaron localmente en Chrome y WebKit con datos controlados. El worker, las cachés, PNG, descargas y portapapeles se ejecutaron realmente. No se realizó una publicación, una llamada pagada a IA, un envío Push o WhatsApp real ni una instalación en un teléfono físico.
