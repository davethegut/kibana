/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/ui-ai-components';
import type { DemoOpenAlert, DemoOpenAlertSeverity } from './demo_adhoc_alerts';

const copy = {
  title: i18n.translate('xpack.alertzero.poc.openAlerts.title', {
    defaultMessage: 'Latest open alerts',
  }),
  description: i18n.translate('xpack.alertzero.poc.openAlerts.description', {
    defaultMessage:
      'Pick an alert and AlertZero investigates it once. Nothing else is switched on.',
  }),
  alert: i18n.translate('xpack.alertzero.poc.openAlerts.alert', { defaultMessage: 'Alert' }),
  severity: i18n.translate('xpack.alertzero.poc.openAlerts.severity', {
    defaultMessage: 'Severity',
  }),
  created: i18n.translate('xpack.alertzero.poc.openAlerts.created', { defaultMessage: 'Created' }),
  action: i18n.translate('xpack.alertzero.poc.openAlerts.action', {
    defaultMessage: 'AlertZero',
  }),
  investigate: i18n.translate('xpack.alertzero.poc.openAlerts.investigate', {
    defaultMessage: 'Investigate with AlertZero',
  }),
  view: i18n.translate('xpack.alertzero.poc.openAlerts.view', {
    defaultMessage: 'View investigation',
  }),
  note: i18n.translate('xpack.alertzero.poc.openAlerts.note', {
    defaultMessage:
      'Sample alerts. Investigations use the recommended models unless you change them in Configuration.',
  }),
  automaticTitle: i18n.translate('xpack.alertzero.poc.openAlerts.automaticTitle', {
    defaultMessage: 'Investigate new alerts as they arrive',
  }),
  automaticDescription: i18n.translate('xpack.alertzero.poc.openAlerts.automaticDescription', {
    defaultMessage: 'Choose which rules send alerts to AlertZero. No rules are selected for you.',
  }),
  chooseRules: i18n.translate('xpack.alertzero.poc.openAlerts.chooseRules', {
    defaultMessage: 'Choose rules',
  }),
};

const severities: Record<DemoOpenAlertSeverity, { label: string; color: string }> = {
  critical: {
    label: i18n.translate('xpack.alertzero.poc.openAlerts.critical', {
      defaultMessage: 'Critical',
    }),
    color: 'danger',
  },
  high: {
    label: i18n.translate('xpack.alertzero.poc.openAlerts.high', { defaultMessage: 'High' }),
    color: 'warning',
  },
  medium: {
    label: i18n.translate('xpack.alertzero.poc.openAlerts.medium', { defaultMessage: 'Medium' }),
    color: 'primary',
  },
  low: {
    label: i18n.translate('xpack.alertzero.poc.openAlerts.low', { defaultMessage: 'Low' }),
    color: 'subdued',
  },
};

const getCreatedLabel = (minutesAgo: number): string =>
  minutesAgo < 60
    ? i18n.translate('xpack.alertzero.poc.openAlerts.minutesAgo', {
        defaultMessage: '{count, plural, one {# minute} other {# minutes}} ago',
        values: { count: minutesAgo },
      })
    : i18n.translate('xpack.alertzero.poc.openAlerts.hoursAgo', {
        defaultMessage: '{count, plural, one {# hour} other {# hours}} ago',
        values: { count: Math.floor(minutesAgo / 60) },
      });

export interface DemoOpenAlertStatus {
  label: string;
  color: 'success' | 'primary' | 'warning';
}

export interface DemoOpenAlertsProps {
  alerts: readonly DemoOpenAlert[];
  /** The investigation status of each alert the customer already asked AlertZero to investigate. */
  statuses: Readonly<Record<string, DemoOpenAlertStatus | undefined>>;
  /** Offers rule selection as the next step while no rule sends alerts to AlertZero. */
  showChooseRules: boolean;
  onInvestigate: (alertId: string) => void;
  onViewInvestigation: (alertId: string) => void;
  onChooseRules: () => void;
}

/** The first-run view: try AlertZero on one open alert before choosing rules or models. */
export const DemoOpenAlerts: React.FC<DemoOpenAlertsProps> = ({
  alerts,
  statuses,
  showChooseRules,
  onInvestigate,
  onViewInvestigation,
  onChooseRules,
}) => {
  const hasInvestigated = alerts.some(({ id }) => statuses[id] !== undefined);
  const columns: Array<EuiBasicTableColumn<DemoOpenAlert>> = [
    {
      name: copy.alert,
      render: ({ rule, entity }: DemoOpenAlert) => (
        <div>
          <EuiText size="s">{rule}</EuiText>
          <EuiText size="xs" color="subdued">
            {entity}
          </EuiText>
        </div>
      ),
    },
    {
      name: copy.severity,
      width: '120px',
      render: ({ severity }: DemoOpenAlert) => (
        <EuiHealth color={severities[severity].color}>{severities[severity].label}</EuiHealth>
      ),
    },
    {
      name: copy.created,
      width: '140px',
      render: ({ minutesAgo }: DemoOpenAlert) => getCreatedLabel(minutesAgo),
    },
    {
      name: copy.action,
      align: 'right',
      width: '300px',
      render: ({ id, rule, entity }: DemoOpenAlert) => {
        const status = statuses[id];
        return status ? (
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            responsive={false}
            data-test-subj={`alertZeroPocOpenAlertStatus-${id}`}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color={status.color}>{status.label}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                onClick={() => onViewInvestigation(id)}
                aria-label={i18n.translate('xpack.alertzero.poc.openAlerts.viewLabel', {
                  defaultMessage: 'View investigation: {rule} on {entity}',
                  values: { rule, entity },
                })}
                data-test-subj={`alertZeroPocViewAlertInvestigation-${id}`}
              >
                {copy.view}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <AiButton
            variant="base"
            size="s"
            iconType="sparkles"
            onClick={() => onInvestigate(id)}
            aria-label={i18n.translate('xpack.alertzero.poc.openAlerts.investigateLabel', {
              defaultMessage: 'Investigate with AlertZero: {rule} on {entity}',
              values: { rule, entity },
            })}
            data-test-subj={`alertZeroPocInvestigateAlert-${id}`}
          >
            {copy.investigate}
          </AiButton>
        );
      },
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="l"
          data-test-subj="alertZeroPocOpenAlerts"
        >
          <EuiTitle size="s">
            <h2>{copy.title}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{copy.description}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiBasicTable<DemoOpenAlert>
            tableCaption={copy.title}
            items={[...alerts]}
            itemId="id"
            columns={columns}
            rowProps={({ id }) => ({ 'data-test-subj': `alertZeroPocOpenAlert-${id}` })}
          />
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <p>{copy.note}</p>
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
      {showChooseRules ? (
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder hasShadow={false} paddingSize="l">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h2>{copy.automaticTitle}</h2>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  <p>{copy.automaticDescription}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill={hasInvestigated}
                  onClick={onChooseRules}
                  data-test-subj="alertZeroPocOpenAlertsChooseRules"
                >
                  {copy.chooseRules}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
