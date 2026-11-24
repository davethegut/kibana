/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTablePagination,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';

export interface DemoAlertInvestigationRule {
  id: string;
  label: string;
  enabled: boolean;
  alertsLast24h: number;
  category?: string;
  source?: 'detection_rules';
}

export interface DemoAlertInvestigationConfig {
  enabled: boolean;
  mode: 'all_enabled' | 'selected';
  ruleIds: string[];
  excludeBuildingBlocks?: boolean;
}

/** Starts with no rules entrusted to automatic investigation until the user selects them. */
export const createDefaultDemoAlertInvestigation = (): DemoAlertInvestigationConfig => ({
  enabled: true,
  mode: 'selected',
  ruleIds: [],
  excludeBuildingBlocks: false,
});

/** Resolves selected rules while accepting legacy all-enabled scope during migration. */
export const getIncludedDemoRules = (
  config: DemoAlertInvestigationConfig,
  rules: readonly DemoAlertInvestigationRule[]
): readonly DemoAlertInvestigationRule[] =>
  rules.filter(
    (rule) => rule.enabled && (config.mode === 'all_enabled' || config.ruleIds.includes(rule.id))
  );

const copy = {
  auto: i18n.translate('xpack.alertzero.poc.alertInvestigation.automatic', {
    defaultMessage: 'Automatically investigate new alerts',
  }),
  on: i18n.translate('xpack.alertzero.poc.alertInvestigation.on', { defaultMessage: 'On' }),
  off: i18n.translate('xpack.alertzero.poc.alertInvestigation.off', { defaultMessage: 'Off' }),
  all: i18n.translate('xpack.alertzero.poc.alertInvestigation.all', {
    defaultMessage: 'All currently enabled rules',
  }),
  allHelp: i18n.translate('xpack.alertzero.poc.alertInvestigation.allHelp', {
    defaultMessage:
      'Select all rules enabled now. New or newly enabled rules must be selected separately.',
  }),
  specific: i18n.translate('xpack.alertzero.poc.alertInvestigation.specific', {
    defaultMessage: 'Selected detection rules',
  }),
  specificHelp: i18n.translate('xpack.alertzero.poc.alertInvestigation.specificHelp', {
    defaultMessage:
      'Include alerts from the rules you select. New rules are not added automatically.',
  }),
  specificSummary: i18n.translate('xpack.alertzero.poc.alertInvestigation.specificSummary', {
    defaultMessage: 'New or newly enabled rules must be selected separately.',
  }),
  excludeBuildingBlocks: i18n.translate(
    'xpack.alertzero.poc.alertInvestigation.excludeBuildingBlocks',
    {
      defaultMessage: 'Exclude building block alerts',
    }
  ),
  excludeBuildingBlocksHelp: i18n.translate(
    'xpack.alertzero.poc.alertInvestigation.excludeBuildingBlocksHelp',
    {
      defaultMessage:
        'Skip alerts marked as building block alerts when starting automatic investigations.',
    }
  ),
  manage: i18n.translate('xpack.alertzero.poc.alertInvestigation.manage', {
    defaultMessage: 'Manage rules',
  }),
  noRules: i18n.translate('xpack.alertzero.poc.alertInvestigation.noRules', {
    defaultMessage: 'No rules included. Alerts will not be investigated until you include rules.',
  }),
  noAvailableRules: i18n.translate('xpack.alertzero.poc.alertInvestigation.noAvailableRules', {
    defaultMessage:
      'No enabled rules available yet. You can save this setup now; alerts will be investigated as rules are enabled.',
  }),
  noAlerts: i18n.translate('xpack.alertzero.poc.alertInvestigation.noAlerts', {
    defaultMessage:
      'No alerts in the last 24 hours. New alerts from these rules will be investigated as they arrive.',
  }),
  paused: i18n.translate('xpack.alertzero.poc.alertInvestigation.paused', {
    defaultMessage:
      'Automatic investigation is off. New alerts will not be investigated until you turn it on.',
  }),
  chooseTitle: i18n.translate('xpack.alertzero.poc.alertInvestigation.chooseTitle', {
    defaultMessage: 'Manage investigation rules',
  }),
  chooseHelp: i18n.translate('xpack.alertzero.poc.alertInvestigation.chooseHelp', {
    defaultMessage:
      'Select rules individually or in bulk. This selection controls investigation only; it does not change your detection rules.',
  }),
  disabledHelp: i18n.translate('xpack.alertzero.poc.alertInvestigation.disabledHelp', {
    defaultMessage: 'Enable this detection rule before including it in investigation.',
  }),
  search: i18n.translate('xpack.alertzero.poc.alertInvestigation.search', {
    defaultMessage: 'Search detection rules',
  }),
  cancel: i18n.translate('xpack.alertzero.poc.alertInvestigation.cancel', {
    defaultMessage: 'Cancel',
  }),
  apply: i18n.translate('xpack.alertzero.poc.alertInvestigation.apply', {
    defaultMessage: 'Apply selection',
  }),
  applyHelp: i18n.translate('xpack.alertzero.poc.alertInvestigation.applyHelp', {
    defaultMessage: 'Apply your selection, then save the configuration to use it.',
  }),
  rule: i18n.translate('xpack.alertzero.poc.alertInvestigation.rule', {
    defaultMessage: 'Detection rule',
  }),
  status: i18n.translate('xpack.alertzero.poc.alertInvestigation.status', {
    defaultMessage: 'Status',
  }),
  enabled: i18n.translate('xpack.alertzero.poc.alertInvestigation.enabled', {
    defaultMessage: 'Enabled',
  }),
  disabled: i18n.translate('xpack.alertzero.poc.alertInvestigation.disabled', {
    defaultMessage: 'Disabled',
  }),
  alerts: i18n.translate('xpack.alertzero.poc.alertInvestigation.alerts', {
    defaultMessage: 'Alerts (24h)',
  }),
};

