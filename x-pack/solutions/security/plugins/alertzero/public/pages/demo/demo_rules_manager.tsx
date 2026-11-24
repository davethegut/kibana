/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSelect,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { DemoAlertInvestigationRule } from './demo_alert_investigation';

export type DemoRulesManagerFilter = 'all' | 'selected' | 'unselected' | 'new';
type DemoRulesManagerSort = 'alerts' | 'name';

const copy = {
  title: i18n.translate('xpack.alertzero.poc.next.rulesManager.title', {
    defaultMessage: 'Choose rules for AlertZero',
  }),
  help: i18n.translate('xpack.alertzero.poc.next.rulesManager.help', {
    defaultMessage:
      'Alerts from the rules you select start investigations. This does not change your detection rules.',
  }),
  search: i18n.translate('xpack.alertzero.poc.next.rulesManager.search', {
    defaultMessage: 'Search detection rules',
  }),
  filters: i18n.translate('xpack.alertzero.poc.next.rulesManager.filters', {
    defaultMessage: 'Filter rules',
  }),
  all: i18n.translate('xpack.alertzero.poc.next.rulesManager.all', { defaultMessage: 'All' }),
  selected: i18n.translate('xpack.alertzero.poc.next.rulesManager.selected', {
    defaultMessage: 'Selected',
  }),
  unselected: i18n.translate('xpack.alertzero.poc.next.rulesManager.unselected', {
    defaultMessage: 'Not selected',
  }),
  new: i18n.translate('xpack.alertzero.poc.next.rulesManager.new', { defaultMessage: 'New' }),
  sort: i18n.translate('xpack.alertzero.poc.next.rulesManager.sort', {
    defaultMessage: 'Sort rules',
  }),
  sortAlerts: i18n.translate('xpack.alertzero.poc.next.rulesManager.sortAlerts', {
    defaultMessage: 'Most alerts first',
  }),
  sortName: i18n.translate('xpack.alertzero.poc.next.rulesManager.sortName', {
    defaultMessage: 'Name',
  }),
  deselectShown: i18n.translate('xpack.alertzero.poc.next.rulesManager.deselectShown', {
    defaultMessage: 'Deselect shown',
  }),
  laterRules: i18n.translate('xpack.alertzero.poc.next.rulesManager.laterRules', {
    defaultMessage:
      'Selecting adds the rules that exist now. Rules added or enabled later are not included until you select them.',
  }),
  rule: i18n.translate('xpack.alertzero.poc.next.rulesManager.rule', {
    defaultMessage: 'Detection rule',
  }),
  status: i18n.translate('xpack.alertzero.poc.next.rulesManager.status', {
    defaultMessage: 'Status',
  }),
  enabled: i18n.translate('xpack.alertzero.poc.next.rulesManager.enabled', {
    defaultMessage: 'Enabled',
  }),
  disabled: i18n.translate('xpack.alertzero.poc.next.rulesManager.disabled', {
    defaultMessage: 'Disabled',
  }),
  newBadge: i18n.translate('xpack.alertzero.poc.next.rulesManager.newBadge', {
    defaultMessage: 'New',
  }),
  alerts: i18n.translate('xpack.alertzero.poc.next.rulesManager.alerts', {
    defaultMessage: 'Alerts (24h)',
  }),
  notCounted: i18n.translate('xpack.alertzero.poc.next.rulesManager.notCounted', {
    defaultMessage: 'Not counted',
  }),
  disabledHelp: i18n.translate('xpack.alertzero.poc.next.rulesManager.disabledHelp', {
    defaultMessage: 'Enable this detection rule before selecting it.',
  }),
  noMatches: i18n.translate('xpack.alertzero.poc.next.rulesManager.noMatches', {
    defaultMessage: 'No rules match.',
  }),
  evidence: i18n.translate('xpack.alertzero.poc.next.rulesManager.evidence', {
    defaultMessage:
      'During an investigation, AlertZero may read alerts from rules you did not select as evidence. Those alerts never start an investigation.',
  }),
  applyHelp: i18n.translate('xpack.alertzero.poc.next.rulesManager.applyHelp', {
    defaultMessage: 'Apply your selection, then save the configuration to use it.',
  }),
  cancel: i18n.translate('xpack.alertzero.poc.next.rulesManager.cancel', {
    defaultMessage: 'Cancel',
  }),
  apply: i18n.translate('xpack.alertzero.poc.next.rulesManager.apply', {
    defaultMessage: 'Apply selection',
  }),
};

