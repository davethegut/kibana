/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import {
  DemoAlertInvestigation,
  createDefaultDemoAlertInvestigation,
  getIncludedDemoRules,
  type DemoAlertInvestigationConfig,
  type DemoAlertInvestigationRule,
} from './demo_alert_investigation';

const sampleRules: DemoAlertInvestigationRule[] = [
  { id: 'endpoint', label: 'Suspicious PowerShell activity', enabled: true, alertsLast24h: 6 },
  { id: 'cloud', label: 'Unexpected cloud access', enabled: true, alertsLast24h: 2 },
  { id: 'network', label: 'Suspicious outbound network activity', enabled: true, alertsLast24h: 0 },
  { id: 'disabled', label: 'Unusual administrative activity', enabled: false, alertsLast24h: 0 },
];

interface HarnessProps {
  rules: readonly DemoAlertInvestigationRule[];
  initialValue: DemoAlertInvestigationConfig;
  onChange: (next: DemoAlertInvestigationConfig) => void;
}

const Harness: React.FC<HarnessProps> = ({ rules, initialValue, onChange }) => {
  const [value, setValue] = useState(initialValue);
  return (
    <I18nProvider>
      <EuiProvider>
        <DemoAlertInvestigation
          value={value}
          rules={rules}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      </EuiProvider>
    </I18nProvider>
  );
};

const renderInvestigation = (
  initialValue = createDefaultDemoAlertInvestigation(),
  initialRules = sampleRules
) => {
  const onChange = jest.fn<void, [DemoAlertInvestigationConfig]>();
  const result = render(
    <Harness initialValue={initialValue} rules={initialRules} onChange={onChange} />
  );
  return {
    onChange,
    rerenderRules: (rules: DemoAlertInvestigationRule[]) =>
      result.rerender(<Harness initialValue={initialValue} rules={rules} onChange={onChange} />),
  };
};

const configuredScope: DemoAlertInvestigationConfig = {
  ...createDefaultDemoAlertInvestigation(),
  ruleIds: ['endpoint', 'cloud', 'network'],
};

const openRules = async () => {
  await userEvent.click(screen.getByTestId('alertZeroPocInvestigationManageRules'));
  return within(screen.getByTestId('alertZeroPocInvestigationRulesFlyout'));
};

const selectRule = async (label: RegExp) => {
  const flyout = within(screen.getByTestId('alertZeroPocInvestigationRulesFlyout'));
  const row = flyout.getByRole('row', { name: label });
  await userEvent.click(within(row).getByRole('checkbox'));
};

