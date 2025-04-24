import React, { useEffect, useState } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { Button, Modal, useTheme2, Spinner, Stack } from '@grafana/ui';
import { css } from '@emotion/css';

interface ActiveAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  status: { state: string };
}

interface AlertRule {
  uid: string;
  title: string;
  condition: string;
  data: Array<{
    refId: string;
    query?: string;
    expression?: string;
    model?: {
      expr?: string;
      type?: string;
      conditions?: Array<{
        evaluator: {
          params: number[];
        };
      }>;
    };
    [key: string]: any;
  }>;
}

const PageOne = () => {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [aiResult, setAiResult] = useState<Record<string, any> | null>(null);
  const [loadingAlertIndex, setLoadingAlertIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const theme = useTheme2();

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const alertsResponse = await getBackendSrv().get('/api/alertmanager/grafana/api/v2/alerts');
      const firingAlerts = alertsResponse.filter((a: ActiveAlert) => a.status.state === 'active');
      const rulesResponse = await getBackendSrv().get('/api/v1/provisioning/alert-rules');
      setAlerts(firingAlerts);
      setRules(rulesResponse);
    } catch (err: any) {
      console.error('Error fetching data:', err.message, err.response?.data);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getAlertQuery = (alert: ActiveAlert): string => {
    const ruleUid = alert.labels?.__alert_rule_uid__;
    if (!ruleUid) return 'N/A';
    const rule = rules.find((r) => r.uid === ruleUid);
    if (!rule) return 'N/A';
    const conditionRef = rule.condition;
    const expressionRef = rule.data.find((d) => d.refId === conditionRef)?.model?.expression || 'A';
    const exprData = rule.data.find((d) => d.refId === expressionRef && d.model?.expr);
    const query = exprData?.model?.expr || 'N/A';
    console.log(`Alert ${alert.labels.alertname}, UID ${ruleUid}, Query: ${query}`);
    return query;
  };

  const getThreshold = (alert: ActiveAlert): string => {
    const ruleUid = alert.labels?.__alert_rule_uid__;
    if (!ruleUid) return 'unknown';
    const rule = rules.find((r) => r.uid === ruleUid);
    if (!rule) return 'unknown';
    const thresholdData = rule.data.find((d) => d.model?.type === 'threshold');
    const param = thresholdData?.model?.conditions?.[0]?.evaluator?.params?.[0];
    return param !== undefined ? param.toString() : 'unknown';
  };

  const investigateAlert = async (alert: ActiveAlert, index: number) => {
    setLoadingAlertIndex(index);
    setAiResult(null);
    setIsInvestigating(true);

    const name = alert.labels.alertname;
    const query = getAlertQuery(alert);
    const valueStr = alert.annotations?.__value_string__ || 'N/A';
    const threshold = getThreshold(alert);
    const panelText = alert.annotations?.summary || 'No summary provided';

    const prompt = `You are a senior SRE. An alert was triggered in Grafana with the following details:\n\n` +
      `- Alert Name: ${name}\n` +
      `- Status: ${alert.status.state}\n` +
      `- Value: ${valueStr}\n` +
      `- Threshold: ${threshold}\n` +
      `- PromQL Query: ${query}\n` +
      `- Description: ${panelText}\n\n` +
      `Please classify the severity (Warning or Critical), suggest root cause(s), and remediation steps. Return JSON with keys: category, root_cause[], remediation[].`;

    try {
      const result = await getBackendSrv().post('/api/plugins/grafana-llm-app/resources/llm/v1/chat/completions', {
        model: 'base',
        messages: [
          { role: 'system', content: 'You are a senior SRE.' },
          { role: 'user', content: prompt },
        ],
      });
      const aiContent = result.choices?.[0]?.message?.content;
      if (!aiContent) throw new Error('No content in LLM response');
      const cleaned = typeof aiContent === 'string' ? aiContent.replace(/```json|```/g, '').trim() : aiContent;
      const parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
      setAiResult(parsed);
      setShowModal(true);
    } catch (err: any) {
      console.error('LLM error:', err.message, err.response?.data);
      setAiResult({ error: `Failed to get AI response: ${err.message || 'Unknown error'}` });
      setShowModal(true);
    }

    setLoadingAlertIndex(null);
    setIsInvestigating(false);
  };

  return (
    <div>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        style={{ marginBottom: theme.spacing(2) }}
      >
        <Button onClick={fetchData} disabled={isRefreshing} icon={isRefreshing ? 'sync' : 'refresh'}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Stack>

      {isInvestigating && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <Spinner /> <span>Thinking...</span>
        </div>
      )}

      {alerts.length === 0 ? (
        <p>No active alerts</p>
      ) : (
        <table
          className={css`
            width: 100%;
            border-collapse: collapse;
            margin-top: ${theme.spacing(1)};
            font-family: system-ui, sans-serif;

            thead th {
              text-align: left;
              padding: 8px;
              background-color: ${theme.colors.background.secondary};
              border-bottom: 2px solid ${theme.colors.border.weak};
              font-weight: bold;
            }

            tbody td {
              padding: 8px;
              border-bottom: 1px solid ${theme.colors.border.weak};
            }

            tbody tr:hover {
              background-color: ${theme.colors.background.primary};
            }
          `}
        >
          <thead>
            <tr>
              <th>Alert Name</th>
              <th>Status</th>
              <th>Query</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, idx) => {
              const rule = rules.find((r) => r.uid === alert.labels?.__alert_rule_uid__);
              const displayName = alert.labels.alertname === 'DatasourceError' ? rule?.title || 'Unknown Rule' : alert.labels.alertname;
              return (
                <tr key={idx}>
                  <td>{displayName}</td>
                  <td>{alert.status.state}</td>
                  <td>{getAlertQuery(alert)}</td>
                  <td>
                    <Button
                      size="sm"
                      onClick={() => investigateAlert(alert, idx)}
                      disabled={loadingAlertIndex === idx}
                      icon={loadingAlertIndex === idx ? 'sync' : undefined}
                    >
                      {loadingAlertIndex === idx ? 'Investigating...' : 'Investigate'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal title="🤖 AI Classification" isOpen={showModal} onDismiss={() => setShowModal(false)}>
        {aiResult ? (
          'error' in aiResult ? (
            <pre style={{ color: 'red' }}>{aiResult.error}</pre>
          ) : (
            <div>
              <p
                className={css`
                  font-family: Georgia, serif;
                  font-weight: bold;
                  font-size: 1.2rem;
                  color: ${aiResult.category === 'Critical' ? 'red' : 'orange'};
                `}
              >
                🚩 Category: {aiResult.category}
              </p>
              <table
                className={css`
                  width: 100%;
                  margin-top: ${theme.spacing(1)};
                  border-collapse: collapse;

                  th {
                    font-family: Georgia, serif;
                    font-weight: bold;
                    font-size: 1.05rem;
                    padding-bottom: 4px;
                    border-bottom: 1px solid ${theme.colors.border.weak};
                    text-align: left;
                  }

                  td {
                    vertical-align: top;
                    padding: 6px 8px 6px 0;
                    font-family: system-ui, sans-serif;
                  }
                `}
              >
                <thead>
                  <tr>
                    <th>🕵️ Root Causes</th>
                    <th>🛠️ Remediation</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(aiResult.root_cause.length, aiResult.remediation.length) }).map(
                    (_, i) => (
                      <tr key={i}>
                        <td>{aiResult.root_cause[i] || ''}</td>
                        <td>{aiResult.remediation[i] || ''}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </Modal>
    </div>
  );
};

export default PageOne;