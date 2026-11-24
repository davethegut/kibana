/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertZeroIcon } from '@kbn/security-solution-navigation';
import { KbnSuccessCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { AlertZeroPreviewRule, AlertZeroPreviewState } from '@kbn/alertzero-common';

interface AlertZeroPreviewPanelProps {
  rule: AlertZeroPreviewRule;
  scope: AlertZeroPreviewState['scope'];
  included: boolean;
  saved: boolean;
  storageError: boolean;
  scopeChanged: boolean;
  configurationUrl: string;
  onChange: (included: boolean) => void;
}

export const AlertZeroPreviewPanel: React.FC<AlertZeroPreviewPanelProps> = ({
  rule,
  scope,
  included,
  saved,
  storageError,
  scopeChanged,
  configurationUrl,
  onChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  // The saved selection, not the unsaved switch, decides whether the rule reads as configured.
  const isConfigured = scope.ruleIds.includes(rule.id);
  const configurationLink = (
    <EuiLink href={configurationUrl} data-test-subj="alertZeroRulePreviewManageConfiguration">
      <FormattedMessage
        id="xpack.securitySolution.ruleEdit.alertZeroPreview.manageConfiguration"
        defaultMessage="Manage AlertZero configuration"
      />
    </EuiLink>
  );

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel
        color={isConfigured ? 'plain' : 'primary'}
        hasBorder
        hasShadow={false}
        data-test-subj="alertZeroRulePreview"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon type={AlertZeroIcon} size="xl" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h4>
                    {isConfigured ? (
                      <FormattedMessage
                        id="xpack.securitySolution.ruleEdit.alertZeroPreview.configuredTitle"
                        defaultMessage="AlertZero"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.securitySolution.ruleEdit.alertZeroPreview.title"
                        defaultMessage="Investigate with AlertZero"
                      />
                    )}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              {isConfigured && (
                <EuiFlexItem grow={false}>
                  {!rule.enabled ? (
                    <EuiBadge color="hollow" data-test-subj="alertZeroRulePreviewStatus">
                      <FormattedMessage
                        id="xpack.securitySolution.ruleEdit.alertZeroPreview.ruleDisabled"
                        defaultMessage="Rule disabled"
                      />
                    </EuiBadge>
                  ) : scope.enabled ? (
                    <EuiBadge color="success" data-test-subj="alertZeroRulePreviewStatus">
                      <FormattedMessage
                        id="xpack.securitySolution.ruleEdit.alertZeroPreview.statusInvestigating"
                        defaultMessage="Investigating new alerts"
                      />
                    </EuiBadge>
                  ) : (
                    <EuiBadge color="default" data-test-subj="alertZeroRulePreviewStatus">
                      <FormattedMessage
                        id="xpack.securitySolution.ruleEdit.alertZeroPreview.statusPaused"
                        defaultMessage="Paused in AlertZero"
                      />
                    </EuiBadge>
                  )}
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              {isConfigured ? (
                <p data-test-subj="alertZeroRulePreviewConfiguredDescription">
                  {!rule.enabled ? (
                    <FormattedMessage
                      id="xpack.securitySolution.ruleEdit.alertZeroPreview.configuredRuleDisabled"
                      defaultMessage="This rule is disabled, so it produces no alerts to investigate."
                    />
                  ) : scope.enabled ? (
                    <FormattedMessage
                      id="xpack.securitySolution.ruleEdit.alertZeroPreview.configuredDescription"
                      defaultMessage="New alerts from this rule start AlertZero investigations."
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.securitySolution.ruleEdit.alertZeroPreview.configuredPaused"
                      defaultMessage="AlertZero is paused. New alerts from this rule are not investigated until it resumes."
                    />
                  )}{' '}
                  {configurationLink}
                </p>
              ) : (
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.ruleEdit.alertZeroPreview.description"
                    defaultMessage="Follow the evidence behind this rule's alerts and understand what needs your attention."
                  />
                </p>
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill={!expanded && !isConfigured}
              iconType={expanded ? 'chevronSingleUp' : 'chevronSingleRight'}
              iconSide="right"
              aria-expanded={expanded}
              aria-controls="alertzero-rule-preview-settings"
              data-test-subj="alertZeroRulePreviewSetup"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <FormattedMessage
                  id="xpack.securitySolution.ruleEdit.alertZeroPreview.hideSettings"
                  defaultMessage="Hide settings"
                />
              ) : isConfigured ? (
                <FormattedMessage
                  id="xpack.securitySolution.ruleEdit.alertZeroPreview.settings"
                  defaultMessage="Settings"
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.ruleEdit.alertZeroPreview.setUp"
                  defaultMessage="Set up"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        {expanded && (
          <div id="alertzero-rule-preview-settings">
            <EuiHorizontalRule margin="l" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem>
                <EuiText size="s">
                  <p>
                    <strong>{rule.label}</strong>
                  </p>
                </EuiText>
              </EuiFlexItem>
              {!rule.enabled && !isConfigured && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    <FormattedMessage
                      id="xpack.securitySolution.ruleEdit.alertZeroPreview.ruleDisabled"
                      defaultMessage="Rule disabled"
                    />
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiSwitch
              data-test-subj="alertZeroRulePreviewIncluded"
              checked={included}
              // A configured rule can be switched off and back on before saving.
              disabled={!rule.enabled && !included && !isConfigured}
              onChange={(event) => onChange(event.target.checked)}
              label={
                <FormattedMessage
                  id="xpack.securitySolution.ruleEdit.alertZeroPreview.included"
                  defaultMessage="Automatically investigate new alerts from this rule"
                />
              }
            />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.ruleEdit.alertZeroPreview.saveHelp"
                  defaultMessage="Save changes to update this rule’s AlertZero setting."
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.ruleEdit.alertZeroPreview.models"
                  defaultMessage="Uses the models configured in AlertZero."
                />
                {!isConfigured && <> {configurationLink}</>}
              </p>
              {!rule.enabled && !isConfigured && (
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.ruleEdit.alertZeroPreview.disabledHelp"
                    defaultMessage="This rule is disabled and generates no new alerts. Enable it in Detection Rules before adding it to a selected scope."
                  />
                </p>
              )}
              {!scope.enabled && !isConfigured && (
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.ruleEdit.alertZeroPreview.automationOff"
                    defaultMessage="Automatic investigation is off in AlertZero. Linked rules are retained. New alerts are not investigated automatically until it is turned on."
                  />
                </p>
              )}
            </EuiText>
          </div>
        )}
      </EuiPanel>
      {saved && (
        <>
          <EuiSpacer size="m" />
          <KbnSuccessCallout
            data-test-subj="alertZeroRulePreviewSaved"
            title={
              <FormattedMessage
                id="xpack.securitySolution.ruleEdit.alertZeroPreview.saved"
                defaultMessage="AlertZero setup saved"
              />
            }
            // A configured rule already links to Configuration from its header.
            actionProps={
              isConfigured
                ? undefined
                : {
                    primary: {
                      href: configurationUrl,
                      'data-test-subj': 'alertZeroRulePreviewViewConfiguration',
                      children: (
                        <FormattedMessage
                          id="xpack.securitySolution.ruleEdit.alertZeroPreview.viewConfiguration"
                          defaultMessage="View AlertZero configuration"
                        />
                      ),
                    },
                  }
            }
          />
        </>
      )}
      {(storageError || scopeChanged) && (
        <>
          <EuiSpacer size="m" />
          <KbnWarningCallout
            title={
              storageError ? (
                <FormattedMessage
                  id="xpack.securitySolution.ruleEdit.alertZeroPreview.storageError"
                  defaultMessage="Could not save this preview. Allow local browser storage and try again. No rule was changed."
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.ruleEdit.alertZeroPreview.scopeChanged"
                  defaultMessage="The AlertZero scope changed in another view. Review the updated setting before saving again."
                />
              )
            }
          />
        </>
      )}
    </>
  );
};
