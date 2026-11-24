/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAlertZeroPreviewState,
  getAlertZeroPreviewStorageKey,
  readAlertZeroPreviewState,
  updateAlertZeroPreviewRule,
  writeAlertZeroPreviewState,
} from './configuration_preview';

const rule = {
  id: 'native-rule',
  label: 'Suspicious script execution',
  enabled: true,
  alertsLast24h: 0,
};

describe('AlertZero configuration preview state', () => {
  it('starts with no selected rules and does not add a rule before opting in', () => {
    const state = createAlertZeroPreviewState();
    expect(state.scope).toMatchObject({ mode: 'selected', ruleIds: [] });
    expect(updateAlertZeroPreviewRule(state, rule, false)).toEqual(state);
    expect(updateAlertZeroPreviewRule(state, rule, true).scope.ruleIds).toEqual([rule.id]);
  });

  it('preserves known legacy coverage without including future rules automatically', () => {
    const legacy = {
      ...createAlertZeroPreviewState(),
      scope: { enabled: true, mode: 'all_enabled' as const, ruleIds: [] },
      rules: [rule, { ...rule, id: 'disabled', enabled: false }],
    };
    const state = readAlertZeroPreviewState({ getItem: () => JSON.stringify(legacy) }, '');
    expect(state?.scope).toEqual({ enabled: true, mode: 'selected', ruleIds: [rule.id] });
    const saved = jest.fn();
    writeAlertZeroPreviewState({ setItem: saved }, '', legacy);
    expect(JSON.parse(saved.mock.calls[0][1]).scope.ruleIds).toEqual([rule.id]);
  });

  it('shares saved associations using a space-specific key', () => {
    const storage = new Map<string, string>();
    const store = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    const state = updateAlertZeroPreviewRule(createAlertZeroPreviewState(), rule, true);
    writeAlertZeroPreviewState(store, '/sec/s/team-a', state);
    expect(readAlertZeroPreviewState(store, '/sec/s/team-a')).toEqual(state);
    expect(readAlertZeroPreviewState(store, '/sec/s/team-b')).toBeUndefined();
    expect(getAlertZeroPreviewStorageKey('/sec/s/team-a')).not.toEqual(
      getAlertZeroPreviewStorageKey('/sec/s/team-b')
    );
  });

  it('adds a selected rule once and preserves unrelated settings', () => {
    const state = {
      ...createAlertZeroPreviewState(),
      scope: {
        enabled: false,
        mode: 'selected' as const,
        ruleIds: ['another'],
        excludeBuildingBlocks: true,
      },
      modelAssignments: {
        efficient: { useRecommended: true, modelIds: ['small'] },
        balanced: { useRecommended: false, modelIds: ['custom'] },
        frontier: { useRecommended: true, modelIds: ['large'] },
      },
    };
    const once = updateAlertZeroPreviewRule(state, rule, true);
    const twice = updateAlertZeroPreviewRule(once, rule, true);
    expect(twice).toEqual(once);
    expect(twice.rules).toHaveLength(1);
    expect(twice.scope).toEqual({ ...state.scope, ruleIds: ['another', rule.id] });
    expect(twice.modelAssignments).toEqual(state.modelAssignments);
    expect(state.scope.ruleIds).toEqual(['another']);
    expect(updateAlertZeroPreviewRule(twice, rule, false).scope.ruleIds).toEqual(['another']);
  });

  it('removes an explicit association and updates existing metadata in place', () => {
    const state = createAlertZeroPreviewState();
    const linked = updateAlertZeroPreviewRule(state, rule, true);
    const revised = updateAlertZeroPreviewRule(linked, { ...rule, label: 'Updated rule' }, false);
    expect(revised.scope).toEqual(state.scope);
    expect(revised.rules).toEqual([{ ...rule, label: 'Updated rule', source: 'detection_rules' }]);
  });

  it('does not newly include a disabled rule', () => {
    const state = {
      ...createAlertZeroPreviewState(),
      scope: { enabled: true, mode: 'selected' as const, ruleIds: [] },
    };
    expect(
      updateAlertZeroPreviewRule(state, { ...rule, enabled: false }, true).scope.ruleIds
    ).toEqual([]);
  });

  it('retains a customer-selected association when its detection rule is disabled', () => {
    const linked = updateAlertZeroPreviewRule(createAlertZeroPreviewState(), rule, true);
    expect(
      updateAlertZeroPreviewRule(linked, { ...rule, enabled: false }, true).scope.ruleIds
    ).toEqual([rule.id]);
  });

  it('ignores invalid or unavailable stored state', () => {
    expect(readAlertZeroPreviewState({ getItem: () => '{broken' }, '')).toBeUndefined();
    expect(
      readAlertZeroPreviewState({ getItem: () => JSON.stringify({ scope: {} }) }, '')
    ).toBeUndefined();
    expect(
      readAlertZeroPreviewState(
        {
          getItem: () => {
            throw new Error('Blocked');
          },
        },
        ''
      )
    ).toBeUndefined();
  });

  it('lets callers report failed writes instead of showing false success', () => {
    const store = {
      setItem: () => {
        throw new Error('Storage full');
      },
    };
    expect(() => writeAlertZeroPreviewState(store, '', createAlertZeroPreviewState())).toThrow(
      'Storage full'
    );
  });
});
