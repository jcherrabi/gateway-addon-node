/**
 * Wraps up a promise in a slightly more convenient manner for passing
 * around, or saving.
 *
 * @module Deferred
 */

'use strict';

const DEBUG = false;

let id = 0;

export class Deferred {
  private id: number;
  public promise: Promise<any>;
  private resolveFunc: { (value?: any): void; (arg0: any): void; } = () => { };
  private rejectFunc: { (reason?: any): void; (arg0: any): void; } = () => { };

  constructor() {
    this.id = ++id;
    this.promise = new Promise((resolve, reject) => {
      this.resolveFunc = resolve;
      this.rejectFunc = reject;
    });
    if (DEBUG) {
      console.log('Deferred: Created deferred promise id:', this.id);
    }
  }

  resolve(arg: any) {
    if (DEBUG) {
      console.log('Deferred: Resolving deferred promise id:', this.id,
        'arg:', arg);
    }
    return this.resolveFunc(arg);
  }

  reject(arg: any) {
    if (DEBUG) {
      console.log('Deferred: Rejecting deferred promise id:', this.id,
        'arg:', arg);
    }
    return this.rejectFunc(arg);
  }
}
