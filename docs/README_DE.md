<div align="center">
  <img src="../assets/logo.svg" width="72" height="72" alt="Agy Powertools Logo" />
  <h1>Agy Powertools</h1>
  <p><strong>Natives Erweiterungs-Plugin für Antigravity 2.0</strong></p>
  <p>Mehrsprachige Oberfläche, Kontext- &amp; Nutzungsstatistiken, kompaktes Layout, Sitzungsverzweigung &amp; Nachrichtenbearbeitung, Multi-Konto-Wechsel, Proxy ohne TUN sowie SSH- &amp; WSL2-Unterstützung</p>
  <!-- plugin-badges:start -->
  <p>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/releases"><img src="https://img.shields.io/github/v/release/WhiteBr1ck/agy-powertools?label=Release&color=2563eb" height="20" alt="Release" /></a>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/WhiteBr1ck/agy-powertools/ci.yml?label=CI" height="20" alt="CI" /></a>
    <a href="../LICENSE"><img src="https://img.shields.io/github/license/WhiteBr1ck/agy-powertools?label=License&color=16a34a" height="20" alt="MIT-Lizenz" /></a>
    <img src="https://img.shields.io/badge/Antigravity-2.35.0-0f172a" height="20" alt="Antigravity 2.35.0" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22.13-339933" height="20" alt="Node.js >= 22.13" />
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL2-475569" height="20" alt="Plattform" />
  </p>
  <!-- plugin-badges:end -->
  <p><a href="../README.md">简体中文</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="../README_EN.md">English</a> | <a href="README_FR.md">Français</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <strong>Deutsch</strong> | <a href="README_ES.md">Español</a> | <a href="README_RU.md">Русский</a></p>
  <p>
    <a href="#screenshots">Screenshots</a> |
    <a href="#funktionen">Funktionen</a> |
    <a href="#installation">Installation</a> |
    <a href="#konfiguration">Konfiguration</a> |
    <a href="#changelog">Changelog</a>
  </p>
</div>

<p align="center">
  <img src="./images/hero-workspace.png" alt="Agy Powertools Arbeitsbereich" width="100%" />
</p>

> Verbindet sich über die lokale Debugging-Schnittstelle mit Antigravity 2.0 und liest lokale SQLite- sowie JSONL-Sitzungsdateien ausschließlich im Schreibschutzmodus. Es verändert keine Installationsdateien des Clients und öffnet keine externen Webseiten.

---

## Screenshots

