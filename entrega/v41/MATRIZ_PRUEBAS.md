# Matriz de pruebas 4.1.0

| Módulo | Verificación / alcance | Estado | Evidencia o limitación |
|---|---|---|---|
| Eventos | Consulta, búsqueda, piso, pago, fecha, alimentación, vista previa y datos comparados con 4.0 | CORREGIDO Y VERIFICADO | regresion |
| Agendas | Cuatro categorías compartidas con Eventos, conteos y paginación de 25 | CORREGIDO Y VERIFICADO | funcionesNuevas |
| Generación | Ventana independiente, mismo generador, copia real texto/HTML y PDF | CORREGIDO Y VERIFICADO | funcionesNuevas |
| Ejecutivo | Datos específicos del registro seleccionado; faltantes No registrado, sin mezclar contactos | CORREGIDO Y VERIFICADO | funcionesNuevas |
| Observación local | Texto original, multilínea, persistencia, rol, conflictos de otra ventana/origen, cuota | CORREGIDO Y VERIFICADO | funcionesNuevas/almacenamiento |
| Observación en origen | Escritura del nuevo texto en Excel o Firebase; no implementada | PENDIENTE | Requiere contrato de escritura autorizada y conflictos en esa fuente |
| Avisos internos | Borrador, edición CAS, publicar, leído/cierre, historial, vigencia, permisos, cuota, sin Notification API | CORREGIDO Y VERIFICADO | funcionesNuevas/almacenamiento |
| Avisos entre dispositivos | No se implementa sincronización remota; ámbito local visible | PENDIENTE | Solo si se requiere alcance entre dispositivos; necesita fuente compartida autorizada |
| Alimentación interna | −15 minutos America/Bogota, app abierta, deduplicación, cancelación y reactivación | CORREGIDO Y VERIFICADO | almacenamiento |
| Push externo | Conservado como integración opcional; proveedor y API probados con servicios controlados | DEPENDENCIA EXTERNA | Credenciales, backend desplegado y prueba física pendientes |
| PWA | Instalar worker, rechazar corrupción, detectar candidato, edición pendiente, dos pestañas, rollback y datos | CORREGIDO Y VERIFICADO | actualizaciones |
| PWA física | Instalación desde menús reales Android/iOS y migración del alojamiento de producción | IMPLEMENTADO, PERO NO VERIFICADO | No se tuvo dispositivo ni se desplegó |
| Responsive | 17 páginas × 5 anchos y 10 modales; capturas inspeccionadas | CORREGIDO Y VERIFICADO | responsive |
| Inicio | Cuatro accesos principales, logotipo existente, herramientas y conexiones agrupadas | CORREGIDO Y VERIFICADO | responsive |
| Minuta / Coworking | Fechas, persistencia, impresión, Ctrl+Q mañana Bogotá con todas las filas manuales | CORREGIDO Y VERIFICADO | minuta/fechas/regresion/webkit/integridad |
| Compartición nativa | PNG y flujos controlados en Chrome/WebKit; recepción física en WhatsApp | IMPLEMENTADO, PERO NO VERIFICADO | Recepción física no probada; sin envío automático |
| Excel / Firebase | Importación XLSX real comparada; datos y conexiones conservados | CORREGIDO Y VERIFICADO | excel/regresion/integridad; Firebase de prueba controlado |
| Firebase producción / IA | Configuraciones y backend conservados; no se afirma conexión nueva exitosa | DEPENDENCIA EXTERNA | Acceso real, configuración opcional IA y verificación en producción |
| Rendimiento | 1000 eventos, 25 filas y cero reconstrucciones tras 20 señales idénticas | CORREGIDO Y VERIFICADO | rendimiento; medición local orientativa |
| GitHub Actions | Flujos anteriores conservados; ejecución remota no realizada | IMPLEMENTADO, PERO NO VERIFICADO | Requiere repositorio remoto configurado |

Los servicios controlados sirven para comprobar contratos y errores; no acreditan conectividad o recepción en producción.
