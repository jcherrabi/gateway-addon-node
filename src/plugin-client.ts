/**
 * @module PluginClient
 *
 * Takes care of connecting to the gateway for an adapter plugin
 */
/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

import { AddonManagerProxy } from './addon-manager-proxy';
const { MessageType } = require('./constants');
import { Deferred } from './deferred';
import EventEmitter from 'events';
import { IpcSocket } from './ipc';

export class PluginClient extends EventEmitter {
  private deferredReply: any;
  private verbose: boolean;
  public gatewayVersion?: string;
  public userProfile?: string;
  private addonManager?: AddonManagerProxy;
  private pluginIpcBaseAddr: any;
  private pluginIpcSocket?: IpcSocket;
  private managerIpcSocket?: IpcSocket;

  constructor(private pluginId: string, public ipcProtocol: string, private appInstance: string, { verbose = false } = {}) {
    super();
    this.verbose = verbose;
  }

  onManagerMsg(msg: any) {
    this.verbose &&
      console.log('PluginClient: rcvd ManagerMsg:', msg);

    if (!this.deferredReply) {
      console.error('No deferredReply setup');
      return;
    }

    if (msg.messageType === MessageType.PLUGIN_REGISTER_RESPONSE) {
      this.gatewayVersion = msg.data.gatewayVersion;
      this.userProfile = msg.data.userProfile;
      this.addonManager = new AddonManagerProxy(this);

      // Now that we're registered with the server, open the plugin
      // specific IPC channel with the server.
      this.pluginIpcBaseAddr = msg.data.ipcBaseAddr;
      this.pluginIpcSocket =
        new IpcSocket('PluginClient', 'pair',
          this.ipcProtocol,
          this.pluginIpcBaseAddr,
          this.addonManager.onMsg.bind(this.addonManager),
          this.appInstance);
      this.pluginIpcSocket.connect();
      this.verbose &&
        console.log('PluginClient: registered with PluginServer:',
          this.pluginIpcSocket.ipcAddr);

      const deferredReply = this.deferredReply;
      this.deferredReply = null;
      deferredReply.resolve(this.addonManager);
    } else {
      console.error('Unexpected registration reply for gateway');
      console.error(msg);
    }
  }
  pluginIpcAddr(_pluginIpcAddr: any) {
    throw new Error("Method not implemented.");
  }

  register() {
    if (this.deferredReply) {
      console.error('Already waiting for registration reply');
      return;
    }
    this.deferredReply = new Deferred();

    this.managerIpcSocket =
      new IpcSocket('PluginClientServer', 'req',
        this.ipcProtocol,
        'gateway.addonManager',
        this.onManagerMsg.bind(this),
        this.appInstance);
    this.managerIpcSocket.connect();

    // Register ourselves with the server
    this.verbose &&
      console.log('Connected to server:', this.managerIpcSocket.ipcAddr,
        'registering...');

    this.managerIpcSocket.sendJson({
      messageType: MessageType.PLUGIN_REGISTER_REQUEST,
      data: {
        pluginId: this.pluginId,
      },
    });

    return this.deferredReply.promise;
  }

  sendNotification(methodType: string, data: any) {
    data.pluginId = this.pluginId;
    if (this.pluginIpcSocket) {
      this.pluginIpcSocket.sendJson({
        messageType: methodType,
        data: data,
      });
    }
  }

  unload() {
    if (this.pluginIpcSocket) {
      this.pluginIpcSocket.close();
    }
    if (this.managerIpcSocket) {
      this.managerIpcSocket.close();
    }
    this.emit('unloaded', {});
  }
}

module.exports = PluginClient;
