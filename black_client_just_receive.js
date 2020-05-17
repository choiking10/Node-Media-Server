
let LOCAL_TEST = true;

let EDGE_JUPITER_IP = "10.0.10.1";
let EDGE_JUPITER_PORT = 1935;


if(LOCAL_TEST) {
    EDGE_JUPITER_IP = "127.0.0.1";
    EDGE_JUPITER_PORT = 1935;
}

const NodeRtmpEdgeChangeClient = require('./node_rtmp_edge_change_client');
const stream_key = "wins2";

let pull_jupiter = new NodeRtmpEdgeChangeClient(
    'rtmp://' + EDGE_JUPITER_IP + '/live/' + stream_key
);

async function run_pulling(pulling_client) {
    pulling_client.on('video', (videoData, timestamp) => {

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
