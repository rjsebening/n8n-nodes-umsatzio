# Umsatz.io API Key Setup

To use the **Umsatz.io Node in n8n**, you need to create an **API Key** from your Umsatz.io admin account.

## 🔑 Create an API Key

1. Log in at [https://app.umsatz.io](https://app.umsatz.io) with your admin credentials.
2. In the left-hand menu, go to **Settings → Integrations**.
3. Select the section **API Keys**.
4. Copy the **API Key**.

## ⚙️ Use in n8n

1. Open n8n and go to **Credentials → New → Umsatz.io API**
2. Enter the following:
   - **API Key**: your generated secret key
   - **Base URL**: Default: `https://app.umsatz.io/api/graphql`
3. Click **Test** → if everything is correct, you’ll get a confirmation.

## 📌 Notes

- API Keys have full access to your Umsatz.io account – keep them safe and private.
