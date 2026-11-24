/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge, AppHeaderMenu } from '@kbn/app-header';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { KbnSuccessCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  ALERTZERO_PAGE_CONTENT_WIDTH,
  ALERTZERO_WATCHES_SUBNAV_WIDTH,
} from '../../components/layout/constants';
import { FeatureSettingsLink } from '../watches/components/feature_settings_link';
import { DemoModelPicker, createDefaultDemoModelAssignments } from './demo_model_picker';
import type { DemoModelAssignments } from './demo_model_picker';
import {
  DemoAlertInvestigation,
  createDefaultDemoAlertInvestigation,
} from './demo_alert_investigation';
import type {
  DemoAlertInvestigationConfig,
  DemoAlertInvestigationRule,
} from './demo_alert_investigation';
import * as nativeLabels from '../watches/settings_translations';
import { DemoUsage } from './demo_usage';
import { DemoConfigurationNext } from './demo_configuration_next';

const copy = {
  configuration: i18n.translate('xpack.alertzero.poc.configuration.title', {
    defaultMessage: 'Configuration',
  }),
  usage: i18n.translate('xpack.alertzero.poc.configuration.usage', { defaultMessage: 'Usage' }),
  navigation: i18n.translate('xpack.alertzero.poc.configuration.navigation', {
    defaultMessage: 'AlertZero management',
  }),
  brand: i18n.translate('xpack.alertzero.poc.configuration.brand', { defaultMessage: 'AlertZero' }),
  back: i18n.translate('xpack.alertzero.poc.configuration.back', {
    defaultMessage: 'Investigations preview',
  }),
  preview: i18n.translate('xpack.alertzero.poc.configuration.preview', {
    defaultMessage: 'POC · Sample data',
  }),
  notice: i18n.translate('xpack.alertzero.poc.configuration.notice', {
    defaultMessage:
      'Changes stay local to this preview. No real alerts, rules, models or endpoints are changed. Shared scope is a proposed experience.',
  }),
  intro: i18n.translate('xpack.alertzero.poc.configuration.intro', {
    defaultMessage: 'Manage what AlertZero investigates and the models it uses.',
  }),
  alerts: i18n.translate('xpack.alertzero.poc.configuration.alerts', {
    defaultMessage: 'Alert investigation',
  }),
  scopeDescription: i18n.translate('xpack.alertzero.poc.configuration.scopeDescription', {
    defaultMessage: 'Automatically investigate alerts from the detection rules in this space.',
  }),
  modelsDescription: i18n.translate('xpack.alertzero.poc.configuration.modelsDescription', {
    defaultMessage: 'Use recommended models for each kind of work, or choose your own.',
  }),
  modelConnections: i18n.translate('xpack.alertzero.poc.configuration.modelConnections', {
    defaultMessage: 'Manage model connections in',
  }),
  leaveDescription: i18n.translate('xpack.alertzero.poc.configuration.leaveDescription', {
    defaultMessage: 'You have unsaved configuration changes. Leave without saving them?',
  }),
  saved: i18n.translate('xpack.alertzero.poc.configuration.saved', {
    defaultMessage: 'Preview configuration saved.',
  }),
  usagePreview: i18n.translate('xpack.alertzero.poc.configuration.recordedUsagePreview', {
    defaultMessage: 'POC · Recorded data',
  }),
  viewInvestigations: i18n.translate('xpack.alertzero.poc.configuration.viewInvestigations', {
    defaultMessage: 'View investigations',
  }),
  currentDesign: i18n.translate('xpack.alertzero.poc.configuration.currentDesign', {
    defaultMessage: 'Compare with current design',
  }),
};

export interface DemoConfigurationSetup {
  severity: 'low' | 'medium' | 'high' | 'critical';
  rules: Record<string, boolean>;
  model: string;
  context: string;
  modelAssignments?: DemoModelAssignments;
  alertInvestigation?: DemoAlertInvestigationConfig;
  excludeBuildingBlocks?: boolean;
  excludedRuleTags?: string[];
}

export interface DemoConfigurationProps {
  setup: DemoConfigurationSetup;
  ruleOptions: ReadonlyArray<DemoAlertInvestigationRule>;
  onSave: (next: DemoConfigurationSetup) => void | boolean;
  onBack: () => void;
  /** `next` renders the redesigned sample body; the saved state and Save/Discard stay shared. */
  variant?: 'current' | 'next';
  onSwitchVariant?: () => void;
}

