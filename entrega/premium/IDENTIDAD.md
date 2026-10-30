# Identidad de Agenda Móvil

Diseño original construido como vectores: calendario de marco abierto y reloj desplazado, con un trazo sencillo y proporciones comunes. Se conserva el nombre Agenda Móvil y el descriptor Gestión de Eventos. No se usan marcas de terceros.

| Uso | Recurso en `assets/agenda-brand/` |
| --- | --- |
| Encabezado sobre fondo oscuro | `logo-full-light.svg` y PNG de 1200 px de ancho |
| Encabezado sobre fondo claro | `logo-full-dark.svg` y PNG de 1200 px de ancho |
| Monocromático | `logo-full-mono.svg` y PNG |
| Símbolo independiente | `logo-symbol-dark.svg`, `logo-symbol-light.svg`, `logo-symbol-mono.svg` |
| Tamaños pequeños | `logo-small.svg`, `favicon.svg`, `favicon.ico` |
| Android/PWA estándar | `icon-192.png`, `icon-512.png` |
| Android adaptable | `icon-maskable-192.png`, `icon-maskable-512.png` |
| Inicio de iOS | `apple-touch-icon.png`, 180 × 180 |
| Notificaciones | `icon-96.png`, `badge-96.png` blanco con transparencia |

Son 19 archivos reales. El ICO contiene imágenes de 16, 32, 48 y 64 px. Los SVG del logotipo llevan las letras como trazados: no dependen de una fuente instalada. Las imágenes PNG están comprimidas y mantienen su proporción. Los iconos adaptables mantienen el símbolo dentro del círculo seguro central del 80 %; esta geometría se comprobó sobre los píxeles exportados.

Paleta: azul `#10283f`, dorado `#bf9a5e`, blanco `#ffffff`, fondo `#f4f7fb`, textos secundarios `#5b6d7d`. Verde para confirmaciones, naranja para pendientes y rojo para errores. El dorado se reserva para acentos. Usa las variantes claras sobre azul; evita comprimir o estirar el símbolo y conserva margen visual.

El manifiesto móvil mantiene identidad, entrada y ámbito previos. Usa iconos estándar y maskable separados. Los metadatos de Apple apuntan al icono nuevo. No se declaran imágenes de inicio específicas por dispositivo: no había una pantalla nativa propia que las necesitara. La presentación de lanzamiento depende de la PWA y del sistema operativo; no se promete uniformidad entre plataformas.
