/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FeatureSettingsLink } from '../watches/components/feature_settings_link';
import type {
  DemoAlertInvestigationConfig,
  DemoAlertInvestigationRule,
} from './demo_alert_investigation';
import { DemoModelPicker, getDemoPrimaryModelName } from './demo_model_picker';
import type { DemoModelAssignments } from './demo_model_picker';
import { DemoRulesManager } from './demo_rules_manager';
import type { DemoRulesManagerFilter } from './demo_rules_manager';
import {
  DEMO_RECENTLY_ADDED_RULES,
  getRulesToReview,
  readReviewedRuleIds,
  writeReviewedRuleIds,
} from './demo_reviewed_rules';

const VISIBLE_SELECTED_RULES = 5;
const RECENTLY_ADDED_RULE_IDS: ReadonlySet<string> = new Set(
  DEMO_RECENTLY_ADDED_RULES.map(({ id }) => id)
);

const copy = {
  intro: i18n.translate('xpack.alertzero.poc.next.intro', {
    defaultMessage: 'Choose which rules send alerts to AlertZero, and the models it uses.',
  }),
  paused: i18n.translate('xpack.alertzero.poc.next.status.paused', {
    defaultMessage: 'AlertZero is paused',
  }),
  noRules: i18n.translate('xpack.alertzero.poc.next.status.noRules', {
    defaultMessage: 'No rules selected yet',
  }),
  noRulesHelp: i18n.translate('xpack.alertzero.poc.next.status.noRulesHelp', {
    defaultMessage: 'AlertZero investigates nothing until you choose rules.',
  }),
  noEnabledRules: i18n.translate('xpack.alertzero.poc.next.status.noEnabledRules', {
    defaultMessage: 'No enabled rules selected',
  }),
  noEnabledRulesHelp: i18n.translate('xpack.alertzero.poc.next.status.noEnabledRulesHelp', {
    defaultMessage:
      'The rules you selected are disabled, so no alerts reach AlertZero. Enable one or choose other rules.',
  }),
  uncounted: i18n.translate('xpack.alertzero.poc.next.status.uncounted', {
    defaultMessage: 'Alerts from rules added in Detection rules are not counted in this preview.',
  }),
  notCounted: i18n.translate('xpack.alertzero.poc.next.rules.notCounted', {
    defaultMessage: 'Not counted in preview',
  }),
  noAlerts: i18n.translate('xpack.alertzero.poc.next.status.noAlerts', {
    defaultMessage:
      'No alerts from these rules in the last 24 hours. Investigations start when the first one arrives.',
  }),
  pause: i18n.translate('xpack.alertzero.poc.next.status.pause', { defaultMessage: 'Pause' }),
  resume: i18n.translate('xpack.alertzero.poc.next.status.resume', { defaultMessage: 'Resume' }),
  viewInvestigations: i18n.translate('xpack.alertzero.poc.next.status.viewInvestigations', {
    defaultMessage: 'View investigations',
  }),
  viewUsage: i18n.translate('xpack.alertzero.poc.next.status.viewUsage', {
    defaultMessage: 'View usage',
  }),
  rulesTitle: i18n.translate('xpack.alertzero.poc.next.rules.title', {
    defaultMessage: "Rules you've selected",
  }),
  rulesDescription: i18n.translate('xpack.alertzero.poc.next.rules.description', {
    defaultMessage: 'Alerts from these rules start investigations.',
  }),
  manage: i18n.translate('xpack.alertzero.poc.next.rules.manage', {
    defaultMessage: 'Manage rules',
  }),
  choose: i18n.translate('xpack.alertzero.poc.next.rules.choose', {
    defaultMessage: 'Choose rules',
  }),
  rulesEmpty: i18n.translate('xpack.alertzero.poc.next.rules.none', {
    defaultMessage: 'No rules selected.',
  }),
  disabled: i18n.translate('xpack.alertzero.poc.next.rules.disabled', {
    defaultMessage: 'Disabled',
  }),
  review: i18n.translate('xpack.alertzero.poc.next.rules.review', { defaultMessage: 'Review' }),
  dismiss: i18n.translate('xpack.alertzero.poc.next.rules.dismiss', { defaultMessage: 'Dismiss' }),
  laterRules: i18n.translate('xpack.alertzero.poc.next.rules.laterRules', {
    defaultMessage: 'Rules added or enabled later are not included until you select them.',
  }),
  evidence: i18n.translate('xpack.alertzero.poc.next.rules.evidence', {
    defaultMessage:
      'During an investigation, AlertZero may read alerts from rules you did not select as evidence. Those alerts never start an investigation.',
  }),
  excludeBuildingBlocks: i18n.translate('xpack.alertzero.poc.next.rules.excludeBuildingBlocks', {
    defaultMessage: 'Exclude building block alerts',
  }),
  modelsTitle: i18n.translate('xpack.alertzero.poc.next.models.title', {
    defaultMessage: 'Models',
  }),
  recommended: i18n.translate('xpack.alertzero.poc.next.models.recommended', {
    defaultMessage: 'Using recommended models',
  }),
  ready: i18n.translate('xpack.alertzero.poc.next.models.ready', { defaultMessage: 'Ready' }),
  readyHelp: i18n.translate('xpack.alertzero.poc.next.models.readyHelp', {
    defaultMessage: 'Sample status. Model connections are not checked in this preview.',
  }),
  change: i18n.translate('xpack.alertzero.poc.next.models.change', { defaultMessage: 'Change' }),
  hide: i18n.translate('xpack.alertzero.poc.next.models.hide', { defaultMessage: 'Hide' }),
  modelConnections: i18n.translate('xpack.alertzero.poc.next.models.connections', {
    defaultMessage: 'Manage model connections in',
  }),
  setupRulesTitle: i18n.translate('xpack.alertzero.poc.next.rules.setupTitle', {
    defaultMessage: 'Rules',
  }),
  setupRulesDescription: i18n.translate('xpack.alertzero.poc.next.rules.setupDescription', {
    defaultMessage:
      'Alerts from the rules you choose start investigations. No rules are selected for you.',
  }),
  setupRulesSelectedDescription: i18n.translate(
    'xpack.alertzero.poc.next.rules.setupSelectedDescription',
    { defaultMessage: 'Alerts from these rules start investigations once you start.' }
  ),
  setupApplyHelp: i18n.translate('xpack.alertzero.poc.next.rules.setupApplyHelp', {
    defaultMessage: 'Apply your selection, then start investigating to use it.',
  }),
  behavior: i18n.translate('xpack.alertzero.poc.next.behavior', {
    defaultMessage:
      'AlertZero investigates each alert and gives a verdict. It asks before getting data from other systems or changing anything.',
  }),
};

