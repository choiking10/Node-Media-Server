
const NodeRtmpClient = require('./node_rtmp_client');
const research_utils = require('./research_utils');


class NodeRtmpEdgeChangeClient {
    constructor(rtmpUrl, connection_id="no_id") {
        this.url = rtmpUrl;
        this.connection_id = connection_id;
        this.activeClient = new NodeRtmpClient(rtmpUrl, connection_id);
        this.nextEdgeClient = null;
        this.callback = {};
        this.directStart = false;

        let _this = this;
        this.activeClient.on('edge_change', (ip, port) => {
            _this.readyEdgeChange(ip, port);
            console.log(research_utils.getTimestamp() +this.connection_id + " viewer will exchange to " + [ip, port]);
        });
    }

    on(event, callback){
        this.callback[event] = callback;
        this.activeClient.on(event, callback);
    }

    async readyEdgeChange(ip, port) {
        this.activeClient.sendEdgeChangeMessage(ip, port);
        let presentInfo = Object.assign({}, this.activeClient.info);
        this.nextEdgeClient = new NodeRtmpClient(
            "rtmp://"+ip+":"+port+presentInfo.pathname,
            this.activeClient.connection_id);
        let _this = this;
        this.nextEdgeClient.on('edge_change', (ip, port) => {
            _this.readyEdgeChange(ip, port);
            console.log(research_utils.getTimestamp() + this.connection_id + "viewer will exchange to " + [ip, port]);
        });
        if(this.activeClient.isPublish){
            this.nextEdgeClient.startPush();
        }
        else {
            let _this = this;
            this.nextEdgeClient.launcher.once("video", (videoData, timestamp) => {
                _this.DoEdgeChange();
                _this.callback["video"](videoData, timestamp);
            });

            this.nextEdgeClient.startPull();

        }
        console.log(research_utils.getTimestamp() + this.connection_id + " ready to exchange to " + this.activeClient.url);
        if (this.directStart){
            this.directStart = false;
            console.log(research_utils.getTimestamp() + this.connection_id + "direct start!");
            this.DoEdgeChange();
        }
    }
    DoEdgeChange() {
        if(this.nextEdgeClient == null) {
            this.directStart = true;
            return;
        }
        for(let key in this.callback) {
            this.nextEdgeClient.on(key, this.callback[key]);
        }
        this.activeClient.stop();
        this.activeClient = this.nextEdgeClient;
        this.nextEdgeClient = null;
        console.log(research_utils.getTimestamp() + this.connection_id + " exchange to " + this.activeClient.url);
    }

    pushAudio(audioData, timestamp) {
        this.activeClient.pushAudio(audioData, timestamp);
    }

    pushVideo(videoData, timestamp) {
        this.activeClient.pushVideo(videoData, timestamp);
    }

    pushScript(scriptData, timestamp) {
        this.activeClient.pushScript(scriptData, timestamp);
    }
    startPull() {
        this.activeClient.startPull();
    }
    startPush() {
        this.activeClient.startPush();
    }

}
module.exports = NodeRtmpEdgeChangeClient
;