const normalizeSetup = (setup: DemoConfigurationSetup): DemoConfigurationSetup => ({
  ...setup,
  rules: { ...setup.rules },
  modelAssignments: Object.fromEntries(
    Object.entries(setup.modelAssignments ?? createDefaultDemoModelAssignments()).map(
      ([tier, assignment]) => [tier, { ...assignment, modelIds: [...assignment.modelIds] }]
    )
  ) as DemoModelAssignments,
  alertInvestigation: {
    ...(setup.alertInvestigation ?? createDefaultDemoAlertInvestigation()),
    ruleIds: [...(setup.alertInvestigation?.ruleIds ?? [])],
    excludeBuildingBlocks:
      setup.alertInvestigation?.excludeBuildingBlocks ?? setup.excludeBuildingBlocks ?? false,
  },
  excludeBuildingBlocks: setup.excludeBuildingBlocks ?? false,
  excludedRuleTags: [...(setup.excludedRuleTags ?? [])],
});

const ConfigurationPanel: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      <div
        css={css`
          padding: ${euiTheme.size.base};
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </div>
      <div
        css={css`
          padding: ${euiTheme.size.base};
        `}
      >
        {children}
      </div>
    </EuiPanel>
  );
};

/** Native page-local configuration preview; callbacks never persist production settings. */
export const DemoConfiguration: React.FC<DemoConfigurationProps> = ({
  setup,
  ruleOptions,
  onSave,
  onBack,
  variant = 'current',
  onSwitchVariant,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: {
      application: { navigateToUrl },
      http,
      overlays: { openConfirm },
      appParams: { history: scopedHistory },
    },
  } = useKibana<CoreStart & { appParams: { history: ScopedHistory } }>();
  const [draft, setDraft] = useState(() => normalizeSetup(setup));
  const [saved, setSaved] = useState(() => normalizeSetup(setup));
  const [active, setActive] = useState<'configuration' | 'usage'>(() =>
    new URLSearchParams(window.location.search).get('view') === 'usage' ? 'usage' : 'configuration'
  );
  const [savedNotice, setSavedNotice] = useState(false);
  const [hasScopeConflict, setHasScopeConflict] = useState(false);
  const previousSetup = useRef(normalizeSetup(setup));
  const currentDraft = useRef(draft);
  currentDraft.current = draft;
  useEffect(() => {
    const next = normalizeSetup(setup);
    const previous = previousSetup.current;
    const local = currentDraft.current;
    const localScopeChanged =
      JSON.stringify(local.alertInvestigation) !== JSON.stringify(previous.alertInvestigation);
    const incomingScopeChanged =
      JSON.stringify(next.alertInvestigation) !== JSON.stringify(previous.alertInvestigation);
    const scopeConflict =
      localScopeChanged &&
      incomingScopeChanged &&
      JSON.stringify(local.alertInvestigation) !== JSON.stringify(next.alertInvestigation);
    const localModelsChanged =
      JSON.stringify(local.modelAssignments) !== JSON.stringify(previous.modelAssignments);
    previousSetup.current = next;
    setDraft({
      ...next,
      alertInvestigation: localScopeChanged ? local.alertInvestigation : next.alertInvestigation,
      modelAssignments: localModelsChanged ? local.modelAssignments : next.modelAssignments,
    });
    setSaved(next);
    setHasScopeConflict(
      (previousConflict) =>
        scopeConflict ||
        (previousConflict &&
          JSON.stringify(local.alertInvestigation) !== JSON.stringify(next.alertInvestigation))
    );
  }, [setup]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const hasUnsavedChanges = isDirty;
  useUnsavedChangesPrompt({
    hasUnsavedChanges,
    http,
    history: scopedHistory,
    navigateToUrl,
    openConfirm,
    titleText: nativeLabels.LEAVE_PROMPT_TITLE,
    messageText: copy.leaveDescription,
    cancelButtonText: nativeLabels.KEEP_EDITING_BUTTON_LABEL,
    confirmButtonText: nativeLabels.LEAVE_PROMPT_CONFIRM_BUTTON_LABEL,
  });
  const discard = () => {
    setDraft(normalizeSetup(saved));
    setHasScopeConflict(false);
    setSavedNotice(false);
  };
  const save = () => {
    if (!isDirty || hasScopeConflict) return;
    const next = normalizeSetup(draft);
    if (onSave(next) === false) return;
    setSaved(next);
    setDraft(next);
    setSavedNotice(true);
  };
  const headerMenu: AppHeaderMenu = {
    primaryActionItem: {
      id: 'alertZeroPocConfigurationSave',
      label: nativeLabels.SAVE_WATCH_SETTINGS,
      iconType: 'save',
      disableButton: !isDirty || hasScopeConflict,
      tooltipContent: !isDirty ? nativeLabels.NO_CHANGES_TO_SAVE_TOOLTIP : undefined,
      testId: 'alertZeroPocConfigurationSave',
      run: save,
    },
    items: [
      {
        id: 'alertZeroPocConfigurationDiscard',
        label: nativeLabels.DISCARD_WATCH_SETTINGS,
        iconType: 'cross',
        disableButton: !hasUnsavedChanges,
        testId: 'alertZeroPocConfigurationDiscard',
        run: discard,
      },
    ],
  };
  const badges: AppHeaderBadge[] = [
    { label: active === 'usage' ? copy.usagePreview : copy.preview, color: 'hollow' },
    ...(hasUnsavedChanges
      ? [
          {
            label: nativeLabels.UNSAVED_CHANGES_BADGE_LABEL,
            color: 'warning' as const,
            'data-test-subj': 'alertZeroPocConfigurationUnsaved',
          },
        ]
      : []),
  ];

  return (
    <EuiPageTemplate offset={0} restrictWidth={false} data-test-subj="alertZeroPocConfiguration">
      <EuiPageTemplate.Sidebar paddingSize="none" minWidth={ALERTZERO_WATCHES_SUBNAV_WIDTH} sticky>
        <aside
          aria-label={copy.navigation}
          css={css`
            width: ${ALERTZERO_WATCHES_SUBNAV_WIDTH}px;
            background: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <div
            css={css`
              display: flex;
              align-items: center;
              min-height: 49px;
              padding-inline: ${euiTheme.size.m};
              border-bottom: ${euiTheme.border.thin};
            `}
          >
            <EuiTitle size="xs">
              <h2>{copy.brand}</h2>
            </EuiTitle>
          </div>
          <div
            css={css`
              padding: ${euiTheme.size.s};
            `}
          >
            <EuiListGroup
              maxWidth={false}
              listItems={[
                {
                  label: copy.configuration,
                  iconType: 'gear',
                  isActive: active === 'configuration',
                  onClick: () => setActive('configuration'),
                  'data-test-subj': 'alertZeroPocConfigurationNavConfiguration',
                },
                {
                  label: copy.usage,
                  iconType: 'visBarVertical',
                  isActive: active === 'usage',
                  onClick: () => setActive('usage'),
                  'data-test-subj': 'alertZeroPocConfigurationNavUsage',
                },
              ]}
            />
            <EuiSpacer size="m" />
            <EuiButtonEmpty
              iconType="chevronSingleLeft"
              size="xs"
              onClick={onBack}
              data-test-subj="alertZeroPocConfigurationBack"
            >
              {copy.back}
            </EuiButtonEmpty>
            {variant === 'next' && onSwitchVariant ? (
              <EuiButtonEmpty
                iconType="sortable"
                size="xs"
                onClick={onSwitchVariant}
                data-test-subj="alertZeroPocConfigurationSwitchVariant"
              >
                {copy.currentDesign}
              </EuiButtonEmpty>
            ) : null}
          </div>
        </aside>
      </EuiPageTemplate.Sidebar>
      <AppHeader
        title={active === 'configuration' ? copy.configuration : copy.usage}
        badges={badges}
        menu={active === 'configuration' ? headerMenu : undefined}
        spacing="compact"
      />
      <EuiPageTemplate.Section
        paddingSize="l"
        grow
        contentProps={{
          css: css`
            width: ${active === 'usage' ? 1120 : ALERTZERO_PAGE_CONTENT_WIDTH}px;
            max-width: 100%;
            margin-inline: auto;
          `,
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
          {active === 'configuration' ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <p>{copy.notice}</p>
              </EuiText>
            </EuiFlexItem>
          ) : null}
          {active === 'configuration' && savedNotice ? (
            <EuiFlexItem grow={false}>
              <KbnSuccessCallout
                size="s"
                title={copy.saved}
                announceOnMount
                actionProps={
                  variant === 'next'
                    ? { primary: { children: copy.viewInvestigations, onClick: onBack } }
                    : undefined
                }
              />
            </EuiFlexItem>
          ) : null}
          {active === 'configuration' && hasScopeConflict ? (
            <EuiFlexItem grow={false}>
              <KbnWarningCallout
                title={i18n.translate('xpack.alertzero.poc.configuration.scopeConflict', {
                  defaultMessage: 'Rule scope changed in another tab',
                })}
                size="s"
                data-test-subj="alertZeroPocScopeConflict"
                text={i18n.translate('xpack.alertzero.poc.configuration.scopeConflictHelp', {
                  defaultMessage:
                    'Use the latest saved rule scope before saving. Your model edits will stay.',
                })}
                actionProps={{
                  primary: {
                    children: i18n.translate('xpack.alertzero.poc.configuration.reloadScope', {
                      defaultMessage: 'Use latest rule scope',
                    }),
                    onClick: () => {
                      setDraft((current) => ({
                        ...current,
                        alertInvestigation: saved.alertInvestigation,
                      }));
                      setHasScopeConflict(false);
                    },
                  },
                }}
              />
            </EuiFlexItem>
          ) : null}
          {active === 'configuration' && variant === 'next' ? (
            <EuiFlexItem grow={false}>
              <DemoConfigurationNext
                scope={draft.alertInvestigation ?? createDefaultDemoAlertInvestigation()}
                rules={ruleOptions}
                models={draft.modelAssignments ?? createDefaultDemoModelAssignments()}
                basePath={http.basePath.get()}
                getRuleHref={(ruleId) =>
                  http.basePath.prepend(
                    `/app/security/rules/id/${encodeURIComponent(
                      ruleId
                    )}/edit?alertZeroPreview=true`
                  )
                }
                onNavigate={(href) => navigateToUrl(href)}
                onChangeScope={(alertInvestigation) => {
                  setDraft((current) => ({ ...current, alertInvestigation }));
                  setSavedNotice(false);
                }}
                onChangeModels={(modelAssignments) => {
                  setDraft((current) => ({ ...current, modelAssignments }));
                  setSavedNotice(false);
                }}
                onViewUsage={() => setActive('usage')}
                onViewInvestigations={onBack}
              />
            </EuiFlexItem>
          ) : active === 'configuration' ? (
            <>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <p>{copy.intro}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConfigurationPanel title={copy.alerts} description={copy.scopeDescription}>
                  <DemoAlertInvestigation
                    value={draft.alertInvestigation ?? createDefaultDemoAlertInvestigation()}
                    rules={ruleOptions}
                    getRuleHref={(ruleId) =>
                      http.basePath.prepend(
                        `/app/security/rules/id/${encodeURIComponent(
                          ruleId
                        )}/edit?alertZeroPreview=true`
                      )
                    }
                    onEditRule={(ruleId) =>
                      navigateToUrl(
                        http.basePath.prepend(
                          `/app/security/rules/id/${encodeURIComponent(
                            ruleId
                          )}/edit?alertZeroPreview=true`
                        )
                      )
                    }
                    onChange={(alertInvestigation) => {
                      setDraft((current) => ({ ...current, alertInvestigation }));
                      setSavedNotice(false);
                    }}
                  />
                </ConfigurationPanel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConfigurationPanel
                  title={nativeLabels.MODELS_LABEL}
                  description={copy.modelsDescription}
                >
                  <DemoModelPicker
                    value={draft.modelAssignments ?? createDefaultDemoModelAssignments()}
                    onChange={(modelAssignments) => {
                      setDraft((current) => ({ ...current, modelAssignments }));
                      setSavedNotice(false);
                    }}
                  />
                  <EuiSpacer size="m" />
                  <EuiText size="xs" color="subdued">
                    <p>
                      {copy.modelConnections}{' '}
                      <FeatureSettingsLink data-test-subj="alertZeroPocConfigurationFeatureSettings" />
                    </p>
                  </EuiText>
                </ConfigurationPanel>
              </EuiFlexItem>
            </>
          ) : (
            <EuiFlexItem grow={false}>
              <DemoUsage />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