describe('DemoAlertInvestigation', () => {
  it('includes no rules until the user chooses them, even when new enabled rules arrive', async () => {
    const initialScope = createDefaultDemoAlertInvestigation();
    expect(initialScope).toEqual({
      enabled: true,
      mode: 'selected',
      ruleIds: [],
      excludeBuildingBlocks: false,
    });
    expect(getIncludedDemoRules(initialScope, sampleRules)).toEqual([]);
    const { onChange, rerenderRules } = renderInvestigation(initialScope);
    const nextRule = {
      id: 'new-rule',
      label: 'Newly enabled detection',
      enabled: true,
      alertsLast24h: 5,
    };
    rerenderRules([...sampleRules, nextRule]);
    expect(getIncludedDemoRules(initialScope, [...sampleRules, nextRule])).toEqual([]);
    expect(screen.getByText('0 enabled rules included')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroPocInvestigationNoRules')).toBeInTheDocument();
    const manager = await openRules();
    expect(manager.getByRole('radio', { name: 'Selected detection rules' })).toBeChecked();
    expect(
      within(manager.getByRole('row', { name: /Newly enabled detection/ })).getByRole('checkbox')
    ).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows native rule provenance without treating it as independent investigation scope', async () => {
    const nativeRule: DemoAlertInvestigationRule = {
      id: 'native-rule',
      label: 'Encoded PowerShell Execution',
      enabled: true,
      alertsLast24h: 0,
      source: 'detection_rules',
    };
    renderInvestigation(
      { ...createDefaultDemoAlertInvestigation(), mode: 'selected', ruleIds: ['endpoint'] },
      [...sampleRules, nativeRule]
    );
    const linked = within(screen.getByTestId('alertZeroPocConnectedRules'));
    expect(linked.getByText(nativeRule.label)).toBeInTheDocument();
    expect(linked.getByText('Not included')).toBeInTheDocument();
    expect(screen.getByText('1 enabled rule included')).toBeInTheDocument();
    const manager = await openRules();
    const nativeRow = manager.getByRole('row', { name: /Encoded PowerShell Execution/ });
    expect(within(nativeRow).getByRole('checkbox')).not.toBeChecked();
  });

  it('uses one main Manage rules action and saves an explicit snapshot when selecting all current rules', async () => {
    const { onChange, rerenderRules } = renderInvestigation();
    expect(screen.getAllByRole('button', { name: 'Manage rules' })).toHaveLength(1);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const manager = await openRules();
    await userEvent.click(manager.getByRole('radio', { name: 'All currently enabled rules' }));
    await userEvent.click(manager.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(onChange).toHaveBeenLastCalledWith(configuredScope);
    rerenderRules([
      ...sampleRules,
      { id: 'new-rule', label: 'Newly enabled detection', enabled: true, alertsLast24h: 0 },
    ]);
    expect(screen.getByText('3 enabled rules included')).toBeInTheDocument();
    expect(
      screen.getByText('New or newly enabled rules must be selected separately.')
    ).toBeInTheDocument();
  });

  it('excludes building block alerts without changing the included rule scope', async () => {
    const scope = configuredScope;
    const { onChange } = renderInvestigation(scope);
    expect(screen.getByLabelText('Exclude building block alerts')).not.toBeChecked();
    await userEvent.click(screen.getByLabelText('Exclude building block alerts'));
    expect(onChange).toHaveBeenLastCalledWith({
      ...scope,
      excludeBuildingBlocks: true,
    });
    expect(screen.getByText('3 enabled rules included')).toBeInTheDocument();
    expect(screen.getByLabelText('Exclude building block alerts')).toBeChecked();
  });

  it('keeps only selected rules and excludes disabled or newly enabled rules', () => {
    const scope = { ...configuredScope, ruleIds: [...configuredScope.ruleIds, 'disabled'] };
    const nextRule = {
      id: 'new-rule',
      label: 'Newly enabled detection',
      enabled: true,
      alertsLast24h: 0,
    };
    expect(getIncludedDemoRules(scope, sampleRules).map(({ id }) => id)).toEqual([
      'endpoint',
      'cloud',
      'network',
    ]);
    expect(getIncludedDemoRules(scope, [...sampleRules, nextRule]).map(({ id }) => id)).toEqual([
      'endpoint',
      'cloud',
      'network',
    ]);
    expect(
      getIncludedDemoRules({ ...scope, mode: 'selected', ruleIds: ['endpoint'] }, [
        ...sampleRules,
        nextRule,
      ]).map(({ id }) => id)
    ).toEqual(['endpoint']);
  });

  it('preserves existing coverage when another enabled rule arrives', () => {
    const { onChange, rerenderRules } = renderInvestigation(configuredScope);
    expect(screen.getByTestId('alertZeroPocInvestigationCoverage')).toHaveTextContent('3');
    rerenderRules([
      ...sampleRules,
      { id: 'new-rule', label: 'Newly enabled detection', enabled: true, alertsLast24h: 0 },
    ]);
    expect(screen.getByTestId('alertZeroPocInvestigationCoverage')).toHaveTextContent('3');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies a bulk selection only when confirmed and accepts a rule with no alerts', async () => {
    const { onChange } = renderInvestigation(configuredScope);
    const flyout = await openRules();
    const checkboxes = within(
      flyout.getByTestId('alertZeroPocInvestigationRulesTable')
    ).getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    await selectRule(/Suspicious outbound network activity/);
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(flyout.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(onChange).toHaveBeenLastCalledWith({
      enabled: true,
      mode: 'selected',
      ruleIds: ['network'],
      excludeBuildingBlocks: false,
    });
    expect(screen.queryByTestId('alertZeroPocInvestigationRulesFlyout')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancels a changed rule selection without changing the parent configuration', async () => {
    const { onChange } = renderInvestigation();
    const flyout = await openRules();
    await selectRule(/Unexpected cloud access/);
    await userEvent.click(flyout.getByTestId('alertZeroPocInvestigationCancelRules'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('alertZeroPocInvestigationRulesFlyout')).not.toBeInTheDocument();
  });

  it('preserves included rules that are hidden by a search', async () => {
    const { onChange } = renderInvestigation({
      enabled: true,
      mode: 'selected',
      ruleIds: ['endpoint'],
    });
    const flyout = await openRules();
    await userEvent.type(flyout.getByLabelText('Search detection rules'), 'cloud');
    expect(
      flyout.queryByRole('row', { name: /Suspicious PowerShell activity/ })
    ).not.toBeInTheDocument();
    await selectRule(/Unexpected cloud access/);
    await userEvent.click(flyout.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(onChange).toHaveBeenLastCalledWith({
      enabled: true,
      mode: 'selected',
      ruleIds: ['endpoint', 'cloud'],
    });
  });

  it('retains selections across pages and searches the full catalog', async () => {
    const rules = Array.from({ length: 36 }, (_, index) => ({
      id: `rule-${index}`,
      label: `Detection ${String(index + 1).padStart(2, '0')}`,
      enabled: true,
      alertsLast24h: 0,
      category: index === 1 ? 'Identity' : 'Endpoint',
    }));
    const { onChange } = renderInvestigation(
      { enabled: true, mode: 'selected', ruleIds: ['rule-0'] },
      rules
    );
    const manager = await openRules();
    await userEvent.click(manager.getByTestId('pagination-button-next'));
    await selectRule(/Detection 26/);
    await userEvent.type(manager.getByLabelText('Search detection rules'), 'Identity');
    expect(manager.getByRole('row', { name: /Detection 02/ })).toBeInTheDocument();
    await selectRule(/Detection 02/);
    await userEvent.click(manager.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: 'selected',
        ruleIds: ['rule-0', 'rule-1', 'rule-25'],
      })
    );
  });

  it('allows an empty selection and explains the resulting lack of coverage', async () => {
    const { onChange } = renderInvestigation(configuredScope);
    const flyout = await openRules();
    const checkboxes = within(
      flyout.getByTestId('alertZeroPocInvestigationRulesTable')
    ).getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    expect(flyout.getByTestId('alertZeroPocInvestigationApplyRules')).toBeEnabled();
    await userEvent.click(flyout.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(onChange).toHaveBeenLastCalledWith({
      enabled: true,
      mode: 'selected',
      ruleIds: [],
      excludeBuildingBlocks: false,
    });
    expect(screen.getByTestId('alertZeroPocInvestigationNoRules')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('preserves a selected disabled rule during another selection edit and restores coverage only for selected rules', async () => {
    const unselectedDisabled = {
      id: 'unselected-disabled',
      label: 'Another disabled detection',
      enabled: false,
      alertsLast24h: 0,
    };
    const initialRules = [...sampleRules, unselectedDisabled];
    const { onChange, rerenderRules } = renderInvestigation(
      { ...createDefaultDemoAlertInvestigation(), ruleIds: ['endpoint', 'disabled'] },
      initialRules
    );
    const manager = await openRules();
    const selectedDisabled = within(
      manager.getByRole('row', { name: /Unusual administrative activity/ })
    ).getByRole('checkbox');
    expect(selectedDisabled).toBeChecked();
    expect(selectedDisabled).toBeEnabled();
    expect(
      within(manager.getByRole('row', { name: /Another disabled detection/ })).getByRole('checkbox')
    ).toBeDisabled();
    await selectRule(/Unexpected cloud access/);
    await userEvent.click(manager.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(onChange).toHaveBeenLastCalledWith({
      ...createDefaultDemoAlertInvestigation(),
      ruleIds: ['endpoint', 'cloud', 'disabled'],
    });
    expect(screen.getByText('2 enabled rules included')).toBeInTheDocument();
    rerenderRules(
      initialRules.map((rule) =>
        rule.id === 'disabled' || rule.id === unselectedDisabled.id
          ? { ...rule, enabled: true }
          : rule
      )
    );
    expect(screen.getByText('3 enabled rules included')).toBeInTheDocument();
    const reopened = await openRules();
    expect(
      within(reopened.getByRole('row', { name: /Unusual administrative activity/ })).getByRole(
        'checkbox'
      )
    ).toBeChecked();
    expect(
      within(reopened.getByRole('row', { name: /Another disabled detection/ })).getByRole(
        'checkbox'
      )
    ).not.toBeChecked();
  });

  it('lets the user remove a disabled rule association without selecting disabled rules anew', async () => {
    const { onChange } = renderInvestigation({
      ...createDefaultDemoAlertInvestigation(),
      ruleIds: ['endpoint', 'disabled'],
    });
    const manager = await openRules();
    const checkbox = within(
      manager.getByRole('row', { name: /Unusual administrative activity/ })
    ).getByRole('checkbox');
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    await userEvent.click(manager.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(onChange).toHaveBeenLastCalledWith({
      ...createDefaultDemoAlertInvestigation(),
      ruleIds: ['endpoint'],
    });
  });

  it('turns automatic investigation off without losing its selected rule scope', async () => {
    const initialValue: DemoAlertInvestigationConfig = {
      enabled: true,
      mode: 'selected',
      ruleIds: ['endpoint'],
    };
    const { onChange } = renderInvestigation(initialValue);
    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationEnabled'));
    expect(onChange).toHaveBeenLastCalledWith({ ...initialValue, enabled: false });
    expect(screen.getByTestId('alertZeroPocInvestigationEnabled')).not.toBeChecked();
    expect(screen.getByTestId('alertZeroPocInvestigationCoverage')).toHaveTextContent(
      /off|paused|not investigat/i
    );
  });
});