const formatNumber = (value: number): string => new Intl.NumberFormat().format(value);
const rulesCount = (count: number): string =>
  i18n.translate('xpack.alertzero.poc.alertInvestigation.rulesCount', {
    defaultMessage:
      '{count, plural, one {# detection rule available} other {# detection rules available}}',
    values: { count },
  });
const includedCount = (count: number): string =>
  i18n.translate('xpack.alertzero.poc.alertInvestigation.includedCount', {
    defaultMessage:
      '{count, plural, one {# enabled rule included} other {# enabled rules included}}',
    values: { count },
  });

const columns: Array<EuiBasicTableColumn<DemoAlertInvestigationRule>> = [
  {
    field: 'label',
    name: copy.rule,
    render: (label: string, rule: DemoAlertInvestigationRule) => (
      <div>
        <EuiText size="s">{label}</EuiText>
        {rule.category ? (
          <EuiText size="xs" color="subdued">
            {rule.category}
          </EuiText>
        ) : null}
      </div>
    ),
  },
  {
    field: 'enabled',
    name: copy.status,
    width: '110px',
    render: (enabled: boolean) => (
      <EuiBadge color={enabled ? 'hollow' : 'default'}>
        {enabled ? copy.enabled : copy.disabled}
      </EuiBadge>
    ),
  },
  {
    field: 'alertsLast24h',
    name: copy.alerts,
    width: '110px',
    align: 'right',
    render: formatNumber,
  },
];

