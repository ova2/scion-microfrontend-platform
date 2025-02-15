/*
 * Copyright (c) 2018-2022 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {FrameLocator, Locator} from '@playwright/test';
import {SciPropertyPO} from '../@scion/components.internal/property.po';
import {OutletPageObject} from '../browser-outlet/browser-outlet.po';

export class PlatformPropertiesPagePO implements OutletPageObject {

  public readonly path = 'platform-properties';

  private readonly _locator: Locator;

  constructor(frameLocator: FrameLocator) {
    this._locator = frameLocator.locator('app-platform-properties');
  }

  public async getPlatformProperties(): Promise<Record<string, any>> {
    return new SciPropertyPO(this._locator.locator('sci-property.e2e-properties')).readProperties();
  }
}
