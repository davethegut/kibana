/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { WorkflowApi, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { loadDemoWorkflowUsage } from './demo_usage_data';
import type { DemoUsageExecution, DemoUsagePeriod, DemoWorkflowUsageData } from './demo_usage_data';

const copy = {
  title: i18n.translate('xpack.alertzero.poc.usage.recorded', {
    defaultMessage: 'Recorded tokens',
  }),
  description: i18n.translate('xpack.alertzero.poc.usage.description', {
    defaultMessage: 'Token consumption reported by AlertZero workflow executions in this space.',
  }),
  period: i18n.translate('xpack.alertzero.poc.usage.period', { defaultMessage: 'Time range' }),
  view: i18n.translate('xpack.alertzero.poc.usage.view', { defaultMessage: 'Execution view' }),
  withReports: i18n.translate('xpack.alertzero.poc.usage.withReports', {
    defaultMessage: 'With token reports',
  }),
  allExecutions: i18n.translate('xpack.alertzero.poc.usage.allExecutions', {
    defaultMessage: 'All executions',
  }),
  reportedExecutions: i18n.translate('xpack.alertzero.poc.usage.reportedExecutions', {
    defaultMessage: 'Executions with token reports',
  }),
  reportViewDescription: i18n.translate('xpack.alertzero.poc.usage.reportViewDescription', {
    defaultMessage:
      'Showing executions with reported token usage. Choose All executions to include work without a token report.',
  }),
  refresh: i18n.translate('xpack.alertzero.poc.usage.refresh', { defaultMessage: 'Refresh' }),
  input: i18n.translate('xpack.alertzero.poc.usage.input', { defaultMessage: 'Input tokens' }),
  output: i18n.translate('xpack.alertzero.poc.usage.output', { defaultMessage: 'Output tokens' }),
  total: i18n.translate('xpack.alertzero.poc.usage.total', { defaultMessage: 'Total tokens' }),
  runs: i18n.translate('xpack.alertzero.poc.usage.runs', { defaultMessage: 'Workflow executions' }),
  trend: i18n.translate('xpack.alertzero.poc.usage.trend', { defaultMessage: 'Daily token usage' }),
  trendDescription: i18n.translate('xpack.alertzero.poc.usage.trendDescription', {
    defaultMessage:
      'Reported input and output tokens by execution start date. Dates without reports show zero recorded tokens.',
  }),
  tokens: i18n.translate('xpack.alertzero.poc.usage.tokens', { defaultMessage: 'Tokens' }),
  date: i18n.translate('xpack.alertzero.poc.usage.date', { defaultMessage: 'Date (UTC)' }),
  workflow: i18n.translate('xpack.alertzero.poc.usage.workflow', { defaultMessage: 'Workflow' }),
  status: i18n.translate('xpack.alertzero.poc.usage.status', { defaultMessage: 'Status' }),
  duration: i18n.translate('xpack.alertzero.poc.usage.duration', { defaultMessage: 'Duration' }),
  test: i18n.translate('xpack.alertzero.poc.usage.test', { defaultMessage: 'Test' }),
  unknown: i18n.translate('xpack.alertzero.poc.usage.unknown', { defaultMessage: 'Not reported' }),
  empty: i18n.translate('xpack.alertzero.poc.usage.empty', {
    defaultMessage: 'No AlertZero workflow executions in this period',
  }),
  emptyReported: i18n.translate('xpack.alertzero.poc.usage.emptyReported', {
    defaultMessage: 'No AlertZero executions with token reports in this period',
  }),
  noUsage: i18n.translate('xpack.alertzero.poc.usage.noUsage', {
    defaultMessage: 'Token usage has not been reported',
  }),
  noUsageDescription: i18n.translate('xpack.alertzero.poc.usage.noUsageDescription', {
    defaultMessage:
      'The execution records are available below. Missing usage is not counted as zero.',
  }),
  error: i18n.translate('xpack.alertzero.poc.usage.error', {
    defaultMessage: 'Could not load workflow usage. Refresh to try again.',
  }),
  access: i18n.translate('xpack.alertzero.poc.usage.access', {
    defaultMessage: 'Workflow execution access is required to view AlertZero usage.',
  }),
  search: i18n.translate('xpack.alertzero.poc.usage.search', {
    defaultMessage: 'Search workflow executions',
  }),
  export: i18n.translate('xpack.alertzero.poc.usage.export', { defaultMessage: 'Export CSV' }),
  footer: i18n.translate('xpack.alertzero.poc.usage.footer', {
    defaultMessage:
      'Usage covers reported AI steps in these executions. Unreported usage and direct inference outside workflows are not included. Running executions may still be accumulating tokens.',
  }),
};

const full = new Intl.NumberFormat();
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const tokenValue = (value: number | undefined): string =>
  value === undefined ? copy.unknown : full.format(value);
const dateValue = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));

