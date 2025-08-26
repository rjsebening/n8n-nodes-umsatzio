# n8n-nodes-umsatzio

  

![n8n Community Node](https://img.shields.io/badge/n8n-community--node-FF6D5A)

![Version](https://img.shields.io/badge/version-1.0.0-blue)

![License](https://img.shields.io/badge/license-MIT-green)

  

An unofficial n8n custom node for integrating with **Umsatz.io — the first CRM built around the Setter–Closer principle**.

Automate your contact and deal workflows, react to real-time events, and keep your revenue pipeline moving without manual busywork.

  

## What is n8n?

  

n8n is a visual workflow automation tool.

By connecting Umsatz.io with your other apps, you can automate repetitive tasks end-to-end and save serious time.

  

## ⚖️ Legal Notice

  

This Community Node uses publicly available (documented) Umsatz.io endpoints and is **not affiliated with, endorsed, or sponsored by Umsatz.io**.

All trademarks are the property of their respective owners.

  

>  **Note:** This is a community-developed Node for the Umsatz.io API. For official support regarding Umsatz.io itself, please contact Umsatz.io directly.

  

## 🚀 Overview

  

This node enables streamlined integration with **Umsatz.io (Setter–Closer CRM)**. From contact creation and lookups to listening for deal updates, you can automate key parts of your revenue operations without writing code.

  

## ✨ Key Features

  

### 👤 **Contact Operations**

  

-  **Create Contact** – Create a new contact

-  **Get by Email** – Lookup a contact by email

-  **Search Contacts** – Filter/search for contacts

-  **Update Contact** – Update existing contact fields

-  **Get Notes (Contact)** – Fetch notes attached to a contact

-  **Get Phone Call Activities (Contact)** – Retrieve phone call activities

-  **Create Note (Contact)** – Attach a note to a contact

  

> These map to your node’s `contact` resource operations (from your `contactOperations` list).

  

### ⚡ **Real-Time Webhooks (Trigger)**

  

Subscribe to Umsatz.io events and react instantly in n8n:

  

-  `newContact` – A new contact was created

-  `changeContactProperty` – A contact field changed

-  `newDeal` – A new deal was created

-  `changeDealProperty` – A deal field changed

-  `updateDealStage` – A deal stage changed

-  `submitForm` – A form was submitted

-  `newActivity` – A new activity was logged

  

> The trigger node registers/unregisters webhooks when you enable/disable it in n8n.

  

### 🔐 Secure API Integration

  

-  **Header Authentication** via `x-api-key`

- **Base URL** https://app.umsatz.io/api/graphql

- Built-in **credential test** and structured error messages

  

## 📦 Installation

  

### Requirements

  

- n8n `>= 1.0.0`

- An active Umsatz.io account and **API Key**

  

### Install via Community Nodes

  

1. Open your n8n instance

2. Go to **Settings → Community Nodes → Install**

3. Install one of the following package names:

  
**Option A — Scoped (personal scope)**


```
@rjsebening/n8n-nodes-umsatzio
```  

**Option B — Unscoped (default)**

```
n8n-nodes-umsatzio
```

> Both packages contain the same code. The scoped variant helps avoid future name conflicts.

  

4.  **Restart n8n** – the node will appear in the node list.

  

## 🔧 Configuration

  

### Create Credentials

  

1. In n8n, open **Credentials → New**

2. Choose **“Umsatz.io API”**

3. Fill in:

-  **API Key** → your Umsatz.io api key (sent as `x-tenant-api-key`)

-  **Base URL** → https://app.umsatz.io/api/graphql

4. Save and **Test** the credential

  

> If you’re unsure about the correct endpoint for your tenant, check your Umsatz.io docs or contact their support. Your node will work with REST or GraphQL endpoints your implementation targets.

  

## 🧩 Nodes & Operations

  

### Umsatz.io (Action Node)

  

**Resource: Contact**

  

- Create Contact

- Get by Email

- Search Contacts

- Update Contact

- Get Notes (Contact)

- Get Phone Call Activities (Contact)

- Create Note (Contact)

  

_(If you later add Deal/Pipeline actions, list them here once implemented.)_

  

### Umsatz.io Trigger (Events)

  

**Event Types**

  

- New Contact (`newContact`)

- Change Contact Property (`changeContactProperty`)

- New Deal (`newDeal`)

- Change Deal Property (`changeDealProperty`)

- Update Deal Stage (`updateDealStage`)

- Submit Form (`submitForm`)

- New Activity (`newActivity`)

  

**Behavior**

  

- Registers webhook on activation, removes on deactivation

- Passes through raw event payload; enrich/route as needed in your workflow

  

## 📖 Examples

  

- Create/Update a contact in your CRM when a lead submits a form in Umsatz.io

- Notify a Slack channel when a **deal stage** changes

- Log phone call activities to your data warehouse for reporting

- Append notes to contacts when internal actions happen elsewhere (e.g., billing, onboarding)

  

## 🛠️ Troubleshooting

  

-  **“Received request for unknown webhook … is not registered.”**

Ensure the Trigger node is **active**. Disable → re-enable to force re-registration.

-  **“Cannot set headers after they are sent to the client.”**

This comes from Express in n8n if multiple responses are attempted. Check custom code or duplicated webhook handling in your workflow.

-  **Webhook ping/delete warnings in logs**

These may occur if a previous webhook was removed outside n8n. Re-enable the Trigger to synchronize.

  

## 📬 About the Author

  

I’m **[Rezk Jörg Sebening](https://github.com/rjsebening)** — Business Automation Expert (DACH).

I build n8n nodes and automation systems that let agencies, coaches, and service businesses ship work **without** drowning in manual tasks.

  

👉 Follow me on GitHub to get updates on DACH-focused integrations and automation templates.

  

## 📋 Disclaimer

  

This unofficial community Node is **not affiliated with, supported, or sponsored by Umsatz.io**.

It only provides a connector to publicly accessible API endpoints under their terms of use.

  

**Important Notes**

  

- Community-developed & maintained

- For API/platform issues, contact **Umsatz.io** support

- All Umsatz.io trademarks and logos belong to their owners

- This Node merely connects to the public endpoints you configure

  

## 📄 License

  

**MIT** — do with it what you love. Contributions welcome.
