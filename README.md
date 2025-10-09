# n8n-nodes-umsatzio

![n8n Community Node](https://img.shields.io/badge/n8n-community--node-FF6D5A)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

### Unofficial n8n Integration for **Umsatz.io – the first CRM built on the Setter-Closer principle**

Automate your contact, deal, and activity workflows, react to real-time events, and keep your pipeline moving — **without manual work**.


## 🧭 Overview

This community node connects **Umsatz.io (Setter-Closer CRM)** seamlessly with your n8n workflows.
From contact creation to deal management and real-time triggers — automate every key revenue process end-to-end.


## ⚙️ Core Features

### 👤 Contacts

| Action                           | Description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| **Create Contact**               | Create a new contact (no upsert).                           |
| **Find Contact by Email**        | Find an existing contact by email.                          |
| **Get Contacts by Filter Group** | Apply a saved filter group and list all resulting contacts. |
| **Search Contacts**              | Search contacts by text (full-text search).                 |
| **Update Contact (by ID)**       | Update a contact by its ID.                                 |
| **Upsert Contact (by Email)**    | Find by email, update if found, otherwise create.           |

### 💼 Deals

| Action                          | Description                                             |
| ------------------------------- | ------------------------------------------------------- |
| **Create Deal**                 | Create a new deal in the system.                        |
| **Find Deal by ID**             | Retrieve a deal by its ID.                              |
| **Find Related Deals by Email** | Retrieve all deals linked to a contact’s email.         |
| **List by Stage**               | List all deals in a given stage.                        |
| **Change Pipeline/Stage**       | Move a deal to another stage.                           |
| **Update Deal (per Deal-ID)**   | Update an existing deal.                                |
| **Get Pipelines**               | List all available pipelines.                           |
| **Get Pipeline**                | Get details for a single pipeline including its stages. |
| **Get Deals by Filter Group**   | Apply a saved filter group and list resulting deals.    |

### 📝 Activities

| Action                         | Description                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------- |
| **Create Note**                | Add an internal note to a contact (context, updates, reminders).             |
| **List Notes**                 | Retrieve all notes created for a contact.                                    |
| **List Email Activities**      | Retrieve email history for a contact.                                        |
| **List Phone Call Activities** | Retrieve logged phone call activities related to the contact.                |
| **Log Email**                  | Manually log an email activity to a contact (e.g., external correspondence). |

### 🔔 Webhooks

| Action             | Description                        |
| ------------------ | ---------------------------------- |
| **List Webhooks**  | List all registered webhooks.      |
| **Create Webhook** | Create a new webhook in Umsatz.io. |
| **Update Webhook** | Update an existing webhook.        |
| **Delete Webhook** | Delete a webhook.                  |

### ⚡ Trigger Events (Real-Time Webhooks)

React instantly to events happening in Umsatz.io:

| Event                       | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| **New Contact**             | Triggered when a new contact is created.                |
| **Change Contact Property** | Triggered when a contact property is updated or filled. |
| **New Deal**                | Triggered when a new deal is created.                   |
| **Change Deal Property**    | Triggered when a deal property changes.                 |
| **Update Deal Stage**       | Triggered when a deal’s stage changes.                  |
| **Submit Form**             | Triggered when a form is submitted within Umsatz.io.    |
| **New Phone Call Activity** | Triggered when a user logs a new call in the app.       |


## 🔐 Authentication

Uses **API Key Authentication**

* Base URL: `https://app.umsatz.io/api/graphql`
* Header: `api-key: <YOUR_API_KEY>`

A built-in credential test verifies the connection directly within n8n.

## 📦 Installation

### Requirements

* n8n **≥ 1.107.1**
* Active Umsatz.io account with **API Key**

### Community Node Installation

1. Open n8n → **Settings → Community Nodes → Install**
2. Enter package name:

```bash
# Option A — Scoped (recommended)
@rjsebening/n8n-nodes-umsatzio

# Option B — Unscoped
n8n-nodes-umsatzio
```

3. **Restart n8n** – the node will now appear in the list.

## 🧩 Node Overview

### Umsatz.io (Action Node)

**Available Resources**

| Resource               | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| **Contact**            | Manage contacts (create, update, upsert, or search).          |
| **Deal**               | Create, update, move, or list deals by stage or filter group. |
| **Activity**           | Manage notes, emails, and phone calls.                        |
| **Webhook**            | Create, list, update, or delete webhooks.                     |
| **Raw Query/Mutation** | Execute custom GraphQL queries or mutations.                  |

### Umsatz.io Trigger (Realtime Node)

* Automatically registers webhooks when the workflow is activated.
* Removes them when deactivated to avoid duplicates.
* Returns the **raw event payload** (JSON response from Umsatz.io).

## 📖 Example Use Cases

* Auto-create CRM contacts when a form is submitted in Umsatz.io.
* Send Slack notifications for **deal stage changes**.
* Log call activities into a Google Sheet for reporting.
* Add notes or emails to contacts when external events (billing, onboarding, etc.) occur.
* Automatically update deal statuses when payments or forms are received.

## 🛠️ Troubleshooting

| Issue                                         | Solution                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **“Received request for unknown webhook…”**   | Disable and re-enable the trigger to re-register the webhook.                               |
| **“Cannot set headers after they are sent…”** | Caused by double response handling in custom code.                                          |
| **Webhook warnings (“Ping/Delete”)**          | Appear when webhooks were manually deleted in Umsatz.io. Reactivate the trigger to refresh. |

## 📬 About the Author

I’m **[Rezk Jörg Sebening](https://github.com/rjsebening)** – Automation & Systems Expert (DACH).
I build n8n nodes and process automation systems that help agencies, coaches, and service providers scale **without manual work**.

👉 Follow me on GitHub for new DACH integrations and automation templates.

## ⚖️ Legal Disclaimer

This community node is **not affiliated with Umsatz.io** (no partnership, no sponsorship, no official endorsement).
It simply connects to publicly available API endpoints.

* Community developed & maintained
* For API-related issues → contact **Umsatz.io Support**
* All trademarks & logos belong to their respective owners

## 📄 License

**MIT License**
Contributions and pull requests are welcome!