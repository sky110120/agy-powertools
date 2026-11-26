<div align="center">
  <img src="../assets/logo.svg" width="72" height="72" alt="Agy Powertools Logo" />
  <h1>Agy Powertools</h1>
  <p><strong>Plugin de mejora nativo para Antigravity 2.0</strong></p>
  <p>Interfaz multilingüe, estadísticas de contexto y uso, diseño compacto, bifurcación y edición de sesiones, cambio entre varias cuentas, proxy sin TUN y soporte para SSH y WSL2</p>
  <!-- plugin-badges:start -->
  <p>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/releases"><img src="https://img.shields.io/github/v/release/WhiteBr1ck/agy-powertools?label=Release&color=2563eb" height="20" alt="Release" /></a>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/WhiteBr1ck/agy-powertools/ci.yml?label=CI" height="20" alt="CI" /></a>
    <a href="../LICENSE"><img src="https://img.shields.io/github/license/WhiteBr1ck/agy-powertools?label=License&color=16a34a" height="20" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Antigravity-2.35.0-0f172a" height="20" alt="Antigravity 2.35.0" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22.13-339933" height="20" alt="Node.js >= 22.13" />
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL2-475569" height="20" alt="Platform" />
  </p>
  <!-- plugin-badges:end -->
  <p><a href="../README.md">简体中文</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="../README_EN.md">English</a> | <a href="README_FR.md">Français</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_DE.md">Deutsch</a> | <strong>Español</strong> | <a href="README_RU.md">Русский</a></p>
  <p>
    <a href="#capturas-de-pantalla">Capturas</a> |
    <a href="#funciones">Funciones</a> |
    <a href="#instalación">Instalación</a> |
    <a href="#configuración">Configuración</a> |
    <a href="#registro-de-cambios">Cambios</a>
  </p>
</div>

<p align="center">
  <img src="./images/hero-workspace.png" alt="Espacio de trabajo de Agy Powertools" width="100%" />
</p>

> Se conecta a Antigravity 2.0 mediante la interfaz de depuración local y lee en modo de solo lectura los archivos locales de sesión SQLite y JSONL. No modifica los archivos de instalación del cliente ni abre páginas web externas.

---

## Capturas de pantalla

<table>
  <tr>
    <th width="50%">Ventana de contexto y velocidad</th>
    <th width="50%">Progreso de tareas y cuota en Resumen</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-composer.png" alt="Ventana de contexto y estadísticas de velocidad" width="100%" />
      <p>Consulta el uso de contexto, la reutilización de caché y la velocidad de generación junto al selector de modelos, con un halo de cuota opcional alrededor del compositor.</p>
    </td>
    <td>
      <img src="./images/card-overview-panel.png" alt="Progreso de tareas y cuota en Resumen" width="100%" />
      <p>Sigue los pasos de ejecución en vivo, la duración de cada paso y la cuota restante por modelo en el panel derecho de Resumen; haz clic en los encabezados para contraer cada sección.</p>
    </td>
  </tr>
  <tr>
    <th>Resumen de uso (claro)</th>
    <th>Resumen de uso (oscuro)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-dashboard-light.png" alt="Resumen de uso en tema claro" width="100%" />
      <p>Usa por defecto el ciclo de cuota semanal actual y muestra solicitudes, tokens, tasa de acierto de caché, costo estimado, mapa de calor de 53 semanas y estado de los modelos.</p>
    </td>
    <td>
      <img src="./images/card-dashboard-dark.png" alt="Resumen de uso en tema oscuro" width="100%" />
      <p>Sigue los temas claro y oscuro del cliente y compara la distribución de tokens, costos, aciertos de caché y velocidad entre modelos.</p>
    </td>
  </tr>
  <tr>
    <th>Solicitudes y anomalías de caché</th>
    <th>Multicuenta y cuotas (desactivado por defecto)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-requests.png" alt="Registro de solicitudes y anomalías de caché" width="100%" />
      <p>Filtra solicitudes por cuenta, modelo, conversación y estado, y señala caídas de caché en intervalos cortos ignorando arranques en frío y compactaciones.</p>
    </td>
    <td>
      <img src="./images/card-accounts.png" alt="Cambio entre varias cuentas y gestión de cuotas" width="100%" />
      <p>Almacena y alterna varias cuentas de Google localmente mediante el almacén nativo del sistema operativo, con vistas de cuota de 5 horas y semanal en un solo lugar.</p>
    </td>
  </tr>
  <tr>
    <th>Idioma y visualización</th>
    <th>Proxy sin TUN (desactivado por defecto)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-settings.png" alt="Configuración de idioma y visualización" width="100%" />
      <p>Elige entre nueve idiomas de interfaz y activa o desactiva el diseño compacto, el tinte de burbujas del usuario y la ventana del halo de cuota.</p>
    </td>
    <td>
      <img src="./images/card-proxy.png" alt="Configuración de proxy de aplicación sin TUN" width="100%" />
      <p>Enruta únicamente Antigravity mediante HTTP o SOCKS5 con comprobaciones de conectividad integradas, Forzar HTTP/1.1 y verificación de actualizaciones dentro de la aplicación.</p>
    </td>
  </tr>
