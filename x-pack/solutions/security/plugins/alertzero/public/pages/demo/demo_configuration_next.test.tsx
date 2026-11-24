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
import { DemoConfigurationNext } from './demo_configuration_next';
import type { DemoConfigurationNextProps } from './demo_configuration_next';
import type {
  DemoAlertInvestigationConfig,
  DemoAlertInvestigationRule,
} from './demo_alert_investigation';
import { createDefaultDemoModelAssignments } from './demo_model_picker';
import {
  DEMO_RECENTLY_ADDED_RULES,
  getReviewedRulesStorageKey,
  getRulesToReview,
  readReviewedRuleIds,
  writeReviewedRuleIds,
} from './demo_reviewed_rules';

jest.mock('../watches/components/feature_settings_link', () => ({
  FeatureSettingsLink: () => <a href="/settings">{'Feature settings'}</a>,
}));

const BASE_PATH = '/s/test';
const rules: DemoAlertInvestigationRule[] = [
  { id: 'quiet', label: 'Quiet rule', enabled: true, alertsLast24h: 0, category: 'Network' },
  { id: 'noisy', label: 'Noisy rule', enabled: true, alertsLast24h: 40, category: 'Windows' },
  { id: 'steady', label: 'Steady rule', enabled: true, alertsLast24h: 2, category: 'Identity' },
  { id: 'off', label: 'Disabled rule', enabled: false, alertsLast24h: 0, category: 'AWS' },
  {
    id: 'native',
    label: 'Native rule',
    enabled: true,
    alertsLast24h: 1,
    category: 'Detection Rules',
    source: 'detection_rules',
  },
];
const scopeWith = (overrides: Partial<DemoAlertInvestigationConfig>) => ({
  enabled: true,
  mode: 'selected' as const,
  ruleIds: [],
  excludeBuildingBlocks: false,
  ...overrides,
});

const renderNext = (overrides: Partial<DemoConfigurationNextProps> = {}) => {
  const props: DemoConfigurationNextProps = {
    scope: scopeWith({}),
    rules,
    models: createDefaultDemoModelAssignments(),
    basePath: BASE_PATH,
    getRuleHref: (ruleId) => `/rules/${ruleId}`,
    onNavigate: jest.fn(),
    onChangeScope: jest.fn(),
    onChangeModels: jest.fn(),
    onViewUsage: jest.fn(),
    onViewInvestigations: jest.fn(),
    ...overrides,
  };
  render(
    <EuiProvider>
      <I18nProvider>
        <DemoConfigurationNext {...props} />
      </I18nProvider>
    </EuiProvider>
  );
  return props;
};

