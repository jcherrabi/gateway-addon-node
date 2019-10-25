/**
 * High-level Event base class implementation.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

import * as utils from './utils';
import { Device } from './device';

/**
 * An Event represents an individual event from a device.
 */
export class Event {
  public timestamp = utils.timestamp();

  /**
   * Initialize the object.
   *
   * @param {Object} device Device this event belongs to
   * @param {String} name Name of the event
   * @param {*} data (Optional) Data associated with the event
   */
  constructor(public device: Device, public name: string, public data?: any) {
  }

  /**
   * Get the event description.
   *
   * @returns {Object} Description of the event as an object.
   */
  asEventDescription(): EventDescription {
    const description: EventDescription = {
      name: this.name,
      timestamp: this.timestamp,
    };

    if (this.data !== null) {
      description.data = this.data;
    }

    return description;
  }

  /**
   * Get the event description.
   *
   * @returns {Object} Description of the event as an object.
   */
  asDict(): EventDescription {
    return {
      name: this.name,
      data: this.data,
      timestamp: this.timestamp,
    };
  }
}

interface EventDescription {
  name: string,
  timestamp: string,
  data?: any
}
