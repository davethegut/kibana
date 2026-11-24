/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertZeroPreviewPanel } from './alertzero_preview_panel';

describe('AlertZeroPreviewPanel', () => {
  const defaultProps = {
    rule: {
      id: 'native-rule',
      label: 'Encoded PowerShell Execution',
      enabled: true,
      alertsLast24h: 0,
    },
    scope: { enabled: true, mode: 'selected' as const, ruleIds: [] },
    included: false,
    saved: false,
    storageError: false,
    scopeChanged: false,
    configurationUrl: '/app/alertzero/watches/configuration-preview-next',
    onChange: jest.fn(),
  };

  const renderPanel = (
    overrides: Partial<React.ComponentProps<typeof AlertZeroPreviewPanel>> = {}
  ) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <AlertZeroPreviewPanel {...defaultProps} {...overrides} />
        </EuiProvider>
      </I18nProvider>
    );

  beforeEach(() => jest.clearAllMocks());

  it('opens the rule-specific setting without duplicating model or autonomy controls', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    expect(screen.getByText('Encoded PowerShell Execution')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('Uses the models configured in AlertZero.')).toBeInTheDocument();
    expect(screen.queryByText('Autonomy')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('keeps rule opt-in available without an all-enabled scope lock', () => {
    renderPanel({ scope: { ...defaultProps.scope, mode: 'all_enabled' }, included: false });
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    const inclusionSwitch = screen.getByRole('switch');
    expect(inclusionSwitch).toBeEnabled();
    expect(inclusionSwitch).not.toBeChecked();
    fireEvent.click(inclusionSwitch);
    expect(defaultProps.onChange).toHaveBeenCalledWith(true);
    expect(
      screen.queryByText(/AlertZero includes all enabled rules automatically/)
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage AlertZero configuration' })).toHaveAttribute(
      'href',
      defaultProps.configurationUrl
    );
  });

  it('prevents newly including a disabled rule', () => {
    renderPanel({ rule: { ...defaultProps.rule, enabled: false } });
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText('Rule disabled')).toBeInTheDocument();
  });

  it('offers the linked Configuration view only after saving', () => {
    renderPanel({ saved: true });
    expect(screen.getByRole('link', { name: 'View AlertZero configuration' })).toHaveAttribute(
      'href',
      defaultProps.configurationUrl
    );
  });

  describe('configured state', () => {
    const configuredScope = { ...defaultProps.scope, ruleIds: ['native-rule'] };

    it('reads as set up, not configured, until the rule is in the saved selection', () => {
      // The unsaved switch alone does not change what the rule says about itself.
      renderPanel({ included: true });
      expect(
        screen.getByRole('heading', { name: 'Investigate with AlertZero' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Set up' })).toBeInTheDocument();
      expect(screen.queryByTestId('alertZeroRulePreviewStatus')).not.toBeInTheDocument();
    });

    it('shows that the rule is investigated without opening any settings', () => {
      renderPanel({ scope: configuredScope, included: true });
      expect(screen.getByRole('heading', { name: 'AlertZero' })).toBeInTheDocument();
      expect(screen.getByTestId('alertZeroRulePreviewStatus')).toHaveTextContent(
        'Investigating new alerts'
      );
      expect(screen.getByTestId('alertZeroRulePreviewConfiguredDescription')).toHaveTextContent(
        'New alerts from this rule start AlertZero investigations.'
      );
      expect(screen.getByRole('link', { name: 'Manage AlertZero configuration' })).toHaveAttribute(
        'href',
        defaultProps.configurationUrl
      );
      expect(screen.queryByRole('button', { name: 'Set up' })).not.toBeInTheDocument();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });

    it('keeps the switch one step away so the rule can be turned off', () => {
      renderPanel({ scope: configuredScope, included: true });
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      const inclusionSwitch = screen.getByRole('switch');
      expect(inclusionSwitch).toBeChecked();
      fireEvent.click(inclusionSwitch);
      expect(defaultProps.onChange).toHaveBeenCalledWith(false);
      // One link to Configuration, in the header.
      expect(screen.getAllByRole('link', { name: /AlertZero configuration/ })).toHaveLength(1);
    });

    it('says when AlertZero is paused', () => {
      renderPanel({ scope: { ...configuredScope, enabled: false }, included: true });
      expect(screen.getByTestId('alertZeroRulePreviewStatus')).toHaveTextContent(
        'Paused in AlertZero'
      );
      expect(screen.getByTestId('alertZeroRulePreviewConfiguredDescription')).toHaveTextContent(
        'New alerts from this rule are not investigated until it resumes.'
      );
    });

    it('says when a configured rule is disabled and still lets it be removed', () => {
      renderPanel({
        rule: { ...defaultProps.rule, enabled: false },
        scope: configuredScope,
        included: true,
      });
      expect(screen.getByTestId('alertZeroRulePreviewStatus')).toHaveTextContent('Rule disabled');
      expect(screen.getAllByText('Rule disabled')).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      expect(screen.getByRole('switch')).toBeEnabled();
      expect(screen.getAllByText('Rule disabled')).toHaveLength(1);
    });

    it('lets a configured disabled rule be switched back on before saving', () => {
      renderPanel({
        rule: { ...defaultProps.rule, enabled: false },
        scope: configuredScope,
        included: false,
      });
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      expect(screen.getByRole('switch')).toBeEnabled();
    });

    it('confirms the save once and leaves a single link to Configuration', () => {
      renderPanel({ scope: configuredScope, included: true, saved: true });
      expect(screen.getByText('AlertZero setup saved')).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /AlertZero configuration/ })).toHaveLength(1);
    });
  });
});
