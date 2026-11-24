/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionListItemDto, WorkflowTokenUsage } from '@kbn/workflows';
import type { WorkflowApi } from '@kbn/workflows-ui';

export type DemoUsagePeriod = '24h' | '7d' | '30d';

export interface DemoUsageExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  isTestRun: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };
  usageUnavailable: boolean;
}

export interface DemoWorkflowUsageData {
  executions: DemoUsageExecution[];
  totalExecutions: number;
  from: string;
  to: string;
  limit: number;
  failedDetails: number;
}

const EXECUTION_LIMIT = 100;
const DETAIL_CONCURRENCY = 5;
const PERIOD_HOURS: Record<DemoUsagePeriod, number> = { '24h': 24, '7d': 168, '30d': 720 };

const isTokenCount = (value: number): boolean => Number.isFinite(value) && value >= 0;

const getUsage = (usage?: WorkflowTokenUsage): DemoUsageExecution['usage'] => {
  if (!usage || typeof usage !== 'object') return undefined;

  const { inputTokens, outputTokens, totalTokens, cachedTokens } = usage;
  if (
    !isTokenCount(inputTokens) ||
    !isTokenCount(outputTokens) ||
    !isTokenCount(totalTokens) ||
    (cachedTokens !== undefined && !isTokenCount(cachedTokens))
  ) {
    return undefined;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    ...(cachedTokens !== undefined ? { cachedTokens } : {}),
  };
};

const toExecution = (
  execution: WorkflowExecutionListItemDto,
  usageUnavailable: boolean,
  fallback: Pick<WorkflowExecutionListItemDto, 'workflowId' | 'workflowName'> = {}
): DemoUsageExecution => {
  const usage = getUsage(execution.usage);
  const workflowId = execution.workflowId ?? fallback.workflowId ?? '';
  return {
    id: execution.id,
    workflowId,
    workflowName: execution.workflowName ?? fallback.workflowName ?? (workflowId || execution.id),
    status: execution.status,
    startedAt: execution.startedAt,
    ...(execution.finishedAt ? { finishedAt: execution.finishedAt } : {}),
    ...(typeof execution.duration === 'number' &&
    Number.isFinite(execution.duration) &&
    execution.duration >= 0
      ? { duration: execution.duration }
      : {}),
    isTestRun: execution.isTestRun,
    ...(usage ? { usage } : {}),
    usageUnavailable: usageUnavailable || (execution.usage !== undefined && !usage),
  };
};

/** Loads a bounded sample of AlertZero executions and their recorded token usage. */
export const loadDemoWorkflowUsage = async (
  api: Pick<WorkflowApi, 'searchExecutions' | 'getExecution'>,
  period: DemoUsagePeriod,
  now: Date = new Date(),
  shouldStop: () => boolean = () => false,
  reportsOnly: boolean = false
): Promise<DemoWorkflowUsageData> => {
  const to = now.toISOString();
  const from = new Date(now.getTime() - PERIOD_HOURS[period] * 60 * 60 * 1000).toISOString();
  const result = await api.searchExecutions({
    kql: reportsOnly ? 'managedBy: "alertzero" AND usage.totalTokens:*' : 'managedBy: "alertzero"',
    startedAfter: from,
    startedBefore: to,
    sortField: 'startedAt',
    sortOrder: 'desc',
    page: 1,
    size: EXECUTION_LIMIT,
    trackTotalHits: true,
  });
  const listedExecutions = result.results.slice(0, EXECUTION_LIMIT);
  const executions = listedExecutions.map((execution) => toExecution(execution, true));
  let nextIndex = 0;
  let failedDetails = 0;

  const loadDetails = async (): Promise<void> => {
    while (nextIndex < listedExecutions.length && !shouldStop()) {
      const index = nextIndex++;
      const listedExecution = listedExecutions[index];
      try {
        // List responses omit usage; request details without step inputs or outputs.
        const detail = await api.getExecution(listedExecution.id, {
          omitStepExecutions: true,
          includeInput: false,
          includeOutput: false,
        });
        executions[index] = toExecution(detail, false, {
          workflowId: listedExecution.workflowId,
          workflowName: listedExecution.workflowName ?? detail.workflowDefinition?.name,
        });
      } catch {
        failedDetails++;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, executions.length) }, loadDetails)
  );

  return {
    executions,
    totalExecutions: result.total,
    from,
    to,
    limit: EXECUTION_LIMIT,
    failedDetails,
  };
};
