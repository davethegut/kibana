/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { DEMO_OPEN_ALERTS } from './demo_adhoc_alerts';
import { DemoOpenAlerts } from './demo_open_alerts';
import type { DemoOpenAlertsProps } from './demo_open_alerts';

const renderOpenAlerts = (overrides: Partial<DemoOpenAlertsProps> = {}) => {
  const props: DemoOpenAlertsProps = {
    alerts: DEMO_OPEN_ALERTS,
    statuses: {},
    showChooseRules: true,
    onInvestigate: jest.fn(),
    onViewInvestigation: jest.fn(),
    onChooseRules: jest.fn(),
    ...overrides,
  };
  render(
    <EuiProvider>
      <I18nProvider>
        <DemoOpenAlerts {...props} />
      </I18nProvider>
    </EuiProvider>
  );
  return props;
};
const row = (alertId: string) => within(screen.getByTestId(`alertZeroPocOpenAlert-${alertId}`));

describe('DemoOpenAlerts', () => {
  it('lists each open alert with its rule, entity, severity and age', () => {
    renderOpenAlerts();

    expect(screen.getAllByRole('row')).toHaveLength(DEMO_OPEN_ALERTS.length + 1);
    expect(row('alert-1').getByText('Suspicious PowerShell activity')).toBeInTheDocument();
    expect(row('alert-1').getByText('ws-014')).toBeInTheDocument();
    expect(row('alert-1').getByText('Critical')).toBeInTheDocument();
    expect(row('alert-1').getByText('4 minutes ago')).toBeInTheDocument();
    expect(row('alert-5').getByText('1 hour ago')).toBeInTheDocument();
    expect(row('alert-6').getByText('2 hours ago')).toBeInTheDocument();
  });

  it('offers one investigation per alert and starts only the one picked', async () => {
    const { onInvestigate } = renderOpenAlerts();

    expect(screen.getAllByRole('button', { name: /^Investigate with AlertZero/ })).toHaveLength(
      DEMO_OPEN_ALERTS.length
    );
    await userEvent.click(row('alert-2').getByRole('button'));

    expect(onInvestigate).toHaveBeenCalledTimes(1);
    expect(onInvestigate).toHaveBeenCalledWith('alert-2');
  });

  it('replaces the button with the status and a way to the investigation', async () => {
    const { onViewInvestigation } = renderOpenAlerts({
      statuses: { 'alert-1': { label: 'Needs your review', color: 'warning' } },
    });

    expect(
      row('alert-1').queryByRole('button', { name: /^Investigate with AlertZero/ })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroPocOpenAlertStatus-alert-1')).toHaveTextContent(
      'Needs your review'
    );
    await userEvent.click(row('alert-1').getByRole('button', { name: /^View investigation/ }));

    expect(onViewInvestigation).toHaveBeenCalledWith('alert-1');
    expect(screen.getAllByRole('button', { name: /^Investigate with AlertZero/ })).toHaveLength(
      DEMO_OPEN_ALERTS.length - 1
    );
  });

  it('offers rule selection as the next step and says no rules are selected', async () => {
    const { onChooseRules } = renderOpenAlerts();

    expect(screen.getByText('Investigate new alerts as they arrive')).toBeInTheDocument();
    expect(screen.getByText(/No rules are selected for you\./)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('alertZeroPocOpenAlertsChooseRules'));

    expect(onChooseRules).toHaveBeenCalledTimes(1);
  });

  it('leaves rule selection out once rules already send alerts to AlertZero', () => {
    renderOpenAlerts({ showChooseRules: false });

    expect(screen.queryByTestId('alertZeroPocOpenAlertsChooseRules')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Investigate with AlertZero/ })).toHaveLength(
      DEMO_OPEN_ALERTS.length
    );
  });
});
