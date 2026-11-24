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
import { DemoSetupNext, hasSelectedDemoRules, mergeDemoRuleIds } from './demo_setup_next';
import type { DemoSetupNextProps } from './demo_setup_next';
import type {
  DemoAlertInvestigationConfig,
  DemoAlertInvestigationRule,
} from './demo_alert_investigation';
import { createDefaultDemoModelAssignments } from './demo_model_picker';
import { DEMO_RECENTLY_ADDED_RULES } from './demo_reviewed_rules';

jest.mock('../watches/components/feature_settings_link', () => ({
  FeatureSettingsLink: () => <a href="/settings">{'Feature settings'}</a>,
}));

const rules: DemoAlertInvestigationRule[] = [
  { id: 'quiet', label: 'Quiet rule', enabled: true, alertsLast24h: 0, category: 'Network' },
  { id: 'noisy', label: 'Noisy rule', enabled: true, alertsLast24h: 40, category: 'Windows' },
  { id: 'steady', label: 'Steady rule', enabled: true, alertsLast24h: 2, category: 'Identity' },
  { id: 'off', label: 'Disabled rule', enabled: false, alertsLast24h: 0, category: 'AWS' },
];
const scopeWith = (
  overrides: Partial<DemoAlertInvestigationConfig> = {}
): DemoAlertInvestigationConfig => ({
  enabled: true,
  mode: 'selected',
  ruleIds: [],
  excludeBuildingBlocks: false,
  ...overrides,
});

const Wrapped: React.FC<DemoSetupNextProps> = (props) => (
  <EuiProvider>
    <I18nProvider>
      <DemoSetupNext {...props} />
    </I18nProvider>
  </EuiProvider>
);
const renderSetup = (overrides: Partial<DemoSetupNextProps> = {}) => {
  const props: DemoSetupNextProps = {
    scope: scopeWith(),
    rules,
    models: createDefaultDemoModelAssignments(),
    basePath: '/s/test',
    getRuleHref: (ruleId) => `/rules/${ruleId}`,
    onNavigate: jest.fn(),
    onStart: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<Wrapped {...props} />) };
};
const chooseRule = async (label: string) => {
  const manager = screen.getByTestId('alertZeroPocNextRulesManager');
  const row = within(manager)
    .getAllByRole('row')
    .find(({ textContent }) => textContent?.includes(label));
  if (!row) throw new Error(`No rule row for ${label}`);
  await userEvent.click(within(row).getByRole('checkbox'));
};