</table>

---

## Funciones

- **Interfaz multilingüe**: Traduce los paneles de Powertools, menús nativos comunes de Antigravity, diálogos de permisos, configuración e iframes de Swarm sin alterar los mensajes del chat ni los bloques de código.
- **Telemetría de contexto y velocidad**: Agrega junto al compositor un anillo de uso de contexto (con reutilización de caché, contador de compactaciones y barras de planificador/ejecutor de Orchestrator) y un indicador de velocidad (`tok/s`, TTFT, tiempo de modelo frente a herramientas y costo estimado de sesión), incluyendo estadísticas de subagentes.
- **Panel local de uso y solicitudes**: Añade la página `Powertools` en la barra lateral combinando el uso de escritorio y de `agy` CLI, con resumen de uso (mapa de calor de 53 semanas, gráficos de tokens y costos, tabla de modelos), registro por solicitud, detección de anomalías de caché en intervalos cortos, copia de errores en un clic, estimación de cuotas y actualización de precios oficiales de API.
- **Diseño compacto y actualizaciones por etapa**: Conserva el tamaño de fuente del cliente mientras ajusta el interlineado y el espaciado; muestra breves avances durante ejecuciones con múltiples herramientas y los pliega en el encabezado de duración al terminar.
- **Bifurcación de sesiones y edición en línea**: Bifurca un nuevo chat desde cualquier respuesta o menú de conversación conservando todo el historial (incluso en chats que usaron subagentes), o edita un mensaje enviado en su lugar usando el compositor nativo de Antigravity.
- **Cambio entre varias cuentas (desactivado por defecto)**: Usa el Administrador de credenciales de Windows, Llavero de macOS o Secret Service de Linux para mantener aisladas varias cuentas de Google sin tokens en texto plano; consulta cuotas de 5 horas y semanales, cambia desde la barra lateral y activa opcionalmente el cambio automático al agotarse la cuota.
- **Proxy de aplicación sin TUN (desactivado por defecto)**: Inyecta parámetros y variables de entorno de proxy solo para Antigravity al reiniciar, con pruebas HTTP CONNECT / SOCKS5, aviso en inicio en frío y opción `GODEBUG=http2client=0` para reducir desconexiones `EOF`.
- **Soporte para SSH remoto y WSL2**: Lee métricas de sesiones remotas, subagentes y panel en ventanas de escritorio `SSH` a través de OpenSSH local sin instalar nada en el servidor; soporta Antigravity en Windows con backend WSL2 en redes NAT y Mirrored, almacenamiento híbrido de credenciales y delegación de reinicio.
- **Menú contextual de archivos y utilidades**: Haz clic derecho sobre enlaces de archivos o elementos del árbol de Archivos para adjuntar al chat, abrir, mostrar en carpeta, copiar el archivo o copiar su ruta (incluidas rutas NAS LAN / SMB en Windows); incluye secciones contraíbles de Progreso de tareas y Cuota en Resumen, contador de no leídos en la barra de título, halo de cuota opcional en el compositor y tinte opcional para burbujas del usuario.

