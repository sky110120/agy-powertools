<div align="center">
  <img src="assets/logo.svg" width="72" height="72" alt="Agy Powertools Logo" />
  <h1>Agy Powertools</h1>
  <p><strong>Native enhancement plugin for Antigravity 2.0</strong></p>
  <p>Multilingual UI, context &amp; usage stats, compact layout, session branching &amp; editing, multi-account switching, no-TUN proxy, SSH &amp; WSL2 support</p>
  <!-- plugin-badges:start -->
  <p>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/releases"><img src="https://img.shields.io/github/v/release/WhiteBr1ck/agy-powertools?label=Release&color=2563eb" height="20" alt="Release" /></a>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/WhiteBr1ck/agy-powertools/ci.yml?label=CI" height="20" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/WhiteBr1ck/agy-powertools?label=License&color=16a34a" height="20" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Antigravity-2.35.0-0f172a" height="20" alt="Antigravity 2.35.0" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22.13-339933" height="20" alt="Node.js >= 22.13" />
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL2-475569" height="20" alt="Platform" />
  </p>
  <!-- plugin-badges:end -->
  <p>
    <a href="README.md">简体中文</a> |
    <strong>English</strong>
  </p>
  <p>
    <a href="#screenshots">Screenshots</a> |
    <a href="#features">Features</a> |
    <a href="#installation">Installation</a> |
    <a href="#configuration">Configuration</a> |
    <a href="#changelog">Changelog</a>
  </p>
</div>

<p align="center">
  <img src="docs/images/hero-workspace.png" alt="Agy Powertools workspace" width="100%" />
</p>

> Attaches to Antigravity 2.0 over the local debugging interface and reads local SQLite and JSONL session files in read-only mode. It does not patch client installation files or open external web pages.

---

## Screenshots

<table>
  <tr>
    <th width="50%">Context Window &amp; Speed Stats</th>
    <th width="50%">Overview Task Progress &amp; Quota</th>
  </tr>
  <tr>
    <td>
      <img src="docs/images/card-composer.png" alt="Context window and speed stats" width="100%" />
      <p>Check context usage, cache reuse, and generation speed next to the model selector, with an optional perimeter quota ring around the composer.</p>
    </td>
    <td>
      <img src="docs/images/card-overview-panel.png" alt="Overview task progress and quota" width="100%" />
      <p>Track live execution steps, per-step durations, and remaining model quotas in the right Overview panel; click section headers to collapse.</p>
    </td>
  </tr>
  <tr>
    <th>Usage Overview (Light)</th>
    <th>Usage Overview (Dark)</th>
  </tr>
  <tr>
    <td>
      <img src="docs/images/card-dashboard-light.png" alt="Usage overview in light theme" width="100%" />
      <p>Defaults to the current weekly quota cycle, displaying request counts, tokens, cache hit rate, estimated cost, a 53-week heatmap, and model health.</p>
    </td>
    <td>
      <img src="docs/images/card-dashboard-dark.png" alt="Usage overview in dark theme" width="100%" />
      <p>Follows the client light and dark themes, comparing token share, cost share, cache hit rate, and speed across models.</p>
    </td>
  </tr>
  <tr>
    <th>Requests &amp; Cache Anomalies</th>
    <th>Multi-Account &amp; Quota Manager (Off by default)</th>
  </tr>
  <tr>
    <td>
      <img src="docs/images/card-requests.png" alt="Request events and cache anomalies" width="100%" />
      <p>Filter requests by account, model, conversation, and status, and flag short-interval cache drops while ignoring cold starts and compactions.</p>
    </td>
    <td>
      <img src="docs/images/card-accounts.png" alt="Multi-account switching and quota management" width="100%" />
      <p>Store and switch multiple Google accounts locally via OS native keyrings, with 5-hour and weekly quota views in one place.</p>
    </td>
  </tr>
  <tr>
    <th>Language &amp; Display Settings</th>
    <th>No-TUN Proxy (Off by default)</th>
  </tr>
  <tr>
    <td>
      <img src="docs/images/card-settings.png" alt="Language and display settings" width="100%" />
      <p>Switch between Simplified Chinese, Traditional Chinese, and English, and toggle compact layout, user bubble tint, and quota halo window.</p>
    </td>
    <td>
      <img src="docs/images/card-proxy.png" alt="No-TUN application proxy settings" width="100%" />
      <p>Route only Antigravity through HTTP or SOCKS5 with built-in connectivity checks, Force HTTP/1.1, and in-app update verification.</p>
    </td>
  </tr>
