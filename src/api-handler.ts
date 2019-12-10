/**
 * @module API Handler base class.
 *
 * Allows add-ons to create generic REST API handlers without having to create
 * a full HTTP server.
 */
/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { AddonManager } from "./addon-manager";
import { equal } from 'assert';

/**
 * Class which holds an API request.
 */
export class APIRequest {
  public method: string;
  public path: string;
  public query: object;
  public body: object;
  /**
   * Build the request.
   *
   * @param {object} params - Request parameters, as such:
   *                   .method {string} HTTP method, e.g. GET, POST, etc.
   *                   .path {string} Path relative to this handler, e.g.
   *                     '/mypath' rather than
   *                     '/extensions/my-extension/api/mypath'.
   *                   .query {object} Object containing query parameters
   *                   .body {object} Body content in key/value form. All
   *                     content should be requested as application/json or
   *                     application/x-www-form-urlencoded data in order for it
   *                     to be parsed properly.
   */
  constructor(params: RequestParams) {
    this.method = params.method;
    this.path = params.path;
    this.query = params.query || {};
    this.body = params.body || {};
  }
}

interface RequestParams {
  method: string;
  path: string;
  query: object;
  body: object;
}

/**
 * Convenience class to build an API response.
 */
export class APIResponse {
  public status: number;
  public contentType?: string;
  public content?: string;
  /**
   * Build the response.
   *
   * @param {object} params - Response parameters, as such:
   *                   .status {number} (Required) Status code
   *                   .contentType {string} Content-Type of response content
   *                   .content {string} Response content
   */
  constructor(params?: ResponseParams) {
    const {
      status,
      contentType,
      content
    } = params || {};

    if (!status) {
      this.status = 500;
      return;
    }

    equal(typeof status, 'number',
      'status should be a number');
    this.status = status;

    if (contentType) {
      equal(typeof contentType, 'string',
        'contentType should be a string');
      this.contentType = contentType;
    }

    if (content) {
      equal(typeof content, 'string',
        'content should be a string');
      this.content = content;
    }
  }
}

interface ResponseParams {
  status: number;
  contentType?: string;
  content?: string;
}

/**
 * Base class for API handlers, which handle sending alerts to a user.
 * @class Notifier
 */
export class APIHandler {
  public gatewayVersion: string;
  public userProfile: any;

  constructor(manager: AddonManager, private packageName: string) {
    this.gatewayVersion = manager.gatewayVersion;
    this.userProfile = manager.userProfile;
  }

  getPackageName() {
    return this.packageName;
  }

  /**
   * @method handleRequest
   *
   * Called every time a new API request comes in for this handler.
   *
   * @param {APIRequest} request - Request object
   *
   * @returns {APIResponse} API response object.
   */
  async handleRequest(request: APIRequest) {
    console.log(`New API request for ${this.packageName}:`, request);
    return new APIResponse({ status: 404 });
  }

  /**
   * Unloads the handler.
   *
   * @returns a promise which resolves when the handler has finished unloading.
   */
  unload() {
    console.log('API Handler', this.packageName, 'unloaded');
    return Promise.resolve();
  }
}

module.exports = { APIHandler, APIRequest, APIResponse };