<table>
  <tr>
    <th width="50%">Kontextfenster &amp; Geschwindigkeitsstatistiken</th>
    <th width="50%">Aufgabenfortschritt &amp; Kontingent in der Übersicht</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-composer.png" alt="Kontextfenster und Geschwindigkeitsstatistiken" width="100%" />
      <p>Prüfen Sie Kontextnutzung, Cache-Wiederverwendung und Generierungsgeschwindigkeit direkt neben der Modellauswahl, optional mit Kontingent-Halo um das Eingabefeld.</p>
    </td>
    <td>
      <img src="./images/card-overview-panel.png" alt="Aufgabenfortschritt und Kontingent in der Übersicht" width="100%" />
      <p>Verfolgen Sie Live-Ausführungsschritte, Schrittdauern und verbleibende Modellkontingente im rechten Übersichtspanel; Abschnitte lassen sich per Klick auf die Kopfzeile einklappen.</p>
    </td>
  </tr>
  <tr>
    <th>Nutzungsübersicht (Hell)</th>
    <th>Nutzungsübersicht (Dunkel)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-dashboard-light.png" alt="Nutzungsübersicht im hellen Design" width="100%" />
      <p>Standardmäßig auf den aktuellen Wochenkontingent-Zyklus eingestellt, mit Anfragezahlen, Tokens, Cache-Trefferrate, Kostenschätzung, 53-Wochen-Heatmap und Modellstatus.</p>
    </td>
    <td>
      <img src="./images/card-dashboard-dark.png" alt="Nutzungsübersicht im dunklen Design" width="100%" />
      <p>Passt sich dem hellen und dunklen Design des Clients an und vergleicht Token-Anteil, Kostenanteil, Cache-Trefferrate und Geschwindigkeit über alle Modelle hinweg.</p>
    </td>
  </tr>
  <tr>
    <th>Anfragen &amp; Cache-Anomalien</th>
    <th>Multi-Konto- &amp; Kontingentverwaltung (standardmäßig aus)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-requests.png" alt="Anfrageereignisse und Cache-Anomalien" width="100%" />
      <p>Filtern Sie Anfragen nach Konto, Modell, Unterhaltung und Status und markieren Sie kurzfristige Cache-Einbrüche, während Kaltstarts und Komprimierungen ignoriert werden.</p>
    </td>
    <td>
      <img src="./images/card-accounts.png" alt="Multi-Konto-Wechsel und Kontingentverwaltung" width="100%" />
      <p>Speichern und wechseln Sie mehrere Google-Konten lokal über den nativen System-Schlüsselbund, mit gebündelter 5-Stunden- und Wochenkontingent-Ansicht.</p>
    </td>
  </tr>
  <tr>
    <th>Sprach- &amp; Anzeigeeinstellungen</th>
    <th>App-Proxy ohne TUN (standardmäßig aus)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-settings.png" alt="Sprach- und Anzeigeeinstellungen" width="100%" />
      <p>Wählen Sie aus neun Oberflächensprachen und schalten Sie kompaktes Layout, Benutzerblasen-Tönung und das Kontingent-Halo-Fenster um.</p>
    </td>
    <td>
      <img src="./images/card-proxy.png" alt="App-Proxy-Einstellungen ohne TUN" width="100%" />
      <p>Leiten Sie ausschließlich Antigravity über HTTP oder SOCKS5 weiter — mit integrierter Verbindungsprüfung, HTTP/1.1-Erzwingung und Update-Verifizierung in der App.</p>
    </td>
  </tr>
</table>

---

## Funktionen

- **Mehrsprachige Oberfläche**: Übersetzt Powertools-Panels, gängige Antigravity-Menüs, Berechtigungsdialoge, Einstellungen und Swarm-Iframes, ohne Chat-Texte oder Codeblöcke zu verändern.
- **Kontext- und Geschwindigkeitstelemetrie**: Ergänzt neben dem Eingabefeld einen Kontextring (mit Cache-Wiederverwendung, Komprimierungszähler und Orchestrator-Planungs-/Ausführungsbalken) sowie eine Geschwindigkeitsanzeige (`tok/s`, TTFT, Modell- vs. Tool-Zeit und geschätzte Sitzungskosten) einschließlich Subagenten-Statistiken.
- **Lokales Nutzungs- und Anfrage-Dashboard**: Fügt eine `Powertools`-Seite in der Seitenleiste hinzu, die Desktop- und `agy`-CLI-Nutzung zusammenführt — mit Nutzungsübersicht (53-Wochen-Heatmap, Token-/Kosten-Diagramme, Modelltabelle), Einzelanfrage-Protokoll, Markierung kurzfristiger Cache-Anomalien, Ein-Klick-Fehlerkopie, Kontingentschätzungen und Abruf offizieller API-Preise.
- **Kompaktes Layout und Live-Zwischenberichte**: Behält die gewählte Schriftgröße des Clients bei und strafft Zeilenhöhe sowie Blockabstände; meldet während mehrstufiger Tool-Läufe kurze Fortschritts-Updates und klappt diese nach Abschluss in die obere Zeitzeile ein.
- **Sitzungsverzweigung und direkte Nachrichtenbearbeitung**: Verzweigen Sie aus jeder Antwort oder über das Unterhaltungsmenü einen neuen Chat mit vollständigem Verlauf (auch bei Chats mit Subagenten) oder bearbeiten Sie gesendete Nachrichten direkt an Ort und Stelle mit dem nativen Eingabefeld von Antigravity.
- **Multi-Konto-Wechsel (standardmäßig aus)**: Nutzt die Windows-Anmeldeinformationsverwaltung, den macOS-Schlüsselbund oder Linux Secret Service, um mehrere Google-Konten ohne Klartext-Tokens isoliert zu halten; prüft 5-Stunden-/Wochenkontingente und ermöglicht den Wechsel aus der Seitenleiste, optional automatisch bei Kontingenterschöpfung.
- **App-Proxy ohne TUN (standardmäßig aus)**: Übergibt Proxy-Flags und Umgebungsvariablen beim Neustart gezielt nur an Antigravity, inklusive HTTP-CONNECT-/SOCKS5-Test, Kaltstart-Hinweis und optionalem `GODEBUG=http2client=0` zur Reduzierung von `EOF`-Verbindungsabbrüchen.
- **SSH-Remote- und WSL2-Unterstützung**: Liest Remote-Sitzungs-, Subagenten- und Dashboard-Metriken in Desktop-`SSH`-Fenstern über lokales OpenSSH ohne Serverinstallation; unterstützt Windows-Antigravity mit integrierten WSL2-Backends im NAT- und Mirrored-Netzwerkmodus, hybrider Anmeldedatenspeicherung und delegiertem Neustart.
- **Datei-Kontextmenü und kleine Helfer**: Rechtsklick auf Dateilinks oder Einträge im Dateibaum zum Anhängen an den Chat, Öffnen, Anzeigen im Ordner, Kopieren der Datei oder Kopieren des Pfads (einschließlich LAN-NAS-/SMB-Pfade unter Windows); ergänzt einklappbare Abschnitte für Aufgabenfortschritt und Kontingent in der Übersicht, Ungelesen-Zähler in der Titelleiste, optionalen Eingabefeld-Kontingentring und optionale Benutzerblasen-Tönung.

