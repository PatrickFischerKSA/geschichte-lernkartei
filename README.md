# Geschichte zum Wenden

Eine deutschsprachige Lernkartei mit **112 drehbaren Karten und 14 Lernzielen** zu den bereitgestellten Ägypten-Unterlagen, historischen Quellen und den ergänzenden Griechenland-Themen der Prüfungsantworten.

## Starten

`index.html` direkt im Browser öffnen. Kein Build, keine Installation, kein Konto und keine API erforderlich. Alternativ im Projektordner:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Anschliessend `http://127.0.0.1:8765` öffnen. Das Projekt kann unverändert auf einem statischen Webserver bereitgestellt werden. Es ist nicht automatisch öffentlich veröffentlicht.

## Lernen

- Frage beantworten und Karte anklicken oder «Antwort aufdecken» wählen.
- Antwort vergleichen; «Noch üben» oder «Gewusst» wählen. Es folgt die nächste Karte.
- Nach Thema, Lernziel, Suchbegriff und Lernstand filtern; Karten mischen.
- Unter «Lernziele & Quellen» Abdeckung, Korrekturen und Nachweise prüfen.
- Tastatur: Leertaste wendet, Pfeiltasten blättern, 1 markiert «Noch üben», 2 «Gewusst». In Eingabefeldern gelten die normalen Tastenfunktionen. Auf einem fokussierten Button aktiviert die Leertaste den Button.

Der Lernstand wird ausschliesslich in `localStorage` dieses Browsers gespeichert. Andere Geräte oder Browser erhalten ihn nicht. Direkt geöffnete Dateien können je nach Browser eingeschränkte Speicherung haben. Ein Hinweis erscheint, falls die Speicherung nicht funktioniert.

## Inhalt und Prüfung

Grundlage sind **IMG_0101.pdf** (26 Seiten) und **WhatsApp Image 2026-10-01 at 13.37.25.pdf** (4 Seiten). D und P in den Quellenangaben beziehen sich auf diese PDFs; gezählt wird die PDF-Reihenfolge, nicht die teilweise neu beginnende gedruckte Seitennummer.

Die handschriftliche Prüfung enthält keine Originalfragen. Entsprechende Karten sind daher als Rekonstruktion gekennzeichnet. Die Filme, der Text zu Prüfung 4a und ein Griechenland-Dossier fehlen. Zwei Karten weisen ausdrücklich auf offene Belegfragen hin; Griechenland ist eine extern geprüfte Ergänzung.

- [Vollständige Aufgaben- und Lernzielzuordnung](docs/ABDECKUNG.md)
- [Inhaltlicher Prüfbericht, Korrekturen und Grenzen](docs/PRUEFBERICHT.md)
- [Maschinenlesbare Abdeckungsmatrix](coverage.json)
- [Editierbare Karten und Quellen](cards.json)

Prüfstatus:

| Status | Bedeutung |
|---|---|
| Dossierabgleich | Antwort wurde aus den genannten Dossierstellen zusammengeführt; Deutungen bleiben als solche erkennbar. |
| Präzisiert / korrigiert | Eine Verkürzung, Fehlannahme, unklare Notiz oder didaktische Vereinfachung wurde erläutert. |
| Ergänzend geprüft | Fehlende Dossierinformationen wurden mit verlinkten Fachquellen ergänzt; keine Behauptung über nicht vorliegende Filminhalte. |
| Quelle fehlt | Eine spezifische Antwort ist anhand des Materials nicht verifizierbar. |

## Bearbeiten und prüfen

`cards.json` ist die Inhaltsquelle. Nach Änderungen `npm run sync` ausführen, damit `data.js` dieselben Daten enthält. Bei Änderungen am Umfang auch Lernzielzuordnung und Dokumentation aktualisieren.

```sh
npm test
node --check app.js
```

Die Browserprüfung in `tests/browser.cjs` benötigt eine vorhandene Playwright-Installation mit Chromium. Dafür entweder `playwright` lokal verfügbar machen oder `PLAYWRIGHT_MODULE` auf eine bestehende Installation setzen. Bei laufendem Vorschau-Server:

```sh
npm run test:browser
```

`TEST_URL` kann eine abweichende lokale Vorschauadresse enthalten. Screenshots werden in `test-results/` abgelegt und nicht versioniert.

## Dateien und Rechte

Die beiden vollständigen PDFs, Namen, Noten und vollständige Schülerantworten werden nicht mitgeliefert. Drei kleine Bildausschnitte aus D 4, D 13 und D 26 ermöglichen die verlangte Quellenarbeit. Der Ausschnitt aus D 26 enthält Anmerkungen der Vorlage; die Kartei erläutert die fehlerhafte Zuordnung.

Quellbilder und Unterrichtsmaterialien erhalten durch dieses Projekt keine neue offene Lizenz. Die Kartei ist für die persönliche Repetition vorbereitet; vor einer öffentlichen Weiterverbreitung sind die Bild- und Materialrechte zu klären. Das GitHub-Repository ist zunächst privat.

Die Anwendung lädt keine externen Schriften, Analysedienste oder Bibliotheken und sendet keine Lernantworten. Nur ausdrücklich angeklickte Quellenlinks öffnen externe Webseiten.