const alertsLabel = (count: number): string =>
  i18n.translate('xpack.alertzero.poc.next.rules.alerts', {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}} (24h)',
    values: { count },
  });

/** The sentence that says what AlertZero does with an alert and when it asks first. */
export const DEMO_ALERTZERO_BEHAVIOR: string = copy.behavior;

export interface DemoSelectionSummary {
  /** The scope as an explicit list; legacy all-enabled input becomes the rules enabled now. */
  scope: DemoAlertInvestigationConfig;
  /** Selected rules, enabled first, then by alert volume. */
  selectedRules: DemoAlertInvestigationRule[];
  /** Selected rules that are enabled, so their alerts can reach AlertZero. */
  activeRules: DemoAlertInvestigationRule[];
  /** Sample alerts in the last 24 hours from active rules that carry a sample count. */
  activeAlerts: number;
  /** True when an active rule came from the native Rules table and has no sample count. */
  hasUncountedRules: boolean;
}

/** Summarizes the customer's rule selection for the status line and the setup footer. */
export const getDemoSelectionSummary = (
  scope: DemoAlertInvestigationConfig,
  rules: readonly DemoAlertInvestigationRule[]
): DemoSelectionSummary => {
  const selectedScope: DemoAlertInvestigationConfig =
    scope.mode === 'all_enabled'
      ? {
          ...scope,
          mode: 'selected',
          ruleIds: rules.filter(({ enabled }) => enabled).map(({ id }) => id),
        }
      : scope;
  const selected = new Set(selectedScope.ruleIds);
  const selectedRules = rules
    .filter(({ id }) => selected.has(id))
    .sort(
      (first, second) =>
        Number(second.enabled) - Number(first.enabled) ||
        second.alertsLast24h - first.alertsLast24h ||
        first.label.localeCompare(second.label)
    );
  const activeRules = selectedRules.filter(({ enabled }) => enabled);
  return {
    scope: selectedScope,
    selectedRules,
    activeRules,
    // Rules registered from the native table carry no sample alert volume, so they are never shown as zero.
    activeAlerts: activeRules
      .filter(({ source }) => source !== 'detection_rules')
      .reduce((total, { alertsLast24h }) => total + alertsLast24h, 0),
    hasUncountedRules: activeRules.some(({ source }) => source === 'detection_rules'),
  };
};