</table>

---

## Features

- **Multilingual UI (`English` / `简体中文` / `繁體中文`)**: Localizes Powertools panels, common Antigravity menus, permission dialogs, settings, and Swarm iframes while leaving chat text and code blocks untouched.
- **Context and speed telemetry**: Adds a context usage ring (with cache reuse, compaction count, and Orchestrator planner/executor bars) and a speed dial (`tok/s`, TTFT, model vs. tool duration, and estimated session cost) next to the composer, including subagent stats.
- **Local usage and request dashboard**: Adds a `Powertools` sidebar page with usage overview (53-week heatmap, token/cost donuts, model table), per-request log, short-interval cache anomaly flags, one-click error copy, quota estimates, and official API pricing refresh.
- **Compact layout and live stage updates**: Keeps your client font size while tightening line height and block spacing; reports short progress updates during multi-step tool runs and folds them into the top duration header once finished.
- **Session branching and inline editing**: Fork a new chat from any reply or conversation menu with full history preserved (including chats that used subagents), or edit a sent message in place using Antigravity's native composer.
- **Multi-account switching (off by default)**: Uses Windows Credential Manager, macOS Keychain, or Linux Secret Service to keep multiple Google accounts isolated without plaintext tokens; check 5-hour/weekly quotas and switch from the sidebar, with optional auto-switch on depletion.
- **No-TUN application proxy (off by default)**: Injects proxy flags and environment variables for Antigravity alone on relaunch, with HTTP CONNECT / SOCKS5 testing, cold-start prompts, and optional `GODEBUG=http2client=0` to reduce `EOF` disconnects.
- **SSH remote and WSL2 support**: Reads remote session, subagent, and dashboard metrics in desktop `SSH` windows over local OpenSSH without installing anything on the server; supports Windows Antigravity with built-in WSL2 backends across NAT and Mirrored networking, hybrid credential storage, and relaunch delegation.
- **File context menu and small utilities**: Right-click file links or Files tree entries to attach to chat, open, reveal in folder, copy the file, or copy its path (including LAN NAS / SMB paths on Windows); adds collapsible Overview Task Progress and Quota panels, titlebar unread counts, optional composer quota ring, and optional user bubble tint.

---

## Useless Features (But Cool)

<p align="center">
  <img src="docs/images/card-border-beam.webp" alt="Working composer border beam preview" width="100%" />
</p>

