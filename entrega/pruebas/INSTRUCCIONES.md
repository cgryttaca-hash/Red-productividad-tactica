# Repetir la verificación

Estas herramientas son únicamente de verificación; la aplicación no requiere Node.js ni Playwright para funcionar.

Requisitos para repetir las pruebas: Node.js, Playwright y Chrome. Se puede indicar la ruta al paquete Playwright mediante `PLAYWRIGHT_PATH` y al ejecutable Chrome mediante `CHROME_PATH`.

1. Extrae el ZIP original y el actualizado en carpetas diferentes.
2. Define `ORIGINAL_PROJECT_PATH` y `ACTUAL_PROJECT_PATH` con las rutas absolutas a sus carpetas de aplicación.
3. Define `TEST_OUTPUT_PATH` para guardar los resultados fuera de esas carpetas.
4. Define `TEST_VENDOR_PATH` apuntando a una carpeta con las cuatro bibliotecas originales indicadas en `DEPENDENCIAS_PRUEBAS.json`, usando los nombres allí registrados. Comprueba sus SHA-256 antes de utilizarlas. Las bibliotecas solo se interceptan durante las pruebas; no sustituyen archivos de la aplicación.
5. Ejecuta `node verify.cjs` y después `node additional.cjs` desde la carpeta que contiene ambos scripts.

El servidor de prueba escucha solo en 127.0.0.1. Firebase se sustituye por un servicio en memoria, y la fecha de prueba se fija al 27 de octubre de 2026 en America/Bogota. Los flujos de autenticación local y XLSX usan los módulos reales del proyecto. Las pruebas operativas de Agenda Móvil simulan que está instalada y que tiene permiso de notificaciones; también se compara su pantalla de requisitos sin esa simulación.

Las pruebas utilizan perfiles temporales del navegador y datos sintéticos. No deben conectarse a la sesión ni al almacenamiento de producción.

Para comparar la impresión, renderiza los PDF `*-impresion-original.pdf` y `*-impresion-actual.pdf` con el mismo Poppler, por ejemplo a 110 ppp, y compara los PNG. En esta entrega las imágenes son idénticas para Eventos y Minuta.

La prueba offline registra la respuesta del documento y su estado de visibilidad: no declara que la Agenda esté operativa si permanece con maintenance-pending. La limitación descrita en el informe se observa tanto en el original como en el actualizado.
