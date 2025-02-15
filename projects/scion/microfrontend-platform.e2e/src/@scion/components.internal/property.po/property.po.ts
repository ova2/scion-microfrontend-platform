/*
 * Copyright (c) 2018-2022 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {Locator} from '@playwright/test';

/**
 * Page object for {@link SciPropertyComponent}.
 */
export class SciPropertyPO {

  constructor(private readonly _sciPropertyLocator: Locator) {
  }

  /**
   * Reads the properties as dictionary.
   */
  public async readProperties(): Promise<Record<string, string>> {
    const keysLocator = this._sciPropertyLocator.locator('.e2e-key');
    const valuesLocator = this._sciPropertyLocator.locator('.e2e-value');

    const propertyCount = await keysLocator.count();
    const properties: Record<string, string> = {};
    for (let i = 0; i < propertyCount; i++) {
      const key = await keysLocator.nth(i).innerText();
      properties[key] = await valuesLocator.nth(i).innerText();
    }

    return properties;
  }
}