const csvCell = (value: string | number | undefined): string => {
  const raw = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

const exportRows = (rows: DemoUsageExecution[]): void => {
  const csv = [
    [
      copy.date,
      copy.workflow,
      'Execution ID',
      copy.status,
      'Duration (ms)',
      copy.input,
      copy.output,
      copy.total,
      'Usage reported',
      copy.test,
    ],
    ...rows.map((row) => [
      row.startedAt,
      row.workflowName,
      row.id,
      row.status,
      row.duration,
      row.usage?.inputTokens,
      row.usage?.outputTokens,
      row.usage?.totalTokens,
      row.usage ? 'true' : 'false',
      row.isTestRun ? 'true' : 'false',
    ]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'alertzero-workflow-usage.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};

/** Reads existing Workflow execution records to present their reported inference consumption. */
export const DemoUsage: React.FC = () => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const { euiTheme } = useEuiTheme();
  const baseTheme = useElasticChartsTheme();
  const { canReadManagedWorkflowExecution } = useWorkflowsCapabilities();
  const api = useMemo(() => new WorkflowApi(http), [http]);
  const [period, setPeriod] = useState<DemoUsagePeriod>('7d');
  const [reportsOnly, setReportsOnly] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<DemoWorkflowUsageData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => {
    if (!canReadManagedWorkflowExecution) {
      setData(undefined);
      setLoading(false);
      return;
    }
    let stopped = false;
    setLoading(true);
    setError(false);
    setData(undefined);
    setPageIndex(0);
    loadDemoWorkflowUsage(api, period, undefined, () => stopped, reportsOnly)
      .then((result) => {
        if (!stopped) setData(result);
      })
      .catch(() => {
        if (!stopped) setError(true);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [api, period, reportsOnly, refresh, canReadManagedWorkflowExecution]);

  const rows = data?.executions ?? [];
  const reported = rows.filter(({ usage }) => usage !== undefined);
  const totals = reported.reduce(
    (sum, { usage }) => ({
      input: sum.input + (usage?.inputTokens ?? 0),
      output: sum.output + (usage?.outputTokens ?? 0),
      total: sum.total + (usage?.totalTokens ?? 0),
    }),
    { input: 0, output: 0, total: 0 }
  );
  const hasTokens = reported.length > 0;
  const noExecutions = data?.totalExecutions === 0;
  const truncated = data !== undefined && data.totalExecutions > rows.length;
  const filteredRows = rows.filter((row) =>
    `${row.workflowName} ${row.id}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );
  const daily = new Map<string, { day: string; input: number; output: number }>();
  if (data) {
    const firstDay = Date.parse(`${data.from.slice(0, 10)}T00:00:00.000Z`);
    const lastDay = Date.parse(`${data.to.slice(0, 10)}T00:00:00.000Z`);
    for (let timestamp = firstDay; timestamp <= lastDay; timestamp += 24 * 60 * 60 * 1000) {
      const day = new Date(timestamp).toISOString().slice(0, 10);
      daily.set(day, { day, input: 0, output: 0 });
    }
  }
  for (const row of reported) {
    const day = row.startedAt.slice(0, 10);
    const bucket = daily.get(day) ?? { day, input: 0, output: 0 };
    bucket.input += row.usage?.inputTokens ?? 0;
    bucket.output += row.usage?.outputTokens ?? 0;
    daily.set(day, bucket);
  }
  const chartData = [...daily.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .flatMap((day) => [
      { day: day.day, kind: copy.input, tokens: day.input },
      { day: day.day, kind: copy.output, tokens: day.output },
    ]);
  const columns: Array<EuiBasicTableColumn<DemoUsageExecution>> = [
    { field: 'startedAt', name: copy.date, width: '145px', render: dateValue },
    {
      field: 'workflowName',
      name: copy.workflow,
      render: (name: string, row) => (
        <>
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
          {row.isTestRun && <EuiBadge color="hollow">{copy.test}</EuiBadge>}
        </>
      ),
    },
    {
      field: 'status',
      name: copy.status,
      width: '110px',
      render: (status: string) => (
        <EuiBadge
          color={status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'hollow'}
        >
          {status.replaceAll('_', ' ')}
        </EuiBadge>
      ),
    },
    {
      field: 'duration',
      name: copy.duration,
      width: '85px',
      align: 'right',
      render: (duration?: number) =>
        duration == null
          ? '—'
          : duration < 1000
          ? `${full.format(duration)} ms`
          : `${full.format(Math.round(duration / 100) / 10)} s`,
    },
    {
      name: copy.input,
      width: '110px',
      align: 'right',
      render: (row: DemoUsageExecution) => tokenValue(row.usage?.inputTokens),
    },
    {
      name: copy.output,
      width: '110px',
      align: 'right',
      render: (row: DemoUsageExecution) => tokenValue(row.usage?.outputTokens),
    },
    {
      name: copy.total,
      width: '110px',
      align: 'right',
      render: (row: DemoUsageExecution) => <strong>{tokenValue(row.usage?.totalTokens)}</strong>,
    },
  ];
  const inputColor = euiTheme.colors.vis.euiColorVis4;
  const outputColor = euiTheme.colors.vis.euiColorVis0;
  const inputPercent =
    totals.input + totals.output > 0 ? (totals.input / (totals.input + totals.output)) * 100 : 0;

  return (
    <div data-test-subj="alertZeroPocUsage">
      <EuiText size="s" color="subdued">
        <p>{copy.description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={copy.period}
            idSelected={period}
            options={[
              { id: '24h', label: '24h' },
              { id: '7d', label: '7d' },
              { id: '30d', label: '30d' },
            ]}
            onChange={(id) => setPeriod(id as DemoUsagePeriod)}
            buttonSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={copy.view}
            idSelected={reportsOnly ? 'reported' : 'all'}
            options={[
              { id: 'reported', label: copy.withReports },
              { id: 'all', label: copy.allExecutions },
            ]}
            onChange={(id) => setReportsOnly(id === 'reported')}
            buttonSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="refresh"
            size="s"
            onClick={() => setRefresh((current) => current + 1)}
            isLoading={loading}
          >
            {copy.refresh}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {reportsOnly && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>{copy.reportViewDescription}</p>
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
      {!canReadManagedWorkflowExecution ? (
        <KbnWarningCallout title={copy.access} />
      ) : error ? (
        <KbnWarningCallout title={copy.error} />
      ) : loading ? (
        <EuiPanel hasBorder hasShadow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiPanel>
      ) : data ? (
        <>
          <EuiPanel hasBorder hasShadow={false} paddingSize="l">
            <EuiText size="s" color="subdued">
              <p>{copy.title}</p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiTitle size="l">
              <h2 title={hasTokens ? full.format(totals.total) : undefined}>
                {hasTokens || noExecutions ? compact.format(totals.total) : copy.unknown}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            {totals.total > 0 && (
              <div
                aria-hidden="true"
                css={css`
                  display: flex;
                  height: ${euiTheme.size.xs};
                  border-radius: ${euiTheme.border.radius.small};
                  overflow: hidden;
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                `}
              >
                <div
                  css={css`
                    width: ${inputPercent}%;
                    background: ${inputColor};
                  `}
                />
                <div
                  css={css`
                    flex: 1;
                    background: ${outputColor};
                  `}
                />
              </div>
            )}
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('xpack.alertzero.poc.usage.coverage', {
                  defaultMessage:
                    '{reported} of {loaded} displayed executions reported token usage.',
                  values: { reported: reported.length, loaded: rows.length },
                })}
              </p>
            </EuiText>
          </EuiPanel>
          <EuiSpacer size="m" />
          {truncated && (
            <>
              <KbnWarningCallout
                size="s"
                title={i18n.translate('xpack.alertzero.poc.usage.limited', {
                  defaultMessage:
                    'Showing the latest {loaded} of {total} executions. Token totals and the chart cover only these {loaded} executions.',
                  values: { loaded: rows.length, total: data.totalExecutions },
                })}
              />
              <EuiSpacer size="m" />
            </>
          )}
          {data.failedDetails > 0 && (
            <>
              <KbnWarningCallout
                size="s"
                title={i18n.translate('xpack.alertzero.poc.usage.detailsFailed', {
                  defaultMessage:
                    'Usage details could not be loaded for {count, plural, one {# execution} other {# executions}}. Their usage is not included.',
                  values: { count: data.failedDetails },
                })}
              />
              <EuiSpacer size="m" />
            </>
          )}
          <EuiFlexGroup gutterSize="m" wrap>
            {[
              {
                label: copy.input,
                value: hasTokens || noExecutions ? compact.format(totals.input) : copy.unknown,
              },
              {
                label: copy.output,
                value: hasTokens || noExecutions ? compact.format(totals.output) : copy.unknown,
              },
              {
                label: reportsOnly ? copy.reportedExecutions : copy.runs,
                value: full.format(data.totalExecutions),
              },
            ].map((stat) => (
              <EuiFlexItem key={stat.label}>
                <EuiPanel hasBorder hasShadow={false}>
                  <EuiText size="s" color="subdued">
                    <p>{stat.label}</p>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiTitle size="s">
                    <p>{stat.value}</p>
                  </EuiTitle>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiPanel hasBorder hasShadow={false} paddingSize="l">
            <EuiTitle size="xs">
              <h3>{copy.trend}</h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>{copy.trendDescription}</p>
            </EuiText>
            <EuiSpacer size="m" />
            {hasTokens ? (
              <Chart size={{ height: 240 }}>
                <Settings baseTheme={baseTheme} showLegend legendPosition={Position.Bottom} />
                <BarSeries
                  id="workflowTokens"
                  data={chartData}
                  xAccessor="day"
                  yAccessors={['tokens']}
                  splitSeriesAccessors={['kind']}
                  stackAccessors={['day']}
                  xScaleType={ScaleType.Ordinal}
                  yScaleType={ScaleType.Linear}
                  color={[inputColor, outputColor]}
                />
                <Axis id="dates" position={Position.Bottom} title={copy.date} />
                <Axis
                  id="tokens"
                  position={Position.Left}
                  title={copy.tokens}
                  tickFormat={(value) => compact.format(Number(value))}
                />
              </Chart>
            ) : (
              <EuiEmptyPrompt
                iconType="chartBarVertical"
                title={
                  <h4>
                    {noExecutions ? (reportsOnly ? copy.emptyReported : copy.empty) : copy.noUsage}
                  </h4>
                }
                body={noExecutions ? undefined : <p>{copy.noUsageDescription}</p>}
              />
            )}
          </EuiPanel>
          <EuiSpacer size="l" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>{copy.runs}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="download"
                onClick={() => exportRows(filteredRows)}
                isDisabled={filteredRows.length === 0}
              >
                {copy.export}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFieldSearch
            aria-label={copy.search}
            placeholder={copy.search}
            value={query}
            onChange={({ target }) => {
              setQuery(target.value);
              setPageIndex(0);
            }}
            isClearable
          />
          <EuiSpacer size="m" />
          <EuiBasicTable<DemoUsageExecution>
            items={filteredRows.slice(pageIndex * 10, (pageIndex + 1) * 10)}
            columns={columns}
            itemId="id"
            tableCaption={copy.runs}
            pagination={{
              pageIndex,
              pageSize: 10,
              totalItemCount: filteredRows.length,
              showPerPageOptions: false,
            }}
            onChange={({ page }: { page?: { index: number } }) => {
              if (page) setPageIndex(page.index);
            }}
            data-test-subj="alertZeroPocUsageExecutions"
          />
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <p>{copy.footer}</p>
          </EuiText>
        </>
      ) : null}
    </div>
  );
};
