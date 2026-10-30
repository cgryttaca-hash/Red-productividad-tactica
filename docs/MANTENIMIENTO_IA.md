# Proceso de mantenimiento asistido por IA

El asistente operativo consulta eventos; no modifica archivos. El mantenimiento de código es un proceso separado del despliegue y del Service Worker.

1. Conserva un ZIP/commit estable, el informe de pruebas y `release.json`. Recoge errores técnicos con fecha y versión, retirando nombres de clientes, tokens, contraseñas, rutas privadas y datos innecesarios antes de entregarlos a una IA.
2. Define un problema reproducible y una prueba que lo detecte. Trabaja en una rama de ensayo del repositorio actual, por ejemplo una rama cuyo nombre elija el administrador para esa corrección. No concedas a esa ejecución secretos ni acceso de escritura a producción.
3. La IA propone una corrección concreta y los archivos afectados. Comprueba manualmente cambios en roles, fechas, horarios de alimentación, parser Excel, impresión y almacenamiento. Mantén las columnas y la selección de eventos salvo autorización expresa.
4. Ejecuta `pnpm build`, `pnpm check`, `pnpm test` y `pnpm test:updates`. Verifica además los recorridos afectados de Eventos, Agenda Móvil, Minuta/Coworking y los casos de impresión o Push que correspondan. Compara el resultado con la copia estable, no solo con una pantalla vacía.
5. Abre una propuesta de cambios con problema, comportamiento final, archivos, pruebas ejecutadas, pendientes y procedimiento de recuperación. `verify.yml` ejecuta los checks sin publicar. La revisión humana debe confirmar que la IA no añadió efectos ocultos, dependencias o permisos innecesarios.
6. Prueba la versión en un servidor y proyecto Firebase de ensayo separados. Si toca IA o Push, las pruebas con dobles locales no sustituyen una prueba de credenciales y dispositivo en ese entorno.
7. Un responsable aprueba la propuesta y la publicación. `publish.yml` requiere ejecución manual y autorización explícita; configura revisores obligatorios para `production` y protección de rama en GitHub. Un archivo YAML por sí solo no crea esas restricciones en la cuenta.
8. Publica el artefacto verificado y conserva el anterior. Las Functions y cambios de reglas se despliegan por separado con revisión administrativa. Comprueba la versión activa y los recorridos críticos después.
9. Si aparecen problemas, detén la promoción, desactiva la función opcional afectada y aplica el procedimiento de restauración. No borres datos del navegador ni reviertas datos de clientes como sustituto de restaurar archivos.

El Service Worker recibe archivos aprobados del servidor y comprueba sus hashes. No descarga propuestas de una IA, no ejecuta texto generado como JavaScript y no tiene una ruta para que el proveedor cambie el código. La IA externa de consultas solo devuelve filtros validados y no tiene herramientas de escritura.

Se entregan los workflows y las pruebas, pero no se crearon ramas, propuestas, reglas remotas, automatizaciones programadas ni despliegues en la cuenta del usuario.
