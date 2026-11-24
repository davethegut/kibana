/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  createAlertZeroPreviewState,
  readAlertZeroPreviewState,
  updateAlertZeroPreviewRule,
  writeAlertZeroPreviewState,
} from '@kbn/alertzero-common';
import type { AlertZeroPreviewRule, AlertZeroPreviewState } from '@kbn/alertzero-common';

/** Dispatches preview submission without reaching live validation, updates or telemetry. */
export const submitRuleEditor = async ({
  isAlertZeroPreview,
  savePreview,
  saveRule,
}: {
  isAlertZeroPreview: boolean;
  savePreview: () => Promise<void>;
  saveRule: () => Promise<void>;
}): Promise<void> => {
  if (isAlertZeroPreview) {
    await savePreview();
    return;
  }
  await saveRule();
};

const loadState = (basePath: string): AlertZeroPreviewState => {
  try {
    return (
      readAlertZeroPreviewState(window.localStorage, basePath) ?? createAlertZeroPreviewState()
    );
  } catch {
    return createAlertZeroPreviewState();
  }
};

const isRuleIncluded = (state: AlertZeroPreviewState, rule: AlertZeroPreviewRule): boolean =>
  state.scope.ruleIds.includes(rule.id);

/** Holds a local rule association until the native editor's Save changes action is used. */
export const useAlertZeroRulePreview = (
  rule: AlertZeroPreviewRule,
  basePath: string,
  active = true
) => {
  const [state, setState] = useState(() =>
    active ? loadState(basePath) : createAlertZeroPreviewState()
  );
  const [included, setIncluded] = useState(() => isRuleIncluded(state, rule));
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [scopeChanged, setScopeChanged] = useState(false);

  useEffect(() => {
    if (!active) return;
    const latest = loadState(basePath);
    setState(latest);
    setIncluded(isRuleIncluded(latest, rule));
    setSaved(false);
    setStorageError(false);
    setScopeChanged(false);
  }, [active, basePath, rule]);

  const changeIncluded = useCallback((next: boolean) => {
    setIncluded(next);
    setSaved(false);
    setStorageError(false);
  }, []);

  const save = useCallback(async () => {
    try {
      const latest = loadState(basePath);
      if (
        latest.scope.mode !== state.scope.mode ||
        isRuleIncluded(latest, rule) !== isRuleIncluded(state, rule)
      ) {
        setState(latest);
        setIncluded(isRuleIncluded(latest, rule));
        setScopeChanged(true);
        setSaved(false);
        return;
      }
      const next = updateAlertZeroPreviewRule(latest, rule, included);
      writeAlertZeroPreviewState(window.localStorage, basePath, next);
      setState(next);
      setIncluded(isRuleIncluded(next, rule));
      setSaved(true);
      setStorageError(false);
      setScopeChanged(false);
    } catch {
      setStorageError(true);
      setSaved(false);
    }
  }, [basePath, included, rule, state]);

  const discard = useCallback(() => {
    setIncluded(isRuleIncluded(state, rule));
    setSaved(false);
    setStorageError(false);
    setScopeChanged(false);
  }, [rule, state]);

  return {
    state,
    included,
    saved,
    storageError,
    scopeChanged,
    changeIncluded,
    save,
    discard,
  };
};
