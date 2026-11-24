# KRONO

Aplicación web académica para organizar **suscripciones, facturas y fechas de vencimiento de documentos**. Ayuda a anticiparse a renovaciones y trámites; **no procesa pagos ni mueve dinero**.

## Estado actual

Implementación en React + TypeScript + Vite del flujo principal diseñado en Figma. El almacenamiento es **local al navegador** (`localStorage`), por lo que la información no se sincroniza entre dispositivos.

### Funcionalidades

- Inicio con próximos vencimientos y resumen económico de importes introducidos.
- Navegación: **Inicio, Obligaciones, Añadir, Alertas y Perfil**.
- Alta de obligaciones por tipo: suscripción, factura/suministro o documento oficial.
- Validación de nombre, fecha y cantidad opcional; errores junto al campo.
- Antelación configurable: 1, 3 o 7 días; fecha de aviso calculada y advertencia de fechas de aviso pasadas.
- Listado con filtros: todas, pendientes, completadas y canceladas.
- Consulta de detalle, resolución y aplazamiento de avisos: **1 día, 3 días, 1 semana o 1 mes**.
- Confirmación visible de acciones, persistencia de estados y cálculo de avisos.

**Limitaciones conocidas:** no hay login/autenticación real, notificaciones push del sistema operativo ni backend. La pantalla Alertas representa avisos calculados en la aplicación; no envía mensajes por sí sola. La validación formal con usuarios (Jira E4PA-49) requiere sesiones reales y sus registros.

## Ejecutar el proyecto

Requisitos: Node.js 24 y npm.

```bash
npm ci
npm run dev
```

Abrir la dirección local mostrada por Vite.

## Verificaciones técnicas

```bash
npm run lint
npm test
npm run build
```

La carpeta `src/obligations` contiene modelo, persistencia, validación de formulario, cálculo de avisos y acciones. Las pruebas abarcan fechas límite (cambios de mes, año, bisiestos), altas válidas/incorrectas, persistencia simulada con almacenamiento falso, estados, aplazamientos y un ciclo de vida integrado.

El workflow [KRONO · Calidad del flujo principal](.github/workflows/krono-ci.yml) ejecuta estas comprobaciones en los cambios al repositorio y en las pull requests contra `main`. El hecho de disponer de pruebas **no equivale a su ejecución aprobada**: consultar los resultados del workflow.

## Criterios y evidencias de Jira

- [E4PA-84](https://davidpesquera.atlassian.net/browse/E4PA-84): modelo y persistencia.
- [E4PA-85](https://davidpesquera.atlassian.net/browse/E4PA-85): formulario de alta.
- [E4PA-86](https://davidpesquera.atlassian.net/browse/E4PA-86): recordatorios lógicos.
- [E4PA-87](https://davidpesquera.atlassian.net/browse/E4PA-87): listado y detalle.
- [E4PA-88](https://davidpesquera.atlassian.net/browse/E4PA-88): resolver y posponer.
- [E4PA-89](https://davidpesquera.atlassian.net/browse/E4PA-89): pruebas funcionales e integración.
- [E4PA-49](https://davidpesquera.atlassian.net/browse/E4PA-49): validación con usuarios (separada de las pruebas técnicas).

Consultar [matriz de pruebas y aceptación](docs/PRUEBAS-Y-CRITERIOS.md) y [protocolo de validación con usuarios](docs/VALIDACION-USUARIOS.md).

## Diseño de referencia

[KRONO · Figma Design](https://www.figma.com/design/Ma4ulIMoSkGhp06w8F0JHz/Sprint-1): Moodboard, Foundations, Componentes, App, Sitemap, Flowchart y Wireframes.

## Organización

- `src/App.tsx`: pantallas, navegación y orquestación de formularios y acciones.
- `src/obligations/model.ts`: entidad Obligación, estados y fechas.
- `src/obligations/storage.ts`: guardado/lectura en almacenamiento local.
- `src/obligations/formValidation.ts`: validaciones del alta.
- `src/obligations/reminders.ts`: planificación lógica de avisos.
- `src/obligations/actions.ts`: resolución y aplazamiento persistentes.
- `src/obligations/*.test.ts`: pruebas de lógica e integración.

Proyecto universitario de Ingeniería Informática. No deben publicarse datos personales reales de participantes en este repositorio.
