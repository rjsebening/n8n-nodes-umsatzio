# n8n-nodes-umsatzio (Deutsch)

![n8n Community Node](https://img.shields.io/badge/n8n-community--node-FF6D5A)  
![Version](https://img.shields.io/badge/version-1.0.0-blue)  
![License](https://img.shields.io/badge/license-MIT-green)

Inoffizielle n8n-Integration für **Umsatz.io – das erste CRM mit Setter-Closer-Prinzip**.  
Automatisiere Kontakt- und Deal-Prozesse, reagiere in Echtzeit auf Events und halte deine Pipeline ohne manuelle Arbeit in Bewegung.

## Was ist n8n?

n8n ist ein visuelles Automatisierungs-Tool.  
Durch die Verbindung von Umsatz.io mit deinen anderen Apps automatisierst du wiederkehrende Aufgaben und sparst massiv Zeit.

## ⚖️ Rechtlicher Hinweis

Diese Community-Node nutzt öffentlich dokumentierte Umsatz.io-Schnittstellen und steht **in keiner Verbindung zu Umsatz.io** (keine Partnerschaft, kein Sponsoring, keine offizielle Freigabe).  
Alle Marken gehören ihren jeweiligen Eigentümern.

> **Hinweis:** Diese Node wurde **von der Community** für die Umsatz.io API entwickelt. Offiziellen Support zu Umsatz.io erhältst du direkt bei Umsatz.io.

## 🚀 Überblick

Die Node verbindet **Umsatz.io (Setter-Closer CRM)** nahtlos mit deinen Workflows in n8n. Von Kontakt-Erstellung und Suche bis hin zu Deal-Events – du automatisierst zentrale Revenue-Abläufe ganz ohne Code.

## ✨ Kernfunktionen

### 👤 **Kontakt-Funktionen**

-   **Kontakt erstellen** – Neuen Kontakt anlegen
    
-   **Per E-Mail suchen** – Kontakte per E-Mail finden
    
-   **Kontakte suchen** – Filter/Suche (Volltextsuche)
    
-   **Kontakt aktualisieren** – Felder aktualisieren
    
-   **Kontakt-Notizen abrufen** – Notizen zum Kontakt lesen
    
-   **Telefon-Aktivitäten abrufen** – Anruf-Aktivitäten laden
    
-   **Kontakt-Notiz erstellen** – Neue Notiz anhängen
    

> Entspricht deinen `contact`-Operationen aus dem Code (Liste `contactOperations`).

### ⚡ **Echtzeit-Webhooks (Trigger)**

Reagiere sofort auf Ereignisse in Umsatz.io:

-   `newContact` – Neuer Kontakt erstellt
    
-   `changeContactProperty` – Kontaktfeld geändert
    
-   `newDeal` – Neuer Deal erstellt
    
-   `changeDealProperty` – Dealfeld geändert
    
-   `updateDealStage` – Deal-Stage gewechselt
    
-   `submitForm` – Formular abgesendet
    
-   `newActivity` – Neue Aktivität angelegt
    

> Der Trigger registriert Webhooks beim Aktivieren und entfernt sie beim Deaktivieren in n8n.

### 🔐 Sichere API-Anbindung

-   **Header-Auth** via `x-tenant-api-key`
    
-   **Base-URL** https://app.umsatz.io/api/graphql
    
-   Integrierter **Credential-Test** & saubere Fehlermeldungen
    

## 📦 Installation

### Voraussetzungen

-   n8n `>= 1.107.1`
    
-   Aktiver Umsatz.io-Account und **API Key**
    

### Installation über Community Nodes

1.  In n8n öffnen
    
2.  **Settings → Community Nodes → Install**
    
3.  Einen der folgenden Paketnamen installieren:
    

**Variante A — Scoped (persönlicher Scope)**

```
@rjsebening/n8n-nodes-umsatzio

```

**Variante B — Unscoped (Standard)**

```
n8n-nodes-umsatzio

```

> Beide Pakete enthalten den gleichen Code. Die Scoped-Variante vermeidet spätere Namenskonflikte.

4.  **n8n neu starten** – die Node erscheint in der Liste.
    

## 🔧 Konfiguration

### Zugangsdaten anlegen

1.  In n8n **Credentials → New**
    
2.  **„Umsatz.io API“** auswählen
    
3.  Ausfüllen:
    
    -   **API Key** → dein Umsatz.io API Key (gesendet als `x-api-key`)
        
    -   **Base-URL** → https://app.umsatz.io/api/graphql
        
4.  Speichern und **Test** ausführen
    

> Falls du die korrekte Endpoint-URL deines Tenants nicht kennst, prüfe die Umsatz.io-Doku oder kontaktiere den Support. Die Node abstrahiert REST/GraphQL, je nach deiner Implementierung.

## 🧩 Nodes & Operationen

### Umsatz.io (Action Node)

**Resource: Contact**

-   Kontakt erstellen
    
-   Per E-Mail abrufen
    
-   Kontakte suchen
    
-   Kontakt aktualisieren
    
-   Kontakt-Notizen abrufen
    
-   Telefon-Aktivitäten abrufen
    
-   Kontakt-Notiz erstellen
    

_(Wenn du später Deal/Pipeline-Aktionen hinzufügst, hier ergänzen.)_

### Umsatz.io Trigger (Events)

**Event-Typen**

-   Neuer Kontakt (`newContact`)
    
-   Kontakt-Eigenschaft geändert (`changeContactProperty`)
    
-   Neuer Deal (`newDeal`)
    
-   Deal-Eigenschaft geändert (`changeDealProperty`)
    
-   Deal-Stage aktualisiert (`updateDealStage`)
    
-   Formular abgeschickt (`submitForm`)
    
-   Neue Aktivität (`newActivity`)
    

**Verhalten**

-   Registriert Webhooks beim Aktivieren, entfernt sie beim Deaktivieren
    
-   Übergibt das rohe Event-Payload; Anreicherung/Routing baust du im Workflow
    

## 📖 Beispiele

-   Kontakte in deinem CRM automatisch anlegen/aktualisieren, wenn ein Formular in Umsatz.io abgesendet wird
    
-   Slack-Benachrichtigung bei **Deal-Stage-Wechsel**
    
-   Telefon-Aktivitäten ins Data Warehouse für Reports schreiben
    
-   Notizen zu Kontakten anhängen, wenn Ereignisse in anderen Tools passieren (Billing, Onboarding, …)
    

## 🛠️ Troubleshooting

-   **„Received request for unknown webhook … is not registered.“**  
    Sicherstellen, dass der Trigger **aktiv** ist. Ein/Aus schalten, um die Registrierung zu erzwingen.
    
-   **„Cannot set headers after they are sent to the client.“**  
    Kommt von Express in n8n, wenn mehrfach geantwortet wird. Prüfe Custom Code oder doppelte Webhook-Behandlung.
    
-   **Ping/Delete-Warnungen im Log**  
    Entstehen u. U., wenn Webhooks außerhalb von n8n entfernt wurden. Trigger erneut aktivieren.
    

## 📬 About Me

Ich bin **[Rezk Jörg Sebening](https://github.com/rjsebening)** – Experte für Business-Automatisierung (DACH).  
Ich entwickle n8n-Nodes und Automations-Systeme, damit Agenturen, Coaches und Dienstleister **ohne** manuelle Arbeit sauber liefern.

👉 Folge mir auf GitHub für neue DACH-Integrationen und Automation-Vorlagen.

## 📋 Disclaimer

Diese **inoffizielle** Community-Node steht **in keiner Verbindung** zu Umsatz.io (keine Partnerschaft, kein Sponsoring, keine offizielle Freigabe).  
Sie stellt lediglich einen Connector zu öffentlich erreichbaren Endpunkten bereit.

**Wichtig**

-   Von der Community entwickelt & gepflegt
    
-   Für Plattform-/API-Themen: **Umsatz.io** Support kontaktieren
    
-   Alle Marken & Logos gehören ihren Eigentümern
    
-   Die Node verbindet lediglich mit den von dir konfigurierten Endpunkten
    

## 📄 Lizenz

**MIT** — Beiträge willkommen.
