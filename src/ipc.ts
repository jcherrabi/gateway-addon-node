'use strict';

import Ajv, { ValidateFunction } from 'ajv';
import fs from 'fs';
import nanomsg, { Socket } from 'nanomsg';
import path from 'path';

const DEBUG = false;
const DEBUG_MSG = false;

const boundAddrs = new Set();
const connectedAddrs = new Set();
let socketId = 0;

export class IpcSocket {
  private socket: Socket;
  private socketId: any;
  private ipcFile: string;
  public ipcAddr: string;
  private logPrefix: string;
  private connected: boolean;
  private bound: boolean;
  private validate: ValidateFunction;

  constructor(private name: string, private socketType: string, private protocol: string, baseAddr: string, private onMsg: (data: any) => void, appInstance: string) {
    this.socket = nanomsg.socket(socketType);
    socketId += 1;
    this.socketId = socketId;

    switch (this.protocol) {
      case 'ipc':
        this.ipcFile = `/tmp/${baseAddr}`;
        break;

      case 'inproc':
        this.ipcFile = `${appInstance}-${baseAddr}`;
        break;

      default: {
        const err = `Unsupported IPC protocol: ${this.protocol}`;
        console.error(err);
        throw err;
      }
    }
    this.ipcAddr = `${this.protocol}://${this.ipcFile}`;

    this.logPrefix = `IpcSocket${(`${this.socketId}`).padStart(3)}: ${
      this.name.padEnd(18)}:`;
    DEBUG && this.log('  alloc', this.ipcAddr, socketType);

    this.socket.on('data', this.onData.bind(this));
    this.connected = false;
    this.bound = false;

    // Build the JSON-Schema validator for incoming messages
    const baseDir = path.resolve(path.join(__dirname, '..', 'schema'));
    const schemas = [];

    // top-level schema
    schemas.push(
      JSON.parse(fs.readFileSync(path.join(baseDir, 'schema.json')).toString())
    );

    // individual message schemas
    for (const fname of fs.readdirSync(path.join(baseDir, 'messages'))) {
      schemas.push(
        JSON.parse(fs.readFileSync(path.join(baseDir, 'messages', fname)).toString())
      );
    }

    // now, build the validator using all the schemas
    this.validate = new Ajv({ schemas }).getSchema(schemas[0].$id);
  }

  error(...args: [any?, ...any[]]) {
    Array.prototype.unshift.call(args, this.logPrefix);
    console.error.apply(null, args);
  }

  log(...args: [any?, ...any[]]) {
    Array.prototype.unshift.call(args, this.logPrefix);
    console.log.apply(null, args);
  }

  bind() {
    DEBUG && this.log('   bind', this.ipcAddr);

    if (this.bound) {
      this.error('socket already bound:', this.ipcAddr);
    }
    if (this.connected) {
      this.error('socket already connected:', this.ipcAddr);
    }
    this.bound = true;

    if (this.socketType === 'pair') {
      if (boundAddrs.has(this.ipcAddr)) {
        this.error('address already bound:', this.ipcAddr);
      }
      boundAddrs.add(this.ipcAddr);
    }

    if (this.protocol === 'ipc') {
      if (fs.existsSync(this.ipcFile)) {
        fs.unlinkSync(this.ipcFile);
      }
    }
    return this.socket.bind(this.ipcAddr);
  }

  connect() {
    DEBUG && this.log('connect', this.ipcAddr);

    if (this.bound) {
      this.error('socket already bound:', this.ipcAddr);
    }
    if (this.connected) {
      this.error('socket already connected:', this.ipcAddr);
    }
    this.connected = true;

    if (this.socketType === 'pair') {
      if (connectedAddrs.has(this.ipcAddr)) {
        this.error('address already connected:', this.ipcAddr);
      }
      connectedAddrs.add(this.ipcAddr);
    }

    return this.socket.connect(this.ipcAddr);
  }

  close() {
    DEBUG && this.log('  close', this.ipcAddr);
    if (this.connected) {
      this.connected = false;
      if (this.socketType === 'pair') {
        connectedAddrs.delete(this.ipcAddr);
      }
    } else if (this.bound) {
      this.bound = false;
      if (this.socketType === 'pair') {
        boundAddrs.delete(this.ipcAddr);
      }
    } else {
      this.error('socket not connected or bound:', this.ipcAddr);
    }
    this.socket.close();
  }

  /**
   * @method onData
   * @param {Buffer} buf
   *
   * Called anytime a new message has been received.
   */
  onData(buf: Buffer) {
    const bufStr = buf.toString();
    let data;
    try {
      data = JSON.parse(bufStr);
    } catch (err) {
      this.error('Error parsing message as JSON');
      this.error(`Rcvd: "${bufStr}"`);
      this.error(err);
      return;
    }
    DEBUG_MSG && this.log(this.name, 'Rcvd:', data);

    // validate the message before forwarding to handler
    if (!this.validate({ message: data })) {
      console.error('Invalid message received:', data);
    }

    this.onMsg(data);
  }

  /**
   * @method sendJson
   * @param {dict} obj
   *
   * Async function which will convert the passed object
   * into json, send it and not wait for any type of reply.
   */
  sendJson(obj: object) {
    const jsonObj = JSON.stringify(obj);
    DEBUG_MSG && this.log(this.name, 'Sending:', jsonObj);
    this.socket.send(jsonObj);
  }
}

module.exports = IpcSocket;