/** A sample-only automatic-investigation setup with native bulk rule selection. */
export const DemoAlertInvestigation: React.FC<{
  value: DemoAlertInvestigationConfig;
  rules: readonly DemoAlertInvestigationRule[];
  onChange: (next: DemoAlertInvestigationConfig) => void;
  getRuleHref?: (ruleId: string) => string;
  onEditRule?: (ruleId: string) => void;
}> = ({ value, rules, onChange, getRuleHref, onEditRule }) => {
  const { euiTheme } = useEuiTheme();
  const groupId = useGeneratedHtmlId({ prefix: 'alertZeroPocInvestigationScope' });
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'alertZeroPocInvestigationRules' });
  const rulesTableId = useGeneratedHtmlId({ prefix: 'alertZeroPocRulesTable' });
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [managerMode, setManagerMode] = useState<'all_current' | 'selected'>('selected');
  const enabledRules = rules.filter((rule) => rule.enabled);
  const includedRules = getIncludedDemoRules(value, rules);
  const selectedScope: DemoAlertInvestigationConfig =
    value.mode === 'all_enabled'
      ? { ...value, mode: 'selected', ruleIds: includedRules.map(({ id }) => id) }
      : value;
  const includedIds = new Set(includedRules.map(({ id }) => id));
  const nativeRules = rules.filter(({ source }) => source === 'detection_rules');
  const alerts = enabledRules.reduce((total, rule) => total + rule.alertsLast24h, 0);
  const includedAlerts = includedRules.reduce((total, rule) => total + rule.alertsLast24h, 0);
  const filteredRules = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return rules.filter(({ label, category }) =>
      `${label} ${category ?? ''}`.toLocaleLowerCase().includes(term)
    );
  }, [rules, search]);
  const pageRules = filteredRules.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const selectedRules = pageRules.filter(({ id }) => selectedIds.includes(id));
  const selectedEnabledCount = enabledRules.filter(({ id }) => selectedIds.includes(id)).length;
  const openManager = () => {
    setSelectedIds(
      rules.filter(({ id }) => selectedScope.ruleIds.includes(id)).map(({ id }) => id)
    );
    setSearch('');
    setPageIndex(0);
    setManagerMode(
      includedRules.length > 0 && includedRules.length === enabledRules.length
        ? 'all_current'
        : 'selected'
    );
    setIsManagerOpen(true);
  };
  const coverage = !value.enabled
    ? copy.paused
    : includedRules.length === 0
    ? enabledRules.length === 0
      ? copy.noAvailableRules
      : copy.noRules
    : includedAlerts === 0
    ? copy.noAlerts
    : i18n.translate('xpack.alertzero.poc.alertInvestigation.coverage', {
        defaultMessage:
          'New alerts from {count, plural, one {this rule are} other {these # rules are}} investigated automatically.',
        values: { count: includedRules.length },
      });
  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{rulesCount(rules.length)}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.alertzero.poc.alertInvestigation.ruleStatusSummary', {
                defaultMessage: '{enabled} enabled · {disabled} disabled',
                values: {
                  enabled: formatNumber(enabledRules.length),
                  disabled: formatNumber(rules.length - enabledRules.length),
                },
              })}
            </p>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.alertzero.poc.alertInvestigation.recentAlerts', {
                defaultMessage:
                  '{count, plural, one {# alert in the last 24 hours} other {# alerts in the last 24 hours}}',
                values: { count: alerts },
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={value.enabled ? 'success' : 'hollow'}>
            {value.enabled ? copy.on : copy.off}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiSwitch
        label={copy.auto}
        checked={value.enabled}
        data-test-subj="alertZeroPocInvestigationEnabled"
        onChange={({ target }) => onChange({ ...selectedScope, enabled: target.checked })}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{copy.specific}</strong>
          </EuiText>
          <EuiText size="s" color="subdued">
            <p>{includedCount(includedRules.length)}</p>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>{copy.specificSummary}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="listBullet"
            size="s"
            onClick={openManager}
            data-test-subj="alertZeroPocInvestigationManageRules"
          >
            {copy.manage}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
      <EuiSwitch
        label={copy.excludeBuildingBlocks}
        aria-label={copy.excludeBuildingBlocks}
        checked={value.excludeBuildingBlocks ?? false}
        data-test-subj="alertZeroPocInvestigationExcludeBuildingBlocks"
        onChange={({ target }) =>
          onChange({ ...selectedScope, excludeBuildingBlocks: target.checked })
        }
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{copy.excludeBuildingBlocksHelp}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <div
        data-test-subj="alertZeroPocInvestigationCoverage"
        css={css`
          border-inline-start: 2px solid ${euiTheme.colors.borderBasePlain};
          padding-inline-start: ${euiTheme.size.m};
        `}
      >
        <EuiText size="s" color="subdued">
          <p
            data-test-subj={
              includedRules.length === 0 ? 'alertZeroPocInvestigationNoRules' : undefined
            }
          >
            {coverage}
          </p>
        </EuiText>
      </div>
      {nativeRules.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="m"
            data-test-subj="alertZeroPocConnectedRules"
          >
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.alertzero.poc.alertInvestigation.connectedRules', {
                  defaultMessage: 'Configured from Detection Rules',
                })}
              </h3>
            </EuiTitle>
            {nativeRules.map((rule) => (
              <React.Fragment key={rule.id}>
                <EuiSpacer size="s" />
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                  <EuiFlexItem>
                    <EuiText size="s">
                      {getRuleHref ? (
                        <EuiLink
                          href={getRuleHref(rule.id)}
                          data-test-subj={`alertZeroPocConnectedRule-${rule.id}`}
                          onClick={
                            onEditRule
                              ? (event: React.MouseEvent) => {
                                  event.preventDefault();
                                  onEditRule(rule.id);
                                }
                              : undefined
                          }
                        >
                          {rule.label}
                        </EuiLink>
                      ) : (
                        rule.label
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={includedIds.has(rule.id) ? 'success' : 'hollow'}>
                      {!rule.enabled
                        ? copy.disabled
                        : includedIds.has(rule.id)
                        ? i18n.translate('xpack.alertzero.poc.alertInvestigation.included', {
                            defaultMessage: 'Included',
                          })
                        : i18n.translate('xpack.alertzero.poc.alertInvestigation.notIncluded', {
                            defaultMessage: 'Not included',
                          })}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </React.Fragment>
            ))}
          </EuiPanel>
        </>
      ) : null}
      {isManagerOpen ? (
        <EuiFlyout
          size="l"
          onClose={() => setIsManagerOpen(false)}
          aria-labelledby={flyoutTitleId}
          data-test-subj="alertZeroPocInvestigationRulesFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{copy.chooseTitle}</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>{copy.chooseHelp}</p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <div
              css={css`
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
                gap: ${euiTheme.size.m};
              `}
            >
              <EuiFlexItem>
                <EuiCheckableCard
                  css={css`
                    height: 100%;
                  `}
                  id={`${groupId}-all`}
                  name={groupId}
                  checkableType="radio"
                  label={copy.all}
                  checked={managerMode === 'all_current'}
                  onChange={() => {
                    setManagerMode('all_current');
                    setSelectedIds((current) =>
                      rules
                        .filter(({ id, enabled }) => enabled || current.includes(id))
                        .map(({ id }) => id)
                    );
                  }}
                  data-test-subj="alertZeroPocInvestigationScopeAll"
                >
                  <EuiText size="s" color="subdued">
                    <p>{copy.allHelp}</p>
                  </EuiText>
                </EuiCheckableCard>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCheckableCard
                  css={css`
                    height: 100%;
                  `}
                  id={`${groupId}-selected`}
                  name={groupId}
                  checkableType="radio"
                  label={copy.specific}
                  checked={managerMode === 'selected'}
                  onChange={() => setManagerMode('selected')}
                  data-test-subj="alertZeroPocInvestigationScopeSelected"
                >
                  <EuiText size="s" color="subdued">
                    <p>{copy.specificHelp}</p>
                  </EuiText>
                </EuiCheckableCard>
              </EuiFlexItem>
            </div>

            <EuiSpacer size="l" />
            <EuiFieldSearch
              fullWidth
              value={search}
              placeholder={copy.search}
              aria-label={copy.search}
              onChange={({ target }) => {
                setSearch(target.value);
                setPageIndex(0);
              }}
              isClearable
            />
            <EuiSpacer size="m" />
            <EuiText size="s">
              <strong>{includedCount(selectedEnabledCount)}</strong>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable<DemoAlertInvestigationRule>
              compressed
              id={rulesTableId}
              itemId="id"
              items={pageRules}
              columns={columns}
              tableCaption={copy.chooseTitle}
              data-test-subj="alertZeroPocInvestigationRulesTable"
              selection={{
                selected: selectedRules,
                selectable: ({ id, enabled }) => enabled || selectedIds.includes(id),
                selectableMessage: (selectable) => (selectable ? '' : copy.disabledHelp),
                onSelectionChange: (next) => {
                  setManagerMode('selected');
                  const visibleIds = new Set(pageRules.map(({ id }) => id));
                  setSelectedIds((current) => [
                    ...current.filter((id) => !visibleIds.has(id)),
                    ...next.map(({ id }) => id),
                  ]);
                },
              }}
            />
            {filteredRules.length > 10 ? (
              <>
                <EuiSpacer size="m" />
                <EuiText size="xs" color="subdued">
                  <p>
                    {i18n.translate('xpack.alertzero.poc.alertInvestigation.pageSummary', {
                      defaultMessage: 'Showing {start}–{end} of {total} rules',
                      values: {
                        start: formatNumber(pageIndex * pageSize + 1),
                        end: formatNumber(
                          Math.min((pageIndex + 1) * pageSize, filteredRules.length)
                        ),
                        total: formatNumber(filteredRules.length),
                      },
                    })}
                  </p>
                </EuiText>
                <EuiSpacer size="s" />
                {/* Keep paging separate so changing pages preserves the controlled rule selection. */}
                <EuiTablePagination
                  activePage={pageIndex}
                  itemsPerPage={pageSize}
                  itemsPerPageOptions={[10, 25, 50, 100]}
                  pageCount={Math.ceil(filteredRules.length / pageSize)}
                  onChangePage={setPageIndex}
                  onChangeItemsPerPage={(size) => {
                    setPageSize(size);
                    setPageIndex(0);
                  }}
                  aria-controls={rulesTableId}
                />
              </>
            ) : null}
            {selectedEnabledCount === 0 && managerMode === 'selected' ? (
              <>
                <EuiSpacer size="m" />
                <KbnInfoCallout size="s" title={copy.noRules} />
              </>
            ) : null}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiText size="xs" color="subdued">
              <p>{copy.applyHelp}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={() => setIsManagerOpen(false)}
                  data-test-subj="alertZeroPocInvestigationCancelRules"
                >
                  {copy.cancel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={() => {
                    onChange({
                      ...value,
                      mode: 'selected',
                      ruleIds: rules
                        .filter(({ id }) => selectedIds.includes(id))
                        .map(({ id }) => id),
                    });
                    setIsManagerOpen(false);
                  }}
                  data-test-subj="alertZeroPocInvestigationApplyRules"
                >
                  {copy.apply}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      ) : null}
    </>
  );
};
