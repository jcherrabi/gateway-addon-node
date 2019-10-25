/**
 * Property.
 *
 * Object which decscribes a property, and its value.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

import { Device } from "./device";

const assert = require('assert');

export class Property implements PropertyDescription {
  public visible: boolean;
  public title?: string;
  public type?: string;
  public '@type'?: string;
  public unit?: string;
  public description?: string;
  public minimum?: number;
  public maximum?: number;
  public enum?: string[];
  public readOnly?: boolean;
  public multipleOf?: number;
  public links?: string[];

  public value: any;
  public prevGetValue: any;

  public fireAndForget = false;

  constructor(public device: Device, public name: string, public propertyDescr: LegacyPropertyDescription) {
    // The propertyDescr argument used to be the 'type' string, so we add an
    // assertion here to notify anybody who has an older plugin.
    assert.equal(typeof propertyDescr, 'object',
      'Please update plugin to use property description.');

    this.visible = propertyDescr.visible || true;
    this.title = propertyDescr.title || propertyDescr.label;
    this.type = propertyDescr.type;
    this['@type'] = propertyDescr['@type'];
    this.unit = propertyDescr.unit;
    this.description = propertyDescr.description;
    this.minimum = propertyDescr.minimum || propertyDescr.min;
    this.maximum = propertyDescr.maximum || propertyDescr.max;
    this.enum = propertyDescr.enum;
    this.readOnly = propertyDescr.readOnly;
    this.multipleOf = propertyDescr.multipleOf;
    this.links = propertyDescr.links;
  }

  /**
   * @returns a dictionary of useful information.
   * This is primarily used for debugging.
   */
  asDict(): PropertyDict {
    return {
      name: this.name,
      value: this.value,
      visible: this.visible,
    };
  }

  /**
   * @returns the dictionary as used to describe a property. Currently
   * this does not include the href field.
   */
  asPropertyDescription(): PropertyDescription {
    return {
      title: this.title,
      type: this.type,
      '@type': this['@type'],
      unit: this.unit,
      description: this.description,
      minimum: this.minimum,
      maximum: this.maximum,
      enum: this.enum,
      readOnly: this.readOnly,
      multipleOf: this.multipleOf,
      links: this.links
    };
  }

  /**
   * @method isVisible
   * @returns true if this is a visible property, which is a property
   *          that is reported in the property description.
   */
  isVisible() {
    return this.visible;
  }

  /**
   * Sets the value and notifies the device if the value has changed.
   * @returns true if the value has changed
   */
  setCachedValueAndNotify(value: any) {
    const oldValue = this.value;
    this.setCachedValue(value);

    // setCachedValue may change the value, therefore we have to check
    // this.value after the call to setCachedValue
    const hasChanged = oldValue !== this.value;

    if (hasChanged) {
      this.device.notifyPropertyChanged(this);

      console.log('setCachedValueAndNotify for property', this.name,
        'from', oldValue, 'to', this.value, 'for', this.device.id);
    }

    return hasChanged;
  }

  /**
   * Sets this.value and makes adjustments to ensure that the value
   * is consistent with the type.
   */
  setCachedValue(value: any) {
    if (this.type === 'boolean') {
      // Make sure that the value is actually a boolean.
      this.value = !!value;
    } else {
      this.value = value;
    }
    return this.value;
  }

  /**
   * @method getValue
   * @returns a promise which resolves to the retrieved value.
   *
   * This implementation is a simple one that just returns
   * the previously cached value.
   */
  getValue() {
    return new Promise((resolve) => {
      if (this.value != this.prevGetValue) {
        console.log('getValue for property', this.name,
          'for:', this.device.title,
          'returning', this.value);
        this.prevGetValue = this.value;
      }
      resolve(this.value);
    });
  }

  /**
   * @method setValue
   * @returns a promise which resolves to the updated value.
   *
   * @note it is possible that the updated value doesn't match
   * the value passed in.
   *
   * It is anticipated that this method will most likely be overridden
   * by a derived class.
   */
  setValue(value: any) {
    return new Promise((resolve, reject) => {
      if (this.readOnly) {
        reject('Read-only property');
        return;
      }

      if (this.minimum && value < this.minimum) {
        reject(`Value less than minimum: ${this.minimum}`);
        return;
      }

      if (this.maximum && value > this.maximum) {
        reject(`Value greater than maximum: ${this.maximum}`);
        return;
      }

      if (this.multipleOf && value % this.multipleOf !== 0) {
        reject(`Value is not a multiple of: ${this.multipleOf}`);
        return;
      }

      if (this.enum && this.enum.length > 0 &&
        !this.enum.includes(value)) {
        reject('Invalid enum value');
        return;
      }

      this.setCachedValueAndNotify(value);
      resolve(this.value);
    });
  }
}

export interface PropertyDict {
  name: string,
  value: any,
  visible: boolean
}

export interface PropertyDescription {
  visible?: boolean;
  title?: string;
  type?: string;
  '@type'?: string;
  unit?: string;
  description?: string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  readOnly?: boolean;
  multipleOf?: number;
  links?: string[];
}

interface LegacyPropertyDescription extends PropertyDescription {
  min?: number;
  max?: number;
  label?: string;
}
