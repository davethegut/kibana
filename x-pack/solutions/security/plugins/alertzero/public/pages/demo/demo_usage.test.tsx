/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { BarSeries } from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n-react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoUsage } from './demo_usage';
import { loadDemoWorkflowUsage } from './demo_usage_data';
import type { DemoWorkflowUsageData } from './demo_usage_data';

const mockCapabilities = { canReadManagedWorkflowExecution: true };
const mockHttp = {};
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { http: mockHttp } }),
}));
jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn(),
  useWorkflowsCapabilities: () => mockCapabilities,
}));
jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="usageChart">{children}</div>
  ),
  Settings: () => null,
  BarSeries: jest.fn(() => null),
  Axis: () => null,
  Position: { Bottom: 'bottom', Left: 'left' },
  ScaleType: { Ordinal: 'ordinal', Linear: 'linear' },
}));
jest.mock('./demo_usage_data', () => ({ loadDemoWorkflowUsage: jest.fn() }));
const mockLoad = jest.mocked(loadDemoWorkflowUsage);

const data: DemoWorkflowUsageData = {
  from: '2026-11-17T00:00:00.000Z',
  to: '2026-11-23T23:59:00.000Z',
  limit: 100,
  totalExecutions: 3,
  failedDetails: 0,
  executions: [
    {
      id: 'run-one',
      workflowId: 'analysis',
      workflowName: 'Alert analysis',
      status: 'completed',
      startedAt: '2026-11-23T18:00:00.000Z',
      duration: 3500,
      isTestRun: false,
      usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
      usageUnavailable: false,
    },
    {
      id: 'run-two',
      workflowId: 'summary',
      workflowName: 'Investigation summary',
      status: 'failed',
      startedAt: '2026-11-22T12:00:00.000Z',
      isTestRun: false,
      usageUnavailable: true,
    },
    {
      id: 'run-three',
      workflowId: 'coverage',
      workflowName: 'Rule coverage',
      status: 'completed',
      startedAt: '2026-11-21T09:00:00.000Z',
      duration: 0,
      isTestRun: true,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      usageUnavailable: false,
    },
  ],
};

const renderUsage = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <DemoUsage />
      </EuiProvider>
    </I18nProvider>
  );

describe('DemoUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilities.canReadManagedWorkflowExecution = true;
    mockLoad.mockResolvedValue(data);
  });
  afterEach(() => jest.restoreAllMocks());

  it('shows recorded token consumption and distinguishes missing reports from zero', async () => {
    renderUsage();
    expect(await screen.findByRole('heading', { name: '120' })).toBeInTheDocument();
    expect(
      screen.getByText('2 of 3 displayed executions reported token usage.')
    ).toBeInTheDocument();
    const table = screen.getByTestId('alertZeroPocUsageExecutions');
    const missing = within(table).getByRole('row', { name: /Investigation summary/ });
    expect(within(missing).getAllByText('Not reported')).toHaveLength(3);
    const zero = within(table).getByRole('row', { name: /Rule coverage/ });
    expect(within(zero).getAllByText('0')).toHaveLength(3);
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it('changes the selected period and refreshes recorded data', async () => {
    renderUsage();
    await screen.findByRole('heading', { name: '120' });
    await userEvent.click(screen.getByText('24h', { exact: true }));
    await waitFor(() =>
      expect(mockLoad).toHaveBeenLastCalledWith(
        expect.anything(),
        '24h',
        undefined,
        expect.any(Function),
        true
      )
    );
    await screen.findByRole('heading', { name: '120' });
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(3));
  });

  it('lets users include executions without token reports', async () => {
    renderUsage();
    await screen.findByRole('heading', { name: '120' });
    expect(screen.getByText('Executions with token reports')).toBeInTheDocument();
    await userEvent.click(screen.getByText('All executions', { exact: true }));
    await waitFor(() =>
      expect(mockLoad).toHaveBeenLastCalledWith(
        expect.anything(),
        '7d',
        undefined,
        expect.any(Function),
        false
      )
    );
  });

  it('does not turn unreported usage into a zero total or a zero chart', async () => {
    mockLoad.mockResolvedValue({ ...data, totalExecutions: 1, executions: [data.executions[1]] });
    renderUsage();
    expect(await screen.findByRole('heading', { name: 'Not reported' })).toBeInTheDocument();
    expect(screen.getByText('Token usage has not been reported')).toBeInTheDocument();
    expect(screen.queryByTestId('usageChart')).not.toBeInTheDocument();
  });

  it('shows every UTC date in the selected period while keeping recorded token totals unchanged', async () => {
    renderUsage();
    await screen.findByRole('heading', { name: '120' });
    const calls = jest.mocked(BarSeries).mock.calls;
    const chartData = calls[calls.length - 1][0].data as Array<{
      day: string;
      tokens: number;
    }>;
    expect([...new Set(chartData.map(({ day }) => day))]).toEqual([
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
    expect(chartData.filter(({ day }) => day === '2026-11-17').map(({ tokens }) => tokens)).toEqual(
      [0, 0]
    );
    expect(chartData.reduce((sum, { tokens }) => sum + tokens, 0)).toBe(120);
    expect(screen.getByText(/Dates without reports show zero recorded tokens/)).toBeInTheDocument();
  });

  it('discloses loaded-record limits and failed detail reads', async () => {
    mockLoad.mockResolvedValue({ ...data, totalExecutions: 340, failedDetails: 1 });
    renderUsage();
    expect(
      await screen.findByText(
        'Showing the latest 3 of 340 executions. Token totals and the chart cover only these 3 executions.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Usage details could not be loaded for 1 execution. Their usage is not included.'
      )
    ).toBeInTheDocument();
  });

  it('does not infer zero activity when managed execution access is unavailable', async () => {
    mockCapabilities.canReadManagedWorkflowExecution = false;
    renderUsage();
    expect(
      await screen.findByText('Workflow execution access is required to view AlertZero usage.')
    ).toBeInTheDocument();
    expect(mockLoad).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: '0' })).not.toBeInTheDocument();
  });

  it('ignores an older request that completes after a period change', async () => {
    let completeFirst: ((result: DemoWorkflowUsageData) => void) | undefined;
    mockLoad.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeFirst = resolve;
        })
    );
    renderUsage();
    await userEvent.click(screen.getByText('30d', { exact: true }));
    await screen.findByRole('heading', { name: '120' });
    await act(async () => completeFirst?.({ ...data, totalExecutions: 999 }));
    expect(screen.queryByText('999')).not.toBeInTheDocument();
  });

  it('exports only displayed-record fields and escapes spreadsheet formula names', async () => {
    mockLoad.mockResolvedValue({
      ...data,
      executions: [{ ...data.executions[0], workflowName: '=SUM(1,2)' }],
      totalExecutions: 1,
    });
    const create = jest.fn().mockReturnValue('blob:usage');
    const revoke = jest.fn();
    const originalUrl = URL;
    global.URL = Object.defineProperties(class extends URL {}, {
      createObjectURL: { value: create },
      revokeObjectURL: { value: revoke },
    });
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      renderUsage();
      await screen.findByRole('heading', { name: '120' });
      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
      const csv = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(create.mock.calls[0][0]);
      });
      expect(csv).toContain('"\'=SUM(1,2)"');
      expect(csv).toContain('"run-one"');
      expect(csv).not.toContain('workflowDefinition');
      expect(revoke).toHaveBeenCalledWith('blob:usage');
    } finally {
      global.URL = originalUrl;
    }
  });
});
