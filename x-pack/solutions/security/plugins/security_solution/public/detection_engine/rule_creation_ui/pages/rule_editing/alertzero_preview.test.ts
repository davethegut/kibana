/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  createAlertZeroPreviewState,
  readAlertZeroPreviewState,
  writeAlertZeroPreviewState,
} from '@kbn/alertzero-common';
import { submitRuleEditor, useAlertZeroRulePreview } from './alertzero_preview';

const basePath = '/s/preview-test';
const rule = {
  id: 'native-rule',
  label: 'Encoded PowerShell Execution',
  enabled: true,
  alertsLast24h: 0,
};

describe('submitRuleEditor', () => {
  it('never reaches live rule validation or saving in preview mode', async () => {
    const savePreview = jest.fn().mockResolvedValue(undefined);
    const saveRule = jest.fn().mockResolvedValue(undefined);
    await submitRuleEditor({ isAlertZeroPreview: true, savePreview, saveRule });
    expect(savePreview).toHaveBeenCalledTimes(1);
    expect(saveRule).not.toHaveBeenCalled();
  });

  it('does not fall through to a live rule update when the preview save fails', async () => {
    const saveRule = jest.fn();
    await expect(
      submitRuleEditor({
        isAlertZeroPreview: true,
        savePreview: jest.fn().mockRejectedValue(new Error('storage blocked')),
        saveRule,
      })
    ).rejects.toThrow('storage blocked');
    expect(saveRule).not.toHaveBeenCalled();
  });

  it('preserves the native submission path outside preview mode', async () => {
    const savePreview = jest.fn();
    const saveRule = jest.fn().mockResolvedValue(undefined);
    await submitRuleEditor({ isAlertZeroPreview: false, savePreview, saveRule });
    expect(saveRule).toHaveBeenCalledTimes(1);
    expect(savePreview).not.toHaveBeenCalled();
  });
});

describe('useAlertZeroRulePreview', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  const selectedState = () => ({
    ...createAlertZeroPreviewState(),
    scope: { enabled: true, mode: 'selected' as const, ruleIds: ['other-rule'] },
  });

  it('holds a draft until Save and leaves storage untouched on Cancel', () => {
    writeAlertZeroPreviewState(window.localStorage, basePath, selectedState());
    const { result } = renderHook(() => useAlertZeroRulePreview(rule, basePath));
    act(() => result.current.changeIncluded(true));
    expect(result.current.included).toBe(true);
    expect(readAlertZeroPreviewState(window.localStorage, basePath)?.scope.ruleIds).toEqual([
      'other-rule',
    ]);
    act(() => result.current.discard());
    expect(result.current.included).toBe(false);
    expect(readAlertZeroPreviewState(window.localStorage, basePath)?.rules).toEqual([]);
  });

  it('saves a selected rule once and preserves the rest of the scope', async () => {
    writeAlertZeroPreviewState(window.localStorage, basePath, selectedState());
    const { result } = renderHook(() => useAlertZeroRulePreview(rule, basePath));
    act(() => result.current.changeIncluded(true));
    await act(() => result.current.save());
    await act(() => result.current.save());
    const stored = readAlertZeroPreviewState(window.localStorage, basePath);
    expect(stored?.scope.ruleIds).toEqual(['other-rule', 'native-rule']);
    expect(stored?.rules).toEqual([{ ...rule, source: 'detection_rules' }]);
    expect(result.current.saved).toBe(true);
  });

  it('leaves a never-configured rule off without writing on render', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useAlertZeroRulePreview(rule, basePath));
    expect(result.current.included).toBe(false);
    expect(result.current.state.scope.ruleIds).toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
    expect(readAlertZeroPreviewState(window.localStorage, basePath)).toBeUndefined();
  });

  it('includes only the explicitly chosen rule after saving a fresh configuration', async () => {
    const { result } = renderHook(() => useAlertZeroRulePreview(rule, basePath));
    act(() => result.current.changeIncluded(true));
    expect(readAlertZeroPreviewState(window.localStorage, basePath)).toBeUndefined();
    await act(() => result.current.save());
    const stored = readAlertZeroPreviewState(window.localStorage, basePath);
    expect(stored?.scope).toEqual({
      enabled: true,
      mode: 'selected',
      ruleIds: [rule.id],
      excludeBuildingBlocks: false,
    });
    expect(stored?.rules).toEqual([{ ...rule, source: 'detection_rules' }]);
    expect(result.current.included).toBe(true);
    expect(result.current.saved).toBe(true);
  });

  it('does not opt a rule in merely by saving without enabling the setting', async () => {
    const { result } = renderHook(() => useAlertZeroRulePreview(rule, basePath));
    await act(() => result.current.save());
    expect(readAlertZeroPreviewState(window.localStorage, basePath)?.scope.ruleIds).toEqual([]);
    expect(result.current.included).toBe(false);
  });

  it('refreshes conflicting same-mode membership without overwriting it', async () => {
    writeAlertZeroPreviewState(window.localStorage, basePath, selectedState());
    const { result } = renderHook(() => useAlertZeroRulePreview(rule, basePath));
    writeAlertZeroPreviewState(window.localStorage, basePath, {
      ...selectedState(),
      scope: { ...selectedState().scope, ruleIds: ['other-rule', rule.id] },
    });
    await act(() => result.current.save());
    expect(result.current.scopeChanged).toBe(true);
    expect(result.current.saved).toBe(false);
    expect(result.current.included).toBe(true);
    expect(readAlertZeroPreviewState(window.localStorage, basePath)?.scope.ruleIds).toContain(
      rule.id
    );
  });

  it('merges unrelated latest settings while saving the rule association', async () => {
    writeAlertZeroPreviewState(window.localStorage, basePath, selectedState());
    const { result } = renderHook(() => useAlertZeroRulePreview(rule, basePath));
    act(() => result.current.changeIncluded(true));
    writeAlertZeroPreviewState(window.localStorage, basePath, {
      ...selectedState(),
      scope: { ...selectedState().scope, excludeBuildingBlocks: true, ruleIds: ['another-rule'] },
    });
    await act(() => result.current.save());
    expect(readAlertZeroPreviewState(window.localStorage, basePath)?.scope).toMatchObject({
      excludeBuildingBlocks: true,
      ruleIds: ['another-rule', rule.id],
    });
  });

  it('reports storage failure without claiming the association was saved', async () => {
    const { result } = renderHook(() => useAlertZeroRulePreview(rule, basePath));
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    await act(() => result.current.save());
    expect(result.current.storageError).toBe(true);
    expect(result.current.saved).toBe(false);
  });

  it('does not access local storage outside the development preview', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem');
    renderHook(() => useAlertZeroRulePreview(rule, basePath, false));
    expect(getItem).not.toHaveBeenCalled();
  });
});
