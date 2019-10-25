/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

export * from './action';
export * from './adapter';
export * from './addon-manager-proxy';
export * from './api-handler';
export * from './constants';
export * from './database';
export * from './deferred';
export * from './device';
export * from './event';
export * from './ipc';
export * from './notifier';
export * from './outlet';
export * from './plugin-client';
export * from './property';
export * from './utils';
export function getVersion() {
  return require('./package.json').version
}
