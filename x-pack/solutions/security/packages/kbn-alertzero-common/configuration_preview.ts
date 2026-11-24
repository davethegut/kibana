/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const previewRuleSchema = lazySchema(() =>
  z.object({
    id: z.string().min(1).max(512),
    label: z.string().min(1).max(1024),
    enabled: z.boolean(),
    alertsLast24h: z.number().nonnegative(),
    category: z.string().max(256).optional(),
    source: z.literal('detection_rules').optional(),
  })
);

const modelAssignmentSchema = lazySchema(() =>
  z.object({
    useRecommended: z.boolean(),
    modelIds: z.array(z.string().max(512)).max(100),
  })
);

const previewStateSchema = lazySchema(() =>
  z.object({
    scope: z.object({
      enabled: z.boolean(),
      mode: z.enum(['all_enabled', 'selected']),
      ruleIds: z.array(z.string().max(512)).max(10000),
      excludeBuildingBlocks: z.boolean().optional(),
    }),
    rules: z.array(previewRuleSchema).max(10000),
    modelAssignments: z
      .object({
        efficient: modelAssignmentSchema,
        balanced: modelAssignmentSchema,
        frontier: modelAssignmentSchema,
      })
      .optional(),
  })
);

export type AlertZeroPreviewState = z.infer<typeof previewStateSchema>;
export type AlertZeroPreviewRule = z.infer<typeof previewRuleSchema>;

const normalizeSelectedScope = (state: AlertZeroPreviewState): AlertZeroPreviewState =>
  state.scope.mode === 'all_enabled'
    ? {
        ...state,
        scope: {
          ...state.scope,
          mode: 'selected',
          ruleIds: state.rules.filter(({ enabled }) => enabled).map(({ id }) => id),
        },
      }
    : state;

/** Namespaces development-only demo state to the current Kibana space. */
export const getAlertZeroPreviewStorageKey = (basePath: string): string =>
  `kbn:alertzero:configuration-preview:v1:${basePath}`;

/** Creates an empty scope so each rule requires customer selection. */
export const createAlertZeroPreviewState = (): AlertZeroPreviewState => ({
  scope: { enabled: true, mode: 'selected', ruleIds: [], excludeBuildingBlocks: false },
  rules: [],
});

/** Reads validated local demo state without accessing any production settings. */
export const readAlertZeroPreviewState = (
  storage: { getItem: (key: string) => string | null },
  basePath: string
): AlertZeroPreviewState | undefined => {
  try {
    const raw = storage.getItem(getAlertZeroPreviewStorageKey(basePath));
    if (raw === null) return;
    const parsed = previewStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? normalizeSelectedScope(parsed.data) : undefined;
  } catch {
    return;
  }
};

/** Saves validated local demo state, surfacing storage failures to the caller. */
export const writeAlertZeroPreviewState = (
  storage: { setItem: (key: string, value: string) => void },
  basePath: string,
  state: AlertZeroPreviewState
): void => {
  storage.setItem(
    getAlertZeroPreviewStorageKey(basePath),
    JSON.stringify(normalizeSelectedScope(previewStateSchema.parse(state)))
  );
};

/** Adds or removes a rule only through an explicit customer selection. */
export const updateAlertZeroPreviewRule = (
  previous: AlertZeroPreviewState,
  rule: AlertZeroPreviewRule,
  included: boolean
): AlertZeroPreviewState => {
  const state = normalizeSelectedScope(previous);
  const existing = state.rules.find(({ id }) => id === rule.id);
  if (!existing && !included) return state;
  const nextRule = { ...existing, ...rule, source: 'detection_rules' as const };
  const rules = existing
    ? state.rules.map((candidate) => (candidate.id === rule.id ? nextRule : candidate))
    : [...state.rules, nextRule];
  const ruleIds = new Set(state.scope.ruleIds);
  if (state.scope.mode === 'selected') {
    if (included && (rule.enabled || state.scope.ruleIds.includes(rule.id))) {
      ruleIds.add(rule.id);
    } else {
      ruleIds.delete(rule.id);
    }
  }
  return { ...state, rules, scope: { ...state.scope, ruleIds: [...ruleIds] } };
};
