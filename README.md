# 📐 PlanMeasure – Interaktives Maßband & Skalierung im Web

Eine leichtgewichtige, hochperformante Web-App zum Vermessen von Distanzen und Flächen auf großformatigen Plänen, Bauzeichnungen und Luftbildern (PNG, JPG, WebP). 

**100% client-seitig, ohne Server oder Build-Schritt – läuft sofort auf GitHub Pages oder per Doppelklick im Browser.**

---

## ✨ Features im Überblick

### 📏 Messwerkzeuge
- **Strecke (Punkt A nach B):** Klassisches Maßband mit Anfangs- und Endgriff, Richtungsanzeige und Distanzbadge.
- **Pfad / Linienzug (A ➔ B ➔ C...):** Mehrteiliges Maßband, das Teilstrecken und Gesamtlänge berechnet (ideal für Zäune, Wege, Straßen).
- **Fläche (Vieleck / Polygon):** Zeichnen beliebiger Polygone mit automatischer Flächenberechnung in $\text{m}^2$ (und Hektar bei großen Flächen) sowie Umfang.
- **Griffe nachträglich verschiebbar:** Alle Messpunkte können jederzeit per Maus oder Touch-Geste millimetergenau nachjustiert werden.
- **Mehrere Messungen gleichzeitig:** Verwaltung aller Messungen in einer Seitenleiste mit Farbmarkierung, Namen, Ausblenden, Löschen und Messwertkopie per Klick.

### 🎯 Maßstab & Skalierung
- **Beliebige Skalierung (px/m):** Direkte Eingabe von Pixel pro Meter (Standardbeispiel: $100\text{ px} = 1\text{ Meter}$).
- **2-Punkte-Kalibrierung:** Klicke zwei Punkte an einer bekannten Referenzstrecke im Bild an (z.B. einen Maßstabsbalken, ein Gebäude oder eine Tür) und gib die reale Meterzahl ein – die App berechnet den Maßstab automatisch.
- **Dynamische Maßstabsleiste:** Wie bei Google Maps oder CAD-Programmen passt sich ein Maßstabsbalken in der Ecke live an das aktuelle Zoomlevel an ($1\text{m}, 2\text{m}, 5\text{m}, 10\text{m}, 20\text{m}, 50\text{m}\dots$).
- **Einheiten-Unterstützung:** Meter ($\text{m}$), Zentimeter ($\text{cm}$), Millimeter ($\text{mm}$) oder Kilometer ($\text{km}$).

### 📱 Optimiert für Smartphone & PC
- **Touch-Gesten auf dem Handy:**
  - **2-Finger-Pinch-to-Zoom & Pan:** Funktioniert in jedem Modus (selbst mitten im Messen kann man mit zwei Fingern in eine Ecke zoomen, den Punkt exakt setzen und wieder herauszoomen).
  - **1-Finger-Pan:** Schnelles Verschieben im "Bewegen"-Modus.
  - **Große Touch-Hitboxen:** Spezielle unsichtbare Touch-Zonen an allen Messpunkten für mühelose Daumenbedienung.
  - **Mobile Bottom Navigation:** Daumenfreundliche Menüleiste am unteren Bildschirmrand.
- **Präzisions-Lupe (Magnifier):**
  - Beim Platzieren oder Ziehen von Punkten auf dem Touchscreen verdeckt der eigene Finger nicht mehr die Sicht: Eine schwebende Lupe vergrößert den Bereich unter dem Finger 4-fach mit Fadenkreuz!
- **Desktop / PC Steuerung:**
  - Mausrad-Zoom direkt auf die Cursorposition.
  - Verschieben per Mittelklick, Leertaste + Ziehen oder Hand-Werkzeug.
  - Tastenkürzel (`M` für Messen, `P` für Pfad, `A` für Fläche, `C` für Kalibrieren, `0` für Einpassen, `Esc` für Abbrechen).

