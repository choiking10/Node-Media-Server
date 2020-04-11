
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
        this.cache = new Set();

        let _this = this;
        this.activeClient.on('edge_change', (ip, port) => {
            _this.readyEdgeChange(ip, port);
            console.log(research_utils.getTimestamp() + " " +
                this.connection_id + " viewer will exchange to " + [ip, port]);
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
            console.log(research_utils.getTimestamp()  + " " +
                this.connection_id + "viewer will exchange to " + [ip, port]);
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
        console.log(research_utils.getTimestamp()  + " " +
            this.connection_id + " ready to exchange to " + this.activeClient.url);
        if (this.directStart){
            this.directStart = false;
            console.log(research_utils.getTimestamp()  + " " +
                this.connection_id + "direct start!");
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
        this.nextEdgeClient.avcSequenceHeader = this.activeClient.avcSequenceHeader;
        this.activeClient = this.nextEdgeClient;
        this.nextEdgeClient = null;
        console.log(research_utils.getTimestamp()  + " " +
            this.connection_id + " exchange to " + this.activeClient.url);
    }

    pushAudio(audioData, timestamp) {
        this.activeClient.pushAudio(audioData, timestamp);
    }
    _pushVideo(videoData, timestamp) {
        if(this.activeClient.isSendAvcSequenceHeader == false){
            let frame_type = (videoData[0] >> 4) & 0x0f;
            let codec_id = videoData[0] & 0x0f;
            let is_header = false;
            if (codec_id == 7 || codec_id == 12) {
                //cache avc sequence header
                if (frame_type == 1 && videoData[1] == 0) {
                    is_header = true;
                }
            }
            if(!is_header)
                this.activeClient.pushVideo(this.activeClient.avcSequenceHeader, 0);
        }
        this.activeClient.pushVideo(videoData, timestamp);
    }
    pushVideo(videoData, timestamp) {
        if(this.activeClient.streamId == 0) {
            this.cache.add([videoData, timestamp]);
            return;
        }
        if(this.cache.size != 0){
            for(let [vid, ts] of this.cache) {
                this._pushVideo(vid, ts);
            }
            this.cache.clear();
        }
        this._pushVideo(videoData, timestamp);
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