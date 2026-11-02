# Gestión de Eventos 4.9.1 — Agenda para copiar

Entrega del 1 de noviembre de 2026 · America/Bogota. Uso instalado (PWA), confirmado por el usuario.

## Usar la función existente

1. Abre Gestión de Eventos desde su aplicación instalada e inicia sesión con tu cuenta habitual.
2. Pulsa **Ctrl + W**. Se abre la página existente **Agendas** en una ventana independiente. La página de origen se conserva.
3. Utiliza sus categorías, búsqueda y fecha habituales. Selecciona un evento y usa **Copiar agenda**, **Copiar con formato** o **Seleccionar y copiar**, que ya existían.
4. Pega el contenido en el aplicativo de destino. No se inicia un servicio de mensajería ni se envía información automáticamente.

Los cambios recibidos por las fuentes existentes se reflejan por los listeners que ya tenía Agendas. Consultar/copiar no cambia el Excel ni los eventos originales. Repetir el atajo reutiliza la ventana de Agendas; dentro de esa página conserva el foco en ella. Si el navegador bloquea su apertura, permite la ventana emergente del mismo sitio y vuelve a pulsar el atajo.

**Ctrl + M** mantiene el acceso, contraseña y organización de Super Administrador de la versión 4.9.

## Instalar la actualización de archivos

Publica el contenido de `Publicacion-Eventos-4.9.1.zip` en la raíz habitual de GitHub Pages, sin una carpeta intermedia ni mezclar versiones. La entrega completa está en `Eventos-4.9.1-Completo.zip`. No cambies Firebase, reglas, credenciales, Excel ni manifiestos.

En la aplicación instalada, utiliza el mecanismo existente: **Ctrl + M → Actualizaciones → Comprobar ahora**, y espera la instalación/verificación de **4.9.1**. Se probó la migración local desde 4.9 con dos pestañas y conservación de datos y sesión. No borres el almacenamiento del navegador para aplicar esta entrega.

## Compatibilidad y alcance de la prueba

En una pestaña normal Chrome reserva Ctrl + W para cerrar la pestaña. Esta entrega se dirige a la aplicación instalada que confirmaste utilizar. No incorpora extensiones, pantalla completa, permisos de captura de teclado o atajos alternativos.

Se verificó una ventana Chrome de ensayo en modo standalone, con teclado automatizado por CDP. La comprobación de teclas físicas en tu propia instalación queda pendiente: venció la autorización de la herramienta de control nativo. No se afirma que esa prueba física se haya realizado.

La distinción entre pestaña normal y ventana de aplicación está documentada en las [pruebas de Chromium](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/ui/browser_command_controller_browsertest.cc). La [API de captura de teclado](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock) requiere condiciones adicionales y no se incorporó a este cambio.

Los archivos de Agenda de Eventos, Minuta, Agenda Móvil, la propia Agendas y su copia permanecen idénticos a 4.9. El único archivo funcional cambiado es `js/admin-shortcut.js`; se añaden el manejador Ctrl + W y los metadatos necesarios de la versión. Informe, relación de archivos y pruebas en `entrega/v491`.

No se ha publicado automáticamente ni se han utilizado datos operativos en las pruebas.
