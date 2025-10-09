# Umsatz.io API Key erstellen

Um die **Umsatz.io Node in n8n** zu nutzen, benötigst du einen **API Key** aus deinem Umsatz.io Admin-Account.

## 🔑 API Key anlegen

1. Melde dich an unter [https://app.umsatz.io/](https://app.umsatz.io/) mit deinem Admin-Login.
2. Gehe links im Menü zu **Einstellungen → Integrationen**.
3. Wähle den Bereich **API Keys**.
4. Kopiere dir den **Secret Key**.

## ⚙️ Verwendung in n8n

1. Öffne n8n und gehe zu **Credentials → New → Umsatz.io API**
2. Trage dort ein:
   - **API Key**: dein generierter Secret Key
   - **Base URL**: Standard: `https://app.umsatz.io/api/graphql`
3. Klicke auf **Test** → wenn alles korrekt ist, bekommst du eine Bestätigung.

## 📌 Hinweise

- API Keys haben volle Rechte für dein Umsatz.io-Konto – halte sie geheim.