/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowExecutionListDto,
  type WorkflowExecutionListItemDto,
  type WorkflowTokenUsage,
} from '@kbn/workflows';
import type { WorkflowApi } from '@kbn/workflows-ui';
import { loadDemoWorkflowUsage, type DemoUsagePeriod } from './demo_usage_data';

type UsageApi = Pick<WorkflowApi, 'searchExecutions' | 'getExecution'>;

const now = new Date('2026-11-23T16:00:00.000Z');

const createListItem = (
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto => ({
  id: 'run-1',
  spaceId: 'default',
  workflowId: 'system-security-worker-alert-triage',
  workflowName: 'Alert triage',
  status: ExecutionStatus.COMPLETED,
  startedAt: '2026-11-23T15:00:00.000Z',
  finishedAt: '2026-11-23T15:00:05.000Z',
  duration: 5000,
  isTestRun: false,
  error: null,
  ...overrides,
});

const createDetail = (overrides: Partial<WorkflowExecutionDto> = {}): WorkflowExecutionDto => ({
  ...createListItem(),
  workflowDefinition: {
    version: '1',
    name: 'Alert triage',
    enabled: true,
    triggers: [],
    steps: [],
  },
  yaml: 'private workflow definition',
  context: { sensitive: 'private context' },
  stepExecutions: [],
  ...overrides,
});

const createSearchResult = (
  results: WorkflowExecutionListItemDto[],
  total: number = results.length
): WorkflowExecutionListDto => ({ results, page: 1, size: 100, total });

const createApi = (): jest.Mocked<UsageApi> => ({
  searchExecutions: jest.fn(),
  getExecution: jest.fn(),
});

describe('loadDemoWorkflowUsage', () => {
  it.each<[DemoUsagePeriod, string]>([
    ['24h', '2026-11-22T16:00:00.000Z'],
    ['7d', '2026-11-16T16:00:00.000Z'],
    ['30d', '2026-10-24T16:00:00.000Z'],
  ])('queries all managed AlertZero execution types over %s', async (period, from) => {
    const api = createApi();
    api.searchExecutions.mockResolvedValue(createSearchResult([]));

    const data = await loadDemoWorkflowUsage(api, period, now);

    expect(api.searchExecutions).toHaveBeenCalledWith({
      kql: 'managedBy: "alertzero"',
      startedAfter: from,
      startedBefore: now.toISOString(),
      sortField: 'startedAt',
      sortOrder: 'desc',
      page: 1,
      size: 100,
      trackTotalHits: true,
    });
    expect(data).toEqual({
      executions: [],
      totalExecutions: 0,
      from,
      to: now.toISOString(),
      limit: 100,
      failedDetails: 0,
    });
    expect(api.getExecution).not.toHaveBeenCalled();
  });

  it('can select only executions with recorded token reports and preserve an empty result', async () => {
    const api = createApi();
    api.searchExecutions.mockResolvedValue(createSearchResult([]));

    const data = await loadDemoWorkflowUsage(api, '7d', now, undefined, true);

    expect(api.searchExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ kql: 'managedBy: "alertzero" AND usage.totalTokens:*' })
    );
    expect(data.totalExecutions).toBe(0);
    expect(data.executions).toEqual([]);
    expect(api.getExecution).not.toHaveBeenCalled();
  });

  it('caps hydration at 100 results with no more than five detail requests in flight', async () => {
    const api = createApi();
    const results = Array.from({ length: 105 }, (_, index) =>
      createListItem({ id: `run-${index}`, isTestRun: index % 2 === 0 })
    );
    let activeRequests = 0;
    let peakRequests = 0;
    api.searchExecutions.mockResolvedValue(createSearchResult(results, 1234));
    api.getExecution.mockImplementation(async (id) => {
      activeRequests++;
      peakRequests = Math.max(peakRequests, activeRequests);
      await Promise.resolve();
      activeRequests--;
      return createDetail({ id, isTestRun: Number(id.slice(4)) % 2 === 0 });
    });

    const data = await loadDemoWorkflowUsage(api, '7d', now);

    expect(data.executions).toHaveLength(100);
    expect(data.totalExecutions).toBe(1234);
    expect(api.getExecution).toHaveBeenCalledTimes(100);
    expect(peakRequests).toBe(5);
    expect(data.executions[0].isTestRun).toBe(true);
    expect(data.executions[1].isTestRun).toBe(false);
    expect(api.getExecution).toHaveBeenCalledWith('run-0', {
      omitStepExecutions: true,
      includeInput: false,
      includeOutput: false,
    });
  });

  it('distinguishes no reported usage from a valid zero-token execution', async () => {
    const api = createApi();
    api.searchExecutions.mockResolvedValue(
      createSearchResult([createListItem({ id: 'missing' }), createListItem({ id: 'zero' })])
    );
    api.getExecution.mockImplementation(async (id) =>
      createDetail({
        id,
        ...(id === 'zero' ? { usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } } : {}),
      })
    );

    const data = await loadDemoWorkflowUsage(api, '24h', now);

    expect(data.executions[0]).toMatchObject({ id: 'missing', usageUnavailable: false });
    expect(data.executions[0].usage).toBeUndefined();
    expect(data.executions[1]).toMatchObject({
      id: 'zero',
      usageUnavailable: false,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
  });

  it('retains list metadata when one detail request fails without discarding successful rows', async () => {
    const api = createApi();
    api.searchExecutions.mockResolvedValue(
      createSearchResult([createListItem({ id: 'failed' }), createListItem({ id: 'loaded' })])
    );
    api.getExecution.mockImplementation(async (id) => {
      if (id === 'failed') throw new Error('Forbidden');
      return createDetail({ id, usage: { inputTokens: 80, outputTokens: 20, totalTokens: 100 } });
    });

    const data = await loadDemoWorkflowUsage(api, '24h', now);

    expect(data.failedDetails).toBe(1);
    expect(data.executions[0]).toEqual({
      id: 'failed',
      workflowId: 'system-security-worker-alert-triage',
      workflowName: 'Alert triage',
      status: ExecutionStatus.COMPLETED,
      startedAt: '2026-11-23T15:00:00.000Z',
      finishedAt: '2026-11-23T15:00:05.000Z',
      duration: 5000,
      isTestRun: false,
      usageUnavailable: true,
    });
    expect(data.executions[1].usage?.totalTokens).toBe(100);
  });

  it('preserves the real display name when details omit workflow metadata', async () => {
    const api = createApi();
    api.searchExecutions.mockResolvedValue(createSearchResult([createListItem()]));
    api.getExecution.mockResolvedValue(
      createDetail({ workflowName: undefined, workflowId: undefined })
    );

    const data = await loadDemoWorkflowUsage(api, '24h', now);

    expect(data.executions[0]).toMatchObject({
      workflowName: 'Alert triage',
      workflowId: 'system-security-worker-alert-triage',
    });
  });

  it('selects canonical fields only and keeps cached tokens within the recorded input total', async () => {
    const api = createApi();
    api.searchExecutions.mockResolvedValue(createSearchResult([createListItem()]));
    api.getExecution.mockResolvedValue(
      createDetail({
        usage: { inputTokens: 80, outputTokens: 20, totalTokens: 100, cachedTokens: 60 },
        stepUsage: [
          {
            stepId: 'private-step',
            connectorId: 'private-connector',
            inputTokens: 80,
            outputTokens: 20,
            totalTokens: 100,
          },
        ],
        executedBy: 'private-user',
      })
    );

    const data = await loadDemoWorkflowUsage(api, '24h', now);

    expect(data.executions[0].usage).toEqual({
      inputTokens: 80,
      outputTokens: 20,
      totalTokens: 100,
      cachedTokens: 60,
    });
    expect(Object.keys(data.executions[0]).sort()).toEqual(
      [
        'id',
        'workflowId',
        'workflowName',
        'status',
        'startedAt',
        'finishedAt',
        'duration',
        'isTestRun',
        'usage',
        'usageUnavailable',
      ].sort()
    );
    expect(JSON.stringify(data)).not.toMatch(/private|context|yaml|workflowDefinition|stepUsage/);
  });

  it.each<WorkflowTokenUsage>([
    { inputTokens: Number.NaN, outputTokens: 20, totalTokens: 100 },
    { inputTokens: 80, outputTokens: Infinity, totalTokens: 100 },
    { inputTokens: -1, outputTokens: 20, totalTokens: 19 },
    { inputTokens: 80, outputTokens: 20, totalTokens: 100, cachedTokens: -1 },
    JSON.parse('{"inputTokens":"80","outputTokens":20,"totalTokens":100}'),
    JSON.parse('{"inputTokens":80,"outputTokens":null,"totalTokens":100}'),
  ])('does not expose invalid or mixed-type token usage: %p', async (usage) => {
    const api = createApi();
    api.searchExecutions.mockResolvedValue(createSearchResult([createListItem()]));
    api.getExecution.mockResolvedValue(createDetail({ usage }));

    const data = await loadDemoWorkflowUsage(api, '24h', now);

    expect(data.executions[0].usage).toBeUndefined();
    expect(data.executions[0].usageUnavailable).toBe(true);
  });

  it('stops scheduling further detail requests after cancellation', async () => {
    const api = createApi();
    let stopped = false;
    let startedRequests = 0;
    api.searchExecutions.mockResolvedValue(
      createSearchResult(
        Array.from({ length: 20 }, (_, index) => createListItem({ id: `run-${index}` }))
      )
    );
    api.getExecution.mockImplementation(async (id) => {
      startedRequests++;
      if (startedRequests === 5) stopped = true;
      await Promise.resolve();
      return createDetail({ id });
    });

    const data = await loadDemoWorkflowUsage(api, '24h', now, () => stopped);

    expect(api.getExecution).toHaveBeenCalledTimes(5);
    expect(data.executions.filter(({ usageUnavailable }) => usageUnavailable)).toHaveLength(15);
    expect(data.failedDetails).toBe(0);
  });

  it('propagates list errors for the page to display', async () => {
    const api = createApi();
    api.searchExecutions.mockRejectedValue(new Error('Execution read permission required'));

    await expect(loadDemoWorkflowUsage(api, '24h', now)).rejects.toThrow(
      'Execution read permission required'
    );
    expect(api.getExecution).not.toHaveBeenCalled();
  });
});