- **Working composer border beam (off by default)**: Inspired by [border-beam-ios](https://github.com/ismnoiet/border-beam-ios), powered by a lightweight rounded-rectangle SDF WebGL shader. Glides a smooth comet and soft inner glow at constant speed around the composer while the agent is working, then fades out to zero idle CPU/GPU cost once the turn finishes. Cross-fades seamlessly with the Composer Quota Halo when both are enabled, and includes 6 palettes (`Gemini`, `Aurora`, `Colorful`, `Neon`, `Accent`, `Quota`) plus a live **Try preview** button in Settings.

---

## Installation

> Requirements: Antigravity installed and started at least once. Uses local Node.js `>= 22.13` or falls back to Antigravity's bundled `agy-node`. No `npm install` or admin privileges needed.

### Option 1: Let an Agent install it (recommended)

Send this prompt to Antigravity or another local coding agent:

> Please install Agy Powertools from https://github.com/WhiteBr1ck/agy-powertools . Read README_EN.md and docs/INSTALL_AGENT.md first, and run the unified installer provided by the project using local Node.js or Antigravity's bundled runtime. Keep all other plugins, account settings, and chat history intact, and do not force-close the running client. Verify the installed version afterward and remind me if a client restart is needed.

See [Agent installation guide](docs/INSTALL_AGENT.md) for details.

### Option 2: Command line

Download and extract the latest ZIP from [Releases](https://github.com/WhiteBr1ck/agy-powertools/releases) (or clone this repository), then run:

```powershell
# Windows (PowerShell)
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

```sh
# macOS / Linux / WSL2
sh ./install.sh
```

Reinstalling keeps your saved settings and does not force-close Antigravity. Restart Antigravity once you finish your current task; **Powertools** will appear in the left sidebar. On macOS, no duplicate `.app` launcher is created: opening the original `Antigravity.app` automatically relaunches once with the debug flag when needed (with built-in loop protection, and a toggle in Settings or Plugins -> Powertools to switch to manual restart anytime).

### Updates and uninstall

- **In-app updates**: Go to **Powertools -> Settings -> About -> Check for updates** and click **Install update**. Packages are SHA-256 verified and roll back automatically if startup fails.
- **Uninstall**: Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1` (Windows) or `sh ./uninstall.sh` (macOS / Linux / WSL2). Append `--keep-settings` to keep your preferences. Native chat history, accounts, and other plugins are untouched.

---

## Configuration

Every setting applies live in **Powertools -> Settings** and saves automatically (**Restore defaults** is at the bottom).

<details>
<summary><strong>Expand all settings, environment variables, and paths</strong></summary>

### Interface & display

| Setting | Default | Description |
| --- | --- | --- |
| Enable Powertools | On | Master switch; pauses all UI enhancements while keeping saved settings |
| Language | `简体中文` | Choose `简体中文`, `繁體中文`, or `English` |
| Compact layout | On | Tightens line height (`1.4`), block spacing, and tool rows while keeping client font size |
| Tint user message bubbles | Off | Adds a tint and border to user messages (Accent, 5 presets, custom color, and 10%-100% blend slider) |
| Always show conversation outline | On | Keeps the turn navigation rail visible in multi-turn chats |
| Keep Overview open when switching chats | On | Preserves the right Overview panel open state across conversations |
| Conversations per project | `Default (6)` | Controls visible chats per project in the sidebar (`Default (6)`, `1-10`, or `Show all`) |
| Taskbar unread badge | On | Shows `(N)` unread count in the window and taskbar title when background chats finish |

### Telemetry & progress

| Setting | Default | Description |
| --- | --- | --- |
| Default Overview range | `Current weekly quota` | Choose weekly quota cycle, Today, 24h, Yesterday, This week, This month, 30d, or All time |
| Context ring | On | Shows context usage ring, cache reuse breakdown, and Orchestrator per-model bars |
| Speed & statistics | On | Shows the speed dial and opens session telemetry and estimated cost |
| Task progress | On | Collapsible Overview section with checklist progress, live phase, and step durations |
| Show quota in Overview | Off | Collapsible Overview section showing 5-hour and weekly remaining quotas |
| Titlebar quick overview | Off | Adds a top-right titlebar Powertools trigger to open the full 6-tab popover over your current chat |
| Composer quota halo | Off | Draws remaining quota clockwise around the composer card (emerald, amber, or red) |
| Quota halo window | `Auto (lower)` | Choose `Auto (lower)`, `Weekly limit`, or `5-hour limit` when the halo is enabled |
| Working composer border beam | Off | Animates a smooth border beam around the composer while working (zero idle cost), transitions cleanly with the quota halo, with 6 palettes and Live preview |
| Subagent context & telemetry | On | Shows per-subagent model, context usage, tokens, cache hit rate, speed, and cost |
| Turn duration / Expand tools | On | Shows total duration on finished turns and expands tool details on click |

### Enhancements, Accounts, Proxy & Experimental Context

| Setting | Default | Description |
| --- | --- | --- |
| Stage updates | On | Reports brief progress updates during tool runs and folds them on completion |
| Parallel search & read | Off | Guides the agent to batch file searches and reads in one turn |
| Full-text search in native picker | On | Extends the native conversation search modal to search message bodies, code blocks, and commands, jumping straight to the matched turn |
| Branching / Message edit / File menu | On | Native session branching, inline message editing, and local/NAS/Files tree context menu (with dynamic Open With apps and `#L:C` jump) |
| Recognize pasted SSH commands | On | Extracts `user@host:port` when pasting `ssh -p PORT user@host` into Create New Project -> SSH Host (discards appended passwords) |
| Enable multi-account switching | Off | Opt-in with risk notice; sidebar switcher, list/card views, 5H/weekly toggle, and auto-switch |
| Application proxy (no TUN) | Off | Protocol/host/port fields, connectivity checks, cold-start prompt, and Force HTTP/1.1 |
| Context target (Experimental) | `Default` | Choose `Default`, `256K`, `500K`, or `1M` (`Default` leaves native settings unchanged) |

### Environment variables & paths

| Name / Path | Description |
| --- | --- |
| `ANTIGRAVITY_USER_DATA_DIR` | Custom Antigravity user-data directory for isolated profiles |
| `ANTIGRAVITY_CDP_PORT_FILE` | Explicit path to `DevToolsActivePort` (also honors `AGY_BROWSER_ACTIVE_PORT_FILE`) |
| `~/.gemini/config/plugins/agy-powertools/` | Installed plugin files and runtime scripts |
| `~/.gemini/antigravity/plugin_data/agy-powertools/` | Saved settings, account metadata, quota samples, and pricing cache |

</details>

---

## Changelog

### v2.16.3
- **Fix Windows non-TUN proxy relaunch antivirus blocks (#53)**: Removed `-EncodedCommand`, `ShellWindows` DCOM, `CreateProcessW`, and `.vbs`; creates a temporary `.lnk` inside plugin data via a plain `-File` script and launches it via `explorer.exe` (cleaning up `.lnk`, `.ack`, and `.ps1` afterward), avoiding Windows Defender AMSI and Huorong blocks; verifies `--proxy-server=` on the relaunched process when proxy mode is enabled.
- **Fix repeated Terms of Service dialog after switching accounts (#59)**: Tracks per-account onboarding acceptance and `isGcpTos` from `app_storage.json`, and atomically syncs `agy.onboarding.lastLoginUsername` and `agy.onboarding.lastLoginIsGcpTos` after Antigravity exits and before relaunching (first-time newly added accounts still show the native prompt once).
- **Add automatic update checks, reminders, and optional idle hot-update (#45)**: Adds "Automatically check for updates" (on by default; checks every 12 hours and when Antigravity upgrades) and "Auto-install updates when idle" (off by default; same-major updates when all conversations are idle) under About; displays a clickable "New" badge on the Powertools sidebar item (follows client accent color and jumps straight to Settings -> About), a status dot on the titlebar trigger, and a native-styled bottom-right reminder card.
- **Complete native Skills and Customizations localization (#60)**: Added untranslated Antigravity 2.35.1 UI strings for Skills, Customizations, Marketplace, and MCP management views, along with Traditional Chinese (`zh-TW`) mappings.

### v2.16.2
- **Fix long-conversation periodic stutter and Windows IME flicker (#51)**: Replaced object-reference checks with value signatures for composer ring and state polling, switched completed turn caching to O(1) index/value checks, added scroll deferral, and backed off idle state polling to 6s.
- **Fix initial restored conversation inline edit (#58)**: Intercepts `Enter` and Send clicks in capture phase on the inline edit host to revert, restore the composer, and resend directly.
- **Exclude code and diff views from localization (#55)**: Excluded Monaco editors, diff viewers, code blocks, and monospace containers from UI translation.
- **Fix SSH remote window account display (#57)**: Isolates SSH remote windows from the local multi-account store, keeps the native Settings button visible, skips local sync/auto-switch, and prefers live capabilities email on local windows.
- **Copyable Google OAuth link when adding an account (#56)**: Displays the raw OAuth login URL with Copy and Cancel controls while sign-in is active.
- **Cold-relaunch and auto-switch hardening (PR #52, thanks `@Hi-Jiajun`)**: Escalates lingering POSIX relaunch processes to `SIGKILL`, resolves Linux symlinks, preserves user system proxy env when plugin proxy is off, resets `switchingInProgress` when `relaunching` is false, and preserves `depletedGroupKey` across deferrals.

### v2.16.1
- **Non-TUN proxy cold-start auto-relaunch**: Detects configured but inactive proxy on sidecar boot and relaunches once when the local proxy port is reachable (with cooldown and circuit breaker), plus a manual relaunch button in the sidecar pane.
- **Fix SSH Overview default filter showing zero (#49)**: Disables local account filtering on SSH remote dashboards and falls back to all accounts when no attributed rows exist.
- **Copy final answer only (#50)**: Intercepts the response toolbar Copy button to filter intermediate stage updates and tool summaries while keeping native copy feedback.
- **Post-`/compact` context usage estimate (#48)**: Estimates post-compaction usage immediately from completed `CHECKPOINT` steps until exact provider usage arrives on the next request.
- **Auto-switch safeguards (PR #42, thanks `@Hi-Jiajun`)**: Adds model compatibility validation, cross-tab running-turn detection, an interactive countdown banner, and active weekly-timer priority ranking.

### v2.16.0
- **Progress 3D particle orb and UI updates**: Updated task progress to a 128-particle monochrome 3D orb; streamlined Pricing into Standard list vs API promo modes (PR #39); removed the 32-item subagent telemetry cap (PR #41); replaced raw title tooltips with theme-adaptive popovers (PR #43); added chat image right-click actions (#40).
- **Smaller update bundle and proxy downloads**: Excluded `docs/images/` from release bundles (~540 KB); added HTTP/SOCKS5 proxy support for update checks and downloads (#44); cleared stale "Updated" state after upgrading (#47).

### v2.15.5
- **macOS single-app launch with automatic cold-start relaunch**:
  - No longer creates a duplicate `~/Applications/Antigravity (Powertools).app` wrapper (automatically cleans up legacy wrappers on upgrade) so you simply open the original `/Applications/Antigravity.app`.
  - Automatically relaunches once with `--remote-debugging-port=0` on cold start when the debug port is absent (drops `osascript` to avoid macOS Automation permission prompts, guarded by per-session tracking, a 120s cooldown, and a 2-attempt circuit breaker).
  - Adds an opt-out **Auto-relaunch on cold start (macOS)** toggle in both **Powertools -> Settings** (macOS only) and the native **Plugins -> Powertools** side pane alongside the manual **Restart to Enable** button.

### v2.15.4
- **Fix long-conversation touch-scroll lag and Windows IME toolbar flicker (#37)**: Added dirty checks for `<html>` style properties, render-signature skipping for unchanged historical turns, WeakMap caching for completed responses and flex anchors, `[contenteditable]` / `[data-markdown-root]` observer filtering, touch-drag and IME composition mount deferral, and throttled pruning in `native-i18n.js`.
- **Fix streaming speed calculation (#36)**: Excludes TTFT for genuine streamed responses (`streamingMs >= 500ms` and `outputTokens >= 20`) while keeping whole-request fallback for short buffered tails, and adds a full hover breakdown (decode speed, end-to-end throughput, TTFT, streaming duration) in the Requests table.
- **Faster Overview loading with shimmer skeletons**: Decoupled local dashboard loading from slow remote quota RPCs and added equal-height shimmer skeletons for Overview and EventTable on initial load instead of flashing placeholder zeros.
- **Titlebar quick overview multiline status tooltip and dismissible first-time alert (#38, thanks `@Hi-Jiajun`)**: Explains active low-quota or pending-proxy alerts in a multiline hover tooltip and a dismissible callout with Got it / Don't remind (restorable in Settings).
- **Paste SSH connection commands (#33, thanks `@wangbingnan136`)**: Extracts `user@host:port` when pasting `ssh -p PORT user@host` into the native SSH Host input while discarding any appended password, toggled under Conversation enhancements.

### v2.15.3
- **Fix Windows "Open containing folder" falling back to Documents on paths with spaces**: Pass `/select,"<path>"` with `windowsVerbatimArguments: true` for all non-root Windows reveal calls (fixing both "Open containing folder" and "Open with > File Explorer", plus direct open for drive roots) without affecting macOS or Linux.

### v2.15.2
- **Working composer border beam (off by default; inspired by [border-beam-ios](https://github.com/ismnoiet/border-beam-ios))**:
  - Uses a lightweight rounded-rectangle SDF WebGL shader parameterized by perimeter arc length so the comet and soft inner glow glide at constant linear speed around any composer aspect ratio, fading out cleanly to zero idle CPU/GPU cost (with `prefers-reduced-motion` and SVG fallback support).
  - Seamlessly cross-fades with the Composer Quota Halo when both are enabled: the quota ring fades out completely while the working beam runs, then returns smoothly once the turn finishes.
  - Enable in **Powertools -> Settings -> Telemetry & progress** to choose from 6 curated palettes (`Gemini`, `Aurora`, `Colorful`, `Neon`, `Accent`, `Quota`) and toggle **Try preview** to test palettes live on any chat composer.

### v2.15.1
- **Titlebar quick overview popover (off by default; thanks `@Hi-Jiajun` for the concept and titlebar mount in #32)**: Enable **Titlebar quick overview** in **Powertools -> Settings -> Telemetry & progress** to add a `28x28` trigger next to top-right titlebar actions (with low-quota / pending-proxy indicator dot) that opens all 6 full panels right over your current conversation.
- **Streamlined single-row About card**: Combines project link, version pill, and a single morphing update button (check, inline spinner, up-to-date state with zero layout shift, and one-click install stages) into one compact card.

### v2.15.0
- **Full-text transcript search integrated directly into the native search modal (thanks `@wangbingnan136` for the search engine foundation in #24)**: Typing in the native Conversations picker now displays local and SSH message body, code block, and terminal command matches right inside the modal with scope pills, one-click copy, and direct turn jump (zero visual change when empty).
- **Dynamic "Open with >" submenu in the file context menu (with `#L:C` line jump)**: Auto-detects installed editors, IDEs, and terminals on Windows, macOS, and Linux without extra settings; fixes Windows percent-encoded drive colons (`file:///d%3A/...`) and hardens Windows `.cmd` spawning against shell metacharacters.
- **Multi-account quota refresh reliability and display accuracy (#28, thanks `@Hi-Jiajun`)**: Added request sequencing and `.db/-wal` incremental caching to prevent UI stalls and stale overwrites, unified active account live quota views, filtered untouched `100%` placeholder countdowns, and marked expired inactive estimates with `≈` alongside weekly risk cues.
- **UI polish and fixes**:
  - Added a `10%-100%` blend strength slider (up to solid fill with automatic text contrast) for user message bubble tinting (#27).
  - Fixed Overview Quota `5h 100%` wrapping on macOS (#25), merged native `Worked for` headers with Powertools turn durations to prevent duplicate rows (#29), and refined Chinese Side Question terminology.

### v2.14.3
- **Antigravity 2.35.0 compatibility**: Updated native popover content (`JC`) binding detection for Antigravity 2.35.0 while keeping backward compatibility with 2.34.0, restoring all native panels and popovers.
- **Expanded 2.35.0 localization**: Added translations for sentence-cased settings labels, updated descriptions, and menu actions (`Load older messages`, `Delete Permanently`, `Return to Inbox`).

### v2.14.2
- **Fixed multi-account in-place "Add account" reverting to the previous account after ~50 minutes and clobbering backup credentials (#22, #23, thanks `@Hi-Jiajun` for the investigation and PR)**:
  - Added cross-platform `id_token_email` ownership verification across Linux, macOS, Windows, and WSL2 credential vaults so mismatched credentials never overwrite another account's vault slot or pollute quota records (with graceful fallback for opaque non-JSON tokens).
  - Added `accounts.completeAdd` after in-place sign-in to set the `pendingSwitch` guard and trigger a clean relaunch when the account changes or tokens rotate (clearing stale `language_server` `TokenSource` instances, degrading cleanly to `manualRestartRequired` when relaunch is unavailable, and skipping relaunch on cancelled sign-ins).

### v2.14.1
- **Fixed Overview Task Progress showing Complete while subagents or background tasks are running**: Keeps yielded main turns active when child subagents or non-daemon background tasks (`notFullyIdle`) are still running, adds dedicated `Subagent running` and `Waiting for background tasks` phases (without flagging long-running daemon servers), matches `SYSTEM_MESSAGE` wakeup turns inside the active turn, and aligns unread badge and auto-switch checks.
- **Expanded Swarm panel localization**: Added missing empty-pane guidance, Hive legends, dynamic member/post/frame counts, task completion states, GIF export progress, and dynamic tooltip translations while preserving the `Swarm` entry label and post bodies.

### v2.14.0
- **Windows Antigravity + WSL2 backend support (#21, thanks `@Hopeless` for the design and testing)**:
  - Detects WSL2 and resolves Windows `%APPDATA%\Antigravity\DevToolsActivePort`; connects directly in Mirrored mode and falls back to a Windows `node.exe` / `agy-node.exe` TCP-over-stdio bridge in default NAT mode.
  - Adds `vault.probe()` with explicit error reporting; pairs atomic `0600` WSL2 token/scope files with isolated Windows Credential Manager backup slots (`agy-powertools:wsl:<distro>:account:<id>`).
  - Delegates `.lnk` maintenance and `Antigravity.exe` relaunch to Windows `powershell.exe` from WSL2, falls back to `manualRestartRequired` if relaunch fails after switching, and cleans up dead-PID runtime JSON files on startup.

### v2.13.9
- **Windows LAN NAS / SMB share support for file context menu**: Validates literal IPs or resolves hostnames via `dns.lookup` before touching SMB, allowing access only when every resolved IP is non-global (LAN IPs, NetBIOS names, split-DNS internal domains, Tailscale/VPN private IPs, `*.localhost`, and `wsl$`) while continuing to block public hosts; fixes quoting for UNC paths with spaces in `explorer.exe /select`.

### v2.13.8
- Mounted the composer quota halo directly on `.surface-composer-card` so it no longer outlines project/branch bars on New Chat.
- Added `Quota halo window` selector (`Auto (lower)`, `Weekly limit`, or `5-hour limit`).
- Fixed Markdown formatting in `Settings -> About -> Release notes`.

### v2.13.7
- Added opt-in Overview quota display and composer quota halo (#18), and made Overview `Task progress` and `Quota` collapsible.
- Added incremental checkpoint calibration for multi-device weekly quota estimates (#19).
- Removed Windows hidden PowerShell taskbar flashing calls to prevent AV false positives, and disabled the unused legacy `hooks.json` hook (#20).
- Added translations for sidebar project menus, permission approval dialogs, `Thought for Xs`, and `Step X of Y`.

<details>
<summary>View earlier releases (v2.10.0 - v2.13.6)</summary>

- **v2.13.6**: Streamlined Overview Task Progress with integrated live phase header, connected timeline, per-step durations, live timer, and Orchestrator tooltip translation.
- **v2.13.5**: Added opt-in User Message Bubble Tint, tightened Requests table columns, fixed `#` paths in `file://` links, and expanded 2.34.0 translations.
- **v2.13.4**: Defaulted Overview to Current weekly quota (#12), added OpenSSH remote window telemetry (#14), per-account quota isolation and filtering (#9, #11), attach files/images from context menu, Swarm iframe localization (#10), and split-pane/edit/polling fixes (#15).
- **v2.13.3**: Full-history branching for conversations with subagents, macOS native launcher icon and Dock guide (#7, #8), and 2.34.0 menu translations.
- **v2.13.2**: Cache hit rate metrics and short-interval cache anomaly detection (#6), Traditional Chinese (`zh-TW`), Orchestrator updates, and dynamic Claude pricing parsing.
- **v2.13.1**: Subagent context & telemetry, live execution phases in Task Progress, Today Overview range, and Aux Pane fallback updater.
- **v2.13.0**: Antigravity 2.34.0 compatibility, opt-in multi-account switching, opt-in no-TUN application proxy, inline edit suspension, and packaged README badge fix (#5).
- **v2.12.0 - v2.12.10**: In-app verified updater, component caching, inline message editing, taskbar unread badges, split context/speed popovers, file context menu (#2), sidebar project limits, and stability fixes (#1, #3, #4).
- **v2.10.0 - v2.11.0**: Antigravity 2.32.x support, paired token/cost donuts, and master switch.

</details>

---

## License & Links

- **License**: [MIT License](LICENSE) (custom date-range calendar adapted from HextaUI using `react-day-picker` and `date-fns`; see [lib/vendor/NOTICE.txt](lib/vendor/NOTICE.txt))
- **Issues**: [GitHub Issues](https://github.com/WhiteBr1ck/agy-powertools/issues) (please include OS, Antigravity version, and plugin version)
- **Community**: [LINUX DO](https://linux.do/)
