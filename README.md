# e-Lockers · FIME UANL

Aplicación en español para consultar y reservar casilleros del Edificio 5 y del Polideportivo de FIME. Usa React con TypeScript, TanStack Start, Tailwind CSS 4, Lucide y despliegue en Netlify.

## Desarrollo local

Requiere Node.js 22.13+ (o 24) y pnpm.

```sh
pnpm install
netlify dev --port 8889
```

La aplicación consulta directamente `https://elockers.onrender.com/api/lockers` y reserva mediante `POST /api/reserve` con `{ "id": number }`. No necesita variables de entorno ni almacena datos en el navegador. Render debe permitir CORS desde el dominio del frontend. El primer acceso puede tardar por el arranque del servicio.

## Verificación

```sh
pnpm test
pnpm run typecheck
pnpm run build
```

Las pruebas usan respuestas HTTP simuladas únicamente en el entorno de pruebas; la aplicación nunca utiliza disponibilidad de demostración. Cubren rangos, duplicados, errores, interacción con teclado, contrato de reserva, conservación de selección y actualización posterior.

## Contrato

`edificio: 5` corresponde a 5001–5100; `edificio: 1`, al Polideportivo 1001–1224. `en_uso` debe ser booleano. Se rechazan respuestas mal formadas completas. Los registros ausentes se presentan como espacios sin datos, nunca como disponibles. El mapa de Edificio 5 es un esquema interior de 10×10 sin carácter oficial. El Polideportivo usa 8 columnas y 28 filas, con desplazamiento vertical.

La confirmación depende de una respuesta HTTP exitosa. Un error HTTP 400 o 409 puede indicar un casillero ocupado o inexistente. Un error de red al reservar no permite determinar si el servidor recibió la solicitud; no se presenta como éxito. No se modificó el backend externo ni su base de datos.