---

## Nutzlose Funktionen (aber cool)

<p align="center">
  <img src="./images/card-border-beam.webp" alt="Vorschau des Eingabefeld-Leuchtrahmens bei Aktivität" width="100%" />
</p>

- **Aktiver Eingabefeld-Leuchtrahmen (standardmäßig aus)**: Inspiriert von [border-beam-ios](https://github.com/ismnoiet/border-beam-ios) und umgesetzt mit einem schlanken Rounded-Rectangle-SDF-WebGL-Shader. Führt einen gleichmäßigen Lichtkometen samt dezentem Innenleuchten mit konstanter Geschwindigkeit um das Eingabefeld, solange der Agent arbeitet, und blendet nach Abschluss der Runde ohne CPU-/GPU-Last im Leerlauf aus. Wechselt nahtlos mit dem Eingabefeld-Kontingent-Halo, wenn beide aktiviert sind, und bietet 6 Farbpaletten (`Gemini`, `Aurora`, `Bunt`, `Neon`, `Akzent`, `Kontingent`) sowie eine Schaltfläche **Vorschau testen** in den Einstellungen.

---

## Installation

> Voraussetzungen: Antigravity ist installiert und wurde mindestens einmal gestartet. Verwendet lokales Node.js `>= 22.13` oder greift auf das mit Antigravity gebündelte `agy-node` zurück. Kein `npm install` und keine Administratorrechte erforderlich.

### Option 1: Installation durch einen Agenten (empfohlen)

Senden Sie diesen Prompt an Antigravity oder einen anderen lokalen Coding-Agenten:

> Bitte installiere Agy Powertools von https://github.com/WhiteBr1ck/agy-powertools . Lies zuerst README_EN.md und docs/INSTALL_AGENT.md und führe den einheitlichen Installer des Projekts mit lokalem Node.js oder der gebündelten Laufzeitumgebung von Antigravity aus. Behalte alle anderen Plugins, Kontoeinstellungen und Chat-Verläufe unverändert bei und schließe den laufenden Client nicht zwangsweise. Prüfe anschließend die installierte Version und gib mir Bescheid, falls ein Neustart des Clients erforderlich ist.

Details finden Sie in der [Agent-Installationsanleitung](./INSTALL_AGENT.md).

### Option 2: Befehlszeile

Laden Sie das aktuelle ZIP-Archiv unter [Releases](https://github.com/WhiteBr1ck/agy-powertools/releases) herunter und entpacken Sie es (oder klonen Sie dieses Repository), und führen Sie anschließend aus:

```powershell
# Windows (PowerShell)
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

```sh
# macOS / Linux / WSL2
sh ./install.sh
```

Bei einer erneuten Installation bleiben Ihre gespeicherten Einstellungen erhalten und Antigravity wird nicht zwangsweise geschlossen. Starten Sie Antigravity neu, sobald Ihre aktuelle Aufgabe abgeschlossen ist; **Powertools** erscheint danach in der linken Seitenleiste. Unter macOS wird kein doppelter `.app`-Starter erstellt: Beim Öffnen der regulären `Antigravity.app` wird bei Bedarf automatisch einmal mit dem Debug-Flag neu gestartet (mit integriertem Schleifenschutz und einem Schalter in den Einstellungen oder unter Plugins -> Powertools, um jederzeit auf manuellen Neustart umzustellen).

### Updates und Deinstallation

- **Updates in der App**: Öffnen Sie **Powertools -> Einstellungen -> Über -> Nach Updates suchen** und klicken Sie auf **Update installieren**. Pakete werden per SHA-256 geprüft und bei Startfehlern automatisch zurückgerollt.
- **Deinstallation**: Führen Sie `powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1` (Windows) oder `sh ./uninstall.sh` (macOS / Linux / WSL2) aus. Hängen Sie `--keep-settings` an, um Ihre Einstellungen zu behalten. Native Chat-Verläufe, Konten und andere Plugins bleiben unberührt.

---

## Konfiguration

Alle Einstellungen greifen sofort unter **Powertools -> Einstellungen** und werden automatisch gespeichert (**Standard wiederherstellen** befindet sich ganz unten).

<details>
<summary><strong>Alle Einstellungen, Umgebungsvariablen und Pfade anzeigen</strong></summary>

### Oberfläche & Anzeige

| Einstellung | Standard | Beschreibung |
| --- | --- | --- |
| Powertools aktivieren | Ein | Hauptschalter; pausiert alle UI-Erweiterungen unter Beibehaltung der gespeicherten Einstellungen |
| Sprache | `简体中文` | Auswahl einer von neun Oberflächensprachen |
| Lokale Schriftart & Schriftschnitt | Client-Standard | Suche nach lokalisiertem Namen oder Familiennamen und direkte Übernahme. Der Schriftschnitt lässt sich unabhängig festlegen. Zurücksetzen stellt beide Standards wieder her. Das integrierte Terminal verwendet die Client-Schriftart |
| Kompaktes Layout | Ein | Strafft Zeilenhöhe (`1.4`), Blockabstände und Tool-Zeilen bei unveränderter Client-Schriftgröße |
| Benutzer-Nachrichtenblasen einfärben | Aus | Fügt Benutzernachrichten eine dezente Tönung und einen Rahmen hinzu (Akzent, 5 Vorlagen, eigene Farbe und Mischstärke 10%-100%) |
| Unterhaltungsgliederung immer anzeigen | Ein | Hält die Runden-Navigationsleiste in mehrstufigen Chats dauerhaft sichtbar |
| Übersicht beim Chat-Wechsel offen halten | Ein | Behält den geöffneten Zustand des rechten Übersichtspanels über Unterhaltungen hinweg bei |
| Unterhaltungen pro Projekt | `Standard (6)` | Steuert die Anzahl sichtbarer Chats pro Projekt in der Seitenleiste (`Standard (6)`, `1-10` oder `Alle anzeigen`) |
| Ordner auf Seitenleiste ziehen | Ein | Erstellt oder öffnet Projekte durch Ziehen lokaler Ordner auf die Seitenleiste in einem lokalen Fenster |
| Hineingezogene Projekte anheften | Aus | Heftet Projekte automatisch oben an, die per Drag-and-Drop erstellt oder geöffnet wurden |
| Seitenleisten-Leuchtrahmen für aktive Chats | Aus | Zeichnet einen fließenden Rahmen-Lichtstrahl um aktive Seitenleisten-Chats (folgt standardmäßig der Eingabefeld-Palette oder wählt eine eigene, optionales Ausblenden des nativen Vier-Punkte-Spinners und Live-Vorschau; Bernsteinfarbe beim Warten auf Bestätigung) |
| Gruppe „Aktive Unterhaltungen“ in der Seitenleiste | Aus | Heftet oben in der Seitenleiste einen einklappbaren Bereich für alle aktiven Chats, Projekte, aktiven Subagenten und Bestätigungsanfragen an; blendet sich im Leerlauf aus |
| Ungelesen-Anzeige in der Taskleiste | Ein | Zeigt `(N)` ungelesene Einträge im Fenster- und Taskleistentitel, wenn Hintergrund-Chats abgeschlossen sind |

### Telemetrie & Fortschritt

| Einstellung | Standard | Beschreibung |
| --- | --- | --- |
| Standard-Zeitraum der Übersicht | `Aktuelles Wochenkontingent` | Auswahl zwischen aktuellem Wochenkontingent, Heute, 24 Std., Gestern, Diese Woche, Dieser Monat, 30 Tage oder Gesamtzeitraum |
| Kontextring | Ein | Zeigt Kontextnutzungsring, Cache-Aufschlüsselung und Orchestrator-Balken pro Modell |
| Geschwindigkeit & Statistiken | Ein | Zeigt die Geschwindigkeitsanzeige und öffnet Sitzungstelemetrie sowie Kostenschätzung |
| Aufgabenfortschritt | Ein | Einklappbarer Abschnitt in der Übersicht mit Checklisten-Fortschritt, Live-Phase und Schrittdauern |
| Kontingent in der Übersicht anzeigen | Aus | Einklappbarer Abschnitt in der Übersicht für verbleibende 5-Stunden- und Wochenkontingente |
| Titelleisten-Schnellübersicht | Aus | Fügt oben rechts in der Titelleiste einen Powertools-Auslöser hinzu, der das vollständige 6-Tab-Popover über dem aktuellen Chat öffnet |
| Kontingent-Halo am Eingabefeld | Aus | Zeichnet das verbleibende Kontingent im Uhrzeigersinn um das Eingabefeld (Smaragd, Bernstein oder Rot) |
| Halo-Kontingentfenster | `Auto (niedrigeres)` | Auswahl von `Auto (niedrigeres)`, `Wochenlimit` oder `5-Stunden-Limit` bei aktiviertem Halo |
| Aktiver Eingabefeld-Leuchtrahmen | Aus | Animiert während der Arbeit einen gleichmäßigen Leuchtrahmen um das Eingabefeld (keine Last im Leerlauf), nahtloser Übergang mit dem Kontingent-Halo, 6 Paletten und Live-Vorschau |
| Subagenten-Kontext & Telemetrie | Ein | Zeigt Modell, Kontextnutzung, Tokens, Cache-Trefferrate, Geschwindigkeit und Kosten je Subagent |
| Rundendauer / Tools aufklappen | Ein | Zeigt die Gesamtdauer abgeschlossener Runden und klappt Tool-Details per Klick auf |
| Runden-Fußzeilentelemetrie | Aus | Zeigt Modell, Cache-Trefferrate, Eingabe-/Ausgabe-Tokens und geschätzte Kosten in der Fußzeile abgeschlossener Antworten mit vollständiger Aufschlüsselung beim Überfahren |

### Erweiterungen, Konten, Proxy & Experimenteller Kontext

| Einstellung | Standard | Beschreibung |
| --- | --- | --- |
| Zwischenberichte | Ein | Meldet kurze Fortschritts-Updates während Tool-Läufen und klappt sie nach Abschluss ein |
| Parallele Suche & Lesevorgänge | Aus | Leitet den Agenten an, Dateisuchen und Lesevorgänge in einer Runde zu bündeln |
| Volltextsuche in der nativen Auswahl | Ein | Erweitert das native Suchfenster für Unterhaltungen um Nachrichtentexte, Codeblöcke und Befehle mit direktem Sprung zur passenden Runde |
| Verzweigung / Nachrichtenbearbeitung / Dateimenü | Ein | Native Sitzungsverzweigung, direkte Nachrichtenbearbeitung und Kontextmenü für lokale Dateien, NAS und Dateibaum (mit dynamischen „Öffnen mit“-Apps und `#L:C`-Zeilensprung) |
| Eingefügte SSH-Befehle erkennen | Ein | Extrahiert `user@host:port`, wenn `ssh -p PORT user@host` in „Neues Projekt -> SSH Host“ eingefügt wird (angehängte Passwörter werden verworfen) |
| Multi-Konto-Wechsel aktivieren | Aus | Opt-in mit Risikohinweis; Seitenleisten-Wechsler, Listen-/Kartenansicht, 5H-/Wochen-Umschalter und automatischer Wechsel |
| App-Proxy (ohne TUN) | Aus | Protokoll-/Host-/Port-Felder, Verbindungsprüfung, Kaltstart-Hinweis und HTTP/1.1 erzwingen |
| Kontextziel (Experimentell) | `Standard` | Auswahl von `Standard`, `256K`, `500K` oder `1M` (`Standard` belässt die nativen Einstellungen unverändert) |

### Umgebungsvariablen & Pfade

| Name / Pfad | Beschreibung |
| --- | --- |
| `ANTIGRAVITY_USER_DATA_DIR` | Benutzerdefiniertes Antigravity-Benutzerdatenverzeichnis für isolierte Profile |
| `ANTIGRAVITY_CLI_DATA_DIR` | Benutzerdefiniertes `agy`-CLI-Datenverzeichnis (Standard: `~/.gemini/antigravity-cli`) |
| `ANTIGRAVITY_CDP_PORT_FILE` | Expliziter Pfad zu `DevToolsActivePort` (berücksichtigt auch `AGY_BROWSER_ACTIVE_PORT_FILE`) |
| `~/.gemini/config/plugins/agy-powertools/` | Installierte Plugin-Dateien und Laufzeitskripte |
| `~/.gemini/antigravity/plugin_data/agy-powertools/` | Gespeicherte Einstellungen, Kontometadaten, Kontingent-Stichproben und Preis-Cache |

</details>

---

## Changelog

### v2.16.8
- **Dateien über 20 MB beim Ablegen im Eingabefeld als native Dateireferenz einfügen (#46)**: Behält das native 20-MB-Limit für normale Dateien bei und fügt lokale Dateien über 20 MB ohne Einlesen des Dateiinhalts als native Dateireferenz ein (einschließlich gemischter Ablagen sowie Isolation von Seitenleiste und SSH-Remote-Fenstern).
- **Kontextschutz für Seitenleisten-Menüübersetzungen in allen neun Sprachen (inkl. PR #82, danke an `@statertly-pixel`)**: Beschränkt `Project`, `Sort Conversations`, `Sort Projects`, `Auto Pin`, `Archived Only`, `Subtitles` und `Decorations` auf Menükontexte, damit gleichnamige Unterhaltungs- oder Projekttitel unverändert bleiben.

### v2.16.7
- **Native Lokalisierung in neun Sprachen (inkl. Französisch-PR #80, danke an `@oxibys`)**: Ergänzt Französisch, Japanisch, Koreanisch, Deutsch, Spanisch und Russisch als modulare On-Demand-Sprachpakete (`lib/locales/` und `i18n.pack`-RPC) samt vollständiger READMEs in allen neun Sprachen.
- **Übersetzung des Seitenleisten-Menüs „Anzeigeoptionen“ vervollständigt (#79)**: Ergänzt `Sort Conversations`, `Sort Projects`, `Auto Pin`, `Archived Only`, `Subtitles`, `Decorations` sowie menübezogenes `Project` ohne echte Projektnamen oder Code anzutasten.
- **Verbleibendes Windows-Terminal-Fenster nach Windows-11-Neustart behoben (#61 Folgekorrektur, danke an `@poneisme`)**: Startet `Antigravity.exe` über einen fensterlosen CUI-Zwischenschritt (`-LaunchOnly`) per `Start-Process`, sodass ConPTY-Handle-Vererbung und Konsolenbindung ohne Virenscanner-Fehlalarme vollständig getrennt werden.

### v2.16.6
- **Nicht anklickbare Unterhaltungszeilen bei aktivem Seitenleisten-Leuchtrahmen behoben**: Die untergeordnete `position: relative`-Überschreibung wurde entfernt, die den `position: absolute; inset: 0`-Zeilenlink von Antigravity zusammengedrückt hatte; Zeilen und Hover-Schaltflächen sind wieder vollständig anklickbar.
- **Ebenenanordnung und Randausblendung des unteren Seitenleisten-Leuchtrahmens verfeinert**: Die `pointer-events: none`-Ebene wurde über die Hover-Aktionsleiste (`z-index: 20`) angehoben, um harte rechteckige Abschnitte hinter Hover-Symbolen zu vermeiden, und mit linken/rechten Ausblendmasken (`.agy-sb-fade`) für sanftes Ein- und Auslaufen versehen.

### v2.16.5
- **Genauigkeit von Wochenkontingent und Nutzungsstatistiken korrigiert (#63)**:
  - `lib/quota.mjs`: Verhindert, dass genullte oder zurückgefallene Scans gültige Checkpoints überschreiben, und erhält gemessenen Fortschritt bei lokalen Verlaufsrückgängen.
  - `lib/dashboard.mjs`: Ordnet jede Anfrage den Wochenfenstergrenzen ihres eigenen Kontingent-Pools zu (Gemini / Claude / Argon), statt einen gemeinsamen frühesten Startzeitstempel über alle Pools zu teilen.
  - `lib/analytics.mjs`: Speichert ein atomares Nutzungsarchiv pro Profil (90 Tage Aufbewahrung, bis zu 20.000 Anfragen), damit Wochenwerte beim Bereinigen alter `.db`-Dateien nicht absinken.
- **UI-Bereinigung und Einstellungsübersetzungen**:
  - Redundante Hover-Tooltips an Kontextring, Subagenten-Ring und Geschwindigkeitsauslöser entfernt (`aria-label` bleibt erhalten), damit keine Tooltips geöffnete Popover überdecken.
  - Kostenkarte der Übersicht und Kostenspaltenkopf in den Modellstatistiken gestrafft: ausführliche Hover-Tooltips, Preisbasis-Untertitel und gepunktete Unterstreichung entfernt, sodass nur Gesamtkosten und Durchschnittskosten pro Anfrage verbleiben.
  - 5 fehlende Übersetzungen für Einstellungen in Antigravity 2.35.2 ergänzt (`Search shortcuts...`, `Settings for conversations outside of projects`, `Hide breakdown`, `Notification settings`, `Automatic check for updates`).
- **Community-PRs & Verbesserungen**:
  - **Auswahl für lokale Schriftart und Schriftschnitt (PR #78, danke an `@awei84`)**: Einzeilige native Auswahl für Schriftfamilie und Schriftschnitt mit OpenType-`name`-Tabellenauswertung, Alias-Suche und Filterung auf tatsächlich verfügbare Schriftschnitte (Icon-Fonts und xterm-Terminals ausgenommen).
  - **Unterer Seitenleisten-Leuchtrahmen und angeheftete Gruppe „Aktive Unterhaltungen“ (PR #76, danke an `@whitzard0421`)**: Beide standardmäßig aus; reines CSS-Leuchten an der Unterkante mit 1-px-Lichtlinie (ohne WebGL, respektiert `prefers-reduced-motion`) und nativer Seitenleisten-Typografie.
  - **Ordner auf die Seitenleiste ziehen zum Erstellen von Projekten (PR #73, danke an `@niuanhua-ydy`)**: Erstellt oder öffnet Projekte per Drag-and-Drop lokaler Ordner mit Verzeichnis-/Symlink-Prüfung und Isolation in SSH-Remote-Fenstern.
  - **Runden-Fußzeilentelemetrie (PR #65, danke an `@wwwsideexiecom-boop`)**: Standardmäßig aus; zeigt Modell, Cache-Trefferrate, Eingabe-/Ausgabe-Tokens und geschätzte Kosten je Runde inline und im Hover-Detail.

### v2.16.4
- **Vererbung der Konsolensitzung beim Windows-Neustart behoben (#61)**: Startet `Antigravity.exe` über `ProcessStartInfo` (`UseShellExecute = $false`, `CreateNoWindow = $true`) im Neustartskript, damit die neue Instanz keine PowerShell-Konsolensitzung erbt.
- **Große macOS-OAuth-Anmeldedaten ohne Lecks in `argv` behoben (#75)**: Nähern sich `/usr/bin/security -i`-Hex-Befehle dem 4096-Byte-Zeilenlimit, erfolgt das Schreiben über `/usr/bin/osascript -l JavaScript` via `stdin` mit `Security.framework`, sodass Anmeldedaten bei jeder Größe aus `argv` herausbleiben.
- **Polling- und Übertragungsaufwand bei langen Unterhaltungen reduziert (#62)**: Zwischenspeicherung geparster Sitzungs-Snapshots im Sidecar nach Dateizeitstempeln, Ausführungsstatus, Preisen und Einstellungen; gibt `{ unchanged: true, stateRev }` zurück und führt laufende Phasentimer lokal im Renderer weiter.
- **Cooldown und Wettlaufbedingung beim macOS-Kaltstart-Neustart behoben (#64)**: Setzt Cooldown-Zeitstempel zurück, sobald Debug-Port oder Proxy bereit sind, ergänzt Start-Wiederholungen für den Proxy und koordiniert parallele Kaltstart-Prüfungen auf höchstens einen Neustart.
- **Tastenkürzel und Entwurfswiederherstellung bei direkter Bearbeitung korrigiert (#70)**: Respektiert die Host-Einstellung `sendWithModEnter`, verdeutlicht das Bearbeitungsbanner und stellt vorherigen Entwurf samt Anhängen wieder her, falls ein anderes Fenster die Unterhaltung startet.
- **Aufblitzen der Fallback-Gliederung beim Unterhaltungswechsel verhindert (#74)**: Ergänzt ein 220-ms-Zeitfenster für das Einbinden des nativen `conversation-navigator`, bevor `.pt-outline` gerendert wird.
- **Benutzerdefinierte Übersetzungen, Slash-Befehle 2.35 und OS-Spracherkennung ergänzt (#68, #69)**: Lädt additive Überschreibungen aus `plugin_data/agy-powertools/custom-i18n.json`, übersetzt 10 neue 2.35-Slash-Befehle, erkennt die Standardsprache anhand des Betriebssystem-Locales und setzt Einstellungen über `settings.reset` zurück.
- **Community-PRs**: Frühstart-Wiederherstellung für SSH-Remote (PR #67, `@qimengdunjia`), Zusammenführung von Antigravity-CLI-Telemetrie und Argon-Kontingent-Pool (PR #71, `@zhangyu-ch`) sowie fixierte Kopf- und Filterleisten auf Verwaltungsseiten (PR #72, `@niuanhua-ydy`).

Das vollständige Änderungsprotokoll finden Sie in [README_EN.md#changelog](../README_EN.md#changelog).

---

## Lizenz & Links

- **Lizenz**: [MIT-Lizenz](../LICENSE) (benutzerdefinierter Zeitraum-Kalender auf Basis von HextaUI mit `react-day-picker` und `date-fns`; siehe [lib/vendor/NOTICE.txt](../lib/vendor/NOTICE.txt))
- **Fehler & Vorschläge**: [GitHub Issues](https://github.com/WhiteBr1ck/agy-powertools/issues) (bitte Betriebssystem, Antigravity-Version und Plugin-Version angeben)
- **Community**: [LINUX DO](https://linux.do/)
