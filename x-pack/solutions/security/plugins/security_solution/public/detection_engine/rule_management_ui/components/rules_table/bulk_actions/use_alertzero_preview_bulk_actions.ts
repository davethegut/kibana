/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  createAlertZeroPreviewState,
  readAlertZeroPreviewState,
  updateAlertZeroPreviewRule,
  writeAlertZeroPreviewState,
} from '@kbn/alertzero-common';
import type { AlertZeroPreviewState } from '@kbn/alertzero-common';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useRulesTableContext } from '../rules_table/rules_table_context';

const ALERTZERO_CONFIGURATION_PATH = '/app/alertzero/watches/configuration-preview-next';

const copy = {
  investigate: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.alertZeroPreview.investigate',
    { defaultMessage: 'Investigate with AlertZero' }
  ),
  stop: i18n.translate('xpack.securitySolution.detectionEngine.rules.alertZeroPreview.stop', {
    defaultMessage: 'Stop investigating with AlertZero',
  }),
  pageOnly: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.alertZeroPreview.pageOnly',
    { defaultMessage: 'In this preview, select rules on the page instead of all matching rules.' }
  ),
  storageFailed: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.alertZeroPreview.storageFailed',
    { defaultMessage: 'The AlertZero preview selection could not be saved in this browser.' }
  ),
  viewConfiguration: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.alertZeroPreview.viewConfiguration',
    { defaultMessage: 'View AlertZero configuration' }
  ),
  previewOnly: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.alertZeroPreview.previewOnly',
    { defaultMessage: 'Local preview. No detection rules were changed.' }
  ),
};

export interface AlertZeroPreviewBulkRule {
  id: string;
  name: string;
  enabled: boolean;
}

export interface AlertZeroPreviewBulkResult {
  state: AlertZeroPreviewState;
  changed: number;
  skippedDisabled: number;
}

/** Adds or removes only the rules the customer selected, skipping disabled rules that were never selected. */
export const applyAlertZeroPreviewSelection = (
  previous: AlertZeroPreviewState,
  rules: readonly AlertZeroPreviewBulkRule[],
  included: boolean
): AlertZeroPreviewBulkResult =>
  rules.reduce<AlertZeroPreviewBulkResult>(
    (result, { id, name, enabled }) => {
      const isIncluded = result.state.scope.ruleIds.includes(id);
      if (included && !enabled && !isIncluded) {
        return { ...result, skippedDisabled: result.skippedDisabled + 1 };
      }
      if (included === isIncluded) return result;
      return {
        ...result,
        changed: result.changed + 1,
        state: updateAlertZeroPreviewRule(
          result.state,
          { id, label: name, enabled, alertsLast24h: 0, category: 'Detection Rules' },
          included
        ),
      };
    },
    { state: previous, changed: 0, skippedDisabled: 0 }
  );

type GetBulkItemsPopoverContent = (closePopover: () => void) => EuiContextMenuPanelDescriptor[];

/** Adds development-only AlertZero preview actions that write local browser state and never call rule APIs. */
export const useAlertZeroPreviewBulkActions = (
  getNativeBulkItems: GetBulkItemsPopoverContent
): GetBulkItemsPopoverContent => {
  const location = useLocation();
  const isAlertZeroPreview =
    process.env.NODE_ENV === 'development' &&
    new URLSearchParams(location.search).get('alertZeroPreview') === 'true';
  const {
    services: { http, application },
  } = useKibana();
  const toasts = useAppToasts();
  const {
    state: { isAllSelected, rules, selectedRuleIds },
    actions: { clearRulesSelection },
  } = useRulesTableContext();

  const getPreviewBulkItems = useCallback<GetBulkItemsPopoverContent>(
    (closePopover) => {
      const selectedRules = rules.filter(({ id }) => selectedRuleIds.includes(id));
      const basePath = http.basePath.get();

      const updateSelection = (included: boolean) => () => {
        closePopover();
        try {
          const { state, changed, skippedDisabled } = applyAlertZeroPreviewSelection(
            readAlertZeroPreviewState(window.localStorage, basePath) ??
              createAlertZeroPreviewState(),
            selectedRules,
            included
          );
          writeAlertZeroPreviewState(window.localStorage, basePath, state);
          clearRulesSelection();
          const addToast = changed > 0 ? toasts.addSuccess : toasts.addInfo;
          addToast({
            title: included
              ? i18n.translate(
                  'xpack.securitySolution.detectionEngine.rules.alertZeroPreview.added',
                  {
                    defaultMessage:
                      '{changed, plural, =0 {No new rules were added to AlertZero} one {# rule now sends alerts to AlertZero} other {# rules now send alerts to AlertZero}}',
                    values: { changed },
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.detectionEngine.rules.alertZeroPreview.removed',
                  {
                    defaultMessage:
                      '{changed, plural, =0 {No rules were removed from AlertZero} one {# rule no longer sends alerts to AlertZero} other {# rules no longer send alerts to AlertZero}}',
                    values: { changed },
                  }
                ),
            text: [
              ...(skippedDisabled > 0
                ? [
                    i18n.translate(
                      'xpack.securitySolution.detectionEngine.rules.alertZeroPreview.skipped',
                      {
                        defaultMessage:
                          '{skippedDisabled, plural, one {# disabled rule was} other {# disabled rules were}} skipped. Enable a rule before selecting it.',
                        values: { skippedDisabled },
                      }
                    ),
                  ]
                : []),
              copy.previewOnly,
            ].join(' '),
            actionProps: {
              primary: {
                children: copy.viewConfiguration,
                onClick: () =>
                  application.navigateToUrl(http.basePath.prepend(ALERTZERO_CONFIGURATION_PATH)),
              },
            },
          });
        } catch {
          toasts.addError(new Error(copy.storageFailed), { title: copy.storageFailed });
        }
      };

      const isDisabled = isAllSelected || selectedRules.length === 0;
      return getNativeBulkItems(closePopover).map((panel) =>
        panel.id === 0
          ? {
              ...panel,
              items: [
                {
                  key: copy.investigate,
                  name: copy.investigate,
                  'data-test-subj': 'alertZeroPreviewInvestigateBulk',
                  disabled: isDisabled,
                  toolTipContent: isAllSelected ? copy.pageOnly : undefined,
                  toolTipProps: { position: 'right' as const },
                  onClick: updateSelection(true),
                  icon: undefined,
                },
                {
                  key: copy.stop,
                  name: copy.stop,
                  'data-test-subj': 'alertZeroPreviewStopBulk',
                  disabled: isDisabled,
                  toolTipContent: isAllSelected ? copy.pageOnly : undefined,
                  toolTipProps: { position: 'right' as const },
                  onClick: updateSelection(false),
                  icon: undefined,
                },
                { isSeparator: true as const, key: 'alertZeroPreviewSeparator' },
                ...(panel.items ?? []),
              ],
            }
          : panel
      );
    },
    [
      application,
      clearRulesSelection,
      getNativeBulkItems,
      http,
      isAllSelected,
      rules,
      selectedRuleIds,
      toasts,
    ]
  );

  return isAlertZeroPreview ? getPreviewBulkItems : getNativeBulkItems;
};