/** Describes the last-24-hour sample alert volume of the enabled rules the customer selected. */
export const getDemoAlertVolumeText = ({
  activeAlerts,
  hasUncountedRules,
}: Pick<DemoSelectionSummary, 'activeAlerts' | 'hasUncountedRules'>): string => {
  if (activeAlerts === 0) return hasUncountedRules ? copy.uncounted : copy.noAlerts;
  return [
    i18n.translate('xpack.alertzero.poc.next.status.alerts', {
      defaultMessage:
        '{count, plural, one {# alert} other {# alerts}} from these rules in the last 24 hours.',
      values: { count: activeAlerts },
    }),
    ...(hasUncountedRules ? [copy.uncounted] : []),
  ].join(' ');
};

export interface DemoConfigurationNextProps {
  /** `setup` is the first-run page: rules and models only, with no status, pause or review prompt. */
  mode?: 'manage' | 'setup';
  scope: DemoAlertInvestigationConfig;
  rules: readonly DemoAlertInvestigationRule[];
  models: DemoModelAssignments;
  basePath: string;
  getRuleHref: (ruleId: string) => string;
  onNavigate: (href: string) => void;
  onChangeScope: (next: DemoAlertInvestigationConfig) => void;
  onChangeModels: (next: DemoModelAssignments) => void;
  onViewUsage?: () => void;
  onViewInvestigations?: () => void;
}