const formatNumber = (value: number): string => new Intl.NumberFormat().format(value);

/** A sample-only rule picker that keeps every membership change an explicit customer selection. */
export const DemoRulesManager: React.FC<{
  rules: readonly DemoAlertInvestigationRule[];
  selectedRuleIds: readonly string[];
  newRuleIds?: readonly string[];
  initialFilter?: DemoRulesManagerFilter;
  /** Says what the customer does after applying; defaults to saving the configuration. */
  applyHelp?: string;
  onApply: (ruleIds: string[]) => void;
  onClose: () => void;
}> = ({
  rules,
  selectedRuleIds,
  newRuleIds = [],
  initialFilter = 'all',
  applyHelp = copy.applyHelp,
  onApply,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'alertZeroPocNextRulesManager' });
  const tableId = useGeneratedHtmlId({ prefix: 'alertZeroPocNextRulesTable' });
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    rules.filter(({ id }) => selectedRuleIds.includes(id)).map(({ id }) => id)
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DemoRulesManagerFilter>(initialFilter);
  // Membership filters use the selection at the time they were chosen, so rows stay put while editing.
  const [filterSelection, setFilterSelection] = useState<readonly string[]>(selectedIds);
  const [sort, setSort] = useState<DemoRulesManagerSort>('alerts');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const newIds = useMemo(() => new Set(newRuleIds), [newRuleIds]);
  const filteredRules = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const membership = new Set(filterSelection);
    return rules
      .filter(({ label, category }) =>
        `${label} ${category ?? ''}`.toLocaleLowerCase().includes(term)
      )
      .filter(({ id }) => {
        if (filter === 'selected') return membership.has(id);
        if (filter === 'unselected') return !membership.has(id);
        if (filter === 'new') return newIds.has(id);
        return true;
      })
      .sort((first, second) =>
        sort === 'alerts'
          ? second.alertsLast24h - first.alertsLast24h || first.label.localeCompare(second.label)
          : first.label.localeCompare(second.label)
      );
  }, [filter, filterSelection, newIds, rules, search, sort]);

  const pageRules = filteredRules.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const selectedOnPage = pageRules.filter(({ id }) => selectedIds.includes(id));
  const enabledShown = filteredRules.filter(({ enabled }) => enabled);
  const selectedRules = rules.filter(({ id }) => selectedIds.includes(id));
  const selectedAlerts = selectedRules
    .filter(({ enabled, source }) => enabled && source !== 'detection_rules')
    .reduce((total, { alertsLast24h }) => total + alertsLast24h, 0);

  const changeFilter = (next: DemoRulesManagerFilter) => {
    setFilter(next);
    setFilterSelection(selectedIds);
    setPageIndex(0);
  };
  const filterButtons: Array<{ id: DemoRulesManagerFilter; label: string; count?: number }> = [
    { id: 'all', label: copy.all },
    { id: 'selected', label: copy.selected },
    { id: 'unselected', label: copy.unselected },
    ...(newRuleIds.length > 0
      ? [{ id: 'new' as const, label: copy.new, count: newRuleIds.length }]
      : []),
  ];

  const columns: Array<EuiBasicTableColumn<DemoAlertInvestigationRule>> = [
    {
      field: 'label',
      name: copy.rule,
      render: (label: string, rule: DemoAlertInvestigationRule) => (
        <div>
          <EuiText size="s">
            {label}{' '}
            {newIds.has(rule.id) ? <EuiBadge color="accent">{copy.newBadge}</EuiBadge> : null}
          </EuiText>
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
      render: (count: number, { source }: DemoAlertInvestigationRule) =>
        source === 'detection_rules' ? copy.notCounted : formatNumber(count),
    },
  ];

  return (
    <EuiFlyout
      size="l"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="alertZeroPocNextRulesManager"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{copy.title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{copy.help}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
          <EuiFlexItem
            css={css`
              min-width: 220px;
            `}
          >
            <EuiFieldSearch
              fullWidth
              compressed
              value={search}
              placeholder={copy.search}
              aria-label={copy.search}
              onChange={({ target }) => {
                setSearch(target.value);
                setPageIndex(0);
              }}
              isClearable
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed role="group" aria-label={copy.filters}>
              {filterButtons.map(({ id, label, count }) => (
                <EuiFilterButton
                  key={id}
                  isToggle
                  isSelected={filter === id}
                  hasActiveFilters={filter === id}
                  numFilters={count}
                  onClick={() => changeFilter(id)}
                  data-test-subj={`alertZeroPocNextRulesFilter-${id}`}
                >
                  {label}
                </EuiFilterButton>
              ))}
            </EuiFilterGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              aria-label={copy.sort}
              value={sort}
              options={[
                { value: 'alerts', text: copy.sortAlerts },
                { value: 'name', text: copy.sortName },
              ]}
              onChange={({ target }) => {
                setSort(target.value === 'name' ? 'name' : 'alerts');
                setPageIndex(0);
              }}
              data-test-subj="alertZeroPocNextRulesSort"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj="alertZeroPocNextRulesSelectionSummary">
              <strong>
                {i18n.translate('xpack.alertzero.poc.next.rulesManager.selectionSummary', {
                  defaultMessage:
                    '{selected, number} of {total, number} rules selected · {alerts, plural, one {# alert} other {# alerts}} in the last 24 hours',
                  values: {
                    selected: selectedRules.length,
                    total: rules.length,
                    alerts: selectedAlerts,
                  },
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  disabled={enabledShown.length === 0}
                  onClick={() =>
                    setSelectedIds((current) => [
                      ...new Set([...current, ...enabledShown.map(({ id }) => id)]),
                    ])
                  }
                  data-test-subj="alertZeroPocNextRulesSelectShown"
                >
                  {i18n.translate('xpack.alertzero.poc.next.rulesManager.selectShown', {
                    defaultMessage:
                      'Select {count, plural, one {# enabled rule} other {all # enabled rules}} shown',
                    values: { count: enabledShown.length },
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  disabled={!filteredRules.some(({ id }) => selectedIds.includes(id))}
                  onClick={() => {
                    const shown = new Set(filteredRules.map(({ id }) => id));
                    setSelectedIds((current) => current.filter((id) => !shown.has(id)));
                  }}
                  data-test-subj="alertZeroPocNextRulesDeselectShown"
                >
                  {copy.deselectShown}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>{copy.laterRules}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<DemoAlertInvestigationRule>
          compressed
          id={tableId}
          itemId="id"
          items={pageRules}
          columns={columns}
          tableCaption={copy.title}
          noItemsMessage={copy.noMatches}
          data-test-subj="alertZeroPocNextRulesTable"
          selection={{
            selected: selectedOnPage,
            selectable: ({ id, enabled }) => enabled || selectedIds.includes(id),
            selectableMessage: (selectable) => (selectable ? '' : copy.disabledHelp),
            onSelectionChange: (next) => {
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
            <EuiSpacer size="s" />
            {/* Paging and sorting stay outside the table so they never clear the controlled selection. */}
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
              aria-controls={tableId}
            />
          </>
        ) : null}
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          <p>{copy.evidence}</p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiText size="xs" color="subdued">
          <p>{applyHelp}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="alertZeroPocNextRulesCancel">
              {copy.cancel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() =>
                onApply(rules.filter(({ id }) => selectedIds.includes(id)).map(({ id }) => id))
              }
              data-test-subj="alertZeroPocNextRulesApply"
            >
              {copy.apply}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
