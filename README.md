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

## Spielrunde und Repetition

Über der Karte stehen drei Modi zur Wahl: **Freies Lernen**, **Spielrunde** und **Repetition**. Themen-, Lernziel- und Suchfilter bestimmen den jeweiligen Kartenpool. Während einer Runde bleibt die Auswahl fest.

- Eine Spielrunde wählt höchstens zehn unterschiedliche Karten zufällig aus. Erst selbst antworten, dann wenden und anhand der Modellantwort einschätzen.
- «Gewusst» beim ersten Versuch bringt 10 XP, nach einem Fehlversuch 5 XP. Jede dritte gewusste Karte in Folge bringt zusätzlich 5 XP. Pro Karte und lokalem Kalendertag gibt es nur einmal Punkte.
- «Noch üben» setzt die Serie zurück und reiht die Karte nach bis zu drei anderen Karten wieder ein. Eine Runde endet, wenn alle enthaltenen Karten als gewusst eingeschätzt wurden; das Ergebnis zeigt Punkte, Versuche und beste Serie.
- Die Repetition wählt höchstens zehn bereits bewertete, fällige Karten. Unsichere Karten kommen zuerst. Nach einer erfolgreichen Wiederholung steigen die Intervalle auf 1, 3, 7, 14 und 30 Tage; danach bleibt es bei 30 Tagen. Vorzeitiges Üben verlängert das Intervall nicht. «Noch üben» setzt es zurück.
- Vorhandene Bewertungen aus der ersten Version werden übernommen und einmalig sofort zur Repetition angeboten. Neue, unbewertete Karten lernt man zuerst frei oder in einer Spielrunde.
- Karten mit fehlenden Quellen sind vom Punktespiel und der Repetition ausgeschlossen und bleiben im freien Lernen zugänglich.

Die Bewertung ist eine **Selbsteinschätzung**, keine automatische Prüfung der Antwort. Punkte und Rundenabschluss sind Lernanreize, keine fachliche Zertifizierung. Ein Moduswechsel oder Neuladen beendet die aktuelle Runde; bereits gespeicherte Bewertungen, Termine und XP bleiben erhalten. «Lernstand zurücksetzen» löscht auch XP, Rundenanzahl und Wiederholungstermine. Es werden keine Benachrichtigungen versandt.

Die Spiellogik liegt separat in `learning.js`. Ihre Tests prüfen unter anderem Terminberechnung, frühe Wiederholung, Rücksetzen, Reihenfolge unsicherer Karten und Schutz vor mehrfachen Punkten am selben Tag. `node tests/game-browser.cjs` ergänzt den bestehenden Browsertest um Spiel- und Repetitionsabläufe.

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

### Drei Niveaus

Die Auswahl über dem Lernmodus baut aufeinander auf:
- **Basis:** Begriffe, Fakten und grundlegende Abläufe.
- **Vertieft:** zusätzlich Erklärungen, Ursachen und Zusammenhänge.
- **Profi:** zusätzlich Quellenkritik, Vergleiche, Transfer und Rechenaufgaben; enthält alle 112 Karten.

Jede Karte ist redaktionell einem Mindestniveau (`level` in `cards.json`) zugeordnet. Das ist eine didaktische Einteilung, keine offizielle Prüfungsstufe. Die Modellantworten und Quellenbelege bleiben vollständig. Die Auswahl gilt für freies Lernen, Spielrunde und Repetition und wird im Browser gespeichert. Während einer Runde ist das Niveau gesperrt; nach dem Beenden kann es gewechselt werden. Lernstand und Wiederholungstermine gelten gemeinsam für alle Niveaus. «Alle Karten anzeigen» und der Einstieg über ein Lernziel wählen Profi, damit keine zugehörige Karte ausgeblendet wird.

`tests/levels-browser.cjs` prüft Niveau-Auswahl, Speicherung, Spielrunden, fällige Karten und die mobile Darstellung.
