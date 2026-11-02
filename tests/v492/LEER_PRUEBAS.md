# Agenda 4.9.2: teclado y columnas originales

Con Node 22 o superior y Playwright instalado, configura `ORIGINAL_PROJECT_PATH` con una copia intacta de 4.9.1. Opcionalmente usa `PLAYWRIGHT_PATH` y `CHROME_PATH` con sus rutas de instalación.

- `node tests/v492/agenda.cjs`: verifica conservación, Ctrl+A, ambas columnas de las imágenes, copia normal/con formato, actualización desde el mismo XLSX real de ensayo, publicación en adaptador, selección de texto y cinco anchos.
- `node tests/v492/app-window.cjs`: Ctrl+A/Ctrl+M por teclado automatizado en ventana Chrome de ensayo con `display-mode: standalone`.
- `node tests/v492/migration.cjs`: actualización 4.9.1 → 4.9.2 por el mecanismo existente, dos pestañas y conservación de datos/sesión.
- `npm run check`: sintaxis e integridad de publicación.

La comprobación Excel utiliza un XLSX y handle reales en OPFS de un perfil temporal. Los textos se reprodujeron de las imágenes del usuario; el segundo evento es ficticio y existe únicamente en el ensayo. El adaptador de Firestore está en memoria. No se leen ni modifican archivos operativos o Firebase de producción.

Se cierra Inicio y queda únicamente la Agenda, que carga las fuentes ya configuradas mediante sus controladores originales. Al cambiar el libro, se activa la comprobación original al recuperar foco. La Agenda se actualiza mediante sus eventos de almacenamiento existentes; no se añaden intervalos o consultas. La copia se compara con los datos nuevos y con los bytes originales del XLSX.

Los resultados y capturas ejecutados están en `entrega/v492`. No se afirma haber probado un teclado físico o un teléfono del usuario.
