/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useHistory, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import {
  getAlertZeroPreviewStorageKey,
  readAlertZeroPreviewState,
  writeAlertZeroPreviewState,
} from '@kbn/alertzero-common';
import type { AlertZeroPreviewState } from '@kbn/alertzero-common';
import { KbnInfoCallout, KbnSuccessCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { DemoConfiguration, type DemoConfigurationSetup } from './demo_configuration';
import {
  createDefaultDemoAlertInvestigation,
  getIncludedDemoRules,
} from './demo_alert_investigation';
import type { DemoAlertInvestigationRule } from './demo_alert_investigation';
import { DEMO_DETECTION_RULES } from './demo_detection_rules';
import { createDefaultDemoModelAssignments } from './demo_model_picker';
import { DEMO_ALERTZERO_BEHAVIOR } from './demo_configuration_next';
import { DemoSetupNext, hasSelectedDemoRules, mergeDemoRuleIds } from './demo_setup_next';
import { getReviewedRulesStorageKey, writeReviewedRuleIds } from './demo_reviewed_rules';
import { DemoOpenAlerts } from './demo_open_alerts';
import type { DemoOpenAlertStatus } from './demo_open_alerts';
import {
  DEMO_OPEN_ALERTS,
  getAdhocAlertsStorageKey,
  readAdhocAlertIds,
  writeAdhocAlertIds,
} from './demo_adhoc_alerts';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { useAppHeadingTitle } from '../../components/app_chrome/app_heading_title';
import * as nativeLabels from '../watches/settings_translations';

const copy = {
  sample: i18n.translate('xpack.alertzero.poc.sample', { defaultMessage: 'POC · Sample data' }),
  notice: i18n.translate('xpack.alertzero.poc.notice', {
    defaultMessage:
      'All names, evidence, and results are illustrative. Changes stay local to this demo. Use Reset demo to start again. No alerts, models, or endpoints are changed.',
  }),
  ruleNetwork: i18n.translate('xpack.alertzero.poc.ruleNetwork', {
    defaultMessage: 'Potential network beaconing',
  }),
  ruleDisabled: i18n.translate('xpack.alertzero.poc.ruleDisabled', {
    defaultMessage: 'Unusual administrative activity',
  }),
  manageInvestigation: i18n.translate('xpack.alertzero.poc.manageInvestigation', {
    defaultMessage: 'Manage investigation',
  }),
  investigationOff: i18n.translate('xpack.alertzero.poc.investigationOff', {
    defaultMessage: 'Automatic investigation is off',
  }),
  investigationOffHelp: i18n.translate('xpack.alertzero.poc.investigationOffHelp', {
    defaultMessage:
      'New alerts are not being investigated automatically. Existing investigations remain available for review and response.',
  }),
  noIncludedRules: i18n.translate('xpack.alertzero.poc.noIncludedRules', {
    defaultMessage: 'No rules included',
  }),
  noIncludedRulesHelp: i18n.translate('xpack.alertzero.poc.noIncludedRulesHelp', {
    defaultMessage: 'Include rules in Configuration to begin investigating their alerts.',
  }),
  noAlertsReceived: i18n.translate('xpack.alertzero.poc.noAlertsReceived', {
    defaultMessage: 'No alerts received yet',
  }),
  noAlertsReceivedHelp: i18n.translate('xpack.alertzero.poc.noAlertsReceivedHelp', {
    defaultMessage:
      'Your configuration is ready. New alerts from the included rules will be investigated as they arrive.',
  }),
  heading: i18n.translate('xpack.alertzero.poc.heading', { defaultMessage: 'Setup preview' }),
  configuration: i18n.translate('xpack.alertzero.poc.configuration', {
    defaultMessage: 'Configuration preview',
  }),
  setup: i18n.translate('xpack.alertzero.poc.next.setup.title', {
    defaultMessage: 'Choose which rules send alerts to AlertZero',
  }),
  leaveSetup: i18n.translate('xpack.alertzero.poc.next.setup.leaveDescription', {
    defaultMessage:
      'Your rule and model choices are not saved until you start investigating. Leave without saving them?',
  }),
  low: i18n.translate('xpack.alertzero.poc.low', { defaultMessage: 'Low and above' }),
  medium: i18n.translate('xpack.alertzero.poc.medium', { defaultMessage: 'Medium and above' }),
  high: i18n.translate('xpack.alertzero.poc.high', { defaultMessage: 'High and above' }),
  critical: i18n.translate('xpack.alertzero.poc.critical', { defaultMessage: 'Critical only' }),
  modelDefault: i18n.translate('xpack.alertzero.poc.modelDefault', {
    defaultMessage: 'Organization-approved model · Default sample',
  }),
  modelAlternate: i18n.translate('xpack.alertzero.poc.modelAlternate', {
    defaultMessage: 'Organization-approved model · Alternate sample',
  }),
  tieredModelsDefault: i18n.translate('xpack.alertzero.poc.tieredModelsDefault', {
    defaultMessage: 'Tiered models · Recommended defaults',
  }),
  tieredModelsCustom: i18n.translate('xpack.alertzero.poc.tieredModelsCustom', {
    defaultMessage: 'Tiered models · Custom assignments',
  }),
  evidence: i18n.translate('xpack.alertzero.poc.evidence', {
    defaultMessage: 'Available evidence',
  }),
  context: i18n.translate('xpack.alertzero.poc.context', {
    defaultMessage: 'Organization context (optional)',
  }),
  contextHint: i18n.translate('xpack.alertzero.poc.contextHint', {
    defaultMessage:
      'For example, approved tools or maintenance activity. Sample findings are fixed and are not recalculated.',
  }),
  home: i18n.translate('xpack.alertzero.poc.home', { defaultMessage: 'Your investigations' }),
  homeIntro: i18n.translate('xpack.alertzero.poc.homeIntro', {
    defaultMessage:
      'See the work underway, the evidence behind each finding, and the decisions that need you.',
  }),
  edit: i18n.translate('xpack.alertzero.poc.edit', { defaultMessage: 'Edit setup' }),
  reset: i18n.translate('xpack.alertzero.poc.reset', { defaultMessage: 'Reset demo' }),
  tryTitle: i18n.translate('xpack.alertzero.poc.openAlerts.pageTitle', {
    defaultMessage: 'Try AlertZero on an open alert',
  }),
  investigateOpenAlert: i18n.translate('xpack.alertzero.poc.openAlerts.investigateAnother', {
    defaultMessage: 'Investigate an open alert',
  }),
  backToOpenAlerts: i18n.translate('xpack.alertzero.poc.openAlerts.back', {
    defaultMessage: 'Back to open alerts',
  }),
  startedByYou: i18n.translate('xpack.alertzero.poc.openAlerts.startedByYou', {
    defaultMessage: 'Started by you',
  }),
  adhocOnlyTitle: i18n.translate('xpack.alertzero.poc.openAlerts.adhocOnlyTitle', {
    defaultMessage: 'No rules selected',
  }),
  adhocOnlyHelp: i18n.translate('xpack.alertzero.poc.openAlerts.adhocOnlyHelp', {
    defaultMessage:
      'AlertZero investigates only the alerts you pick. Choose rules to investigate new alerts as they arrive.',
  }),
  chooseRules: i18n.translate('xpack.alertzero.poc.openAlerts.adhocOnlyChooseRules', {
    defaultMessage: 'Choose rules',
  }),
  adhocSummary: i18n.translate('xpack.alertzero.poc.openAlerts.adhocSummary', {
    defaultMessage:
      'AlertZero is investigating this alert. This preview has no prepared result for it.',
  }),
  adhocEvidence: i18n.translate('xpack.alertzero.poc.openAlerts.adhocEvidence', {
    defaultMessage: 'No sample evidence is prepared for this alert.',
  }),
  adhocStorageFailed: i18n.translate('xpack.alertzero.poc.openAlerts.storageFailed', {
    defaultMessage:
      'This browser could not save the investigation you started. It stays available until you reload.',
  }),
  back: i18n.translate('xpack.alertzero.poc.back', { defaultMessage: 'All investigations' }),
  review: i18n.translate('xpack.alertzero.poc.review', { defaultMessage: 'Needs your review' }),
  progress: i18n.translate('xpack.alertzero.poc.progress', { defaultMessage: 'In progress' }),
  complete: i18n.translate('xpack.alertzero.poc.complete', { defaultMessage: 'Complete' }),
  summary: i18n.translate('xpack.alertzero.poc.summary', {
    defaultMessage: 'Investigation summary',
  }),
  contextAvailable: i18n.translate('xpack.alertzero.poc.contextAvailable', {
    defaultMessage: 'Context provided for review',
  }),
  noContext: i18n.translate('xpack.alertzero.poc.noContext', {
    defaultMessage: 'No organization context added.',
  }),
  saveContext: i18n.translate('xpack.alertzero.poc.saveContext', {
    defaultMessage: 'Save sample context',
  }),
  contextSaved: i18n.translate('xpack.alertzero.poc.contextSaved', {
    defaultMessage:
      'Context saved for these sample investigations. Existing conclusions have not been revalidated.',
  }),
  collection: i18n.translate('xpack.alertzero.poc.collection', {
    defaultMessage: 'Collect more evidence',
  }),
  collectionBody: i18n.translate('xpack.alertzero.poc.collectionBody', {
    defaultMessage:
      'Endpoint analysis needs the running process list from sample host ws-014 to check whether the suspicious process is still active. This is active collection. Approving it does not approve isolation or any other response.',
  }),
  approveCollection: i18n.translate('xpack.alertzero.poc.approveCollection', {
    defaultMessage: 'Simulate collection approval',
  }),
  declineCollection: i18n.translate('xpack.alertzero.poc.declineCollection', {
    defaultMessage: 'Decline collection',
  }),
  declined: i18n.translate('xpack.alertzero.poc.declined', {
    defaultMessage:
      'Collection declined. The investigation remains incomplete, and no response is proposed. Existing indexed evidence remains available.',
  }),
  reconsider: i18n.translate('xpack.alertzero.poc.reconsider', {
    defaultMessage: 'Reconsider collection',
  }),
  collecting: i18n.translate('xpack.alertzero.poc.collecting', {
    defaultMessage:
      'Simulated handoff to endpoint analysis: is the suspicious process still active? The question and indexed evidence stay with this investigation.',
  }),
  showCollection: i18n.translate('xpack.alertzero.poc.showCollection', {
    defaultMessage: 'Show sample collection results',
  }),
  collected: i18n.translate('xpack.alertzero.poc.collected', {
    defaultMessage:
      'Sample collection returned: the process is still active and connects to an unfamiliar destination. Endpoint analysis returned this evidence to the same investigation.',
  }),
  response: i18n.translate('xpack.alertzero.poc.response', { defaultMessage: 'Review a response' }),
  responseBody: i18n.translate('xpack.alertzero.poc.responseBody', {
    defaultMessage:
      'Proposed response: isolate sample host ws-014 to interrupt the suspicious connection. Isolation can disrupt the person using this device. This needs a separate decision from evidence collection.',
  }),
  approveResponse: i18n.translate('xpack.alertzero.poc.approveResponse', {
    defaultMessage: 'Simulate isolation approval',
  }),
  declineResponse: i18n.translate('xpack.alertzero.poc.declineResponse', {
    defaultMessage: 'Decline response',
  }),
  approvedResponse: i18n.translate('xpack.alertzero.poc.approvedResponse', {
    defaultMessage:
      'Simulated response approval recorded. A live experience would request isolation; this POC sent no endpoint action.',
  }),
  declinedResponse: i18n.translate('xpack.alertzero.poc.declinedResponse', {
    defaultMessage: 'Investigation reviewed. Response declined. This POC sent no endpoint action.',
  }),
  analyzing: i18n.translate('xpack.alertzero.poc.analyzing', {
    defaultMessage:
      'AlertZero is comparing the sample cloud audit and sign-in records. No active collection or response is requested.',
  }),
  showAnalysis: i18n.translate('xpack.alertzero.poc.showAnalysis', {
    defaultMessage: 'Show sample analysis results',
  }),
  cloudResult: i18n.translate('xpack.alertzero.poc.cloudResult', {
    defaultMessage:
      'The sample records match an authorized automation identity and expected access pattern. No response is proposed.',
  }),
  ruleEndpoint: i18n.translate('xpack.alertzero.poc.ruleEndpoint', {
    defaultMessage: 'Suspicious PowerShell activity',
  }),
  ruleCloud: i18n.translate('xpack.alertzero.poc.ruleCloud', {
    defaultMessage: 'Unexpected cloud access',
  }),
  ruleIdentity: i18n.translate('xpack.alertzero.poc.ruleIdentity', {
    defaultMessage: 'Rare service-account sign-in',
  }),
  endpointTitle: i18n.translate('xpack.alertzero.poc.endpointTitle', {
    defaultMessage: 'Suspicious PowerShell on ws-014',
  }),
  endpointSummary: i18n.translate('xpack.alertzero.poc.endpointSummary', {
    defaultMessage:
      'A document reader launched encoded PowerShell. Indexed events show an unfamiliar outbound connection. More evidence is needed before choosing a response.',
  }),
  endpointEvidence: i18n.translate('xpack.alertzero.poc.endpointEvidence', {
    defaultMessage:
      'Indexed endpoint event: document reader → encoded PowerShell. Network event: outbound connection to an unfamiliar destination. These observations alone do not establish compromise.',
  }),
  cloudTitle: i18n.translate('xpack.alertzero.poc.cloudTitle', {
    defaultMessage: 'Unusual cloud access by deploy-service',
  }),
  cloudSummary: i18n.translate('xpack.alertzero.poc.cloudSummary', {
    defaultMessage:
      'An automation identity accessed a cloud resource it has not recently used. The sample analysis is checking the surrounding activity.',
  }),
  cloudEvidence: i18n.translate('xpack.alertzero.poc.cloudEvidence', {
    defaultMessage:
      'Cloud audit record: resource read by deploy-service. Sign-in record: the same automation identity and expected source network.',
  }),
  identityTitle: i18n.translate('xpack.alertzero.poc.identityTitle', {
    defaultMessage: 'Service sign-in matches an expected job',
  }),
  identitySummary: i18n.translate('xpack.alertzero.poc.identitySummary', {
    defaultMessage:
      'The rare sign-in matches the sample service account’s documented recurring job. No response is proposed, and no alert has been closed.',
  }),
  identityEvidence: i18n.translate('xpack.alertzero.poc.identityEvidence', {
    defaultMessage:
      'Identity sign-in: service-backup from its usual host. Indexed job record: matching account, host, and activity.',
  }),
};

type Severity = DemoConfigurationSetup['severity'];
type Stage = 'collection' | 'collecting' | 'response' | 'analyzing' | 'complete';
type Setup = DemoConfigurationSetup;
interface SampleInvestigation {
  id: string;
  rule: string;
  severity: Severity;
  title: string;
  summary: string;
  evidence: string;
  ruleTags?: readonly string[];
  buildingBlock?: boolean;
  /** A placeholder for a sample alert that has no prepared findings. */
  unprepared?: boolean;
}
const investigations: readonly SampleInvestigation[] = [
  {
    id: 'endpoint',
    ruleTags: ['production', 'endpoint'],
    rule: copy.ruleEndpoint,
    severity: 'critical',
    title: copy.endpointTitle,
    summary: copy.endpointSummary,
    evidence: copy.endpointEvidence,
  },
  {
    id: 'cloud',
    ruleTags: ['production', 'cloud'],
    rule: copy.ruleCloud,
    severity: 'high',
    title: copy.cloudTitle,
    summary: copy.cloudSummary,
    evidence: copy.cloudEvidence,
  },
  {
    id: 'identity',
    ruleTags: ['production', 'identity'],
    rule: copy.ruleIdentity,
    severity: 'medium',
    title: copy.identityTitle,
    summary: copy.identitySummary,
    evidence: copy.identityEvidence,
  },
];
const mergePreviewRules = (
  rules: readonly DemoAlertInvestigationRule[]
): DemoAlertInvestigationRule[] => [
  ...new Map([...DEMO_DETECTION_RULES, ...rules].map((rule) => [rule.id, rule])).values(),
];
/** The sample investigations, and the Configuration the redesigned setup pairs with. */
const INVESTIGATIONS_PATH = '/poc';
const CONFIGURATION_PATH = '/watches/configuration-preview-next';
const initialStages: Record<string, Stage> = {
  endpoint: 'collection',
  cloud: 'analyzing',
  identity: 'complete',
};
const initialSetup: Setup = {
  severity: 'medium',
  rules: { endpoint: true, cloud: true, identity: true },
  model: 'default',
  context: '',
};
const severityOrder: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const severityLabels: Record<Severity, string> = {
  low: copy.low,
  medium: copy.medium,
  high: copy.high,
  critical: copy.critical,
};
const inScope = (
  setup: Setup,
  availableInvestigationRules: readonly DemoAlertInvestigationRule[]
) => {
  if (setup.alertInvestigation) {
    const included = new Set(
      getIncludedDemoRules(setup.alertInvestigation, availableInvestigationRules).map(
        ({ id }) => id
      )
    );
    return investigations.filter(
      ({ id, buildingBlock }) =>
        included.has(id) && !(setup.alertInvestigation?.excludeBuildingBlocks && buildingBlock)
    );
  }
  return investigations.filter(
    (item) =>
      setup.rules[item.id] &&
      severityOrder[item.severity] >= severityOrder[setup.severity] &&
      !(setup.excludeBuildingBlocks && item.buildingBlock) &&
      !(item.ruleTags ?? []).some((tag) => (setup.excludedRuleTags ?? []).includes(tag))
  );
};
const getStatus = (stage: Stage) => {
  if (stage === 'complete') return { label: copy.complete, color: 'success' as const };
  if (stage === 'collecting' || stage === 'analyzing')
    return { label: copy.progress, color: 'primary' as const };
  return { label: copy.review, color: 'warning' as const };
};
/** The investigation an alert the customer picked opens: a prepared sample where one exists, otherwise a placeholder. */
const getAdhocInvestigation = (alertId: string): SampleInvestigation | undefined => {
  const alert = DEMO_OPEN_ALERTS.find(({ id }) => id === alertId);
  if (!alert) return;
  return (
    investigations.find(({ id }) => id === alert.ruleId) ?? {
      id: `adhoc-${alert.id}`,
      rule: alert.rule,
      severity: alert.severity,
      title: i18n.translate('xpack.alertzero.poc.openAlerts.adhocTitle', {
        defaultMessage: '{rule} on {entity}',
        values: { rule: alert.rule, entity: alert.entity },
      }),
      summary: copy.adhocSummary,
      evidence: copy.adhocEvidence,
      unprepared: true,
    }
  );
};

/** A page-local sample of scoped setup, investigation review, and separate approvals. */
export const DemoPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const {
    services: {
      application: { navigateToUrl },
      http,
      notifications,
      overlays: { openConfirm },
      appParams: { history: scopedHistory },
    },
  } = useKibana<CoreStart & { appParams: { history: ScopedHistory } }>();
  const basePath = http.basePath.get();
  const [initialPreview] = useState(() => readAlertZeroPreviewState(window.localStorage, basePath));
  const [availableInvestigationRules, setAvailableInvestigationRules] = useState(() =>
    mergePreviewRules(initialPreview?.rules ?? [])
  );
  const location = useLocation<{ setup?: Setup; view?: 'try' | 'setup' | 'home' }>();
  const isNextConfigurationPreview = location.pathname === '/watches/configuration-preview-next';
  const isConfigurationPreview =
    isNextConfigurationPreview || location.pathname === '/watches/configuration-preview';
  useAppHeadingTitle(isConfigurationPreview ? copy.configuration : copy.heading);
  const [adhocAlertIds, setAdhocAlertIds] = useState(() =>
    readAdhocAlertIds(window.localStorage, basePath)
  );
  // First run opens on open alerts. A customer with rules or investigations lands on their investigations.
  const [view, setView] = useState<'try' | 'setup' | 'home' | 'detail'>(
    () =>
      location.state?.view ??
      (hasSelectedDemoRules(initialPreview?.scope, availableInvestigationRules) ||
      adhocAlertIds.length > 0
        ? 'home'
        : 'try')
  );
  const [resetCount, setResetCount] = useState(0);
  const [hasSetupDraft, setHasSetupDraft] = useState(false);
  const isSetupView = !isConfigurationPreview && view === 'setup';
  // Rule and model choices in setup are saved only by Start, so leaving asks first.
  useUnsavedChangesPrompt({
    hasUnsavedChanges: isSetupView && hasSetupDraft,
    http,
    history: scopedHistory,
    navigateToUrl,
    openConfirm,
    titleText: nativeLabels.LEAVE_PROMPT_TITLE,
    messageText: copy.leaveSetup,
    cancelButtonText: nativeLabels.KEEP_EDITING_BUTTON_LABEL,
    confirmButtonText: nativeLabels.LEAVE_PROMPT_CONFIRM_BUTTON_LABEL,
    shouldPromptOnReplace: false,
  });
  // Without a saved selection the scope is empty: no rule is ever included for the customer.
  const [setup, setSetup] = useState<Setup>(() => ({
    ...(location.state?.setup ?? initialSetup),
    alertInvestigation: initialPreview?.scope ?? createDefaultDemoAlertInvestigation(),
    modelAssignments: initialPreview?.modelAssignments ?? createDefaultDemoModelAssignments(),
  }));
  useEffect(() => {
    const synchronize = () => {
      const shared = readAlertZeroPreviewState(window.localStorage, basePath);
      if (!shared) {
        try {
          writeAlertZeroPreviewState(window.localStorage, basePath, {
            scope: setup.alertInvestigation ?? createDefaultDemoAlertInvestigation(),
            rules: mergePreviewRules([]),
            modelAssignments: setup.modelAssignments ?? createDefaultDemoModelAssignments(),
          });
        } catch {
          notifications.toasts.addDanger(
            i18n.translate('xpack.alertzero.poc.storageUnavailable', {
              defaultMessage:
                'This browser could not save shared preview settings. Check browser storage access and try again.',
            })
          );
        }
        return;
      }
      const rules = mergePreviewRules(shared.rules);
      if (JSON.stringify(rules) !== JSON.stringify(shared.rules)) {
        try {
          writeAlertZeroPreviewState(window.localStorage, basePath, { ...shared, rules });
        } catch {
          notifications.toasts.addDanger(
            i18n.translate('xpack.alertzero.poc.catalogStorageFailed', {
              defaultMessage:
                'The preview rule catalog could not be saved. Your saved rule associations are unchanged.',
            })
          );
        }
      }
      setAvailableInvestigationRules((previous) =>
        JSON.stringify(previous) === JSON.stringify(rules) ? previous : rules
      );
      const synchronizeSetup = (previous: Setup): Setup => {
        const next = {
          ...previous,
          alertInvestigation: shared.scope,
          modelAssignments: shared.modelAssignments ?? createDefaultDemoModelAssignments(),
        };
        return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
      };
      setSetup(synchronizeSetup);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === getAlertZeroPreviewStorageKey(basePath)) synchronize();
    };
    synchronize();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', synchronize);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', synchronize);
    };
  }, [basePath, notifications.toasts, setup.alertInvestigation, setup.modelAssignments]);
  const savePreview = (next: Setup): boolean => {
    const latest = readAlertZeroPreviewState(window.localStorage, basePath);
    const preview: AlertZeroPreviewState = {
      scope: next.alertInvestigation ?? createDefaultDemoAlertInvestigation(),
      modelAssignments: next.modelAssignments ?? createDefaultDemoModelAssignments(),
      rules: mergePreviewRules(latest?.rules ?? availableInvestigationRules),
    };
    try {
      writeAlertZeroPreviewState(window.localStorage, basePath, preview);
      setAvailableInvestigationRules(preview.rules);
      return true;
    } catch {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertzero.poc.saveStorageFailed', {
          defaultMessage:
            'Preview settings could not be saved. Your changes are still available to retry.',
        })
      );
      return false;
    }
  };
  useEffect(() => {
    if (
      isConfigurationPreview &&
      (!setup.alertInvestigation ||
        setup.alertInvestigation.excludeBuildingBlocks === undefined ||
        !setup.modelAssignments)
    ) {
      const next = {
        ...setup,
        alertInvestigation: {
          ...(setup.alertInvestigation ?? createDefaultDemoAlertInvestigation()),
          excludeBuildingBlocks:
            setup.alertInvestigation?.excludeBuildingBlocks ?? setup.excludeBuildingBlocks ?? false,
        },
        modelAssignments: setup.modelAssignments ?? createDefaultDemoModelAssignments(),
      };
      setSetup(next);
    }
  }, [isConfigurationPreview, setup]);
  const [contextDraft, setContextDraft] = useState('');
  const [contextSaved, setContextSaved] = useState(false);
  const [stages, setStages] = useState(initialStages);
  const [selectedId, setSelectedId] = useState('endpoint');
  const [collectionDeclined, setCollectionDeclined] = useState(false);
  const [response, setResponse] = useState<'approved' | 'declined' | undefined>();
  const visible = inScope(setup, availableInvestigationRules);
  // Alerts the customer picked come first; a rule-driven sample is not listed twice.
  const adhocInvestigations = adhocAlertIds
    .map(getAdhocInvestigation)
    .filter((item): item is SampleInvestigation => item !== undefined);
  const adhocInvestigationIds = new Set(adhocInvestigations.map(({ id }) => id));
  const homeItems = [
    ...adhocInvestigations,
    ...visible.filter(({ id }) => !adhocInvestigationIds.has(id)),
  ];
  // A placeholder has no staged sample, so it stays in progress.
  const stageOf = (id: string): Stage => stages[id] ?? 'analyzing';
  const selected =
    [...investigations, ...adhocInvestigations].find((item) => item.id === selectedId) ??
    investigations[0];
  const stage = stageOf(selected.id);
  const status = getStatus(stage);
  const OutcomeCallout = response === 'approved' ? KbnSuccessCallout : KbnWarningCallout;
  const changeStage = (next: Stage) =>
    setStages((previous) => ({ ...previous, [selected.id]: next }));
  const getSummary = (item: SampleInvestigation) => {
    if (item.id === 'cloud' && stageOf(item.id) === 'complete') return copy.cloudResult;
    if (item.id === 'endpoint' && stageOf(item.id) === 'complete')
      return response === 'approved' ? copy.approvedResponse : copy.declinedResponse;
    if (item.id === 'endpoint' && stageOf(item.id) === 'response') return copy.collected;
    if (item.id === 'endpoint' && collectionDeclined) return copy.declined;
    return item.summary;
  };
  const resetDemo = () => {
    setResetCount((count) => count + 1);
    setHasSetupDraft(false);
    // A remembered "show investigations" entry would otherwise skip first-run setup after a refresh.
    if (!isConfigurationPreview) history.replace(INVESTIGATIONS_PATH);
    try {
      window.localStorage.removeItem(getReviewedRulesStorageKey(basePath));
      window.localStorage.removeItem(getAdhocAlertsStorageKey(basePath));
    } catch {
      // Without storage access there is no reviewed-rule baseline or started investigation to clear.
    }
    setAdhocAlertIds([]);
    setView('try');
    const emptySetup = {
      ...initialSetup,
      alertInvestigation: createDefaultDemoAlertInvestigation(),
      modelAssignments: createDefaultDemoModelAssignments(),
    };
    setSetup(emptySetup);
    savePreview(emptySetup);
    setContextDraft('');
    setContextSaved(false);
    setStages(initialStages);
    setSelectedId('endpoint');
    setCollectionDeclined(false);
    setResponse(undefined);
  };
  const savedScope = useMemo(
    () => setup.alertInvestigation ?? createDefaultDemoAlertInvestigation(),
    [setup.alertInvestigation]
  );
  const savedModels = useMemo(
    () => setup.modelAssignments ?? createDefaultDemoModelAssignments(),
    [setup.modelAssignments]
  );
  const startInvestigating: React.ComponentProps<typeof DemoSetupNext>['onStart'] = (
    alertInvestigation,
    modelAssignments
  ) => {
    // A rule switched on or off elsewhere that has not reached this page yet is kept as the customer set it.
    const latestScope = readAlertZeroPreviewState(window.localStorage, basePath)?.scope;
    const next = {
      ...setup,
      alertInvestigation:
        latestScope?.mode === 'selected' && savedScope.mode === 'selected'
          ? {
              ...alertInvestigation,
              ruleIds: mergeDemoRuleIds(
                alertInvestigation.ruleIds,
                savedScope.ruleIds,
                latestScope.ruleIds
              ),
            }
          : alertInvestigation,
      modelAssignments,
    };
    if (!savePreview(next)) return;
    // Starting ends first-run setup, so Configuration does not report today's rules as new.
    writeReviewedRuleIds(
      window.localStorage,
      basePath,
      availableInvestigationRules.map(({ id }) => id)
    );
    setSetup(next);
    setContextSaved(false);
    setSelectedId(inScope(next, availableInvestigationRules)[0]?.id ?? 'endpoint');
    setView('home');
  };
  const openInvestigation = (id: string) => {
    setSelectedId(id);
    setContextDraft(setup.context);
    setContextSaved(false);
    setView('detail');
  };
  const investigateAlert = (alertId: string) => {
    if (adhocAlertIds.includes(alertId)) return;
    const next = [...adhocAlertIds, alertId];
    setAdhocAlertIds(next);
    if (!writeAdhocAlertIds(window.localStorage, basePath, next)) {
      notifications.toasts.addDanger(copy.adhocStorageFailed);
    }
  };
  const alertStatuses = Object.fromEntries(
    adhocAlertIds.flatMap((alertId): Array<[string, DemoOpenAlertStatus]> => {
      const investigation = getAdhocInvestigation(alertId);
      return investigation ? [[alertId, getStatus(stageOf(investigation.id))]] : [];
    })
  );
  // Setup choices are saved only by Start, so going back asks before dropping them.
  const backToOpenAlerts = async () => {
    if (hasSetupDraft) {
      const leave = await openConfirm(copy.leaveSetup, {
        title: nativeLabels.LEAVE_PROMPT_TITLE,
        cancelButtonText: nativeLabels.KEEP_EDITING_BUTTON_LABEL,
        confirmButtonText: nativeLabels.LEAVE_PROMPT_CONFIRM_BUTTON_LABEL,
        buttonColor: 'danger',
      });
      if (!leave) return;
    }
    setHasSetupDraft(false);
    setView('try');
  };
  const includedRuleCount = setup.alertInvestigation
    ? getIncludedDemoRules(setup.alertInvestigation, availableInvestigationRules).length
    : Object.values(setup.rules).filter(Boolean).length;
  const scopeSummary = setup.alertInvestigation
    ? !setup.alertInvestigation.enabled
      ? copy.investigationOff
      : adhocInvestigations.length > 0 && includedRuleCount > 0
      ? // Picked alerts and rule-driven alerts are listed together, so no single source is named.
        i18n.translate('xpack.alertzero.poc.investigationCount', {
          defaultMessage:
            '{count, plural, one {# sample investigation} other {# sample investigations}}',
          values: { count: homeItems.length },
        })
      : i18n.translate('xpack.alertzero.poc.automaticScopeSummary', {
          defaultMessage:
            '{count, plural, one {# sample investigation} other {# sample investigations}} · {scope}',
          values: {
            count: homeItems.length,
            scope:
              // With no rule selected, everything listed is an alert the customer picked.
              includedRuleCount === 0 && homeItems.length > 0
                ? copy.startedByYou
                : setup.alertInvestigation.mode === 'all_enabled'
                ? i18n.translate('xpack.alertzero.poc.allEnabledRules', {
                    defaultMessage: 'All enabled rules',
                  })
                : i18n.translate('xpack.alertzero.poc.selectedRules', {
                    defaultMessage: 'Selected rules',
                  }),
          },
        })
    : i18n.translate('xpack.alertzero.poc.scopeSummary', {
        defaultMessage:
          '{count, plural, one {# sample investigation} other {# sample investigations}} · {severity}',
        values: {
          count: visible.length,
          severity: severityLabels[setup.severity],
        },
      });
  const emptyTitle =
    setup.alertInvestigation?.enabled === false
      ? copy.investigationOff
      : includedRuleCount === 0
      ? copy.noIncludedRules
      : copy.noAlertsReceived;
  const emptyHelp =
    setup.alertInvestigation?.enabled === false
      ? copy.investigationOffHelp
      : includedRuleCount === 0
      ? copy.noIncludedRulesHelp
      : copy.noAlertsReceivedHelp;

  if (isConfigurationPreview) {
    return (
      <DemoConfiguration
        setup={setup}
        variant={isNextConfigurationPreview ? 'next' : 'current'}
        onSwitchVariant={() => history.push('/watches/configuration-preview')}
        ruleOptions={availableInvestigationRules}
        onSave={(next) => {
          if (!savePreview(next)) return false;
          setSetup(next);
          setSelectedId(inScope(next, availableInvestigationRules)[0]?.id ?? 'endpoint');
        }}
        onBack={() => {
          // With no rules and nothing picked there are no investigations to return to yet.
          const next = includedRuleCount > 0 || adhocAlertIds.length > 0 ? 'home' : 'try';
          setView(next);
          history.push(INVESTIGATIONS_PATH, { setup, view: next });
        }}
      />
    );
  }

  return (
    <AlertZeroPageSection
      contentProps={{
        css: css`
          width: 100%;
        `,
      }}
    >
      <div
        css={css`
          max-width: 1120px;
          width: 100%;
          margin-inline: auto;
        `}
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{copy.sample}</EuiBadge>
          </EuiFlexItem>
          {isSetupView ? null : (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="gear"
                onClick={() => {
                  setView('home');
                  history.push(CONFIGURATION_PATH, { setup, view: 'home' });
                }}
              >
                {copy.configuration}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" iconType="refresh" onClick={resetDemo}>
              {copy.reset}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="xs" color="subdued">
          <p>{copy.notice}</p>
        </EuiText>
        <EuiSpacer size="l" />
        <AlertZeroPageHeader
          greeting=""
          title={
            view === 'try'
              ? copy.tryTitle
              : view === 'setup'
              ? copy.setup
              : view === 'home'
              ? copy.home
              : selected.title
          }
          subtitle={
            view === 'try' || view === 'setup'
              ? DEMO_ALERTZERO_BEHAVIOR
              : view === 'home'
              ? copy.homeIntro
              : selected.rule
          }
        />
        <EuiSpacer size="l" />

        {view === 'try' ? (
          <div
            css={css`
              max-width: 920px;
            `}
          >
            {homeItems.length > 0 || includedRuleCount > 0 ? (
              <>
                <EuiButtonEmpty
                  size="s"
                  flush="left"
                  iconType="chevronSingleLeft"
                  onClick={() => setView('home')}
                  data-test-subj="alertZeroPocBackToInvestigations"
                >
                  {copy.back}
                </EuiButtonEmpty>
                <EuiSpacer size="m" />
              </>
            ) : null}
            <DemoOpenAlerts
              alerts={DEMO_OPEN_ALERTS}
              statuses={alertStatuses}
              showChooseRules={includedRuleCount === 0}
              onInvestigate={investigateAlert}
              onViewInvestigation={(alertId) => {
                const investigation = getAdhocInvestigation(alertId);
                if (investigation) openInvestigation(investigation.id);
              }}
              onChooseRules={() => setView('setup')}
            />
          </div>
        ) : view === 'setup' ? (
          <div
            css={css`
              max-width: 760px;
            `}
          >
            <EuiButtonEmpty
              size="s"
              flush="left"
              iconType="chevronSingleLeft"
              onClick={backToOpenAlerts}
              data-test-subj="alertZeroPocBackToOpenAlerts"
            >
              {copy.backToOpenAlerts}
            </EuiButtonEmpty>
            <EuiSpacer size="m" />
            <DemoSetupNext
              key={resetCount}
              scope={savedScope}
              rules={availableInvestigationRules}
              models={savedModels}
              basePath={basePath}
              getRuleHref={(ruleId) =>
                http.basePath.prepend(
                  `/app/security/rules/id/${encodeURIComponent(ruleId)}/edit?alertZeroPreview=true`
                )
              }
              onNavigate={(href) => navigateToUrl(href)}
              onStart={startInvestigating}
              onUnsavedChange={setHasSetupDraft}
            />
          </div>
        ) : view === 'home' ? (
          <>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
              <EuiFlexItem>
                <EuiText size="s">
                  <p>{scopeSummary}</p>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  <p>
                    {setup.modelAssignments
                      ? Object.values(setup.modelAssignments).every(
                          ({ useRecommended }) => useRecommended
                        )
                        ? copy.tieredModelsDefault
                        : copy.tieredModelsCustom
                      : setup.model === 'default'
                      ? copy.modelDefault
                      : copy.modelAlternate}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={() => setView('try')}
                  data-test-subj="alertZeroPocInvestigateOpenAlert"
                >
                  {copy.investigateOpenAlert}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="gear"
                  onClick={() => {
                    if (setup.alertInvestigation) {
                      history.push(CONFIGURATION_PATH, { setup, view: 'home' });
                      return;
                    }
                    setView('setup');
                  }}
                >
                  {setup.alertInvestigation ? copy.manageInvestigation : copy.edit}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {setup.alertInvestigation?.enabled === false && homeItems.length > 0 ? (
              <>
                <KbnInfoCallout title={copy.investigationOff} text={copy.investigationOffHelp} />
                <EuiSpacer size="m" />
              </>
            ) : null}
            {includedRuleCount === 0 && homeItems.length > 0 ? (
              <>
                <KbnInfoCallout
                  title={copy.adhocOnlyTitle}
                  text={copy.adhocOnlyHelp}
                  data-test-subj="alertZeroPocAdhocOnly"
                  actionProps={{
                    primary: { children: copy.chooseRules, onClick: () => setView('setup') },
                  }}
                />
                <EuiSpacer size="m" />
              </>
            ) : null}
            <div
              css={css`
                display: grid;
                gap: ${euiTheme.size.m};
              `}
            >
              {homeItems.length === 0 ? (
                <KbnInfoCallout
                  title={emptyTitle}
                  text={emptyHelp}
                  data-test-subj="alertZeroPocNoInvestigations"
                />
              ) : null}
              {homeItems.map((item) => {
                const itemStatus = getStatus(stageOf(item.id));
                return (
                  <EuiPanel key={item.id} hasBorder hasShadow={false} paddingSize="l">
                    <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiTitle size="s">
                          <h2>
                            <EuiButtonEmpty flush="left" onClick={() => openInvestigation(item.id)}>
                              {item.title}
                            </EuiButtonEmpty>
                          </h2>
                        </EuiTitle>
                        <EuiText size="s">
                          <p>{getSummary(item)}</p>
                        </EuiText>
                      </EuiFlexItem>
                      {adhocInvestigationIds.has(item.id) ? (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="hollow">{copy.startedByYou}</EuiBadge>
                        </EuiFlexItem>
                      ) : null}
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={itemStatus.color}>{itemStatus.label}</EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="chevronSingleLeft"
                  flush="left"
                  onClick={() => setView('home')}
                >
                  {copy.back}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color={status.color}>{status.label}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder hasShadow={false} paddingSize="l">
              <EuiDescriptionList
                listItems={[
                  { title: copy.summary, description: getSummary(selected) },
                  { title: copy.evidence, description: selected.evidence },
                  { title: copy.contextAvailable, description: setup.context || copy.noContext },
                ]}
              />
              {selected.id === 'endpoint' && (stage === 'response' || stage === 'complete') && (
                <>
                  <EuiSpacer size="m" />
                  <KbnInfoCallout announceOnMount size="s" title={copy.collected} />
                </>
              )}
            </EuiPanel>
            <EuiSpacer size="m" />
            {selected.id === 'endpoint' && stage === 'collection' && (
              <EuiPanel hasBorder hasShadow={false} paddingSize="l">
                <EuiTitle size="s">
                  <h2>{copy.collection}</h2>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p>{collectionDeclined ? copy.declined : copy.collectionBody}</p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiFlexGroup wrap>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={() =>
                        collectionDeclined
                          ? setCollectionDeclined(false)
                          : changeStage('collecting')
                      }
                    >
                      {collectionDeclined ? copy.reconsider : copy.approveCollection}
                    </EuiButton>
                  </EuiFlexItem>
                  {!collectionDeclined && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setCollectionDeclined(true)}>
                        {copy.declineCollection}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiPanel>
            )}
            {(stage === 'collecting' || stage === 'analyzing') && !selected.unprepared && (
              <KbnInfoCallout
                announceOnMount
                title={copy.progress}
                text={stage === 'collecting' ? copy.collecting : copy.analyzing}
                actionProps={{
                  primary: {
                    children: stage === 'collecting' ? copy.showCollection : copy.showAnalysis,
                    onClick: () => changeStage(stage === 'collecting' ? 'response' : 'complete'),
                  },
                }}
              />
            )}
            {stage === 'response' && (
              <EuiPanel hasBorder hasShadow={false} paddingSize="l">
                <EuiTitle size="s">
                  <h2>{copy.response}</h2>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p>{copy.responseBody}</p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiFlexGroup wrap>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={() => {
                        setResponse('approved');
                        changeStage('complete');
                      }}
                    >
                      {copy.approveResponse}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      onClick={() => {
                        setResponse('declined');
                        changeStage('complete');
                      }}
                    >
                      {copy.declineResponse}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            )}
            {selected.id === 'endpoint' && stage === 'complete' && (
              <OutcomeCallout announceOnMount title={getSummary(selected)} />
            )}
            <EuiSpacer size="l" />
            <EuiFormRow label={copy.context} helpText={copy.contextHint} fullWidth>
              <EuiTextArea
                fullWidth
                value={contextDraft}
                maxLength={2000}
                rows={3}
                onChange={(event) => {
                  setContextDraft(event.target.value);
                  setContextSaved(false);
                }}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiButton
              size="s"
              isDisabled={contextDraft.trim() === setup.context}
              onClick={() => {
                setSetup({ ...setup, context: contextDraft.trim() });
                setContextSaved(true);
              }}
            >
              {copy.saveContext}
            </EuiButton>
            {contextSaved && (
              <>
                <EuiSpacer size="s" />
                <KbnInfoCallout announceOnMount size="s" title={copy.contextSaved} />
              </>
            )}
          </>
        )}
      </div>
    </AlertZeroPageSection>
  );
};
