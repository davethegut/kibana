/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DemoAlertInvestigationRule } from './demo_alert_investigation';
import { DEMO_DETECTION_RULES } from './demo_detection_rules';

const MAX_REVIEWED_RULE_IDS = 10000;
const MAX_RULE_ID_LENGTH = 512;

/** The three newest enabled sample rules stand in for rules added since the last review. */
export const DEMO_RECENTLY_ADDED_RULES: readonly DemoAlertInvestigationRule[] =
  DEMO_DETECTION_RULES.filter(({ enabled }) => enabled).slice(-3);

/** Namespaces the reviewed-rule baseline of the redesigned preview to the current Kibana space. */
export const getReviewedRulesStorageKey = (basePath: string): string =>
  `kbn:alertzero:configuration-preview-next:reviewed-rules:v1:${basePath}`;

const isRuleIdList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= MAX_REVIEWED_RULE_IDS &&
  value.every((id) => typeof id === 'string' && id.length > 0 && id.length <= MAX_RULE_ID_LENGTH);

/** Reads the rule IDs the customer has already reviewed, or nothing when no valid baseline exists. */
export const readReviewedRuleIds = (
  storage: { getItem: (key: string) => string | null },
  basePath: string
): string[] | undefined => {
  try {
    const raw = storage.getItem(getReviewedRulesStorageKey(basePath));
    if (raw === null) return;
    const parsed: unknown = JSON.parse(raw);
    return isRuleIdList(parsed) ? parsed : undefined;
  } catch {
    return;
  }
};

/** Saves the reviewed-rule baseline and reports whether browser storage accepted it. */
export const writeReviewedRuleIds = (
  storage: { setItem: (key: string, value: string) => void },
  basePath: string,
  ruleIds: readonly string[]
): boolean => {
  try {
    storage.setItem(
      getReviewedRulesStorageKey(basePath),
      JSON.stringify([...new Set(ruleIds)].slice(0, MAX_REVIEWED_RULE_IDS))
    );
    return true;
  } catch {
    return false;
  }
};

/** Returns enabled rules the customer has neither reviewed nor selected. */
export const getRulesToReview = (
  rules: readonly DemoAlertInvestigationRule[],
  reviewedRuleIds: readonly string[],
  selectedRuleIds: readonly string[]
): DemoAlertInvestigationRule[] => {
  const reviewed = new Set(reviewedRuleIds);
  const selected = new Set(selectedRuleIds);
  return rules.filter(({ id, enabled }) => enabled && !reviewed.has(id) && !selected.has(id));
};
