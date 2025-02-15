/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {MicrofrontendPlatform} from '../../microfrontend-platform';
import {MicrofrontendPlatformHost} from '../../host/microfrontend-platform-host';
import {Beans} from '@scion/toolkit/bean-manager';
import {OutletRouter} from './outlet-router';

describe('OutletRouter', () => {

  beforeEach(async () => await MicrofrontendPlatform.destroy());
  afterEach(async () => await MicrofrontendPlatform.destroy());

  describe('intent-based-routing', () => {
    it('should reject navigation if passing "relativeTo" navigation option', async () => {
      await MicrofrontendPlatformHost.start({applications: []});
      const navigate = Beans.get(OutletRouter).navigate({entity: 'person'}, {relativeTo: 'url'});
      await expectAsync(navigate).toBeRejectedWithError(/\[OutletRouterError]\[UnsupportedOptionError]/);
    });

    it('should validate microfrontend params', async () => {
      await MicrofrontendPlatformHost.start({
        host: {
          manifest: {
            name: 'Host Application',
            capabilities: [
              {
                type: 'microfrontend',
                qualifier: {entity: 'person'},
                params: [{name: 'id', required: true}],
                properties: {
                  path: 'microfrontend',
                },
              },
            ],
          },
        },
        applications: [],
      });

      const navigate = Beans.get(OutletRouter).navigate({entity: 'person'});
      await expectAsync(navigate).toBeRejectedWithError(/IntentParamValidationError/);
    });
  });
});
