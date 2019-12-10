/**
 * High-level Action base class implementation.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

import * as utils from './utils';
import { Device } from './device';

/**
 * An Action represents an individual action on a device.
 */
export class Action implements ActionDescription {
  public status: string = 'created';
  public timeRequested: string = utils.timestamp();;
  public timeCompleted?: string;

  /**
   * Initialize the object.
   *
   * @param {String} id ID of this action
   * @param {Device} device Device this action belongs to
   * @param {String} name Name of the action
   * @param {Object} input Any action inputs
   */
  constructor(public id: string, public device: Device, public name: string, public input: any) {
  }

  /**
   * Get the action description.
   *
   * @returns {ActionDescription} Description of the action as an object.
   */
  asActionDescription(): ActionDescription {
    const description: ActionDescription = {
      name: this.name,
      timeRequested: this.timeRequested,
      status: this.status,
    };

    if (this.input) {
      description.input = this.input;
    }

    if (this.timeCompleted) {
      description.timeCompleted = this.timeCompleted;
    }

    return description;
  }

  /**
   * Get the action description.
   *
   * @returns {ActionDescriptionWithId} Description of the action as an object.
   */
  asDict(): ActionDescriptionWithId {
    return {
      id: this.id,
      name: this.name,
      input: this.input,
      status: this.status,
      timeRequested: this.timeRequested,
      timeCompleted: this.timeCompleted,
    };
  }

  /**
   * Start performing the action.
   */
  start() {
    this.status = 'pending';
    this.device.actionNotify(this);
  }

  /**
   * Finish performing the action.
   */
  finish() {
    this.status = 'completed';
    this.timeCompleted = utils.timestamp();
    this.device.actionNotify(this);
  }
}

interface ActionDescription {
  name: string,
  input?: any,
  status: string,
  timeRequested: string,
  timeCompleted?: string
}

interface ActionDescriptionWithId extends ActionDescription {
  id: string
}