---

## Funciones inútiles (pero geniales)

<p align="center">
  <img src="./images/card-border-beam.webp" alt="Vista previa del borde luminoso del compositor" width="100%" />
</p>

- **Borde luminoso del compositor al trabajar (desactivado por defecto)**: Inspirado en [border-beam-ios](https://github.com/ismnoiet/border-beam-ios), funciona mediante un shader WebGL SDF ligero de rectángulo redondeado. Desplaza un haz fluido y un brillo interior suave a velocidad constante alrededor del compositor mientras el agente trabaja, y se desvanece hasta consumo nulo de CPU/GPU al finalizar el turno. Realiza una transición limpia con el halo de cuota cuando ambos están activos e incluye 6 paletas (`Gemini`, `Aurora`, `Multicolor`, `Neón`, `Acento`, `Cuota`) además del botón **Probar vista previa** en Configuración.

---

## Instalación

> Requisitos: tener Antigravity instalado y haberlo iniciado al menos una vez. Usa Node.js local `>= 22.13` o recurre al `agy-node` incluido con Antigravity. No requiere `npm install` ni permisos de administrador.

### Opción 1: Dejar que un agente lo instale (recomendado)

Envía este prompt a Antigravity o a otro agente local de programación:

> Instala Agy Powertools desde https://github.com/WhiteBr1ck/agy-powertools . Lee primero README_EN.md y docs/INSTALL_AGENT.md, y ejecuta el instalador unificado del proyecto usando Node.js local o el entorno incluido con Antigravity. Conserva intactos los demás plugins, ajustes de cuentas e historial de chats, y no cierres por la fuerza el cliente en ejecución. Verifica la versión instalada al finalizar y avísame si hace falta reiniciar el cliente.

Consulta la [Guía de instalación para agentes](./INSTALL_AGENT.md) para más detalles.

### Opción 2: Línea de comandos

Descarga y extrae el último archivo ZIP desde [Releases](https://github.com/WhiteBr1ck/agy-powertools/releases) (o clona este repositorio) y ejecuta:

```powershell
# Windows (PowerShell)
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

```sh
# macOS / Linux / WSL2
sh ./install.sh
```

Al reinstalar se conservan tus ajustes guardados y no se cierra Antigravity a la fuerza. Reinicia Antigravity cuando termines tu tarea actual y **Powertools** aparecerá en la barra lateral izquierda. En macOS no se crea un lanzador `.app` duplicado: abrir el `Antigravity.app` original reinicia automáticamente una vez con el parámetro de depuración cuando es necesario (con protección antibucle integrada y un interruptor en Configuración o en Plugins -> Powertools para cambiar a reinicio manual en cualquier momento).

### Actualizaciones y desinstalación

- **Actualizaciones dentro de la app**: Ve a **Powertools -> Configuración -> Acerca de -> Buscar actualizaciones** y haz clic en **Instalar actualización**. Los paquetes se verifican con SHA-256 y se revierten automáticamente si el arranque falla.
- **Desinstalación**: Ejecuta `powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1` (Windows) o `sh ./uninstall.sh` (macOS / Linux / WSL2). Añade `--keep-settings` para conservar tus preferencias. El historial nativo de chats, las cuentas y los demás plugins no se modifican.

---

## Configuración

Cada ajuste se aplica al instante en **Powertools -> Configuración** y se guarda automáticamente (**Restaurar valores predeterminados** está al final).

<details>
<summary><strong>Ver todos los ajustes, variables de entorno y rutas</strong></summary>

### Interfaz y visualización

| Ajuste | Predeterminado | Descripción |
| --- | --- | --- |
| Activar Powertools | Activado | Interruptor principal; pausa todas las mejoras de interfaz conservando los ajustes guardados |
| Idioma | `简体中文` | Elige uno de los nueve idiomas de interfaz |
| Fuente local y grosor | Predeterminado del cliente | Busca por nombre localizado o de familia y selecciona para aplicar. El grosor puede configurarse por separado. Restablecer devuelve ambos valores por defecto. La terminal integrada conserva su fuente nativa |
| Diseño compacto | Activado | Reduce el interlineado (`1.4`), el espaciado entre bloques y las filas de herramientas manteniendo el tamaño de fuente del cliente |
| Teñir burbujas de mensajes del usuario | Desactivado | Agrega tinte y borde a los mensajes del usuario (Acento, 5 preajustes, color personalizado y control de intensidad del 10% al 100%) |
| Mostrar siempre el esquema de conversación | Activado | Mantiene visible el riel de navegación por turnos en conversaciones con varios turnos |
| Mantener Resumen abierto al cambiar de chat | Activado | Conserva el estado abierto del panel derecho de Resumen entre conversaciones |
| Conversaciones por proyecto | `Predeterminado (6)` | Controla cuántos chats visibles muestra cada proyecto en la barra lateral (`Predeterminado (6)`, `1-10` o `Mostrar todo`) |
| Arrastrar carpetas a la barra lateral | Activado | Crea o abre proyectos soltando carpetas locales en la barra lateral en una ventana local |
| Fijar proyectos soltados | Desactivado | Fija automáticamente los proyectos creados o abiertos al soltar carpetas |
| Borde luminoso en chats activos de la barra lateral | Desactivado | Dibuja un borde luminoso fluido en los chats activos de la barra lateral (sigue la paleta del compositor o usa una propia, permite ocultar el indicador nativo de cuatro puntos y probar vista previa; cambia a ámbar al esperar confirmación) |
| Grupo de conversaciones en ejecución en la barra lateral | Desactivado | Fija una sección contraíble En ejecución en la parte superior de la barra lateral con chats activos, proyectos, subagentes activos y avisos de confirmación; se oculta al quedar inactivo |
| Contador de no leídos en la barra de tareas | Activado | Muestra `(N)` no leídos en el título de la ventana y de la barra de tareas cuando terminan chats en segundo plano |

### Telemetría y progreso

| Ajuste | Predeterminado | Descripción |
| --- | --- | --- |
| Rango predeterminado de Resumen | `Cuota semanal actual` | Elige ciclo de cuota semanal, Hoy, 24h, Ayer, Esta semana, Este mes, 30 días o Todo el historial |
| Anillo de contexto | Activado | Muestra el anillo de uso de contexto, el desglose de reutilización de caché y las barras por modelo de Orchestrator |
| Velocidad y estadísticas | Activado | Muestra el indicador de velocidad y abre la telemetría de sesión y el costo estimado |
| Progreso de tareas | Activado | Sección contraíble en Resumen con progreso de lista de tareas, fase en vivo y duración por paso |
| Mostrar cuota en Resumen | Desactivado | Sección contraíble en Resumen con las cuotas restantes de 5 horas y semanal |
| Resumen rápido en la barra de título | Desactivado | Agrega un botón de Powertools en la barra de título superior derecha para abrir el panel completo de 6 pestañas sobre el chat actual |
| Halo de cuota en el compositor | Desactivado | Dibuja la cuota restante en sentido horario alrededor de la tarjeta del compositor (esmeralda, ámbar o rojo) |
| Ventana del halo de cuota | `Automático (menor)` | Elige `Automático (menor)`, `Límite semanal` o `Límite de 5 horas` cuando el halo está activado |
| Borde luminoso del compositor al trabajar | Desactivado | Anima un borde luminoso alrededor del compositor mientras trabaja (sin consumo en reposo), con transición limpia junto al halo de cuota, 6 paletas y vista previa en vivo |
| Contexto y telemetría de subagentes | Activado | Muestra modelo, uso de contexto, tokens, tasa de acierto de caché, velocidad y costo por subagente |
| Duración del turno / Expandir herramientas | Activado | Muestra la duración total en turnos completados y expande detalles de herramientas al hacer clic |
| Telemetría al pie del turno | Desactivado | Muestra modelo, tasa de acierto de caché, tokens de entrada/salida y costo estimado al pie de cada respuesta completada con desglose al pasar el cursor |

### Mejoras, cuentas, proxy y contexto experimental

| Ajuste | Predeterminado | Descripción |
| --- | --- | --- |
| Actualizaciones por etapa | Activado | Muestra breves actualizaciones de progreso durante ejecuciones de herramientas y las pliega al terminar |
| Búsqueda y lectura en paralelo | Desactivado | Indica al agente que agrupe búsquedas y lecturas de archivos en un solo turno |
| Búsqueda de texto completo en el selector nativo | Activado | Amplía el modal nativo de búsqueda de conversaciones para buscar en mensajes, bloques de código y comandos, saltando directamente al turno coincidente |
| Bifurcación / Edición de mensajes / Menú de archivos | Activado | Bifurcación nativa de sesiones, edición de mensajes en línea y menú contextual local/NAS/árbol de Archivos (con Abrir con dinámico y salto `#L:C`) |
| Reconocer comandos SSH pegados | Activado | Extrae `user@host:port` al pegar `ssh -p PORT user@host` en Crear nuevo proyecto -> SSH Host (descarta contraseñas adjuntas) |
| Activar cambio entre varias cuentas | Desactivado | Activación opcional con aviso de riesgos; selector en barra lateral, vista de lista/tarjetas, selector 5H/semanal y cambio automático |
| Proxy de aplicación (sin TUN) | Desactivado | Campos de protocolo/host/puerto, pruebas de conectividad, aviso en inicio en frío y Forzar HTTP/1.1 |
| Objetivo de contexto (Experimental) | `Predeterminado` | Elige `Predeterminado`, `256K`, `500K` o `1M` (`Predeterminado` no modifica la configuración nativa) |

### Variables de entorno y rutas

| Nombre / Ruta | Descripción |
| --- | --- |
| `ANTIGRAVITY_USER_DATA_DIR` | Directorio personalizado de datos de usuario de Antigravity para perfiles aislados |
| `ANTIGRAVITY_CLI_DATA_DIR` | Directorio personalizado de datos de `agy` CLI (por defecto `~/.gemini/antigravity-cli`) |
| `ANTIGRAVITY_CDP_PORT_FILE` | Ruta explícita a `DevToolsActivePort` (también respeta `AGY_BROWSER_ACTIVE_PORT_FILE`) |
| `~/.gemini/config/plugins/agy-powertools/` | Archivos instalados del plugin y scripts de ejecución |
| `~/.gemini/antigravity/plugin_data/agy-powertools/` | Configuración guardada, metadatos de cuentas, muestras de cuota y caché de precios |

</details>

---

## Registro de cambios

### v2.16.7
- **Localización nativa en nueve idiomas (integra el PR #80 en francés, gracias a `@oxibys`)**: Añade francés, japonés, coreano, alemán, español y ruso mediante paquetes modulares bajo demanda (`lib/locales/` y RPC `i18n.pack`), junto con guías README completas en los nueve idiomas.
- **Traducción completa del menú Opciones de visualización en la barra lateral (#79)**: Añade `Sort Conversations`, `Sort Projects`, `Auto Pin`, `Archived Only`, `Subtitles`, `Decorations` y `Project` en menús sin afectar nombres de proyectos ni bloques de código.
- **Corrección definitiva de la ventana residual de Windows Terminal tras reiniciar en Windows 11 (#61, gracias a `@poneisme`)**: Lanza `Antigravity.exe` a través de un salto CUI sin ventana (`-LaunchOnly`) con `Start-Process` para cortar por completo la herencia de ConPTY sin activar falsos positivos de antivirus.

### v2.16.6
- **Corrección de filas de conversación no clicables en la barra lateral con el borde luminoso activo**: Se eliminó la regla `position: relative` en el elemento hijo que colapsaba el enlace `position: absolute; inset: 0` de Antigravity, restaurando los clics en toda la fila y los botones al pasar el cursor.
- **Ajuste de capas y desvanecimiento lateral del borde luminoso**: Se elevó la capa `pointer-events: none` por encima de la barra de acciones al pasar el cursor (`z-index: 20`) para evitar recortes rectangulares bruscos y se añadieron máscaras de desvanecimiento izquierda/derecha (`.agy-sb-fade`).

### v2.16.5
- **Precisión en cuota semanal y estadísticas de uso (#63)**:
  - `lib/quota.mjs`: Evita que lecturas en cero o regresivas sobrescriban puntos de control válidos y conserva el progreso medido ante regresiones del historial local.
  - `lib/dashboard.mjs`: Evalúa cada solicitud dentro de los límites semanales de su propio grupo de cuota (Gemini / Claude / Argon) en lugar de compartir una sola marca inicial.
  - `lib/analytics.mjs`: Guarda un archivo atómico de uso por perfil (retención de 90 días, hasta 20 000 solicitudes) para que los totales semanales no caigan al purgarse archivos `.db` antiguos.
- **Limpieza de interfaz y traducciones de Configuración**: Se eliminaron tooltips redundantes sobre los anillos de contexto y velocidad (conservando `aria-label`), se simplificó la tarjeta y encabezado de Costo, y se añadieron 5 textos faltantes de Configuración de Antigravity 2.35.2.
- **PRs de la comunidad y mejoras**: Selector local de fuente y grosor (PR #78, gracias a `@awei84`), borde luminoso inferior y grupo En ejecución en la barra lateral (PR #76, gracias a `@whitzard0421`), arrastrar carpetas a la barra lateral para crear proyectos (PR #73, gracias a `@niuanhua-ydy`) y telemetría al pie de cada turno (PR #65, gracias a `@wwwsideexiecom-boop`).

### v2.16.4
- **Corrección de herencia de consola al reiniciar en Windows (#61)** y **escrituras de credenciales OAuth grandes en macOS sin exponer secretos en `argv` (#75)**.
- **Menor sobrecarga en conversaciones largas (#62)** mediante caché de instantáneas en el sidecar (`{ unchanged: true, stateRev }`) y avance local de temporizadores.
- **Corrección de enfriamiento y condiciones de carrera al reiniciar en frío en macOS (#64)**, **atajos y recuperación de borradores en edición en línea (#70)**, **prevención de parpadeo del esquema alternativo al cambiar de chat (#74)** y **personalización de traducciones (`custom-i18n.json`), comandos slash de 2.35 y detección de idioma del SO (#68, #69)**.
- **PRs de la comunidad**: Recuperación en arranque temprano por SSH remoto (PR #67, `@qimengdunjia`), fusión de telemetría de Antigravity CLI y grupo de cuota Argon (PR #71, `@zhangyu-ch`), y barra de encabezado y filtros fija en la página de gestión (PR #72, `@niuanhua-ydy`).

Para ver el historial completo de versiones anteriores, consulta el [registro de cambios completo](../README_EN.md#changelog).

---

## Licencia y enlaces

- **Licencia**: [MIT License](../LICENSE) (calendario de rango de fechas adaptado de HextaUI con `react-day-picker` y `date-fns`; consulta [lib/vendor/NOTICE.txt](../lib/vendor/NOTICE.txt))
- **Problemas**: [GitHub Issues](https://github.com/WhiteBr1ck/agy-powertools/issues) (incluye sistema operativo, versión de Antigravity y versión del plugin)
- **Comunidad**: [LINUX DO](https://linux.do/)
