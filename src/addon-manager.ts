/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Device } from "./device";
import { Property } from "./property";
import { Action } from "./action";
import { Event } from "./event";
import { Adapter } from "./adapter";
import { Outlet } from "./outlet";

export interface AddonManager {
  sendPropertyChangedNotification<T>(property: Property<T>): void;
  sendActionStatusNotification(action: Action): void;
  sendEventNotification(event: Event): void;
  sendConnectedNotification(device: Device, connected: boolean): void;
  gatewayVersion: string;
  userProfile: any;
  handleDeviceAdded(device: Device): void;
  handleDeviceRemoved(device: Device): void;
  emit<T>(eventType: any, property: Property<T> | Action | Event | { device: Device, connected: boolean }): void;
  sendPairingPrompt(adapter: Adapter, prompt: string, url?: string, device?: Device): void;
  sendUnpairingPrompt(adapter: Adapter, prompt: string, url?: string, device?: Device): void;
  handleOutletAdded(outlet: Outlet): void;
  handleOutletRemoved(outlet: Outlet): void;
}
