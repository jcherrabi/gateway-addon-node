/**
 * Outlet Model.
 *
 * Abstract base class for outlets managed by a notifier.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

import { Notifier } from "./notifier";

export class Outlet {
  public name: string = '';

  constructor(public notifier: Notifier, public id: string) {
    const anyId: any = id;

    if (typeof anyId !== 'string') {
      id = anyId.toString();
    }
  }

  asDict(): OutletDescription {
    return {
      id: this.id,
      name: this.name,
    };
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  /**
   * Notify the user.
   *
   * @param {string} title Title of notification.
   * @param {string} message Message of notification.
   * @param {number} level Alert level.
   * @returns {Promise} Promise which resolves when the user has been notified.
   */
  notify(title: string, message: string, level: number) {
    console.log(
      `Outlet: ${this.name} notify("${title}", "${message}", ${level})`
    );
    return Promise.resolve();
  }
}

interface OutletDescription {
  id: string,
  name: string
}
