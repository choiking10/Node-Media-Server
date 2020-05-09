
const NodeRtmpClient = require('./node_rtmp_client');
const research_utils = require('./research_utils');

const STRATEGY_DO_YOUR_SELF = 0;
const STRATEGY_HARD_HAND_OFF = 1;
const STRATEGY_AFTER_FIXED_TIME = 2;
const STRATEGY_BEFORE_I_FRAME = 3;
const STRATEGY_AFTER_I_FRAME = 4;
const STRATEGY_NOT_NEAR_I_FRAME = 5;

const EDGE_CHANGE_BEFORE_READY = 0;
const EDGE_CHANGE_READY = 0;


class NodeRtmpEdgeChangeClient {
    constructor(rtmpUrl, connection_id="no_id") {
        this.url = rtmpUrl;
        this.connection_id = connection_id;
        this.activeClient = new NodeRtmpClient(rtmpUrl, connection_id);
        this.nextEdgeClient = null;
        this.callback = {};
        this.directStart = false;
        this.edge_change_strategy = STRATEGY_DO_YOUR_SELF;
        this.edge_change_value = 0;
        this.ready_change = false;
        this.cache = new Set();
        this.frame_count = 0;
        this.bef_time_stamp = -1;
        this.nextIpPort = null;
        this.doEdgeTimerId = -1;

        let _this = this;
        this.activeClient.on('edge_change', (candidateEdges) => {
            _this.readyEdgeChange(candidateEdges);
            _this.doEdgeTimerId = setTimeout(
                () => _this.DoEdgeChange(),
                5000);
            console.log(research_utils.getTimestamp()  + " " +
                this.connection_id + "viewer will change to " + candidateEdges);
        });
    }

    on(event, callback){
        this.callback[event] = callback;
        this.activeClient.on(event, callback);
    }

    setEdgeChangeStrategy(strategy_name, value=1000) {
        this.edge_change_strategy = strategy_name;
        this.edge_change_value = value;
    }
    setNextIpPort(ip, port) {
        this.nextIpPort = ip + ":" + port;
        console.log("set next IP and Port " + this.nextIpPort)
    }
    edgeChangeHandler() {
        let _this = this;
        switch ((this.edge_change_strategy)) {
            case STRATEGY_AFTER_FIXED_TIME:
                console.log("STRATEGY_AFTER_FIXED_TIME");
                setTimeout(()=> _this.DoEdgeChange(), 150);
                break;
            case STRATEGY_HARD_HAND_OFF:
                console.log("STRATEGY_HARD_HAND_OFF");
                this.DoEdgeChange();
                break;
            case STRATEGY_AFTER_I_FRAME:
                console.log("STRATEGY_AFTER_I_FRAME");
                this.ready_change = true;
                break;
            case STRATEGY_BEFORE_I_FRAME:
                console.log("STRATEGY_BEFORE_I_FRAME");
                this.ready_change = true;
                break;

            case STRATEGY_NOT_NEAR_I_FRAME:
                console.log("STRATEGY_NOT_NEAR_I_FRAME");
                setTimeout(()=> _this.ready_change = true, 100);
                break;
        }
    }
    async readyEdgeChange(candidateEdges) {
        let _this = this;
        this.nextEdgeClient = new Map();
        if(this.activeClient.isPublish){
            console.log("send edge change message");
            this.activeClient.sendEdgeChangeMessage(candidateEdges);
        }
        let presentInfo = Object.assign({}, this.activeClient.info);

        for (let i =0; i < candidateEdges.length; i++){
            let [ip, port] = candidateEdges[i];
            let ipAndPort = ip+":"+port;
            let rtmpUrl = "rtmp://"+ip+":"+port+presentInfo.pathname;
            let egClient = new NodeRtmpClient(rtmpUrl,this.activeClient.connection_id);
            console.log("connect to " + rtmpUrl);

            if(this.activeClient.isPublish) {
                // broadcaster
                egClient.avcSequenceHeader = this.activeClient.avcSequenceHeader;
                egClient.startPush();
            } else {
                // viewer
                egClient.on('edge_change', (candidateEdgeList) => {
                    _this.readyEdgeChange(candidateEdgeList);
                    _this.doEdgeTimerId = setTimeout(
                        () => _this.DoEdgeChange(),
                        5000);
                    console.log(research_utils.getTimestamp()  + " " +
                        this.connection_id + "viewer will change to " + candidateEdgeList);
                });

                egClient.launcher.once("video-arrive", (ip, port) => {
                    console.log("I receive from " + ip +":" + port );
                    _this.setNextIpPort(ip, port);
                    _this.DoEdgeChange();
                });

                egClient.startPull();
            }
            this.nextEdgeClient.set(ipAndPort, egClient);
        }
        if(this.activeClient.isPublish) {
            this.edgeChangeHandler();
        }
    }
    async DoEdgeChange() {
        if(this.nextEdgeClient == null) {
            return;
        }
        let nextEGClient = null;
        console.log("DoEdgeChange");
        if(this.nextIpPort != null) {
            console.log(research_utils.getTimestamp()  + " " +
                this.connection_id + " from " + Array.from(this.nextEdgeClient.keys()) +
                " switching to " + this.nextIpPort);

            if(!this.nextEdgeClient.has(this.nextIpPort)){
                for(let egClient of this.nextEdgeClient.keys()){
                    console.log(egClient);
                }

                throw new Error("next edge client has no present nextIpPort");
            }

            nextEGClient = this.nextEdgeClient.get(this.nextIpPort);

            for(let key in this.callback) {
                nextEGClient.on(key, this.callback[key]);
            }
            nextEGClient.avcSequenceHeader = this.activeClient.avcSequenceHeader;
            this.activeClient.stop();
            this.activeClient = nextEGClient;
        } else {
            // cancel edge switching
            console.log(research_utils.getTimestamp()  + " " +
                this.connection_id + " no switching");
        }
        let tmp = this.nextEdgeClient;
        this.nextEdgeClient = null;
        this.nextIpPort = null;


        for(let egClient of tmp.values()){
            if (egClient != nextEGClient) {
                if (egClient.isPublish) {
                    egClient.rtmpSendFCUnpublish();
                }
                egClient.rtmpSendDeleteStream();
                egClient.socket.destroy();

                console.log(research_utils.getTimestamp()  + " " +
                    this.connection_id + " stop " + egClient.info.host);
            }
        }

    }