/** The redesigned sample configuration: one status, the customer's own rule selection, and model defaults. */
export const DemoConfigurationNext: React.FC<DemoConfigurationNextProps> = ({
  mode = 'manage',
  scope,
  rules,
  models,
  basePath,
  getRuleHref,
  onNavigate,
  onChangeScope,
  onChangeModels,
  onViewUsage,
  onViewInvestigations,
}) => {
  const { euiTheme } = useEuiTheme();
  const [manager, setManager] = useState<DemoRulesManagerFilter | undefined>();
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  // Until the customer reviews once, every rule outside the sample "recently added" set counts as seen.
  const [reviewedRuleIds, setReviewedRuleIds] = useState<readonly string[] | undefined>(() =>
    readReviewedRuleIds(window.localStorage, basePath)
  );
  useEffect(() => {
    setReviewedRuleIds(readReviewedRuleIds(window.localStorage, basePath));
  }, [basePath]);

  const isSetup = mode === 'setup';
  const {
    scope: selectedScope,
    selectedRules,
    activeRules,
    activeAlerts,
    hasUncountedRules,
  } = useMemo(() => getDemoSelectionSummary(scope, rules), [rules, scope]);
  const disabledSelectedCount = selectedRules.length - activeRules.length;
  const rulesToReview = useMemo(
    () =>
      getRulesToReview(
        rules,
        reviewedRuleIds ??
          rules.filter(({ id }) => !RECENTLY_ADDED_RULE_IDS.has(id)).map(({ id }) => id),
        selectedScope.ruleIds
      ),
    [reviewedRuleIds, rules, selectedScope.ruleIds]
  );
  const markReviewed = () => {
    const next = rules.map(({ id }) => id);
    writeReviewedRuleIds(window.localStorage, basePath, next);
    setReviewedRuleIds(next);
  };

  const hasSelection = selectedRules.length > 0;
  const hasActiveRules = activeRules.length > 0;
  const isPaused = !selectedScope.enabled;
  const statusTitle = isPaused
    ? copy.paused
    : !hasSelection
    ? copy.noRules
    : !hasActiveRules
    ? copy.noEnabledRules
    : i18n.translate('xpack.alertzero.poc.next.status.investigating', {
        defaultMessage:
          'AlertZero is investigating alerts from {selected, number} of {total, plural, one {# rule} other {# rules}}',
        values: { selected: activeRules.length, total: rules.length },
      });
  const statusHelp = isPaused
    ? i18n.translate('xpack.alertzero.poc.next.status.pausedHelp', {
        defaultMessage:
          '{count, plural, =0 {No rules are selected.} one {Your # selected rule stays selected.} other {Your # selected rules stay selected.}} New alerts are not investigated while paused.',
        values: { count: selectedRules.length },
      })
    : !hasSelection
    ? copy.noRulesHelp
    : !hasActiveRules
    ? copy.noEnabledRulesHelp
    : getDemoAlertVolumeText({ activeAlerts, hasUncountedRules });
  const statusColor = isPaused ? 'subdued' : hasActiveRules ? 'success' : 'warning';

  const tiers = [models.efficient, models.balanced, models.frontier];
  const customTiers = tiers.filter(({ useRecommended }) => !useRecommended).length;
  const modelSummary =
    customTiers === 0
      ? copy.recommended
      : i18n.translate('xpack.alertzero.poc.next.models.custom', {
          defaultMessage: 'Custom models for {count} of 3 kinds of work',
          values: { count: customTiers },
        });
  const primaryModels = tiers.map(getDemoPrimaryModelName).filter(Boolean).join(' · ');

  const panelHeader = css`
    padding: ${euiTheme.size.base};
    border-bottom: ${euiTheme.border.thin};
  `;
  const panelBody = css`
    padding: ${euiTheme.size.base};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
      {isSetup ? null : (
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p>{copy.intro}</p>
            <p data-test-subj="alertZeroPocNextBehavior">{copy.behavior}</p>
          </EuiText>
        </EuiFlexItem>
      )}

      {isSetup ? null : (
        <EuiFlexItem grow={false}>
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="m"
            data-test-subj="alertZeroPocNextStatus"
          >
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
              <EuiFlexItem>
                <EuiHealth color={statusColor}>
                  <EuiTitle size="xs">
                    <h2 data-test-subj="alertZeroPocNextStatusTitle">{statusTitle}</h2>
                  </EuiTitle>
                </EuiHealth>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  <p data-test-subj="alertZeroPocNextStatusHelp">{statusHelp}</p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="m" responsive={false}>
                  {onViewInvestigations ? (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        flush="left"
                        onClick={onViewInvestigations}
                        data-test-subj="alertZeroPocNextViewInvestigations"
                      >
                        {copy.viewInvestigations}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}
                  {onViewUsage ? (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        flush="left"
                        onClick={onViewUsage}
                        data-test-subj="alertZeroPocNextViewUsage"
                      >
                        {copy.viewUsage}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {!hasSelection && !isPaused ? (
                  <EuiButton
                    fill
                    size="s"
                    onClick={() => setManager('all')}
                    data-test-subj="alertZeroPocNextChooseRules"
                  >
                    {copy.choose}
                  </EuiButton>
                ) : (
                  <EuiButtonEmpty
                    size="s"
                    iconType={isPaused ? 'play' : 'pause'}
                    onClick={() => onChangeScope({ ...selectedScope, enabled: isPaused })}
                    data-test-subj="alertZeroPocNextPause"
                  >
                    {isPaused ? copy.resume : copy.pause}
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          data-test-subj="alertZeroPocNextRules"
        >
          <div css={panelHeader}>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>{isSetup ? copy.setupRulesTitle : copy.rulesTitle}</h2>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>
                    {!isSetup
                      ? copy.rulesDescription
                      : hasSelection
                      ? copy.setupRulesSelectedDescription
                      : copy.setupRulesDescription}
                  </p>
                </EuiText>
              </EuiFlexItem>
              {hasSelection || (!isSetup && isPaused) ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="listBullet"
                    size="s"
                    onClick={() => setManager('all')}
                    data-test-subj="alertZeroPocNextManageRules"
                  >
                    {hasSelection ? copy.manage : copy.choose}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </div>
          <div css={panelBody}>
            {hasSelection ? (
              <>
                {selectedRules.slice(0, VISIBLE_SELECTED_RULES).map((rule) => (
                  <EuiFlexGroup
                    key={rule.id}
                    alignItems="center"
                    justifyContent="spaceBetween"
                    gutterSize="m"
                    responsive={false}
                    css={css`
                      padding-block: ${euiTheme.size.xs};
                    `}
                    data-test-subj={`alertZeroPocNextSelectedRule-${rule.id}`}
                  >
                    <EuiFlexItem>
                      <EuiText size="s">
                        {rule.source === 'detection_rules' ? (
                          <EuiLink
                            href={getRuleHref(rule.id)}
                            onClick={(event: React.MouseEvent) => {
                              event.preventDefault();
                              onNavigate(getRuleHref(rule.id));
                            }}
                          >
                            {rule.label}
                          </EuiLink>
                        ) : (
                          rule.label
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {rule.enabled ? (
                        <EuiText size="xs" color="subdued">
                          {rule.source === 'detection_rules'
                            ? copy.notCounted
                            : alertsLabel(rule.alertsLast24h)}
                        </EuiText>
                      ) : (
                        <EuiBadge color="default">{copy.disabled}</EuiBadge>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
                {selectedRules.length > VISIBLE_SELECTED_RULES ? (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiButtonEmpty
                      size="xs"
                      flush="left"
                      onClick={() => setManager('selected')}
                      data-test-subj="alertZeroPocNextMoreRules"
                    >
                      {i18n.translate('xpack.alertzero.poc.next.rules.more', {
                        defaultMessage: 'and {count, number} more',
                        values: { count: selectedRules.length - VISIBLE_SELECTED_RULES },
                      })}
                    </EuiButtonEmpty>
                  </>
                ) : null}
                {disabledSelectedCount > 0 ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="subdued">
                      <p data-test-subj="alertZeroPocNextDisabledSelected">
                        {i18n.translate('xpack.alertzero.poc.next.rules.disabledSelected', {
                          defaultMessage:
                            '{count, plural, one {# selected rule is disabled and produces} other {# selected rules are disabled and produce}} no alerts until re-enabled.',
                          values: { count: disabledSelectedCount },
                        })}
                      </p>
                    </EuiText>
                  </>
                ) : null}
              </>
            ) : (
              <div data-test-subj="alertZeroPocNextNoRules">
                {isSetup ? (
                  <EuiButton
                    fill
                    onClick={() => setManager('all')}
                    data-test-subj="alertZeroPocNextChooseRules"
                  >
                    {copy.choose}
                  </EuiButton>
                ) : (
                  <EuiText size="s" color="subdued">
                    <p>{copy.rulesEmpty}</p>
                  </EuiText>
                )}
              </div>
            )}

            {!isSetup && rulesToReview.length > 0 ? (
              <>
                <EuiHorizontalRule margin="m" />
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  gutterSize="s"
                  responsive={false}
                  data-test-subj="alertZeroPocNextRulesToReview"
                >
                  <EuiFlexItem>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="bell" color="primary" aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          {i18n.translate('xpack.alertzero.poc.next.rules.toReview', {
                            defaultMessage:
                              '{count, plural, one {# new rule} other {# new rules}} since you last reviewed',
                            values: { count: rulesToReview.length },
                          })}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          onClick={() => setManager('new')}
                          data-test-subj="alertZeroPocNextReviewRules"
                        >
                          {copy.review}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          color="text"
                          onClick={markReviewed}
                          data-test-subj="alertZeroPocNextDismissReview"
                        >
                          {copy.dismiss}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ) : null}

            <EuiHorizontalRule margin="m" />
            {isSetup ? null : (
              <>
                <EuiSwitch
                  compressed
                  label={copy.excludeBuildingBlocks}
                  checked={selectedScope.excludeBuildingBlocks ?? false}
                  onChange={({ target }) =>
                    onChangeScope({ ...selectedScope, excludeBuildingBlocks: target.checked })
                  }
                  data-test-subj="alertZeroPocNextExcludeBuildingBlocks"
                />
                <EuiSpacer size="m" />
              </>
            )}
            <EuiText size="xs" color="subdued">
              <p>{copy.laterRules}</p>
              <p>{copy.evidence}</p>
            </EuiText>
          </div>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          data-test-subj="alertZeroPocNextModels"
        >
          <div css={isModelPickerOpen ? panelHeader : panelBody}>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>{copy.modelsTitle}</h2>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" data-test-subj="alertZeroPocNextModelSummary">
                      {modelSummary}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success" title={copy.readyHelp}>
                      {copy.ready}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  <p>{primaryModels}</p>
                  <p>{copy.readyHelp}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  aria-expanded={isModelPickerOpen}
                  onClick={() => setIsModelPickerOpen((open) => !open)}
                  data-test-subj="alertZeroPocNextChangeModels"
                >
                  {isModelPickerOpen ? copy.hide : copy.change}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
          {isModelPickerOpen ? (
            <div css={panelBody}>
              <DemoModelPicker value={models} onChange={onChangeModels} />
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                <p>
                  {copy.modelConnections}{' '}
                  <FeatureSettingsLink data-test-subj="alertZeroPocNextFeatureSettings" />
                </p>
              </EuiText>
            </div>
          ) : null}
        </EuiPanel>
      </EuiFlexItem>

      {manager ? (
        <DemoRulesManager
          rules={rules}
          selectedRuleIds={selectedScope.ruleIds}
          newRuleIds={isSetup ? [] : rulesToReview.map(({ id }) => id)}
          initialFilter={manager}
          applyHelp={isSetup ? copy.setupApplyHelp : undefined}
          onClose={() => setManager(undefined)}
          onApply={(ruleIds) => {
            onChangeScope({ ...selectedScope, mode: 'selected', ruleIds });
            if (manager === 'new') {
              markReviewed();
            } else if (reviewedRuleIds && !isSetup) {
              // A rule the customer has selected or deselected has been seen, so it is never reported as new.
              const seen = [...new Set([...reviewedRuleIds, ...selectedScope.ruleIds, ...ruleIds])];
              writeReviewedRuleIds(window.localStorage, basePath, seen);
              setReviewedRuleIds(seen);
            }
            setManager(undefined);
          }}
        />
      ) : null}
    </EuiFlexGroup>
  );
};
