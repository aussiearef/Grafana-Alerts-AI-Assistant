# Alert AI Assistant for Grafana

Alert AI Assistant is a Grafana app plugin that enhances your alert observability workflows with AI-powered root cause analysis, severity classification, and actionable remediation guidance — all integrated directly within Grafana.

Powered by OpenAI and the Grafana LLM plugin.

---

## Features

- View all firing alerts in real time
- Use AI to:
  - Categorise the alert as Warning or Critical.   
  - Provide Root Cause Analysis.
  - Provide Remediation Steps.

---

## Getting Started

### Requirements

- Grafana v10.4.0 or later
- Grafana LLM App Plugin installed and configured with an OpenAI api key.

### Installation (Local Development)

```bash
# Clone the plugin
git clone https://github.com/aussiearef/Grafana-Alerts-AI-Assistant.git
cd alert-ai-assistant

# Install dependencies
npm install

# Start Grafana in plugin dev mode
npm run dev
```

Then navigate to http://localhost:3000 → Apps → Alert AI Assistant.

---

## Plugin Architecture

- Frontend only: React + Emotion CSS + Grafana UI components
- LLM integration via Grafana's plugin proxy endpoint
- Alert and rule data retrieved from Grafana's internal APIs


## How It Works

When you click Investigate:

1. The plugin extracts the alert name, query, and threshold
2. It sends a structured prompt to the LLM plugin
3. The AI model returns JSON-formatted insights
4. The result is displayed in a modal with a structured layout


## FAQ

**Q: Does this work without Internet access?**  
A: No. The LLM integration requires outbound access to your provider.

---

## Author

Aref Karimi  
https://github.com/arefkarimi

---

## License

MIT License
