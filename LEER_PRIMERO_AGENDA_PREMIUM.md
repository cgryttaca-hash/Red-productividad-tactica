# Agenda Móvil premium · 29 de octubre de 2026

Esta entrega actualiza el proyecto completo a partir de `Red-productividad-tactica-main-Agendas-PWA.zip`. Incluye la identidad original en azul oscuro, dorado y blanco; los iconos exportados; la interfaz móvil; FCM; el backend de alimentación y las pruebas locales.

La última instrucción autoriza modernizar Agenda Móvil. Se conservan sus reglas de consulta, fechas, filtros y detalle. Minuta, Eventos, Agendas, Excel, autenticación, la publicación de datos y las reglas de Firestore conservan su código funcional. Continúan retirados únicamente los cuatro módulos ya autorizados: Respaldos, Diagnóstico, Equipos y Auditoría.

## Documentación vigente de esta entrega

- [Informe, pruebas y límites](entrega/premium/INFORME_PREMIUM.md).
- [Configuración y despliegue de Firebase, FCM y alimentación](entrega/premium/DESPLIEGUE_FIREBASE.md).
- [Identidad y recursos exportados](entrega/premium/IDENTIDAD.md).
- [Inventario de archivos y huellas SHA-256](entrega/premium/ARCHIVOS_MODIFICADOS.md).
- [Pruebas reproducibles](entrega/premium/pruebas/INSTRUCCIONES.md).

Los informes anteriores se conservan como historial y describen sus respectivas versiones. Para esta actualización prevalecen estos documentos. No se entregan secretos ni se ha desplegado Firebase: el registro de producción y las pruebas físicas de Android/iPhone requieren completar la guía. El permiso del navegador, el registro confirmado, la aceptación del proveedor y la recepción física se tratan como estados distintos.

Las alertas de alimentación usan exclusivamente `horarioAyB` / `HORARIO AYB`, 15 minutos antes, en `America/Bogota`, zona confirmada por el usuario. Se retiran las notificaciones de finalización y del día siguiente. El filtro «Próximos» continúa disponible.

Publica los archivos estáticos en la misma ruta HTTPS. Conserva los datos del sitio y la vinculación del Excel. La aplicación ofrecerá la actualización de su único service worker. Configura primero el backend en pruebas y realiza la comprobación física descrita en la guía antes de considerar operativos los avisos de fondo.
