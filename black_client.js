
let LOCAL_TEST = false;

let EDGE_JUPITER_IP = "10.0.10.1";
let EDGE_JUPITER_PORT = 1935;


if(LOCAL_TEST) {
    EDGE_JUPITER_IP = "127.0.0.1";
    EDGE_JUPITER_PORT = 1935;
}

const NodeRtmpEdgeChangeClient = require('./node_rtmp_edge_change_client');
const NodeRtmpClient = require('./node_rtmp_client');
const research_utils = require('./research_utils');
const stream_key = "wins2";

let pull_jupiter = new NodeRtmpEdgeChangeClient(
    'rtmp://' + EDGE_JUPITER_IP + '/live/' + stream_key,
    "black"
);

let push_jupiter = new NodeRtmpEdgeChangeClient('rtmp://' + EDGE_JUPITER_IP + '/live/wins3');
// rtmp://143.248.55.86:31935/live/wins

//let rtmp_pushing_to_server_client = new NodeRtmpClient('rtmp://' + push_addr + '/live/' + stream_key);
//let rtmp_polling_from_server_client = new NodeRtmpClient('rtmp://' + push_addr + '/live/' + stream_key);
/*
* obs studio ->
* (node_rtmp_server local) ->
* rtmp_polling_client ->
* rtmp_pushing_to_server_client ->
* (node_rtmp_server remote) ->
* rtmp_polling_from_server_client
* */


async function run_pulling(pulling_client) {
    pulling_client.on('video', (videoData, timestamp) => {

        let frame_type = (videoData[0] >> 4) & 0x0f;
        let codec_id = videoData[0] & 0x0f;

        if(!(frame_type == 1 && videoData[1] ==0 && codec_id == 7)){
            research_utils.appendLogForMessage(
                pulling_client.connection_id,
                pulling_client.activeClient.url,
                'VideoPolling',
                timestamp,
                videoData.length,
                research_utils.getTimestampMicro(),
                (videoData[0] >> 4) & 0x0f
            );
        }


        //console.log(research_utils.getTimestamp() + " " +
        //   pulling_client.connection_id + " I receive video (" + timestamp + ")")
        push_jupiter.pushVideo(videoData, timestamp);
    });

    push_jupiter.startPush();
    pulling_client.startPull();
}

run_pulling(pull_jupiter);

/*
rtmp_polling_from_server_client.on('video', (videoData, timestamp) => {
    research_utils.appendLog(
        [timestamp, 'rtmp_polling_from_server_client']
    );

});

async function run_rtmp_pushing_to_server_client() {
    rtmp_pushing_to_server_client.startPush();
}
async function run_rtmp_polling_from_server_client() {
    rtmp_polling_from_server_client.startPull();
}

run_rtmp_polling_client();
run_rtmp_pushing_to_server_client();
run_rtmp_polling_from_server_client();
*/
