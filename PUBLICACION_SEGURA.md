# Flujo recomendado de publicación

## Producción
Rama `main`, publicada mediante GitHub Pages.

## Pruebas
Crea una rama `test` o un repositorio separado:
`Red-productividad-tactica-test`.

1. Sube primero la versión nueva al entorno de pruebas.
2. Ejecuta `diagnostico.html`.
3. Comprueba Eventos, Minuta y Agenda Móvil.
4. Verifica el informe del Excel en `validacion.html`.
5. Solo después reemplaza los archivos de producción.

El archivo `laboratorio.html` permite analizar un Excel sin modificar los datos
productivos ni publicar en Firebase.
