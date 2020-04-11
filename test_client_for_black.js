
const EDGE_JUPITER_IP = "10.0.10.1";

const NodeRtmpEdgeChangeClient = require('./node_rtmp_edge_change_client');
const research_utils = require('./research_utils');
const stream_key = "wins2";

let pull_jupiter = new NodeRtmpEdgeChangeClient(
    'rtmp://' + EDGE_JUPITER_IP + '/live/' + stream_key,
    "black"
);

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
        if(videoData != null)
            research_utils.appendLog(['black', timestamp, videoData.length], "black_pulling.csv");
        else
            research_utils.appendLog(['black', timestamp, "null"], "black_pulling.csv");

        console.log(research_utils.getTimestamp() + " " +
            this.connection_id + " I receive video (" + timestamp + ")")
    });
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