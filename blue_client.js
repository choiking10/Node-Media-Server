const exec = require('child_process').exec;

const research_utils = require('./research_utils');
const NodeRtmpEdgeChangeClient = require('./node_rtmp_edge_change_client');

const STRATEGY_DO_YOUR_SELF = 0;
const STRATEGY_HARD_HAND_OFF = 1;
const STRATEGY_AFTER_FIXED_TIME = 2;
const STRATEGY_BEFORE_I_FRAME = 3;
const STRATEGY_AFTER_I_FRAME = 4;

const NUMBER_OF_NETWORK = 6;

const LOCAL_TEST = false;

let POLL_FROM_ME = "127.0.0.1";
let EDGE_JUPITER_IP = "10.0.10.1";
let EDGE_EARTH_IP = "10.0.20.1";
let EDGE_MOON_IP = "10.0.30.1";
let EDGE_JUPITER_PORT = 1935;
let EDGE_EARTH_PORT = 1935;
let EDGE_MOON_PORT = 1935;

if(LOCAL_TEST) {
    EDGE_JUPITER_IP = "127.0.0.1";
    EDGE_EARTH_IP = "127.0.0.1";
    EDGE_MOON_IP = "127.0.0.1";
    EDGE_JUPITER_PORT = 1935;
    EDGE_EARTH_PORT = 1936;
    EDGE_MOON_PORT = 1937;
}

const changeAddr = [
    [EDGE_JUPITER_IP, EDGE_JUPITER_PORT],
    [EDGE_EARTH_IP, EDGE_EARTH_PORT],
    [EDGE_MOON_IP, EDGE_MOON_PORT],
    [EDGE_EARTH_IP, EDGE_EARTH_PORT],
];

const candidateEdgesList = [
    [[EDGE_EARTH_IP, EDGE_EARTH_PORT],],
    [[EDGE_MOON_IP, EDGE_MOON_PORT],],
    [[EDGE_EARTH_IP, EDGE_EARTH_PORT],],
    [[EDGE_MOON_IP, EDGE_MOON_PORT],],
];

const initHandOffSequence = [
    '/bin/bash bash/change-link.sh wlan0 0',
    '/bin/bash bash/change-link.sh wlan1 1',
    '/bin/bash bash/soft-handoff.sh wlan1 wlan0 0',
];

let net_number = 0;
let timeoutId = -1;

let rtmp_polling_client = new NodeRtmpEdgeChangeClient(
    'rtmp://' + POLL_FROM_ME + '/live/wins',
    "blue_send"
);
let publisher = new NodeRtmpEdgeChangeClient('rtmp://' +
    changeAddr[Math.floor(net_number / 2) % changeAddr.length][0] + '/live/wins2', 'blue-publisher');

publisher.setEdgeChangeStrategy(parseInt("1"));

for(let cmd of initHandOffSequence) {
    if(!LOCAL_TEST) {
        exec(cmd);
    }
    console.log(cmd);
}

function handoff(network_number) {
    let dev_name = "wlan";
    let dev_from = 1;
    let dev_to = 0;

    if(network_number % 2 != 0){
        dev_from = 0;
        dev_to = 1;
    }
    dev_from = dev_name + dev_from;
    dev_to = dev_name + dev_to;

    let present_net_number = network_number % ((NUMBER_OF_NETWORK - 1) * 2);
    let next_net_number = (network_number+1) % ((NUMBER_OF_NETWORK - 1) * 2);

    if (present_net_number >= 5) {
        present_net_number = ((NUMBER_OF_NETWORK - 1) * 2) - present_net_number;
    }

    if (next_net_number >= 5) {
        next_net_number = ((NUMBER_OF_NETWORK - 1) * 2) - next_net_number;
    }
    
    let softHandoffExec = "/bin/bash bash/soft-handoff.sh " +  dev_from + " " +  dev_to + " "  + present_net_number;
    let linkChangeExec = "/bin/bash bash/change-link.sh " + dev_from + " " + next_net_number;

    console.log(research_utils.getTimestampMicro() + " " + softHandoffExec);
    console.log(research_utils.getTimestampMicro() + " " + linkChangeExec);

    if(!LOCAL_TEST) {
        let output = exec(softHandoffExec);
        output.on('data', (data)=>{
            console.log(research_utils.getTimestampMicro() + " " + data);
        });
        exec(linkChangeExec);
    }
}


setInterval(() => {
    if (timeoutId != -1) {
        clearTimeout(timeoutId);
    }
    net_number += 1;

    let candidateEdges = candidateEdgesList[
        Math.floor((net_number-1) / 2) % candidateEdgesList.length
    ];
    console.log(research_utils.getTimestamp()  + " " +
        publisher.connection_id + " try to change addr! to " + candidateEdges);

    if(Math.floor(net_number/2) != Math.floor((net_number-1)/2) ){
        let [ip, port] = changeAddr[Math.floor(net_number / 2) % changeAddr.length];
        publisher.setNextIpPort(ip, port);
        console.log(research_utils.getTimestamp()  + " set ip and port " + ip + " " + port);
    }
    publisher.readyEdgeChange(candidateEdges);

    handoff(net_number);
}, 20000);


rtmp_polling_client.on('video', (videoData, timestamp) => {
    publisher.pushVideo(videoData, timestamp);
});

async function run_rtmp_polling_client() {
    rtmp_polling_client.startPull();
    console.log("rtmp_polling_client start");
}

async function run_publush(publish_client) {
    publish_client.startPush();
}

run_publush(publisher);
run_rtmp_polling_client();

// rtmp://143.248.55.86:31935/live/wins

//
//let rtmp_polling_from_server_client = new NodeRtmpClient('rtmp://' + push_addr + '/live/' + stream_key);
/*
* obs studio ->
* (node_rtmp_server local) ->
* rtmp_polling_client ->
* rtmp_pushing_to_server_client ->
* (node_rtmp_server remote) ->
* rtmp_polling_from_server_client
* */

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