describe('DemoConfigurationNext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Nothing is new in these tests unless a test says otherwise.
    writeReviewedRuleIds(
      window.localStorage,
      BASE_PATH,
      rules.map(({ id }) => id)
    );
  });

  it('starts with no rules, one status and no pause control', () => {
    renderNext();

    expect(screen.getByTestId('alertZeroPocNextStatusTitle')).toHaveTextContent(
      'No rules selected yet'
    );
    expect(screen.getByTestId('alertZeroPocNextStatusHelp')).toHaveTextContent(
      'AlertZero investigates nothing until you choose rules.'
    );
    expect(screen.getByTestId('alertZeroPocNextNoRules')).toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroPocNextPause')).not.toBeInTheDocument();
    // One way in from this page, so the empty state does not repeat itself.
    expect(screen.getAllByRole('button', { name: 'Choose rules' })).toHaveLength(1);
    expect(screen.queryByTestId('alertZeroPocNextManageRules')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroPocNextNoRules')).toHaveTextContent('No rules selected.');
    // Rules are chosen on this page, so it does not send the customer to Detection rules.
    expect(screen.queryByText(/Detection rules/)).not.toBeInTheDocument();
    expect(screen.queryByText('Configured from Detection Rules')).not.toBeInTheDocument();
    expect(screen.queryByText(/in this space/)).not.toBeInTheDocument();
  });

  it('describes the selection, its alert volume and the selected rules by volume', () => {
    renderNext({ scope: scopeWith({ ruleIds: ['quiet', 'noisy', 'native', 'off'] }) });

    expect(screen.getByTestId('alertZeroPocNextStatusTitle')).toHaveTextContent(
      'AlertZero is investigating alerts from 3 of 5 rules'
    );
    expect(screen.getByTestId('alertZeroPocNextStatusHelp')).toHaveTextContent(
      '40 alerts from these rules in the last 24 hours. Alerts from rules added in Detection rules are not counted in this preview.'
    );
    const rows = within(screen.getByTestId('alertZeroPocNextRules')).getAllByTestId(
      /^alertZeroPocNextSelectedRule-/
    );
    expect(rows.map((row) => row.getAttribute('data-test-subj'))).toEqual([
      'alertZeroPocNextSelectedRule-noisy',
      'alertZeroPocNextSelectedRule-native',
      'alertZeroPocNextSelectedRule-quiet',
      'alertZeroPocNextSelectedRule-off',
    ]);
    expect(screen.getByRole('link', { name: 'Native rule' })).toHaveAttribute(
      'href',
      '/rules/native'
    );
    expect(screen.getByTestId('alertZeroPocNextDisabledSelected')).toHaveTextContent(
      '1 selected rule is disabled and produces no alerts until re-enabled.'
    );
  });

  it('does not report a healthy status when every selected rule is disabled', () => {
    renderNext({ scope: scopeWith({ ruleIds: ['off'] }) });

    expect(screen.getByTestId('alertZeroPocNextStatusTitle')).toHaveTextContent(
      'No enabled rules selected'
    );
    expect(screen.getByTestId('alertZeroPocNextStatusHelp')).toHaveTextContent(
      'The rules you selected are disabled, so no alerts reach AlertZero.'
    );
  });

  it('explains waiting for a first alert when the selected rules are quiet', () => {
    renderNext({ scope: scopeWith({ ruleIds: ['quiet'] }) });

    expect(screen.getByTestId('alertZeroPocNextStatusHelp')).toHaveTextContent(
      'Investigations start when the first one arrives.'
    );
  });

  it('pauses and resumes without changing the selection', async () => {
    const { onChangeScope } = renderNext({ scope: scopeWith({ ruleIds: ['noisy'] }) });

    await userEvent.click(screen.getByTestId('alertZeroPocNextPause'));

    expect(onChangeScope).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false, ruleIds: ['noisy'] })
    );
  });

  it('keeps the selection visible while paused', () => {
    renderNext({ scope: scopeWith({ enabled: false, ruleIds: ['noisy', 'steady'] }) });

    expect(screen.getByTestId('alertZeroPocNextStatusTitle')).toHaveTextContent(
      'AlertZero is paused'
    );
    expect(screen.getByTestId('alertZeroPocNextStatusHelp')).toHaveTextContent(
      'Your 2 selected rules stay selected. New alerts are not investigated while paused.'
    );
    expect(screen.getByTestId('alertZeroPocNextPause')).toHaveTextContent('Resume');
  });

  it('still offers the rule picker when paused with no rules selected', async () => {
    renderNext({ scope: scopeWith({ enabled: false }) });

    expect(screen.getByTestId('alertZeroPocNextPause')).toHaveTextContent('Resume');
    expect(screen.getAllByRole('button', { name: 'Choose rules' })).toHaveLength(1);
    await userEvent.click(screen.getByTestId('alertZeroPocNextManageRules'));

    expect(screen.getByTestId('alertZeroPocNextRulesManager')).toBeInTheDocument();
  });

  it('applies an explicit selection from the rule manager', async () => {
    const { onChangeScope } = renderNext();

    await userEvent.click(screen.getByTestId('alertZeroPocNextChooseRules'));
    const manager = screen.getByTestId('alertZeroPocNextRulesManager');
    expect(within(manager).queryByText(/Detection rules/)).not.toBeInTheDocument();
    // Most alerts first, and a disabled rule cannot be newly selected.
    const rowLabels = within(manager)
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent);
    expect(rowLabels[0]).toContain('Noisy rule');
    await userEvent.click(within(manager).getByTestId('alertZeroPocNextRulesSelectShown'));
    expect(within(manager).getByTestId('alertZeroPocNextRulesSelectionSummary')).toHaveTextContent(
      '4 of 5 rules selected · 42 alerts in the last 24 hours'
    );
    await userEvent.click(within(manager).getByTestId('alertZeroPocNextRulesApply'));

    expect(onChangeScope).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'selected',
        ruleIds: ['quiet', 'noisy', 'steady', 'native'],
      })
    );
  });

  it('prompts to review rules added since the last review and never enrolls them', async () => {
    window.localStorage.removeItem(getReviewedRulesStorageKey(BASE_PATH));
    expect(DEMO_RECENTLY_ADDED_RULES).toHaveLength(3);
    const { onChangeScope } = renderNext({
      rules: [...rules, ...DEMO_RECENTLY_ADDED_RULES],
      scope: scopeWith({ ruleIds: ['noisy'] }),
    });

    expect(screen.getByTestId('alertZeroPocNextRulesToReview')).toHaveTextContent(
      '3 new rules since you last reviewed'
    );
    expect(screen.getByTestId('alertZeroPocNextStatusTitle')).toHaveTextContent(
      'AlertZero is investigating alerts from 1 of 8 rules'
    );

    await userEvent.click(screen.getByTestId('alertZeroPocNextDismissReview'));

    expect(screen.queryByTestId('alertZeroPocNextRulesToReview')).not.toBeInTheDocument();
    expect(onChangeScope).not.toHaveBeenCalled();
    expect(readReviewedRuleIds(window.localStorage, BASE_PATH)).toEqual(
      [...rules, ...DEMO_RECENTLY_ADDED_RULES].map(({ id }) => id)
    );
  });

  it('summarizes recommended models in one line until the customer chooses to change them', async () => {
    renderNext();

    expect(screen.getByTestId('alertZeroPocNextModelSummary')).toHaveTextContent(
      'Using recommended models'
    );
    expect(screen.queryByText('Efficient models')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('alertZeroPocNextChangeModels'));

    expect(screen.getByText('Efficient models')).toBeInTheDocument();
  });

  it('reports custom model tiers in the summary', () => {
    const models = createDefaultDemoModelAssignments();
    renderNext({
      models: { ...models, frontier: { useRecommended: false, modelIds: ['claude5opus'] } },
    });

    expect(screen.getByTestId('alertZeroPocNextModelSummary')).toHaveTextContent(
      'Custom models for 1 of 3 kinds of work'
    );
  });

  it('states the approval behavior, the evidence rule and that later rules are not included', () => {
    renderNext({ scope: scopeWith({ ruleIds: ['noisy'] }) });

    expect(screen.getByTestId('alertZeroPocNextBehavior')).toHaveTextContent(
      'It asks before getting data from other systems or changing anything.'
    );
    expect(
      screen.getByText(/may read alerts from rules you did not select as evidence/)
    ).toBeInTheDocument();
    expect(
      screen.getByText('Rules added or enabled later are not included until you select them.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Detection rules/)).not.toBeInTheDocument();
  });

  it('offers the way forward to investigations and usage', async () => {
    const { onViewInvestigations, onViewUsage } = renderNext();

    await userEvent.click(screen.getByTestId('alertZeroPocNextViewInvestigations'));
    await userEvent.click(screen.getByTestId('alertZeroPocNextViewUsage'));

    expect(onViewInvestigations).toHaveBeenCalledTimes(1);
    expect(onViewUsage).toHaveBeenCalledTimes(1);
  });
});

describe('reviewed rule baseline', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns only enabled rules that are neither reviewed nor selected', () => {
    expect(getRulesToReview(rules, ['quiet'], ['noisy']).map(({ id }) => id)).toEqual([
      'steady',
      'native',
    ]);
  });

  it('ignores invalid stored baselines and reports storage failures', () => {
    window.localStorage.setItem(getReviewedRulesStorageKey(BASE_PATH), '{"not":"a list"}');
    expect(readReviewedRuleIds(window.localStorage, BASE_PATH)).toBeUndefined();
    expect(
      writeReviewedRuleIds(
        {
          setItem: () => {
            throw new Error('full');
          },
        },
        BASE_PATH,
        ['quiet']
      )
    ).toBe(false);
  });
});
