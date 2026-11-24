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
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { DemoConfiguration, type DemoConfigurationSetup } from './demo_configuration';
import * as nativeLabels from '../watches/settings_translations';
import { createDefaultDemoModelAssignments } from './demo_model_picker';
import { createDefaultDemoAlertInvestigation } from './demo_alert_investigation';

const mockKibanaServices = {
  application: { navigateToUrl: jest.fn() },
  http: { basePath: { prepend: jest.fn((path: string) => path) } },
  overlays: { openConfirm: jest.fn() },
  appParams: { history: { block: jest.fn() } },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: mockKibanaServices }),
}));

jest.mock('@kbn/unsaved-changes-prompt', () => ({ useUnsavedChangesPrompt: jest.fn() }));

jest.mock('./demo_usage', () => ({
  DemoUsage: () => <h2>Recorded workflow usage</h2>,
}));

const mockUseUnsavedChangesPrompt = jest.mocked(useUnsavedChangesPrompt);

interface HeaderAction {
  label: React.ReactNode;
  testId?: string;
  disableButton?: boolean | (() => boolean);
  run: () => void;
}

interface HeaderProps {
  title: React.ReactNode;
  badges?: Array<{ label: string; 'data-test-subj'?: string }>;
  menu?: { primaryActionItem?: HeaderAction; items?: HeaderAction[] };
}

jest.mock('@kbn/app-header', () => ({
  AppHeader: ({ title, badges = [], menu }: HeaderProps) => {
    const actions = [
      ...(menu?.items ?? []),
      ...(menu?.primaryActionItem ? [menu.primaryActionItem] : []),
    ];
    return (
      <header>
        <h1>{title}</h1>
        {badges.map((badge) => (
          <span key={badge.label} data-test-subj={badge['data-test-subj']}>
            {badge.label}
          </span>
        ))}
        {actions.map((action) => (
          <button
            key={action.testId}
            type="button"
            data-test-subj={action.testId}
            disabled={
              typeof action.disableButton === 'function'
                ? action.disableButton()
                : Boolean(action.disableButton)
            }
            onClick={() => action.run()}
          >
            {action.label}
          </button>
        ))}
      </header>
    );
  },
}));

jest.mock('../watches/components/feature_settings_link', () => ({
  FeatureSettingsLink: ({ 'data-test-subj': testSubj }: { 'data-test-subj'?: string }) => (
    <a href="/app/management/modelManagement/model_settings" data-test-subj={testSubj}>
      Feature settings
    </a>
  ),
}));

const configuredScope = {
  ...createDefaultDemoAlertInvestigation(),
  ruleIds: ['endpoint', 'identity'],
};

const savedSetup: DemoConfigurationSetup = {
  severity: 'medium',
  rules: { endpoint: true, identity: false },
  model: 'existing-model-connection',
  context: 'Original organization context.',
  modelAssignments: createDefaultDemoModelAssignments(),
  alertInvestigation: configuredScope,
  excludeBuildingBlocks: false,
  excludedRuleTags: [],
};

const ruleOptions = [
  { id: 'endpoint', label: 'Suspicious PowerShell activity', enabled: true, alertsLast24h: 1 },
  { id: 'identity', label: 'Rare service-account sign-in', enabled: true, alertsLast24h: 0 },
];

const renderConfiguration = (initialSetup = savedSetup, options = ruleOptions) => {
  const onSave = jest.fn<void | boolean, [DemoConfigurationSetup]>();
  const onBack = jest.fn();
  const content = (setup: DemoConfigurationSetup) => (
    <I18nProvider>
      <EuiProvider>
        <DemoConfiguration setup={setup} ruleOptions={options} onSave={onSave} onBack={onBack} />
      </EuiProvider>
    </I18nProvider>
  );
  const result = render(content(initialSetup));
  return {
    onSave,
    onBack,
    rerenderSetup: (setup: DemoConfigurationSetup) => result.rerender(content(setup)),
  };
};