    pushAudio(audioData, timestamp) {
        this.activeClient.pushAudio(audioData, timestamp);
    }
    _pushVideo(videoData, timestamp) {
        let frame_type = (videoData[0] >> 4) & 0x0f;
        let codec_id = videoData[0] & 0x0f;

        if(this.edge_change_strategy == STRATEGY_BEFORE_I_FRAME &&
            this.ready_change && frame_type == 1){
            this.DoEdgeChange();
            this.ready_change = false;
        } else if(this.edge_change_strategy == STRATEGY_NOT_NEAR_I_FRAME &&
            this.ready_change &&
            100 <= this.frame_count && this.frame_count <= 200){
            console.log("we change at " + this.frame_count);
            this.DoEdgeChange();
            this.ready_change = false;
        } else if(this.directStart){
            this.DoEdgeChange();
            this.ready_change = false;
        }

        this.frame_count += 1;
        if(frame_type == 1) {
            this.frame_count = 0;
        }

        if(this.activeClient.isSendAvcSequenceHeader == true && frame_type == 1 && videoData[1] == 0 && codec_id == 7) return;
        if(this.activeClient.isSendAvcSequenceHeader == false){
            let is_header = false;
            if (codec_id == 7 || codec_id == 12) {
                //cache avc sequence header
                if (frame_type == 1 && videoData[1] == 0) {
                    is_header = true;
                }
            }
            if(!is_header) {
                this.activeClient.pushVideo(this.activeClient.avcSequenceHeader, 0);
            }
        }
        if(!(frame_type == 1 && videoData[1] ==0 && codec_id == 7)){
            research_utils.appendLogForMessage(
                this.connection_id,
                this.activeClient.url,
                'VideoPush',
                timestamp,
                videoData.length,
                research_utils.getTimestampMicro(),
                frame_type
            );
        }

        this.activeClient.pushVideo(videoData, timestamp);

        if(this.edge_change_strategy == STRATEGY_AFTER_I_FRAME &&
            this.ready_change && frame_type == 1){
            this.DoEdgeChange();
            this.ready_change = false;

        }
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
