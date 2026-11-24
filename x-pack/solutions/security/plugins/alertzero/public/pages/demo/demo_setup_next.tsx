/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type {
  DemoAlertInvestigationConfig,
  DemoAlertInvestigationRule,
} from './demo_alert_investigation';
import {
  DemoConfigurationNext,
  getDemoAlertVolumeText,
  getDemoSelectionSummary,
} from './demo_configuration_next';
import type { DemoModelAssignments } from './demo_model_picker';

const copy = {
  start: i18n.translate('xpack.alertzero.poc.next.setup.start', {
    defaultMessage: 'Start investigating',
  }),
  chooseFirst: i18n.translate('xpack.alertzero.poc.next.setup.chooseFirst', {
    defaultMessage: 'Choose at least one rule to start.',
  }),
  noEnabledRules: i18n.translate('xpack.alertzero.poc.next.setup.noEnabledRules', {
    defaultMessage:
      'The rules you selected are disabled, so no alerts would reach AlertZero. Choose an enabled rule to start.',
  }),
  changeLater: i18n.translate('xpack.alertzero.poc.next.setup.changeLater', {
    defaultMessage: 'You can change rules and models at any time in Configuration.',
  }),
};

/** Applies rule selections saved elsewhere since `previous` to the customer's unsaved picks. */
export const mergeDemoRuleIds = (
  draft: readonly string[],
  previous: readonly string[],
  latest: readonly string[]
): string[] => {
  const removed = new Set(previous.filter((id) => !latest.includes(id)));
  const added = latest.filter((id) => !previous.includes(id) && !draft.includes(id));
  return [...draft.filter((id) => !removed.has(id)), ...added];
};

/** First-run setup is only for a customer who has not selected a rule yet, from here or from a rule. */
export const hasSelectedDemoRules = (
  scope: DemoAlertInvestigationConfig | undefined,
  rules: readonly DemoAlertInvestigationRule[]
): boolean => scope !== undefined && getDemoSelectionSummary(scope, rules).selectedRules.length > 0;

export interface DemoSetupNextProps {
  /** The saved selection. It can change while this page is open, for example from a detection rule. */
  scope: DemoAlertInvestigationConfig;
  rules: readonly DemoAlertInvestigationRule[];
  models: DemoModelAssignments;
  basePath: string;
  getRuleHref: (ruleId: string) => string;
  onNavigate: (href: string) => void;
  onStart: (scope: DemoAlertInvestigationConfig, models: DemoModelAssignments) => void;
  /** Reports whether the customer has picks or model changes that Start has not saved yet. */
  onUnsavedChange?: (hasUnsavedChanges: boolean) => void;
}

/** The redesigned first-run setup: choose rules, keep or change the recommended models, then start. */
export const DemoSetupNext: React.FC<DemoSetupNextProps> = ({
  scope,
  rules,
  models,
  basePath,
  getRuleHref,
  onNavigate,
  onStart,
  onUnsavedChange,
}) => {
  const savedScope = useMemo(() => getDemoSelectionSummary(scope, rules).scope, [rules, scope]);
  const [draftScope, setDraftScope] = useState(savedScope);
  const [draftModels, setDraftModels] = useState(models);
  const previousSavedRuleIds = useRef(savedScope.ruleIds);
  const hasModelEdits = useRef(false);

  // A rule switched on or off elsewhere is the customer's own choice, so it joins the unsaved picks here.
  useEffect(() => {
    const previous = previousSavedRuleIds.current;
    previousSavedRuleIds.current = savedScope.ruleIds;
    setDraftScope((current) => ({
      ...savedScope,
      ruleIds: mergeDemoRuleIds(current.ruleIds, previous, savedScope.ruleIds),
    }));
  }, [savedScope]);
  useEffect(() => {
    if (!hasModelEdits.current) setDraftModels(models);
  }, [models]);

  const hasUnsavedChanges =
    // The picker returns rules in catalog order, so only membership counts as a change.
    JSON.stringify([...draftScope.ruleIds].sort()) !==
      JSON.stringify([...savedScope.ruleIds].sort()) ||
    JSON.stringify(draftModels) !== JSON.stringify(models);
  useEffect(() => {
    onUnsavedChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChange]);
  useEffect(() => () => onUnsavedChange?.(false), [onUnsavedChange]);

  const summary = getDemoSelectionSummary(draftScope, rules);
  const canStart = summary.activeRules.length > 0;
  const startSummary =
    summary.selectedRules.length === 0
      ? copy.chooseFirst
      : !canStart
      ? copy.noEnabledRules
      : i18n.translate('xpack.alertzero.poc.next.setup.summary', {
          defaultMessage:
            'AlertZero will investigate alerts from {count, plural, one {# rule} other {# rules}}.',
          values: { count: summary.activeRules.length },
        });

  return (
    <>
      <DemoConfigurationNext
        mode="setup"
        scope={draftScope}
        rules={rules}
        models={draftModels}
        basePath={basePath}
        getRuleHref={getRuleHref}
        onNavigate={onNavigate}
        onChangeScope={setDraftScope}
        onChangeModels={(next) => {
          hasModelEdits.current = true;
          setDraftModels(next);
        }}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isDisabled={!canStart}
            onClick={() => onStart({ ...summary.scope, enabled: true }, draftModels)}
            data-test-subj="alertZeroPocNextSetupStart"
          >
            {copy.start}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <p data-test-subj="alertZeroPocNextSetupSummary">{startSummary}</p>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {canStart ? (
              <p data-test-subj="alertZeroPocNextSetupVolume">{getDemoAlertVolumeText(summary)}</p>
            ) : null}
            <p>{copy.changeLater}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
