/**
 * Device Model.
 *
 * Abstract base class for devices managed by an adapter.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

import { Action } from "./action";
import { Adapter } from "./adapter";
import { Event } from "./event";
import { Property, PropertyDescription, PropertyDict } from "./property";
import Ajv from 'ajv';
const ajv = new Ajv();

export class Device {
  public type = 'thing';
  public '@context' = 'https://iot.mozilla.org/schemas';
  public '@type': string[] = [];
  public title = '';
  public description = '';
  public properties = new Map<string, Property<any>>();
  public actions = new Map<string, ActionMetadata>();
  public events = new Map<string, EventMetadata>();
  public links: Link[] = [];
  public baseHref?: string;
  public pinRequired = false;
  public pinPattern?: string;
  public credentialsRequired = false;
  // legacy
  private name?: string;

  constructor(public adapter: Adapter, public id: string) {
    const anyId: any = id;

    if (typeof anyId !== 'string') {
      id = anyId.toString();
    }

    if (this.name) {
      this.title = this.name;
    }
  }

  asDict(): DeviceDict {
    const properties: { [key: string]: PropertyDict<any> } = {};
    this.properties.forEach((property, propertyName) => {
      properties[propertyName] = property.asDict();
    });

    const actions: { [key: string]: ActionMetadata } = {};
    this.actions.forEach((metadata, actionName) => {
      actions[actionName] = Object.assign({}, metadata);
    });

    const events: { [key: string]: EventMetadata } = {};
    this.events.forEach((metadata, eventName) => {
      events[eventName] = Object.assign({}, metadata);
    });

    return {
      id: this.id,
      title: this.title,
      type: this.type,
      '@context': this['@context'],
      '@type': this['@type'],
      description: this.description,
      properties: properties,
      actions: actions,
      events: events,
      links: this.links,
      baseHref: this.baseHref,
      pin: {
        required: this.pinRequired,
        pattern: this.pinPattern,
      },
      credentialsRequired: this.credentialsRequired,
    };
  }

  /**
   * @returns this object as a thing
   */
  asThing(): Thing {
    const thing: Thing = {
      id: this.id,
      title: this.title,
      type: this.type,
      '@context': this['@context'],
      '@type': this['@type'],
      properties: this.getPropertyDescriptions(),
      links: this.links,
      baseHref: this.baseHref,
      pin: {
        required: this.pinRequired,
        pattern: this.pinPattern,
      },
      credentialsRequired: this.credentialsRequired,
    };

    if (this.description) {
      thing.description = this.description;
    }

    if (this.actions) {
      const actions: { [id: string]: ActionMetadata } = {};
      this.actions.forEach((metadata, actionName) => {
        actions[actionName] = Object.assign({}, metadata);
      });
      thing.actions = actions;
    }

    if (this.events) {
      const events: { [id: string]: EventMetadata } = {};
      this.events.forEach((metadata, eventName) => {
        events[eventName] = Object.assign({}, metadata);
      });
      thing.events = events;
    }

    return thing;
  }

  debugCmd(cmd: string, params: any) {
    console.log('Device:', this.name, 'got debugCmd:', cmd, 'params:', params);
  }

  getId() {
    return this.id;
  }

  getName() {
    console.log('getName() is deprecated. Please use getTitle().');
    return this.getTitle();
  }

  getTitle() {
    if (this.name && !this.title) {
      this.title = this.name;
    }

    return this.title;
  }

  getType() {
    return this.type;
  }

  getPropertyDescriptions() {
    const propDescs: { [key: string]: PropertyDescription } = {};
    this.properties.forEach((property, propertyName) => {
      if (property.isVisible()) {
        propDescs[propertyName] = property.asPropertyDescription();
      }
    });
    return propDescs;
  }

  findProperty(propertyName: string) {
    return this.properties.get(propertyName);
  }

  /**
   * @method getProperty
   * @returns a promise which resolves to the retrieved value.
   */
  getProperty(propertyName: string) {
    return new Promise((resolve, reject) => {
      const property = this.findProperty(propertyName);
      if (property) {
        property.getValue().then((value) => {
          resolve(value);
        });
      } else {
        reject(`Property "${propertyName}" not found`);
      }
    });
  }

  hasProperty(propertyName: string) {
    return this.properties.has(propertyName);
  }

  notifyPropertyChanged<T>(property: Property<T>) {
    this.adapter.manager.sendPropertyChangedNotification(property);
  }

  actionNotify(action: Action) {
    this.adapter.manager.sendActionStatusNotification(action);
  }

  eventNotify(event: Event) {
    this.adapter.manager.sendEventNotification(event);
  }

  connectedNotify(connected: boolean) {
    this.adapter.manager.sendConnectedNotification(this, connected);
  }

  setDescription(description: string) {
    this.description = description;
  }

  setName(name: string) {
    console.log('setName() is deprecated. Please use setTitle().');
    this.setTitle(name);
  }

  setTitle(title: string) {
    this.title = title;
  }

  /**
   * @method setProperty
   * @returns a promise which resolves to the updated value.
   *
   * @note it is possible that the updated value doesn't match
   * the value passed in.
   */
  setProperty(propertyName: string, value: any) {
    const property = this.findProperty(propertyName);
    if (property) {
      return property.setValue(value);
    }

    return Promise.reject(`Property "${propertyName}" not found`);
  }

  /**
   * @method requestAction
   * @returns a promise which resolves when the action has been requested.
   */
  requestAction(actionId: string, actionName: string, input: any) {
    return new Promise((resolve, reject) => {
      if (!this.actions.has(actionName)) {
        reject(`Action "${actionName}" not found`);
        return;
      }

      // Validate action input, if present.
      const metadata = this.actions.get(actionName);
      if (metadata) {
        if (metadata.hasOwnProperty('input')) {
          const valid = ajv.validate(metadata.input, input);
          if (!valid) {
            reject(`Action "${actionName}": input "${input}" is invalid`);
          }
        }
      } else {
        reject(`Action "${actionName}" not found`);
      }

      const action = new Action(actionId, this, actionName, input);
      this.performAction(action).catch((err) => console.log(err));
      resolve();
    });
  }

  /**
   * @method removeAction
   * @returns a promise which resolves when the action has been removed.
   */
  removeAction(actionId: string, actionName: string) {
    return new Promise((resolve, reject) => {
      if (!this.actions.has(actionName)) {
        reject(`Action "${actionName}" not found`);
        return;
      }

      this.cancelAction(actionId, actionName).catch((err) => console.log(err));
      resolve();
    });
  }

  /**
   * @method performAction
   */
  performAction(_action: Action) {
    return Promise.resolve();
  }

  /**
   * @method cancelAction
   */
  cancelAction(_actionId: string, _actionName: string) {
    return Promise.resolve();
  }

  /**
   * Add an action.
   *
   * @param {String} name Name of the action
   * @param {ActionMetadata} metadata Action metadata, i.e. type, description, etc., as
   *                          an object
   */
  addAction(name: string, metadata: ActionMetadata) {
    metadata = metadata || {};
    if (metadata.hasOwnProperty('href')) {
      delete metadata.href;
    }

    this.actions.set(name, metadata);
  }

  /**
   * Add an event.
   *
   * @param {String} name Name of the event
   * @param {EventMetadata} metadata Event metadata, i.e. type, description, etc., as
   *                          an object
   */
  addEvent(name: string, metadata: EventMetadata) {
    metadata = metadata || {};
    if (metadata.hasOwnProperty('href')) {
      delete metadata.href;
    }

    this.events.set(name, metadata);
  }
}

interface DeviceDescription {
  id: string,
  title: string,
  type: string,
  '@context': string,
  '@type': string[],
  links: Link[],
  baseHref?: string,
  pin?: {
    required?: boolean,
    pattern?: string,
  },
  credentialsRequired: boolean,
  properties: { [key: string]: PropertyDescription },
  description?: string;
  actions?: { [id: string]: ActionMetadata };
  events?: { [id: string]: EventMetadata };
}

interface DeviceDict extends DeviceDescription {
  properties: { [key: string]: PropertyDict<any> }
}

interface Thing extends DeviceDescription {
  properties: { [key: string]: PropertyDescription }
}

interface Link {
  rel?: string,
  mediaType?: string,
  href?: string,
}

interface ActionMetadata {
  href: string;
  input: any
}

interface EventMetadata {
  href: string;
}
