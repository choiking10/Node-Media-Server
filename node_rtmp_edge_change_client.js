
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

    setEdgeChangeStrategy(strategy_name, value=1000) {
        this.edge_change_strategy = strategy_name;
        this.edge_change_value = value;
    }
    edgeChangeHandler() {
        let _this = this;
        switch ((this.edge_change_strategy)) {
            case STRATEGY_AFTER_FIXED_TIME:
                setTimeout(()=> _this.DoEdgeChange(), this.edge_change_value);
                console.log("STRATEGY_AFTER_FIXED_TIME");
                break;
            case STRATEGY_HARD_HAND_OFF:
                this.DoEdgeChange();
                console.log("STRATEGY_HARD_HAND_OFF");
                break;
            case STRATEGY_AFTER_I_FRAME:
                this.ready_change = true;
                console.log("STRATEGY_AFTER_I_FRAME");
                break;
            case STRATEGY_BEFORE_I_FRAME:
                this.ready_change = true;
                console.log("STRATEGY_BEFORE_I_FRAME");
                break;

            case STRATEGY_NOT_NEAR_I_FRAME:
                setTimeout(()=> _this.ready_change = true, 100);
                console.log("STRATEGY_NOT_NEAR_I_FRAME");
                break;
        }
    }
    async readyEdgeChange(ip, port) {
        console.log(research_utils.getTimestamp()  + " " +
            this.connection_id + " ready to exchange to " + this.activeClient.url);

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
            this.edgeChangeHandler();
        }
        else {
            let _this = this;
            this.nextEdgeClient.launcher.once("video", (videoData, timestamp) => {
                _this.DoEdgeChange();
                _this.callback["video"](videoData, timestamp);
            });

            this.nextEdgeClient.startPull();
        }

    }
    DoEdgeChange() {
        if(this.nextEdgeClient == null) {
            console.log("directStart!");
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
        let frame_type = (videoData[0] >> 4) & 0x0f;
        let codec_id = videoData[0] & 0x0f;

        if(this.edge_change_strategy == STRATEGY_BEFORE_I_FRAME &&
            this.ready_change && frame_type == 1){
            this.DoEdgeChange();
            this.ready_change = false;
        } else if(this.edge_change_strategy == STRATEGY_NOT_NEAR_I_FRAME &&
            this.ready_change && frame_type == 1 &&
            100 <= this.frame_count && this.frame_count <= 200){
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
