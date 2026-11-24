# KRONO · Matriz de aceptación técnica y evidencias

**Fecha de revisión:** 24/11/2026  
**Alcance:** aplicación React en GitHub, distinto del prototipo interactivo de Figma.

> Regla de calidad: un caso no es «aprobado» hasta ejecutar la prueba y conservar el resultado observado. Un test escrito constituye un caso preparado, no una ejecución aprobada.

| Jira | Caso | Resultado esperado | Evidencia disponible | Verificación |
|---|---|---|---|---|
| E4PA-84 | Añadir obligación válida con y sin importe | Guarda campos e identificador único | obligations.test.ts | CI pendiente de consulta |
| E4PA-84 | Recargar datos desde almacenamiento | Conserva registros, estados y fechas; no duplica ID | obligations.test.ts | CI pendiente de consulta |
| E4PA-85 | Campos obligatorios vacíos | Señala nombre/fecha junto al campo | formValidation.test.ts, App.tsx | CI y revisión UI pendientes |
| E4PA-85 | Fecha anterior a hoy o inválida | Impide continuar sin guardar | formValidation.test.ts, App.tsx | CI y revisión UI pendientes |
| E4PA-85 | Alta correcta | Guarda y presenta pantalla de confirmación | App.tsx, flow.integration.test.ts | CI y recorrido navegador pendientes |
| E4PA-86 | Antelación 1/3/7 días | Calcula vencimiento menos antelación | reminders.test.ts | CI pendiente |
| E4PA-86 | Cambio de mes/año/bisiesto | Calcula fechas válidas en UTC | obligations.test.ts, reminders.test.ts | CI pendiente |
| E4PA-86 | Aviso configurado en el pasado | Advierte y considera hoy como disparo lógico | reminders.test.ts, App.tsx | CI pendiente |
| E4PA-87 | Inicio y listado | Muestran obligaciones guardadas con sus estados | App.tsx | Revisión navegador pendiente |
| E4PA-87 | Apertura y vuelta desde detalle | Muestra datos de la obligación y vuelve conservando almacenamiento | App.tsx | Revisión navegador pendiente |
| E4PA-88 | Resolver pendiente | Cambia a Completada, la retira de pendientes y elimina futuros avisos | actions.ts, actions.test.ts | CI pendiente |
| E4PA-88 | Posponer 1/3/7 días y 1 mes | Guarda fecha elegida y recalcula próximo aviso efectivo | actions.ts, actions.test.ts | CI pendiente |
| E4PA-88 | Reabrir después de resolver o posponer | Mantiene estado y fecha en almacenamiento | actions.test.ts, flow.integration.test.ts | CI pendiente |
| E4PA-88 | Confirmaciones visibles | Lista confirma resolución; detalle muestra aplazamiento | App.tsx | Revisión navegador pendiente |
| E4PA-89 | Flujo principal completo | Alta, cálculo, detalle, aplazamiento, resolución y persistencia | flow.integration.test.ts | CI pendiente |
| E4PA-89 | Defectos bloqueantes | Registrados, corregidos y reprobados | Registro de ejecución al final de este documento | Pendiente |
| E4PA-89 | Consistencia Figma/código | Comparados caminos y decisiones | Figma Sprint 1 y App.tsx | Comprobación manual pendiente |
| E4PA-49 | Validación con personas usuarias | Sesiones reales, resultados y hallazgos documentados | docs/VALIDACION-USUARIOS.md | **No realizada** |

## Comprobaciones reproducibles

Desde la raíz del repositorio:

```bash
npm ci
npm run lint
npm test
npm run build
npm run dev
```

Abrir la dirección local de Vite. Para garantizar una prueba aislada, borrar solamente la clave `krono-obligations` del almacenamiento del sitio en un navegador de prueba, o abrir una sesión limpia. **No borrar el almacenamiento de un usuario que tenga datos reales.**

### Recorrido manual 1 · Alta de obligación

1. En Inicio elegir «Añadir».
2. Elegir «Suscripción de pago».
3. Entrar al formulario y enviar vacío: comprobar errores junto al campo.
4. Introducir fecha anterior a hoy: se debe impedir el alta.
5. Escribir «Netflix prueba», importe opcional 12,99 €, fecha futura y antelación de 3 días.
6. Comprobar fecha calculada, guardar y comprobar confirmación.
7. Volver a Inicio, abrir la obligación desde listado y comprobar sus datos.
8. Recargar página y comprobar que el registro sigue disponible.

### Recorrido manual 2 · Resolver y posponer

1. Abrir el detalle de una obligación pendiente.
2. Pulsar «Posponer aviso» y probar cada opción: 1 día, 3 días, 1 semana y 1 mes (crear nueva obligación para cada caso).
3. Verificar confirmación y fecha «Aviso pospuesto hasta».
4. Recargar, volver al detalle y confirmar que la fecha persiste.
5. Marcar como resuelta; comprobar mensaje y filtro Completadas.
6. Recargar y verificar que no reaparece en Pendientes ni Alertas.

### Recorrido manual 3 · Avisos

1. Crear una obligación cuyo aviso se active hoy.
2. Comprobar que aparece en Alertas.
3. Posponer y verificar que ya no se considera activo antes de la nueva fecha.
4. Resolver y verificar que no genera más alertas.

## Registro de ejecución (por cumplimentar)

| Fecha / ejecutor | Commit | Comando / caso | Resultado esperado | Resultado observado | Evidencia | Incidencia |
|---|---|---|---|---|---|---|
| Pendiente | Pendiente | `npm run lint` | Sin errores | Sin ejecutar/documentar | URL de CI | — |
| Pendiente | Pendiente | `npm test` | Todas verdes | Sin ejecutar/documentar | URL de CI | — |
| Pendiente | Pendiente | `npm run build` | Compilación exitosa | Sin ejecutar/documentar | URL de CI | — |
| Pendiente | Pendiente | Recorrido manual 1 | Alta correcta | Sin ejecutar | Capturas | — |
| Pendiente | Pendiente | Recorrido manual 2 | Estados persistentes | Sin ejecutar | Capturas | — |
| Pendiente | Pendiente | Recorrido manual 3 | Avisos coherentes | Sin ejecutar | Capturas | — |

**No marcar E4PA-89 como «Listo» hasta completar la tabla con resultados observados y corregir los defectos bloqueantes.**
