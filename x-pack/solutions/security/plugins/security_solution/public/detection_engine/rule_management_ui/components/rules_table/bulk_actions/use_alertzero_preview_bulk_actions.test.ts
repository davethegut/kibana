/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertZeroPreviewState } from '@kbn/alertzero-common';
import { applyAlertZeroPreviewSelection } from './use_alertzero_preview_bulk_actions';

const enabledRule = { id: 'rule-1', name: 'Encoded PowerShell Execution', enabled: true };
const otherRule = { id: 'rule-2', name: 'Rare Sign-In', enabled: true };
const disabledRule = { id: 'rule-3', name: 'Disabled Rule', enabled: false };

describe('applyAlertZeroPreviewSelection', () => {
  it('adds only the selected enabled rules and skips disabled rules that were never selected', () => {
    const { state, changed, skippedDisabled } = applyAlertZeroPreviewSelection(
      createAlertZeroPreviewState(),
      [enabledRule, otherRule, disabledRule],
      true
    );

    expect(state.scope.ruleIds).toEqual(['rule-1', 'rule-2']);
    expect(state.rules.map(({ id, source }) => ({ id, source }))).toEqual([
      { id: 'rule-1', source: 'detection_rules' },
      { id: 'rule-2', source: 'detection_rules' },
    ]);
    expect(changed).toBe(2);
    expect(skippedDisabled).toBe(1);
  });

  it('does not count rules that are already selected and keeps other selections', () => {
    const first = applyAlertZeroPreviewSelection(
      createAlertZeroPreviewState(),
      [enabledRule],
      true
    );
    const second = applyAlertZeroPreviewSelection(first.state, [enabledRule, otherRule], true);

    expect(second.changed).toBe(1);
    expect(second.state.scope.ruleIds).toEqual(['rule-1', 'rule-2']);
  });

  it('removes only the selected rules', () => {
    const added = applyAlertZeroPreviewSelection(
      createAlertZeroPreviewState(),
      [enabledRule, otherRule],
      true
    );
    const removed = applyAlertZeroPreviewSelection(added.state, [enabledRule, disabledRule], false);

    expect(removed.changed).toBe(1);
    expect(removed.skippedDisabled).toBe(0);
    expect(removed.state.scope.ruleIds).toEqual(['rule-2']);
  });

  it('leaves a never-selected state untouched when nothing can be added', () => {
    const previous = createAlertZeroPreviewState();
    const { state, changed } = applyAlertZeroPreviewSelection(previous, [disabledRule], true);

    expect(changed).toBe(0);
    expect(state).toBe(previous);
  });
});
