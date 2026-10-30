# Configuración de la integración opcional de IA

## Arquitectura

`asistente.html` usa `js/assistant-core.js` para las consultas locales. El mismo código se copia a `functions/assistant-core.js` durante la construcción y se comprueba su igualdad. No cambian las columnas de Excel ni las colecciones de eventos existentes.

El modo externo usa `functions/assistant-service.js` y la función HTTP `eventAssistant`. El servidor verifica origen, token Firebase revocado, UID autorizado y App Check. Reserva una cuota transaccional y lee una publicación completa de Firebase antes de llamar al proveedor. El modelo interpreta la solicitud con Responses API y un esquema JSON estricto. No recibe herramientas, código ejecutable ni filas de eventos. La respuesta se valida nuevamente y se ejecuta como filtros de solo lectura; los reportes se construyen de forma determinista desde los registros publicados.

Se muestran el rango y los filtros efectivos para que el usuario revise una posible interpretación incorrecta. Un esquema correcto no garantiza que el modelo haya entendido la intención. No se presentan hechos generados libremente como si fueran datos del sistema.

El endpoint no admite modificar, publicar, borrar eventos ni enviar mensajes. La IA de esta pantalla tampoco edita el código de la aplicación.

## Requisitos aún pendientes

1. Una cuenta API del proveedor con presupuesto y un modelo compatible con Responses y JSON Schema. No se fija un modelo inexistente ni se presupone acceso del usuario a uno concreto.
2. Firebase Authentication con correo/contraseña para las cuentas que usarán IA. Cada UID debe autorizarse expresamente en el servidor. La autenticación anónima y los roles guardados solo en localStorage no conceden acceso a IA.
3. Firebase App Check con el dominio registrado y su clave pública configurada en `js/firebase-config.js`. No se suministra una clave real nueva.
4. Firestore y Functions habilitados, facturación y permisos de despliegue. Se utiliza la publicación existente `eventos_meta/publicacion` y sus bloques; no se crea un esquema alternativo de eventos.
5. El dominio HTTPS de la aplicación y la URL real de la función desplegada.

## Variables de servidor

Copia las variables de `functions/.env.ai.example` a `functions/.env.TU_PROJECT_ID`, junto con las variables Push que correspondan. No publiques ese archivo ni lo guardes en Git. Los ejemplos se entregan vacíos o desactivados.

| Variable | Uso |
|---|---|
| `AI_ENABLED` | `true` al habilitar la función; `false` para desactivar. Requiere volver a desplegar esa función. |
| `AI_MODEL` | Identificador de un modelo autorizado en tu cuenta, compatible con Responses y salida estructurada. |
| `AI_ALLOWED_ORIGINS` | Orígenes exactos separados por comas, por ejemplo `https://tu-dominio`; sin ruta ni barra final. |
| `AI_ALLOWED_UIDS` | UID de cada identidad Firebase autorizada, separados por comas. Otorga consulta de la publicación completa; los filtros no son una barrera de autorización. |
| `AI_REQUIRE_APP_CHECK` | `true` por defecto. Mantenerlo en producción. `false` solo para un ensayo controlado si se decide hacerlo expresamente. |
| `AI_USER_DAILY_LIMIT` | Solicitudes por UID y día de Colombia; valor inicial 10, límite de configuración 100. |
| `AI_GLOBAL_DAILY_LIMIT` | Solicitudes totales por día; valor inicial 100, límite de configuración 5000. |
| `AI_MAX_OUTPUT_TOKENS` | Tope de tokens de salida por interpretación; inicial 600, entre 200 y 2000. |
| `AI_TIMEOUT_MS` | Espera al proveedor; inicial 15000, entre 1000 y 25000 ms. |

`OPENAI_API_KEY` se crea como secreto de Firebase Secret Manager, **no en un JavaScript público**:

```sh
firebase functions:secrets:set OPENAI_API_KEY --project TU_PROJECT_ID
```

Introduce la clave cuando la herramienta la solicite. No la pegues en un comando, informe, captura, archivo público o variable de GitHub Pages. Con `AI_ENABLED` desactivado, la función no necesita montar ese secreto y Push sigue siendo independiente.

Las cuotas cuentan intentos admitidos, incluidos los que luego fallan. No se reintenta una llamada de IA automáticamente, para evitar consumos duplicados. Los contadores viven en `assistant_quotas`, sin lectura del cliente, con el UID representado mediante hash en el identificador y un campo `expiresOn`. Configura TTL para ese campo si quieres su retirada automática. Son identificadores seudónimos, no datos anónimos. No se guardan preguntas, contraseñas, tokens ni contenido de eventos en los registros del asistente.

El límite diario y el límite de tokens reducen el consumo, pero no sustituyen el presupuesto y las alertas de facturación del proveedor. Los costos reales dependen del modelo elegido. Se admite una publicación de hasta 20000 registros; las entradas mayores se rechazan explícitamente.

## Despliegue y activación

```sh
cd functions
npm ci
cd ..
firebase deploy --only functions:eventAssistant --project TU_PROJECT_ID
```

Después de verificar el endpoint en pruebas, configura `js/assistant-config.js` con `enabled:true` y la URL HTTPS de `eventAssistant`, sin `/query`. No incluyas ninguna clave ni token. Reconstruye una nueva versión y publica `dist/`.

Las rutas son `GET /config` y `POST /query`. La segunda acepta únicamente `question` y `query`, con token Firebase y App Check. La respuesta incluye el identificador de solicitud y el hash de la publicación. La comprobación `/config` no llama al proveedor ni certifica las credenciales de la cuenta; la primera consulta autorizada debe probarse en un entorno de ensayo.

En la pantalla Asistente, conecta una identidad Firebase autorizada si aún no está conectada. Esta es la misma sesión Firebase del navegador: si cambias la cuenta, las funciones propietarias existentes comprobarán esa nueva identidad como ya lo hacían. Tu sesión local y sus permisos no se modifican.

## Desactivación

Para detener el uso externo, establece `AI_ENABLED=false` y vuelve a desplegar `eventAssistant`. Desactiva también `ASSISTANT_CONFIG.enabled` en el frontend en la siguiente publicación. Las consultas locales, Excel, Minuta, Agenda Móvil y Push siguen funcionando. Para revocar un acceso concreto, elimina su UID de `AI_ALLOWED_UIDS` y despliega la configuración; también puedes revocar su sesión Firebase.

## Pruebas y límites

Se ejecutaron pruebas del contrato HTTP, filtros reales, datos faltantes, esquema, permisos, App Check, cuotas, errores y registros con proveedores controlados. **No se realizó una llamada real a OpenAI ni se probó un secreto de producción.** Se exige una prueba autorizada en ensayo después de configurar credenciales.

Fuentes: [API y claves de servidor](https://developers.openai.com/api/reference/overview), [salida estructurada](https://developers.openai.com/api/docs/guides/structured-outputs), [tokens Firebase](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [variables y secretos de Functions](https://firebase.google.com/docs/functions/config-env).
