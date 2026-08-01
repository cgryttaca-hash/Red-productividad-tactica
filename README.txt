GESTIÓN DE EVENTOS — VERSIÓN FINAL PROFESIONAL
================================================

Páginas:
- index.html: autorización del equipo, estado del Excel, Firebase e historial.
- eventos.html: consulta completa y responsive de la hoja Eventos.
- minuta.html: minuta por fecha, segundo y tercer piso.
- agenda_movil.html: vista pública de solo lectura en tiempo real.

FUNCIONAMIENTO
--------------
1. La primera vez en un equipo:
   - El index solicita nombre del equipo, correo y contraseña del propietario.
   - Abre el selector del Excel.
   - Guarda la sesión de Firebase y la referencia del archivo en ese navegador.

2. Siguientes aperturas:
   - No vuelve a pedir contraseña si Firebase conserva la sesión.
   - No vuelve a pedir buscar el archivo.
   - Comprueba el archivo al abrir, volver a la pestaña y cada 30 segundos.
   - Si Chrome revoca el permiso, muestra Reconectar sin perder la referencia.

3. Almacenamiento:
   - Los eventos se guardan en IndexedDB.
   - localStorage solo conserva datos pequeños.
   - Se evita el error QuotaExceededError.

4. Firebase:
   - Los eventos y el documento de estado se publican primero.
   - La bitácora se publica aparte; un error de historial no bloquea la agenda.
   - La agenda móvil solo puede leer.
   - El propietario autorizado es el UID configurado en firestore.rules.

PUBLICACIÓN EN GITHUB
---------------------
Sube el contenido de esta carpeta a la raíz del repositorio y reemplaza los
archivos existentes. Después abre la página con Ctrl + F5.

La agenda móvil estará en:
https://cgryttaca-hash.github.io/Red-productividad-tactica/agenda_movil.html

IMPORTANTE
----------
Un archivo ZIP subido a GitHub no puede cambiar las reglas remotas de Firestore.
El archivo firestore.rules queda listo y debe coincidir con las reglas publicadas
en Firebase Console para que funcione la bitácora completa. La publicación de
Eventos y Meta no depende de que la bitácora se pueda escribir.
