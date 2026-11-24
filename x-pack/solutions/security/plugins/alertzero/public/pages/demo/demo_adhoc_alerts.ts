/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEMO_DETECTION_RULES } from './demo_detection_rules';

export type DemoOpenAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DemoOpenAlert {
  id: string;
  ruleId: string;
  /** The detection rule that raised the alert. */
  rule: string;
  /** The host, account or identity the alert is about. */
  entity: string;
  severity: DemoOpenAlertSeverity;
  minutesAgo: number;
}

const sampleAlerts: ReadonlyArray<Omit<DemoOpenAlert, 'rule'>> = [
  { id: 'alert-1', ruleId: 'endpoint', entity: 'ws-014', severity: 'critical', minutesAgo: 4 },
  { id: 'alert-2', ruleId: 'cloud', entity: 'deploy-service', severity: 'high', minutesAgo: 11 },
  {
    id: 'alert-3',
    ruleId: 'identity',
    entity: 'service-backup',
    severity: 'medium',
    minutesAgo: 26,
  },
  { id: 'alert-4', ruleId: 'sample-windows-1', entity: 'ws-022', severity: 'high', minutesAgo: 38 },
  {
    id: 'alert-5',
    ruleId: 'sample-identity-49',
    entity: 'u-0417',
    severity: 'medium',
    minutesAgo: 64,
  },
  {
    id: 'alert-6',
    ruleId: 'sample-aws-65',
    entity: 'ops-admin',
    severity: 'medium',
    minutesAgo: 127,
  },
];

/** A fixed, illustrative list of the most recent open alerts, newest first. */
export const DEMO_OPEN_ALERTS: readonly DemoOpenAlert[] = sampleAlerts.map((alert) => ({
  ...alert,
  rule: DEMO_DETECTION_RULES.find(({ id }) => id === alert.ruleId)?.label ?? alert.ruleId,
}));

/** Namespaces the alerts the customer chose to investigate to the current Kibana space. */
export const getAdhocAlertsStorageKey = (basePath: string): string =>
  `kbn:alertzero:configuration-preview-next:adhoc-alerts:v1:${basePath}`;

const knownAlertIds = new Set(DEMO_OPEN_ALERTS.map(({ id }) => id));

/** Reads the sample alerts the customer asked AlertZero to investigate, ignoring anything unrecognized. */
export const readAdhocAlertIds = (
  storage: { getItem: (key: string) => string | null },
  basePath: string
): string[] => {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(getAdhocAlertsStorageKey(basePath)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter((id): id is string => typeof id === 'string' && knownAlertIds.has(id))
      ),
    ];
  } catch {
    return [];
  }
};

/** Saves the alerts the customer asked AlertZero to investigate and reports whether storage accepted them. */
export const writeAdhocAlertIds = (
  storage: { setItem: (key: string, value: string) => void },
  basePath: string,
  alertIds: readonly string[]
): boolean => {
  try {
    storage.setItem(getAdhocAlertsStorageKey(basePath), JSON.stringify([...new Set(alertIds)]));
    return true;
  } catch {
    return false;
  }
};
