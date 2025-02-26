/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {ApplicationConfig} from '@scion/microfrontend-platform';

const devtools: ApplicationConfig = {
  symbolicName: 'devtools',
  manifestUrl: 'http://localhost:5200/assets/manifest.json',
  intentionCheckDisabled: true,
  scopeCheckDisabled: true,
};

/**
 * Environment used when starting the app locally.
 */
export const environment = {
  production: false,
  apps: {
    app_1: {
      symbolicName: 'app-1',
      url: 'http://localhost:4201',
      activatorLoadTimeout: undefined,
    },
    app_2: {
      symbolicName: 'app-2',
      url: 'http://localhost:4202',
      activatorLoadTimeout: undefined,
    },
    app_3: {
      symbolicName: 'app-3',
      url: 'http://localhost:4203',
      activatorLoadTimeout: 800, // activator-readiness.e2e-spec.ts and startup-progress.e2e-spec.ts
    },
    app_4: {
      symbolicName: 'app-4',
      url: 'http://localhost:4204',
      activatorLoadTimeout: undefined,
    },
  },
  activatorLoadTimeout: 20000,
  devtools,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
