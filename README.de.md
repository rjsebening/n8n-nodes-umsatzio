
# n8n-nodes-umsatzio

![n8n Community Node](https://img.shields.io/badge/n8n-community--node-FF6D5A)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

### Inoffizielle n8n-Integration für **Umsatz.io – das erste CRM mit Setter-Closer-Prinzip**

Automatisiere Kontakt-, Deal- und Aktivitäts-Prozesse, reagiere in Echtzeit auf Ereignisse und halte deine Pipeline in Bewegung – **ohne manuelle Arbeit**.

## 🧭 Überblick

Diese Community-Node verbindet **Umsatz.io (Setter-Closer CRM)** nahtlos mit deinen Workflows in n8n.  
Von der Kontakt-Erstellung über Deal-Verwaltung bis hin zu Webhooks für Echtzeit-Events – du kannst deine Revenue-Prozesse komplett automatisieren.

## ⚙️ Kernfunktionen

### 👤 Kontakte

| Aktion | Beschreibung |
|--------|---------------|
| **Create Contact** | Neuen Kontakt erstellen (kein Upsert). |
| **Find Contact by Email** | Bestehenden Kontakt anhand der E-Mail suchen. |
| **Get Contacts by Filter Group** | Eine gespeicherte Filtergruppe anwenden und Kontakte abrufen. |
| **Search Contacts** | Kontakte per Volltextsuche durchsuchen. |
| **Update Contact (by ID)** | Kontakt anhand seiner ID aktualisieren. |
| **Upsert Contact (by Email)** | Per E-Mail suchen, bei Treffer aktualisieren, sonst neuen Kontakt erstellen. |

### 💼 Deals

| Aktion | Beschreibung |
|--------|---------------|
| **Create Deal** | Neuen Deal im System anlegen. |
| **Find Deal by ID** | Einen bestimmten Deal per ID abrufen. |
| **Find Related Deals by Email** | Alle Deals zu einer E-Mail-Adresse (Kontakt) abrufen. |
| **List by Stage** | Alle Deals einer Pipeline-Stage abrufen. |
| **Change Pipeline/Stage** | Einen Deal in eine andere Stage verschieben. |
| **Update Deal (per Deal-ID)** | Bestehenden Deal aktualisieren. |
| **Get Pipelines** | Alle Pipelines auflisten. |
| **Get Pipeline** | Details zu einer Pipeline inkl. Stages abrufen. |
| **Get Deals by Filter Group** | Eine gespeicherte Filtergruppe anwenden und Deals abrufen. |

### 📝 Aktivitäten

| Aktion | Beschreibung |
|--------|---------------|
| **Create Note** | Interne Notiz an einen Kontakt anhängen (z. B. Kontext, Updates oder Erinnerungen). |
| **List Notes** | Alle Notizen eines Kontakts abrufen. |
| **List Email Activities** | E-Mail-Historie zu einem Kontakt abrufen. |
| **List Phone Call Activities** | Alle Telefon-Aktivitäten eines Kontakts abrufen. |
| **Log Email** | Eine E-Mail-Aktivität manuell an einen Kontakt anhängen (z. B. externe Korrespondenz). |

### 🔔 Webhooks

| Aktion | Beschreibung |
|--------|---------------|
| **List Webhooks** | Alle registrierten Webhooks anzeigen. |
| **Create Webhook** | Einen neuen Webhook in Umsatz.io erstellen. |
| **Update Webhook** | Bestehenden Webhook aktualisieren. |
| **Delete Webhook** | Webhook löschen. |

### ⚡ Trigger-Events (Echtzeit-Webhooks)

Reagiere sofort auf Ereignisse aus Umsatz.io:

| Event | Beschreibung |
|--------|---------------|
| **New Contact** | Wird ausgelöst, wenn ein neuer Kontakt erstellt wird. |
| **Change Contact Property** | Wird ausgelöst, wenn ein Kontaktfeld geändert oder ausgefüllt wird. |
| **New Deal** | Wird ausgelöst, wenn ein neuer Deal erstellt wird. |
| **Change Deal Property** | Wird ausgelöst, wenn ein Dealfeld geändert oder ausgefüllt wird. |
| **Update Deal Stage** | Wird ausgelöst, wenn ein Deal in eine andere Stage verschoben wird. |
| **Submit Form** | Wird ausgelöst, wenn ein Formular in Umsatz.io abgesendet wird. |
| **New Phone Call Activity** | Wird ausgelöst, wenn ein Benutzer einen neuen Anruf in der App protokolliert. |


## 🔐 Authentifizierung

Die Node verwendet **API-Key-Authentifizierung**.  
- Base-URL: `https://app.umsatz.io/api/graphql`  
- Auth-Header: `api-key: <YOUR_API_KEY>`

Ein integrierter Credential-Test prüft deine Verbindung direkt in n8n.


## 📦 Installation

### Voraussetzungen
- n8n **≥ 1.107.1**
- Aktiver Umsatz.io-Account mit **API-Key**

### Installation über Community Nodes

1. In n8n öffnen → **Settings → Community Nodes → Install**  
2. Paketname eingeben:

```bash
# Variante A — Scoped (empfohlen)
@rjsebening/n8n-nodes-umsatzio

# Variante B — Unscoped
n8n-nodes-umsatzio

```

3.  **n8n neu starten** – die Node erscheint in der Liste.

## 🧩 Node-Übersicht

### Umsatz.io (Action Node)

**Verfügbare Ressourcen**

| Resource               | Beschreibung                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **Contact**            | Erstellen, suchen, updaten oder upserten von Kontakten.                            |
| **Deal**               | Deals erstellen, verschieben, listen, aktualisieren oder per Filtergruppe abrufen. |
| **Activity**           | E-Mails, Anrufe und Notizen verwalten.                                             |
| **Webhook**            | Webhooks erstellen, listen, aktualisieren und löschen.                             |
| **Raw Query/Mutation** | Direkte GraphQL-Abfragen an die API ausführen.                                     |


### Umsatz.io Trigger (Realtime Node)

-   Registriert automatisch Webhooks beim Aktivieren des Workflows.
    
-   Entfernt sie beim Deaktivieren, um doppelte Events zu vermeiden.
    
-   Gibt den **rohen Event-Payload** zurück (JSON-Response von Umsatz.io).
    
## 📖 Anwendungsbeispiele

-   Kontakte automatisch in dein CRM einpflegen, wenn ein Umsatz.io-Formular abgeschickt wird.
    
-   Slack-Benachrichtigung bei **Stage-Wechsel** eines Deals.
    
-   Telefon-Aktivitäten automatisch in eine Google-Sheet-Report-Tabelle schreiben.
    
-   Notizen oder E-Mails zu Kontakten synchronisieren, wenn externe Tools (z. B. Abrechnung oder Onboarding) ein Event auslösen.
    
-   Automatisiertes Updaten von Deal-Status, sobald Formulare ausgefüllt oder Zahlungen eingegangen sind.
    

## 🛠️ Troubleshooting

| Problem                                       | Lösung                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **„Received request for unknown webhook…“**   | Trigger deaktivieren und wieder aktivieren, um Registrierung neu anzulegen.                    |
| **„Cannot set headers after they are sent…“** | Meist durch doppeltes Response-Handling in Custom Code verursacht.                             |
| **Webhook-Warnungen im Log („Ping/Delete“) ** | Entstehen, wenn Webhooks manuell in Umsatz.io gelöscht wurden. Einfach Trigger neu aktivieren. |



## 📬 Über den Entwickler

Ich bin **[Rezk Jörg Sebening](https://github.com/rjsebening)** – Experte für Business-Automatisierung (DACH).  
Ich entwickle n8n-Nodes und Systeme, damit Agenturen, Coaches und Dienstleister **ohne manuelle Arbeit** skalieren und sauber liefern können.

👉 Folge mir auf GitHub, um neue DACH-Integrationen und Automations-Vorlagen zu erhalten.

## ⚖️ Rechtlicher Hinweis

Diese Community-Node steht **in keiner Verbindung zu Umsatz.io**.  
Keine Partnerschaft, kein Sponsoring, keine offizielle Freigabe.  
Sie nutzt ausschließlich **öffentliche API-Endpunkte**.

-   Von der Community entwickelt & gepflegt
    
-   Für API-Fragen → Support von **Umsatz.io** kontaktieren
    
-   Alle Marken & Logos gehören ihren Eigentümern
    

## 📄 Lizenz

**MIT License**  
Beiträge und Pull Requests sind willkommen!