### 🚀 Riesige Pläne & Dateien (z.B. 200m × 200m bei 100 px/m)
- Bei $200\text{m} \times 200\text{m}$ und $100\text{ px/m}$ entstehen Bilder mit **$20.000 \times 20.000\text{ Pixeln}$ (400 Megapixel)**.
- **Warum diese App dabei nicht abstürzt:**
  - Normale Webseiten stürzen ab, wenn sie versuchen, ein 400-MP-Bild in ein HTML5-Canvas zu laden (Browserspeicher-Limit).
  - Diese App nutzt eine **hardwarebeschleunigte CSS-Transform-Architektur mit nativem Image-Streaming und SVG-Vektorebene**.
  - Messlinien bleiben als Vektoren selbst bei $10.000\%$ Zoom gestochen scharf.
  - Text-Badges und Griffe behalten dank inverser Skalierung immer ihre optimale Lesbarkeit auf dem Bildschirm.
  - Intelligenter Fallback für Mobiltelefone mit begrenztem Arbeitsspeicher.

### 💾 Export & Daten
- **Bild mit Messungen exportieren:** Erzeugt ein hochauflösendes PNG mit allen eingezeichneten Linien, Farben und Maßangaben.
- **JSON-Export:** Sichert alle Messkoordinaten und Skalierungswerte zur Weiterverarbeitung.
- **Zwischenablage:** Werte mit einem Klick kopieren.
- **Integrierter 200m-Beispielplan:** Direkt mit einem Klick testbar, ohne erst ein Bild suchen zu müssen.

---

## 🌐 Auf GitHub Pages veröffentlichen (Schritt-für-Schritt)

Da die App vollständig client-seitig ist (reines HTML, CSS und JavaScript), ist kein Build-Prozess nötig:

1. **Repository auf GitHub erstellen:**
   - Erstelle auf [GitHub.com](https://github.com) ein neues Repository (z.B. `plan-measure`).

2. **Dateien hochladen:**
   - Öffne dein Terminal in diesem Ordner und führe aus:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: PlanMeasure Web-App"
   git branch -M main
   git remote add origin https://github.com/DEIN-BENUTZERNAME/plan-measure.git
   git push -u origin main
   ```

3. **GitHub Pages aktivieren:**
   - Gehe in deinem GitHub-Repository auf **Settings** (Einstellungen).
   - Klicke im linken Menü auf **Pages**.
   - Wähle unter **Build and deployment > Source**: `Deploy from a branch`.
   - Wähle als Branch `main` und als Ordner `/ (root)` aus.
   - Klicke auf **Save**.

4. **Fertig!**
   - Nach ca. 1–2 Minuten ist deine Webseite unter:
     `https://DEIN-BENUTZERNAME.github.io/plan-measure/`
     weltweit auf PC und Smartphone erreichbar!

---

## 💻 Lokal auf dem PC testen

Du kannst die App auch ohne Webserver direkt öffnen oder lokal starten:

- **Option A (Mit Python Server):**
  ```bash
  python -m http.server 8000
  ```
  Öffne im Browser: `http://localhost:8000`

- **Option B (Mit Node.js / npx):**
  ```bash
  npx serve .
  ```

---

## ⌨️ Tastatur-Shortcuts

| Taste | Funktion |
| :--- | :--- |
| `H` | Hand-Werkzeug (Verschieben) |
| `M` oder `L` | Strecke messen (Linie) |
| `P` | Pfad messen (Mehrteilig) |
| `A` | Fläche messen (Polygon) |
| `C` | Kalibrierungswerkzeug |
| `+` / `-` | Vergrößern / Verkleinern |
| `0` | Bild an Bildschirm anpassen (Fit) |
| `Leertaste + Ziehen` | Bild verschieben (Pan) |
| `Mausrad` | Zoomen auf Cursorposition |
| `Esc` | Aktuelle Messung abbrechen |
