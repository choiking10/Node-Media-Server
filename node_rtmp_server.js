//
//  Created by Mingliang Chen on 17/8/1.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require('./node_core_logger');

const secure_mode = true;
const Net = require('net');
const fs = require('fs');
const tls = require('tls');
const options = {
    key: fs.readFileSync('./server.pem'),
    cert: fs.readFileSync('./server.crt')
    //ca: fs.readFileSync('./csr.pem', 'utf8'),
    //requestCert: false //do not request client side cert.
} //tls key and cert.

const NodeRtmpSession = require('./node_rtmp_session');
const NodeCoreUtils = require('./node_core_utils');

const context = require('./node_core_ctx');

const RTMP_PORT = 1935;

class NodeRtmpServer {
  constructor(config) {
    config.rtmp.port = this.port = config.rtmp.port ? config.rtmp.port : RTMP_PORT;
    if (secure_mode) { //may not working...
        this.tcpServer = tls.createServer(options, (socket) => {
        let session = new NodeRtmpSession(config, socket);
        session.run();
        })
    }
    else {
        this.tcpServer = Net.createServer((socket) => {
            let session = new NodeRtmpSession(config, socket);
            session.run();
        })
    }}

  run() {
    this.tcpServer.listen(this.port, () => {
      Logger.log(`Node Media Rtmp Server started on port: ${this.port}`);
      if (secure_mode) {
          Logger.log('Secure mode ON')}
    });

    this.tcpServer.on('error', (e) => {
      Logger.error(`Node Media Rtmp Server ${e}`);
    });

    this.tcpServer.on('close', () => {
      Logger.log('Node Media Rtmp Server Close.');
    });
  }

  stop() {
    this.tcpServer.close();
    context.sessions.forEach((session, id) => {
      if (session instanceof NodeRtmpSession)
        session.stop();
    });
  }
}

module.exports = NodeRtmpServer
