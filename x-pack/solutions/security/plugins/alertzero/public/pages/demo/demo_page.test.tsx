/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { EuiProvider } from '@elastic/eui';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import {
  createAlertZeroPreviewState,
  readAlertZeroPreviewState,
  writeAlertZeroPreviewState,
} from '@kbn/alertzero-common';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { DemoPage } from './demo_page';
import { DEMO_DETECTION_RULES } from './demo_detection_rules';
import { readReviewedRuleIds } from './demo_reviewed_rules';
import { getAdhocAlertsStorageKey, readAdhocAlertIds } from './demo_adhoc_alerts';

const BASE_PATH = '/s/test';
const mockKibanaServices = {
  application: { navigateToUrl: jest.fn() },
  http: { basePath: { get: () => BASE_PATH, prepend: (path: string) => `${BASE_PATH}${path}` } },
  notifications: { toasts: { addDanger: jest.fn() } },
  overlays: { openConfirm: jest.fn() },
  appParams: { history: {} },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: mockKibanaServices }),
}));
jest.mock('@kbn/unsaved-changes-prompt', () => ({ useUnsavedChangesPrompt: jest.fn() }));
jest.mock('../../components/app_chrome/app_heading_title', () => ({
  useAppHeadingTitle: jest.fn(),
}));
jest.mock('../../components/alertzero_page_header', () => ({
  AlertZeroPageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header>
      <h1>{title}</h1>
      <p data-test-subj="pageSubtitle">{subtitle}</p>
    </header>
  ),
}));
jest.mock('../../components/layout/alertzero_page_section', () => ({
  AlertZeroPageSection: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
jest.mock('../watches/components/feature_settings_link', () => ({
  FeatureSettingsLink: () => <a href="/settings">{'Feature settings'}</a>,
}));
jest.mock('./demo_configuration', () => ({
  DemoConfiguration: ({ variant, onBack }: { variant: string; onBack: () => void }) => (
    <button type="button" data-test-subj={`configuration-${variant}`} onClick={onBack}>
      {'Back to investigations'}
    </button>
  ),
}));

const mockUseUnsavedChangesPrompt = jest.mocked(useUnsavedChangesPrompt);
const hasLeavePrompt = () => mockUseUnsavedChangesPrompt.mock.lastCall?.[0].hasUnsavedChanges;
const savedRuleIds = () => readAlertZeroPreviewState(window.localStorage, BASE_PATH)?.scope.ruleIds;
const saveSelection = (ruleIds: string[]) =>
  writeAlertZeroPreviewState(window.localStorage, BASE_PATH, {
    ...createAlertZeroPreviewState(),
    scope: { enabled: true, mode: 'selected', ruleIds, excludeBuildingBlocks: false },
    rules: [...DEMO_DETECTION_RULES],
  });

const renderPage = (path: string, state?: { view: 'home' }) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <MemoryRouter initialEntries={[{ pathname: path, state }]}>
          <Route path={['/poc', '/watches/:page']} component={DemoPage} />
          <Route
            path="*"
            render={({ location }) => (
              <span data-test-subj="location">{`${location.pathname}|${JSON.stringify(
                (location.state as { view?: string } | undefined)?.view ?? null
              )}`}</span>
            )}
          />
        </MemoryRouter>
      </I18nProvider>
    </EuiProvider>
  );
const goToSetup = () => userEvent.click(screen.getByTestId('alertZeroPocOpenAlertsChooseRules'));
const pageTitle = () => screen.getByRole('heading', { level: 1 });
const chooseRule = async (label: string) => {
  await userEvent.click(screen.getByText(/^(Choose|Manage) rules$/));
  const manager = screen.getByTestId('alertZeroPocNextRulesManager');
  const row = within(manager)
    .getAllByRole('row')
    .find(({ textContent }) => textContent?.includes(label));
  if (!row) throw new Error(`No rule row for ${label}`);
  await userEvent.click(within(row).getByRole('checkbox'));
  await userEvent.click(screen.getByTestId('alertZeroPocNextRulesApply'));
};

describe('DemoPage setup flows', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('opens first run on open alerts, with nothing investigated, selected or saved', () => {
    renderPage('/poc');

    expect(pageTitle()).toHaveTextContent('Try AlertZero on an open alert');
    expect(screen.getByTestId('pageSubtitle')).toHaveTextContent('It asks before getting data');
    expect(screen.getAllByRole('button', { name: /^Investigate with AlertZero/ })).toHaveLength(6);
    expect(screen.queryByTestId('alertZeroPocNextSetupStart')).not.toBeInTheDocument();
    expect(savedRuleIds()).toEqual([]);
    expect(readAdhocAlertIds(window.localStorage, BASE_PATH)).toEqual([]);
    expect(hasLeavePrompt()).toBe(false);
  });

  it('opens setup from there with no rules, nothing saved and none of the old fields', async () => {
    renderPage('/poc');
    await goToSetup();

    expect(pageTitle()).toHaveTextContent('Choose which rules send alerts to AlertZero');
    expect(screen.getByTestId('pageSubtitle')).toHaveTextContent('It asks before getting data');
    expect(screen.getByTestId('alertZeroPocNextSetupStart')).toBeDisabled();
    expect(screen.queryByText('Minimum severity')).not.toBeInTheDocument();
    expect(screen.queryByText('Sample detection rules')).not.toBeInTheDocument();
    expect(screen.queryByText('Approved AI model')).not.toBeInTheDocument();
    expect(screen.queryByText(/Organization context/)).not.toBeInTheDocument();
    expect(screen.queryByText('Configuration preview')).not.toBeInTheDocument();
    expect(screen.queryByText('Compare with current design')).not.toBeInTheDocument();
    expect(savedRuleIds()).toEqual([]);
    expect(hasLeavePrompt()).toBe(false);
  });

  it('saves only on Start, then shows investigations and marks the rules as reviewed', async () => {
    renderPage('/poc');
    await goToSetup();

    await chooseRule('Suspicious PowerShell activity');

    expect(savedRuleIds()).toEqual([]);
    expect(hasLeavePrompt()).toBe(true);

    await userEvent.click(screen.getByTestId('alertZeroPocNextSetupStart'));

    expect(savedRuleIds()).toEqual(['endpoint']);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your investigations');
    expect(screen.getByText('Suspicious PowerShell on ws-014')).toBeInTheDocument();
    expect(hasLeavePrompt()).toBe(false);
    expect(readReviewedRuleIds(window.localStorage, BASE_PATH)).toHaveLength(
      DEMO_DETECTION_RULES.length
    );
  });

  it('keeps a rule that was switched on elsewhere and has not reached the page yet', async () => {
    renderPage('/poc');
    await goToSetup();

    await chooseRule('Suspicious PowerShell activity');
    // Same-window writes fire no storage event, so the page has not seen this selection.
    saveSelection(['cloud']);
    await userEvent.click(screen.getByTestId('alertZeroPocNextSetupStart'));

    expect(savedRuleIds()).toEqual(['endpoint', 'cloud']);
  });

  it('skips first run when rules are already selected, and returns to it on Reset', async () => {
    saveSelection(['identity']);
    renderPage('/poc');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your investigations');
    expect(screen.getByText('Service sign-in matches an expected job')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Manage investigation'));
    expect(screen.getByTestId('location')).toHaveTextContent('/watches/configuration-preview-next');
    await userEvent.click(screen.getByTestId('configuration-next'));
    expect(screen.getByTestId('location')).toHaveTextContent('/poc|"home"');

    await userEvent.click(screen.getByText('Reset demo'));

    expect(pageTitle()).toHaveTextContent('Try AlertZero on an open alert');
    expect(savedRuleIds()).toEqual([]);
    expect(screen.getByTestId('location')).toHaveTextContent('/poc|null');
    await goToSetup();
    expect(screen.getByTestId('alertZeroPocNextSetupStart')).toBeDisabled();
    expect(screen.getByTestId('alertZeroPocNextNoRules')).toBeInTheDocument();
  });

  it('returns from the current Configuration preview to the investigations', async () => {
    saveSelection(['identity']);
    renderPage('/watches/configuration-preview');

    await userEvent.click(screen.getByTestId('configuration-current'));

    expect(screen.getByTestId('location')).toHaveTextContent('/poc|"home"');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your investigations');
  });

  it('shows no investigations when asked for them before any rule is selected', () => {
    renderPage('/poc', { view: 'home' });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your investigations');
    expect(screen.getByTestId('alertZeroPocNoInvestigations')).toHaveTextContent(
      'No rules included'
    );
    expect(screen.queryByText('Suspicious PowerShell on ws-014')).not.toBeInTheDocument();
    expect(screen.queryByText(/Medium and above/)).not.toBeInTheDocument();
  });

  it('clears unsaved picks on Reset', async () => {
    renderPage('/poc');
    await goToSetup();

    await chooseRule('Suspicious PowerShell activity');
    await userEvent.click(screen.getByText('Reset demo'));
    await goToSetup();

    expect(screen.getByTestId('alertZeroPocNextNoRules')).toBeInTheDocument();
    expect(hasLeavePrompt()).toBe(false);
  });
});

describe('DemoPage open alerts', () => {
  const investigate = (alertId: string) =>
    userEvent.click(screen.getByTestId(`alertZeroPocInvestigateAlert-${alertId}`));
  const viewInvestigation = (alertId: string) =>
    userEvent.click(screen.getByTestId(`alertZeroPocViewAlertInvestigation-${alertId}`));

  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('investigates only the alert picked and selects no rule', async () => {
    renderPage('/poc');

    await investigate('alert-1');

    expect(screen.getByTestId('alertZeroPocOpenAlertStatus-alert-1')).toHaveTextContent(
      'Needs your review'
    );
    expect(screen.getAllByRole('button', { name: /^Investigate with AlertZero/ })).toHaveLength(5);
    expect(readAdhocAlertIds(window.localStorage, BASE_PATH)).toEqual(['alert-1']);
    expect(savedRuleIds()).toEqual([]);
  });

  it('opens the investigation, then lists it as started by the customer with rules still to choose', async () => {
    renderPage('/poc');

    await investigate('alert-1');
    await viewInvestigation('alert-1');
    expect(pageTitle()).toHaveTextContent('Suspicious PowerShell on ws-014');

    await userEvent.click(screen.getByText('All investigations'));
    expect(pageTitle()).toHaveTextContent('Your investigations');
    expect(screen.getByText('1 sample investigation · Started by you')).toBeInTheDocument();
    expect(screen.queryByText(/Selected rules/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroPocNoInvestigations')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroPocAdhocOnly')).toHaveTextContent(
      'AlertZero investigates only the alerts you pick.'
    );

    await userEvent.click(
      within(screen.getByTestId('alertZeroPocAdhocOnly')).getByRole('button', {
        name: 'Choose rules',
      })
    );
    expect(pageTitle()).toHaveTextContent('Choose which rules send alerts to AlertZero');
  });

  it('keeps an alert without a prepared sample in progress, with no result to reveal', async () => {
    renderPage('/poc');

    await investigate('alert-4');
    expect(screen.getByTestId('alertZeroPocOpenAlertStatus-alert-4')).toHaveTextContent(
      'In progress'
    );
    await viewInvestigation('alert-4');

    expect(pageTitle()).toHaveTextContent('Encoded PowerShell Command on ws-022');
    expect(screen.getByText(/This preview has no prepared result for it\./)).toBeInTheDocument();
    expect(screen.queryByText('Show sample analysis results')).not.toBeInTheDocument();
  });

  it('returns to the started investigations on the next visit, and clears them on Reset', async () => {
    window.localStorage.setItem(getAdhocAlertsStorageKey(BASE_PATH), '["alert-2"]');
    renderPage('/poc');

    expect(pageTitle()).toHaveTextContent('Your investigations');
    expect(screen.getByText('Unusual cloud access by deploy-service')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Reset demo'));

    expect(pageTitle()).toHaveTextContent('Try AlertZero on an open alert');
    expect(screen.getAllByRole('button', { name: /^Investigate with AlertZero/ })).toHaveLength(6);
    expect(readAdhocAlertIds(window.localStorage, BASE_PATH)).toEqual([]);
  });

  it('lists an investigation once when its rule is also selected', async () => {
    saveSelection(['endpoint', 'cloud']);
    window.localStorage.setItem(getAdhocAlertsStorageKey(BASE_PATH), '["alert-1"]');
    renderPage('/poc');

    expect(screen.getAllByText('Suspicious PowerShell on ws-014')).toHaveLength(1);
    expect(screen.getByText('Unusual cloud access by deploy-service')).toBeInTheDocument();
    expect(screen.getAllByText('Started by you')).toHaveLength(1);
    expect(screen.queryByTestId('alertZeroPocAdhocOnly')).not.toBeInTheDocument();
  });

  it('stays reachable after setup, without offering rule selection again, and leads back', async () => {
    saveSelection(['identity']);
    renderPage('/poc');

    await userEvent.click(screen.getByTestId('alertZeroPocInvestigateOpenAlert'));

    expect(pageTitle()).toHaveTextContent('Try AlertZero on an open alert');
    expect(screen.queryByTestId('alertZeroPocOpenAlertsChooseRules')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('alertZeroPocBackToInvestigations'));
    expect(pageTitle()).toHaveTextContent('Your investigations');
  });

  it('offers no way to investigations on first run, when there are none', () => {
    renderPage('/poc');

    expect(screen.queryByTestId('alertZeroPocBackToInvestigations')).not.toBeInTheDocument();
  });

  it('names no single source when picked and rule-driven investigations are listed together', () => {
    saveSelection(['cloud']);
    window.localStorage.setItem(getAdhocAlertsStorageKey(BASE_PATH), '["alert-4"]');
    renderPage('/poc');

    expect(screen.getByText('2 sample investigations')).toBeInTheDocument();
    expect(screen.queryByText(/Selected rules/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Started by you')).toHaveLength(1);
  });

  it('returns from Configuration to open alerts while there is nothing to investigate', async () => {
    renderPage('/watches/configuration-preview-next');

    await userEvent.click(screen.getByTestId('configuration-next'));

    expect(screen.getByTestId('location')).toHaveTextContent('/poc|"try"');
    expect(pageTitle()).toHaveTextContent('Try AlertZero on an open alert');
  });

  it('asks before going back to open alerts with unsaved setup choices', async () => {
    renderPage('/poc');
    await goToSetup();
    await chooseRule('Suspicious PowerShell activity');

    mockKibanaServices.overlays.openConfirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByTestId('alertZeroPocBackToOpenAlerts'));
    expect(pageTitle()).toHaveTextContent('Choose which rules send alerts to AlertZero');

    mockKibanaServices.overlays.openConfirm.mockResolvedValueOnce(true);
    await userEvent.click(screen.getByTestId('alertZeroPocBackToOpenAlerts'));
    expect(await screen.findByText('Latest open alerts')).toBeInTheDocument();
    expect(savedRuleIds()).toEqual([]);
  });

  it('goes back to open alerts without asking when nothing was chosen', async () => {
    renderPage('/poc');
    await goToSetup();

    await userEvent.click(screen.getByTestId('alertZeroPocBackToOpenAlerts'));

    expect(await screen.findByText('Latest open alerts')).toBeInTheDocument();
    expect(mockKibanaServices.overlays.openConfirm).not.toHaveBeenCalled();
  });
});
