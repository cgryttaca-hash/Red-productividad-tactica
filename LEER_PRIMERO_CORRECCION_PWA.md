# Corrección PWA y diseño premium · 29 de octubre de 2026

Esta es la documentación vigente de la entrega. Se conserva la versión premium anterior como base y punto de recuperación.

La Agenda Móvil ahora se puede consultar desde el navegador sin instalar y sin autorizar notificaciones. Instalar, abrir desde el icono, conceder permiso y verificar el envío son pasos distintos. Antes de abrir la PWA instalada no se solicitan permisos, tokens ni registros Push.

La interfaz móvil es más compacta y las doce páginas comparten el tema azul marino, dorado y blanco. Se conservan los módulos operativos y los estilos de impresión. Las reglas de alimentación siguen usando `HORARIO AYB`, menos 15 minutos, en `America/Bogota`.

## Archivos de esta entrega

- [Informe y resultados](entrega/correccion-pwa/INFORME_CORRECCION_PWA.md).
- [Configuración externa, despliegue y prueba física](entrega/correccion-pwa/DESPLIEGUE_Y_PRUEBA.md).
- [Archivos modificados](entrega/correccion-pwa/ARCHIVOS_MODIFICADOS.md).
- [Pruebas reproducibles](entrega/correccion-pwa/pruebas/INSTRUCCIONES.md).

**Falta conectar el servicio real de Firebase/FCM.** La URL del backend sigue vacía porque no se suministró una dirección de despliegue verificada. Tampoco se proporcionaron las claves VAPID reales ni acceso administrativo. La aplicación muestra este estado dentro de la PWA instalada y permite seguir consultando los eventos. No se finge una activación ni se atribuye el problema a la instalación del usuario.

El backend incluye una prueba autenticada de envío. Su aceptación por el proveedor se registra por separado de la recepción física. Las pruebas de código y de navegadores locales pasaron; el despliegue y la recepción en Android/iPhone físicos siguen pendientes.

Los documentos de `entrega/premium/` y demás carpetas anteriores son históricos. Para el comportamiento actual prevalecen este archivo y `entrega/correccion-pwa/`. No borres el almacenamiento del navegador al actualizar: conserva usuarios, Excel vinculado y preferencias.