describe('DemoSetupNext', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts with no rules, one way to choose them and nothing to start', () => {
    renderSetup();

    expect(screen.getAllByText('Choose rules')).toHaveLength(1);
    expect(screen.getByTestId('alertZeroPocNextNoRules')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroPocNextSetupStart')).toBeDisabled();
    expect(screen.getByTestId('alertZeroPocNextSetupSummary')).toHaveTextContent(
      'Choose at least one rule to start.'
    );
    expect(screen.queryByTestId('alertZeroPocNextSetupVolume')).not.toBeInTheDocument();
    // First run offers one way to choose: no route out to Detection rules and no list of alternatives.
    expect(screen.queryByText('Select in bulk from Detection rules')).not.toBeInTheDocument();
    expect(screen.queryByText(/turn AlertZero on from a detection rule/)).not.toBeInTheDocument();
  });

  it('asks only for rules and models', () => {
    renderSetup({ rules: [...rules, ...DEMO_RECENTLY_ADDED_RULES] });

    expect(screen.getByTestId('alertZeroPocNextRules')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroPocNextModelSummary')).toHaveTextContent(
      'Using recommended models'
    );
    // No status, pause, review prompt, building-block option, severity, context or single-model field.
    expect(screen.queryByTestId('alertZeroPocNextStatus')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroPocNextPause')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroPocNextRulesToReview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroPocNextExcludeBuildingBlocks')).not.toBeInTheDocument();
    expect(screen.queryByText(/severity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/organization context/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('says that nothing is chosen for the customer and how unselected rules are used', () => {
    renderSetup();

    const panel = screen.getByTestId('alertZeroPocNextRules');
    expect(panel).toHaveTextContent('No rules are selected for you.');
    expect(panel).toHaveTextContent(
      'Rules added or enabled later are not included until you select them.'
    );
    expect(panel).toHaveTextContent('Those alerts never start an investigation.');
  });

  it('starts with exactly the rules the customer chose and the models shown', async () => {
    const { props } = renderSetup();

    await userEvent.click(screen.getByTestId('alertZeroPocNextChooseRules'));
    expect(screen.getByTestId('alertZeroPocNextRulesManager')).toHaveTextContent(
      'Apply your selection, then start investigating to use it.'
    );
    expect(screen.queryByText('Select in bulk from Detection rules')).not.toBeInTheDocument();
    await chooseRule('Noisy rule');
    await chooseRule('Steady rule');
    await userEvent.click(screen.getByTestId('alertZeroPocNextRulesApply'));

    expect(props.onStart).not.toHaveBeenCalled();
    expect(screen.queryByText('Select in bulk from Detection rules')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroPocNextRules')).toHaveTextContent(
      'Alerts from these rules start investigations once you start.'
    );
    expect(screen.getByTestId('alertZeroPocNextSetupSummary')).toHaveTextContent(
      'AlertZero will investigate alerts from 2 rules.'
    );
    expect(screen.getByTestId('alertZeroPocNextSetupVolume')).toHaveTextContent(
      '42 alerts from these rules in the last 24 hours.'
    );

    await userEvent.click(screen.getByTestId('alertZeroPocNextSetupStart'));

    expect(props.onStart).toHaveBeenCalledTimes(1);
    expect(props.onStart).toHaveBeenCalledWith(
      {
        enabled: true,
        mode: 'selected',
        ruleIds: ['noisy', 'steady'],
        excludeBuildingBlocks: false,
      },
      props.models
    );
  });

  it('does not start when every chosen rule is disabled', () => {
    renderSetup({ scope: scopeWith({ ruleIds: ['off'] }) });

    expect(screen.getByTestId('alertZeroPocNextSetupStart')).toBeDisabled();
    expect(screen.getByTestId('alertZeroPocNextSetupSummary')).toHaveTextContent(
      'The rules you selected are disabled'
    );
  });

  it('tells the customer when the chosen rules have been quiet', () => {
    renderSetup({ scope: scopeWith({ ruleIds: ['quiet'] }) });

    expect(screen.getByTestId('alertZeroPocNextSetupStart')).toBeEnabled();
    expect(screen.getByTestId('alertZeroPocNextSetupVolume')).toHaveTextContent(
      'No alerts from these rules in the last 24 hours.'
    );
  });

  it('keeps unsaved picks when a rule is switched on elsewhere, and includes that rule', async () => {
    const { props, rerender } = renderSetup();

    await userEvent.click(screen.getByTestId('alertZeroPocNextChooseRules'));
    await chooseRule('Noisy rule');
    await userEvent.click(screen.getByTestId('alertZeroPocNextRulesApply'));
    rerender(<Wrapped {...props} scope={scopeWith({ ruleIds: ['steady'] })} />);

    expect(screen.getByTestId('alertZeroPocNextSetupSummary')).toHaveTextContent(
      'AlertZero will investigate alerts from 2 rules.'
    );

    rerender(<Wrapped {...props} scope={scopeWith()} />);
    await userEvent.click(screen.getByTestId('alertZeroPocNextSetupStart'));

    expect(props.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ ruleIds: ['noisy'] }),
      props.models
    );
  });

  it('turns investigation on when starting from a paused selection', async () => {
    const { props } = renderSetup({ scope: scopeWith({ enabled: false, ruleIds: ['noisy'] }) });

    await userEvent.click(screen.getByTestId('alertZeroPocNextSetupStart'));

    expect(props.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, ruleIds: ['noisy'] }),
      props.models
    );
  });

  it('reports unsaved picks until they match what is saved', async () => {
    const onUnsavedChange = jest.fn();
    const { props, rerender } = renderSetup({ onUnsavedChange });

    expect(onUnsavedChange).toHaveBeenLastCalledWith(false);

    await userEvent.click(screen.getByTestId('alertZeroPocNextChooseRules'));
    await chooseRule('Noisy rule');
    await userEvent.click(screen.getByTestId('alertZeroPocNextRulesApply'));

    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);

    rerender(<Wrapped {...props} scope={scopeWith({ ruleIds: ['noisy'] })} />);

    expect(onUnsavedChange).toHaveBeenLastCalledWith(false);
  });

  it('does not treat the same rules in a different order as unsaved', () => {
    const onUnsavedChange = jest.fn();
    const { props, rerender } = renderSetup({
      onUnsavedChange,
      scope: scopeWith({ ruleIds: ['steady', 'noisy'] }),
    });
    rerender(<Wrapped {...props} scope={scopeWith({ ruleIds: ['noisy', 'steady'] })} />);

    expect(onUnsavedChange).not.toHaveBeenCalledWith(true);
  });

  it('applies selections saved elsewhere without dropping or duplicating unsaved picks', () => {
    expect(mergeDemoRuleIds(['a'], [], ['b'])).toEqual(['a', 'b']);
    expect(mergeDemoRuleIds(['a', 'b'], ['b'], [])).toEqual(['a']);
    expect(mergeDemoRuleIds(['a', 'b'], ['b'], ['b'])).toEqual(['a', 'b']);
    expect(mergeDemoRuleIds(['a'], [], ['a'])).toEqual(['a']);
  });

  it('shows setup only until a rule from the catalog is selected', () => {
    expect(hasSelectedDemoRules(undefined, rules)).toBe(false);
    expect(hasSelectedDemoRules(scopeWith(), rules)).toBe(false);
    expect(hasSelectedDemoRules(scopeWith({ ruleIds: ['removed-rule'] }), rules)).toBe(false);
    expect(hasSelectedDemoRules(scopeWith({ ruleIds: ['off'] }), rules)).toBe(true);
    expect(hasSelectedDemoRules(scopeWith({ mode: 'all_enabled' }), rules)).toBe(true);
  });
});
