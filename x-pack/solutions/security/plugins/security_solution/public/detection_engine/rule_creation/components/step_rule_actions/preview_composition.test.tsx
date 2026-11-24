/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { FormHook } from '../../../../shared_imports';
import type { ActionsStepRule } from '../../../common/types';
import { StepRuleActions } from '.';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { application: { capabilities: { actions: { show: true } } } },
  }),
}));
jest.mock('../../../../shared_imports', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  UseField: ({ path }: { path: string }) =>
    path === 'actions' ? <button type="button">{'Existing notification'}</button> : null,
}));
jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => ({
  UseArray: () => <button type="button">{'Existing response'}</button>,
}));
jest.mock('../../../../common/components/rule_actions_field', () => ({
  RuleActionsField: () => null,
}));
jest.mock('../../../rule_response_actions/response_actions_form', () => ({
  ResponseActionsForm: () => null,
}));
jest.mock('../step_content_wrapper', () => ({
  StepContentWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../../../rule_management/api/hooks/use_fetch_connectors_query', () => ({
  useFetchConnectorsQuery: jest.fn(),
}));
jest.mock('../../../rule_management/api/hooks/use_fetch_connector_types_query', () => ({
  useFetchConnectorTypesQuery: jest.fn(),
}));
jest.mock('./rule_snooze_section', () => ({ RuleSnoozeSection: () => null }));
jest.mock('./notification_action', () => ({ NotificationAction: () => null }));
jest.mock('./response_action', () => ({ ResponseAction: () => null }));

describe('StepRuleActions preview composition', () => {
  const renderActions = (actionsDisabled: boolean) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <StepRuleActions
            actionMessageParams={{ context: [], state: [], params: [] }}
            summaryActionMessageParams={{ context: [], state: [], params: [] }}
            form={{} as FormHook<ActionsStepRule>}
            isLoading={false}
            ruleInterval="5m"
            beforeActions={<button type="button">{'Investigate with AlertZero'}</button>}
            actionsDisabled={actionsDisabled}
          />
        </EuiProvider>
      </I18nProvider>
    );

  it('keeps the preview control interactive while disabling stock mutation controls', () => {
    renderActions(true);
    expect(screen.getByRole('button', { name: 'Investigate with AlertZero' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Existing notification' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Existing response' })).toBeDisabled();
  });

  it('preserves normal notification and response editing outside preview mode', () => {
    renderActions(false);
    expect(screen.getByRole('button', { name: 'Existing notification' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Existing response' })).toBeEnabled();
  });
});
