/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEMO_OPEN_ALERTS,
  getAdhocAlertsStorageKey,
  readAdhocAlertIds,
  writeAdhocAlertIds,
} from './demo_adhoc_alerts';
import { DEMO_DETECTION_RULES } from './demo_detection_rules';

const BASE_PATH = '/s/test';
const storageWith = (value: string | null) => ({ getItem: () => value });

describe('demo ad hoc alerts', () => {
  it('lists open alerts newest first, each from an enabled rule in the sample catalog', () => {
    const minutes = DEMO_OPEN_ALERTS.map(({ minutesAgo }) => minutesAgo);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
    for (const { ruleId, rule } of DEMO_OPEN_ALERTS) {
      const catalogRule = DEMO_DETECTION_RULES.find(({ id }) => id === ruleId);
      expect(catalogRule).toMatchObject({ enabled: true, label: rule });
    }
    expect(new Set(DEMO_OPEN_ALERTS.map(({ id }) => id)).size).toBe(DEMO_OPEN_ALERTS.length);
  });

  it('keeps the started investigations of each space apart', () => {
    expect(getAdhocAlertsStorageKey('/s/a')).not.toBe(getAdhocAlertsStorageKey('/s/b'));
  });

  it('reads only known alerts, once each', () => {
    expect(
      readAdhocAlertIds(storageWith('["alert-2","alert-2","missing",7,"alert-1"]'), BASE_PATH)
    ).toEqual(['alert-2', 'alert-1']);
  });

  it('reads nothing from missing, malformed or unreadable storage', () => {
    expect(readAdhocAlertIds(storageWith(null), BASE_PATH)).toEqual([]);
    expect(readAdhocAlertIds(storageWith('{"alert-1":true}'), BASE_PATH)).toEqual([]);
    expect(readAdhocAlertIds(storageWith('not json'), BASE_PATH)).toEqual([]);
    expect(
      readAdhocAlertIds(
        {
          getItem: () => {
            throw new Error('blocked');
          },
        },
        BASE_PATH
      )
    ).toEqual([]);
  });

  it('writes the picked alerts and reports a storage failure', () => {
    const setItem = jest.fn();
    expect(writeAdhocAlertIds({ setItem }, BASE_PATH, ['alert-1', 'alert-1', 'alert-3'])).toBe(
      true
    );
    expect(setItem).toHaveBeenCalledWith(
      getAdhocAlertsStorageKey(BASE_PATH),
      '["alert-1","alert-3"]'
    );
    expect(
      writeAdhocAlertIds(
        {
          setItem: () => {
            throw new Error('full');
          },
        },
        BASE_PATH,
        ['alert-1']
      )
    ).toBe(false);
  });
});