const customizeEfficientModels = async () => {
  await userEvent.click(screen.getByTestId('alertZeroPocModelTierToggle-efficient'));
  await userEvent.click(screen.getByLabelText('Use recommended defaults for Efficient models'));
};

describe('DemoConfiguration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps scope and tiered model choices local until Save and commits the new baseline', async () => {
    const { onSave } = renderConfiguration();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Feature settings' })).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationEnabled'));
    await customizeEfficientModels();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('alertZeroPocConfigurationUnsaved')).toBeInTheDocument();
    expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({ hasUnsavedChanges: true })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      ...savedSetup,
      alertInvestigation: { ...configuredScope, enabled: false },
      modelAssignments: {
        ...createDefaultDemoModelAssignments(),
        efficient: {
          ...createDefaultDemoModelAssignments().efficient,
          useRecommended: false,
        },
      },
    });
    expect(screen.getByText('Preview configuration saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
    expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({ hasUnsavedChanges: false })
    );

    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationEnabled'));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByTestId('alertZeroPocInvestigationEnabled')).not.toBeChecked();
    expect(
      screen.getByLabelText('Use recommended defaults for Efficient models')
    ).not.toBeChecked();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('discards unsaved edits without calling onSave', async () => {
    const { onSave } = renderConfiguration();
    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationEnabled'));
    await customizeEfficientModels();
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByTestId('alertZeroPocInvestigationEnabled')).toBeChecked();
    expect(screen.getByLabelText('Use recommended defaults for Efficient models')).toBeChecked();
    expect(screen.queryByTestId('alertZeroPocConfigurationUnsaved')).not.toBeInTheDocument();
    expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({ hasUnsavedChanges: false })
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves and discards building-block exclusion with the shared configuration draft', async () => {
    const { onSave } = renderConfiguration();
    await userEvent.click(screen.getByLabelText('Exclude building block alerts'));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByLabelText('Exclude building block alerts')).not.toBeChecked();
    await userEvent.click(screen.getByLabelText('Exclude building block alerts'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        alertInvestigation: {
          ...configuredScope,
          excludeBuildingBlocks: true,
        },
      })
    );
    expect(screen.getByLabelText('Exclude building block alerts')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves an empty included-rule scope without requiring a sample alert', async () => {
    const { onSave } = renderConfiguration();
    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationManageRules'));
    const manager = within(screen.getByTestId('alertZeroPocInvestigationRulesFlyout'));
    const table = within(manager.getByTestId('alertZeroPocInvestigationRulesTable'));
    await userEvent.click(table.getAllByRole('checkbox')[0]);
    await userEvent.click(manager.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(screen.getByTestId('alertZeroPocInvestigationNoRules')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        alertInvestigation: {
          enabled: true,
          mode: 'selected',
          ruleIds: [],
          excludeBuildingBlocks: false,
        },
      })
    );
  });

  it('saves a rule scope with no recent alerts and removes the old filter controls', async () => {
    const { onSave } = renderConfiguration();
    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationManageRules'));
    const manager = within(screen.getByTestId('alertZeroPocInvestigationRulesFlyout'));
    const table = within(manager.getByTestId('alertZeroPocInvestigationRulesTable'));
    await userEvent.click(table.getAllByRole('checkbox')[0]);
    await userEvent.click(
      within(table.getByRole('row', { name: /Rare service-account sign-in/ })).getByRole('checkbox')
    );
    await userEvent.click(manager.getByTestId('alertZeroPocInvestigationApplyRules'));
    expect(screen.getByTestId('alertZeroPocInvestigationCoverage')).toHaveTextContent(
      'No alerts in the last 24 hours'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        alertInvestigation: {
          enabled: true,
          mode: 'selected',
          ruleIds: ['identity'],
          excludeBuildingBlocks: false,
        },
      })
    );
    expect(screen.queryByLabelText('Minimum severity')).not.toBeInTheDocument();
    expect(screen.queryByText('Scope exclusions')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Excluded rule tags')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Exclude building block alerts')).toBeInTheDocument();
  });

  it('preserves the configuration draft while opening read-only workflow Usage', async () => {
    const { onSave } = renderConfiguration();
    await customizeEfficientModels();
    await userEvent.click(screen.getByTestId('alertZeroPocConfigurationNavUsage'));

    expect(screen.getByRole('heading', { name: 'Recorded workflow usage' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByText('POC · Recorded data')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('alertZeroPocConfigurationNavConfiguration'));
    await userEvent.click(screen.getByTestId('alertZeroPocModelTierToggle-efficient'));
    expect(
      screen.getByLabelText('Use recommended defaults for Efficient models')
    ).not.toBeChecked();
    expect(screen.getByTestId('alertZeroPocConfigurationUnsaved')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the three model tiers without a Context configuration section', async () => {
    renderConfiguration();
    for (const tier of ['efficient', 'balanced', 'frontier']) {
      expect(screen.getByTestId(`alertZeroPocModelTier-${tier}`)).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: 'Context' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Organization context (optional)')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('saves the ordered custom fallbacks without offering duplicate assignments', async () => {
    const { onSave } = renderConfiguration();
    await customizeEfficientModels();
    await userEvent.click(screen.getByTestId('alertZeroPocModelMoveDown-efficient-gpt6luna'));
    await userEvent.click(screen.getByTestId('alertZeroPocModelRemove-efficient-claude45haiku'));
    await userEvent.click(screen.getByTestId('alertZeroPocModelAdd-efficient'));
    expect(screen.queryByTestId('alertZeroPocModelOption-gpt6luna')).not.toBeInTheDocument();
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search models for Efficient models' }),
      'Sonnet'
    );
    await userEvent.click(screen.getByTestId('alertZeroPocModelOption-claude55sonnet'));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        modelAssignments: expect.objectContaining({
          efficient: {
            useRecommended: false,
            modelIds: ['gemini35flashlite', 'gpt6luna', 'claude55sonnet'],
          },
        }),
      })
    );
  });

  it('restores recommended models and keeps at least one custom model assigned', async () => {
    const { onSave } = renderConfiguration();
    await customizeEfficientModels();
    await userEvent.click(
      screen.getByTestId('alertZeroPocModelRemove-efficient-gemini35flashlite')
    );
    await userEvent.click(screen.getByTestId('alertZeroPocModelRemove-efficient-claude45haiku'));
    expect(screen.getByTestId('alertZeroPocModelRemove-efficient-gpt6luna')).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Use recommended defaults for Efficient models'));
    expect(screen.getByLabelText('Use recommended defaults for Efficient models')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps autonomy and proposal-action controls out of configuration', () => {
    renderConfiguration();
    expect(screen.queryByText(/^Autonomy$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Manual')).not.toBeInTheDocument();
    expect(screen.queryByText('Supervised')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(approve|reject|apply)\b/i })
    ).not.toBeInTheDocument();
  });

  it('merges externally linked rules into an untouched scope and preserves model drafts', async () => {
    const { onSave, rerenderSetup } = renderConfiguration();
    await customizeEfficientModels();
    const sharedScope = {
      ...createDefaultDemoAlertInvestigation(),
      mode: 'selected' as const,
      ruleIds: ['identity'],
    };
    rerenderSetup({ ...savedSetup, alertInvestigation: sharedScope });
    expect(screen.queryByTestId('alertZeroPocScopeConflict')).not.toBeInTheDocument();
    expect(screen.getByText('1 enabled rule included')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Use recommended defaults for Efficient models')
    ).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        alertInvestigation: sharedScope,
        modelAssignments: expect.objectContaining({
          efficient: expect.objectContaining({ useRecommended: false }),
        }),
      })
    );
  });

  it('preserves a local scope draft when only saved models change elsewhere', async () => {
    const { onSave, rerenderSetup } = renderConfiguration();
    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationEnabled'));
    const modelAssignments = createDefaultDemoModelAssignments();
    modelAssignments.efficient.useRecommended = false;
    rerenderSetup({ ...savedSetup, modelAssignments });
    expect(screen.getByTestId('alertZeroPocInvestigationEnabled')).not.toBeChecked();
    expect(screen.queryByTestId('alertZeroPocScopeConflict')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        alertInvestigation: { ...configuredScope, enabled: false },
        modelAssignments,
      })
    );
  });

  it('requires resolving a conflicting external scope while retaining model edits', async () => {
    const { onSave, rerenderSetup } = renderConfiguration();
    await customizeEfficientModels();
    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationEnabled'));
    const sharedScope = {
      ...createDefaultDemoAlertInvestigation(),
      mode: 'selected' as const,
      ruleIds: ['identity'],
    };
    rerenderSetup({ ...savedSetup, alertInvestigation: sharedScope });
    expect(screen.getByTestId('alertZeroPocScopeConflict')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Use latest rule scope' }));
    expect(screen.getByTestId('alertZeroPocInvestigationEnabled')).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        alertInvestigation: sharedScope,
        modelAssignments: expect.objectContaining({
          efficient: expect.objectContaining({ useRecommended: false }),
        }),
      })
    );
  });

  it('keeps an unsuccessful shared save dirty for retry', async () => {
    const { onSave } = renderConfiguration();
    onSave.mockReturnValue(false);
    await userEvent.click(screen.getByTestId('alertZeroPocInvestigationEnabled'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByText('Preview configuration saved.')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroPocConfigurationUnsaved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('links a native rule back to the Detection Rules preview', async () => {
    const nativeRule = {
      id: 'native-rule',
      label: 'Encoded PowerShell Execution',
      enabled: true,
      alertsLast24h: 0,
      source: 'detection_rules' as const,
    };
    renderConfiguration(
      {
        ...savedSetup,
        alertInvestigation: {
          ...configuredScope,
          ruleIds: [...configuredScope.ruleIds, nativeRule.id],
        },
      },
      [...ruleOptions, nativeRule]
    );
    const link = screen.getByRole('link', { name: nativeRule.label });
    const href = '/app/security/rules/id/native-rule/edit?alertZeroPreview=true';
    expect(link).toHaveAttribute('href', href);
    expect(
      within(screen.getByTestId('alertZeroPocConnectedRules')).getByText('Included')
    ).toBeInTheDocument();
    await userEvent.click(link);
    expect(mockKibanaServices.application.navigateToUrl).toHaveBeenCalledWith(href);
  });

  it('returns directly when there are no unsaved changes', async () => {
    const { onBack, onSave } = renderConfiguration();
    expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({ hasUnsavedChanges: false })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Investigations preview' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('wires the native navigation guard for an unsaved draft and delegates Back through it', async () => {
    const { onBack, onSave } = renderConfiguration();
    await customizeEfficientModels();
    expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith({
      hasUnsavedChanges: true,
      http: mockKibanaServices.http,
      history: mockKibanaServices.appParams.history,
      navigateToUrl: mockKibanaServices.application.navigateToUrl,
      openConfirm: mockKibanaServices.overlays.openConfirm,
      titleText: nativeLabels.LEAVE_PROMPT_TITLE,
      messageText: 'You have unsaved configuration changes. Leave without saving them?',
      cancelButtonText: nativeLabels.KEEP_EDITING_BUTTON_LABEL,
      confirmButtonText: nativeLabels.LEAVE_PROMPT_CONFIRM_BUTTON_LABEL,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Investigations preview' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({ hasUnsavedChanges: true })
    );
    expect(mockKibanaServices.overlays.openConfirm).not.toHaveBeenCalled();
  });
});
