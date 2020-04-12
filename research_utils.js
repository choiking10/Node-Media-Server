
const fs = require('fs');
const Bitop = require('./node_core_bitop');

function getTimestamp() {
    let ptime = new Date(Date.now());
    let year = ptime.getFullYear();
    let month = ptime.getMonth();
    let date = ptime.getDate();
    let hour = ptime.getHours();
    let min = ptime.getMinutes();
    let sec = ptime.getSeconds();
    return date + '/' + month + '/' + year + ' ' + hour + ':' + min + ':' + sec + " " + ptime.getMilliseconds();
}

function getTimestampMicro() {
    return Date.now().toString();
}

function getFileTimestamp() {
    let ptime = new Date(Date.now());
    return [ptime.getMonth(), ptime.getDate(), ptime.getHours(), ptime.getMinutes()].join('_');
}

const START_TIMESTAMP = getFileTimestamp();
const BASE_LOG_DIR = "./log/" + START_TIMESTAMP + "/";
if (!fs.existsSync(BASE_LOG_DIR)) {
    fs.mkdirSync(BASE_LOG_DIR, function (err) {
        console.log("make log dir error!" + err);
    });
}

function appendLog(data, filename="text"){
    if (!Array.isArray(data)){
        data = [data]
    }
    filename = BASE_LOG_DIR + filename;
    if(!filename.endsWith("csv")){
        filename += ".csv";
    }
    data = [getTimestampMicro()].concat(data).concat('\n');
    fs.appendFile(filename, data.join(','), function(err) {
    });
}
function appendLogForMessage(id, url, event_name, timestamp, length,
                             real_timestamp, frameType=0, filename=null) {
    if (filename == null){
        filename = id;
    }
    appendLog([
        id,
        url,
        event_name,
        timestamp,
        length,
        frameType,
        real_timestamp,
    ], filename)
}

class CustomLogger {
    constructor(filename, headers) {
        this.filename = BASE_LOG_DIR + filename;

        if(!this.filename.endsWith("csv")){
            this.filename  += ".csv";
        }
        this.header = headers;

    }
    appendLog(data){
        if (!Array.isArray(data)){
            data = [data]
        }
        data = [getTimestampMicro()].concat(data).concat('\n');
        fs.appendFile(this.filename, data.join(','), function(err) {
        });
    }
}

class FutureLog {
    constructor(data) {
        this.timestamp = getTimestampMicro();
        this.data = data;
        if (!Array.isArray(this.data)){
            this.data = [this.data]
        }
        this.data = [this.timestamp].concat(this.data).concat('\n');
    }
    appendLog(additional_data, filename="text.txt") {
        filename = BASE_LOG_DIR + filename;

        if (!Array.isArray(additional_data)){
            additional_data = [additional_data]
        }
        if(!filename.endsWith("csv")){
            filename += ".csv";
        }
        this.data = this.data.concat(additional_data);
        fs.appendFile(filename, this.data.join(','), function(err) {

        });
    }
}
class WriteBit {

    constructor() {
        this.bits = "";
    }
    writeBit(data, bit_num) {
        for(let i = 0; i < bit_num; i++)
            this.bits += (data & (1 << (bit_num-i)-1)).toString();
    }
}
class Field {
    constructor(field_name, bit, pos, data, calc=null, golomb=false) {
        this.field_name = field_name;
        this.bit = bit;
        this.golomb=golomb;
        this.pos = pos;
        this.data = data;
        this.calc = calc;

        if (this.calc == null) {
            this.calc = function (manager, data) {
                return data;
            }
        }
    }
}
class H264FieldManager {
    constructor(buffer) {
        this.buffer = buffer;
        this.order = [];
        this.holder = {};
        this.bitop = new Bitop(buffer);
    }
    add_field(field) {
        this.order.push(field);
        this.holder[field.field_name] = field;
    }
    read(field_name, n_bit=0, calc=null) {
        let pos = this.bitop.bufpos * 8 + this.bitop.bufoff;
        let data = this.bitop.read(n_bit);
        this.add_field(new Field(field_name, n_bit, pos, data, calc, false));

        return data;
    }
    read_golomb(field_name, calc=null) {
        let bef = this.bitop.bufpos * 8 + this.bitop.bufoff;
        let data = this.bitop.read_golomb();
        let aft = this.bitop.bufpos * 8 + this.bitop.bufoff;

        this.add_field(new Field(field_name, aft-bef, bef, data, calc, true));
        return data;
    }
    edit(field_name, data, golomb=false) {
        let field = this.holder[field_name];
        if(!golomb) {
            field.data = data;
            this.write(field.pos, field.bit, data);
            return true;
        }else {
            // TODO
            return false;
        }
    }
    get(field_name) {
        let field = this.holder[field_name];
        return field.calc(this, field.data);
    }
    write(pos, bit, data) {
        let buf = "";
        for(let i = 0; i < this.buffer.length; i++){
            let pstr = this.buffer[i].toString(2);
            buf.concat(this.buffer[i].toString(2));
            for(let i = pstr.length; i < 8; i++){
                buf += "0";
            }
            buf += pstr;
        }
        let front = buf.slice(0, pos);
        let back = buf.slice(pos+bit, buf.length);

        let data_bit = data.toString(2).split("").reverse();
        for(let i = data_bit.length; i < bit; i++){
            data_bit.push("0");
        }
        data_bit = data_bit.reverse().join('');
        let merger = front + data_bit + back;

        for(let i = 0; i < this.buffer.length; i++){
            this.buffer[i] = parseInt(merger.slice(i*8, (i+1) * 8), 2);
        }
    }
}


// 참고: https://github.com/stephenyin/h264_sps_decoder/blob/master/sps.cpp

class H264BitEditTools {
    constructor(buffer) {
        this.buffer = buffer;
    }
    run_decoder(){
        let timing_info_present_flag;
        this.manager = new H264FieldManager(this.buffer);

        this.info = {};
        this.width=0;
        this.height=0;
        this.profile_idc =0;

        this.manager.read("front", 48);

        this.width = 0;
        this.height = 0;

        do {
            this.manager.read("profile", 8);
            this.manager.read("compat", 8);
            this.manager.read("level", 8);
            this.manager.read("nalu", 8, function (manager, data) {
                return (data & 0x03) + 1;
            });
            this.manager.read("nb_sps", 8, function (manager, data) {
                return data & 0x1F;
            });

            if (this.manager.get("nb_sps") == 0) {
                break;
            }

            /* nal size */
            this.manager.read("nal_size", 16);

            /* nal type */
            if (this.manager.read("nal_type", 8) != 0x67) {
                break;
            }
            /* SPS */

            let profile_idc = this.manager.read("profile_idc", 8);
            this.manager.read("constraint_set0_flag", 1);
            this.manager.read("constraint_set1_flag", 1);
            this.manager.read("constraint_set2_flag", 1);
            this.manager.read("constraint_set3_flag", 1);
            this.manager.read("reserved_zero_4bits", 4);

            this.manager.read("level_idc", 8);

            this.manager.read_golomb("seq_parameter_set_id");

            if( profile_idc == 100 || profile_idc == 110 ||
                profile_idc == 122 || profile_idc == 144 )
            {

                let chroma_format_idc = this.manager.read_golomb("chroma_format_idc");
                if(chroma_format_idc == 3)
                    this.manager.read("residual_colour_transform_flag", 1);
                this.manager.read_golomb("bit_depth_luma_minus8");
                this.manager.read_golomb("bit_depth_chroma_minus8");
                this.manager.read("qpprime_y_zero_transform_bypass_flag",1);
                this.manager.read("seq_scaling_matrix_present_flag", 1);

                if(this.manager.get("seq_scaling_matrix_present_flag"))
                {
                    for(let i = 0; i < 8; i++ ) {
                        this.manager.read("seq_scaling_list_present_flag_"+i.toString(), 1);
                    }
                }
            }
            this.manager.read_golomb("log2_max_frame_num_minus4");
            this.manager.read_golomb("pic_order_cnt_type");
            if(this.manager.get("pic_order_cnt_type") == 0)
                this.manager.read_golomb("log2_max_pic_order_cnt_lsb_minus4");

            else if(this.manager.get("pic_order_cnt_type") == 1)
            {
                this.manager.read("delta_pic_order_always_zero_flag",1);
                this.manager.read_golomb("offset_for_non_ref_pic");
                this.manager.read_golomb("offset_for_top_to_bottom_field");

                let num_ref_frames_in_pic_order_cnt_cycle =
                    this.manager.read_golomb("num_ref_frames_in_pic_order_cnt_cycle");

                for(let i = 0; i < num_ref_frames_in_pic_order_cnt_cycle; i++)
                    this.manager.read_golomb("offset_for_ref_frame_"+i.toString());
            }
            this.manager.read_golomb("num_ref_frames");
            this.manager.read("gaps_in_frame_num_value_allowed_flag",1);
            this.manager.read_golomb("pic_width_in_mbs_minus1");
            this.manager.read_golomb("pic_height_in_map_units_minus1");

            let frame_mbs_only_flag = this.manager.read("frame_mbs_only_flag",1);
            if(!frame_mbs_only_flag)
                this.manager.read("mb_adaptive_frame_field_flag",1);

            this.manager.read("direct_8x8_inference_flag",1);
            let frame_cropping_flag =
                this.manager.read("frame_cropping_flag",1);

            if(frame_cropping_flag)
            {
                this.manager.read_golomb("frame_crop_left_offset");
                this.manager.read_golomb("frame_crop_right_offset");
                this.manager.read_golomb("frame_crop_top_offset");
                this.manager.read_golomb("frame_crop_bottom_offset");
            }
            let vui_parameter_present_flag =
                this.manager.read("vui_parameter_present_flag",1);
            if(vui_parameter_present_flag)
            {
                let aspect_ratio_info_present_flag = this.manager.read("aspect_ratio_info_present_flag",1);

                if(aspect_ratio_info_present_flag)
                {
                    let aspect_ratio_idc = this.manager.read("aspect_ratio_idc",8);
                    if(aspect_ratio_idc==255)
                    {
                        this.manager.read("sar_width",16);
                        this.manager.read("sar_height",16);
                    }
                }
                let overscan_info_present_flag =
                    this.manager.read("overscan_info_present_flag",1);

                if(overscan_info_present_flag)
                    this.manager.read("overscan_appropriate_flagu",1);

                let video_signal_type_present_flag =
                    this.manager.read("video_signal_type_present_flag",1);

                if(video_signal_type_present_flag)
                {
                    this.manager.read("video_format",3);
                    this.manager.read("video_full_range_flag",1);
                    let colour_description_present_flag =
                        this.manager.read("colour_description_present_flag",1);

                    if(colour_description_present_flag)
                    {
                        this.manager.read("colour_primaries",8);
                        this.manager.read("transfer_characteristics",8);
                        this.manager.read("matrix_coefficients",8);
                    }
                }
                let chroma_loc_info_present_flag =
                    this.manager.read("chroma_loc_info_present_flag",1);
                if(chroma_loc_info_present_flag)
                {
                    this.chroma_sample_loc_type_top_field=this.manager.read_golomb();
                    this.chroma_sample_loc_type_bottom_field=this.manager.read_golomb();
                }
                timing_info_present_flag =
                    this.manager.read("timing_info_present_flag",1);

                if(timing_info_present_flag)
                {
                    this.manager.read("num_units_in_tick",32);
                    this.manager.read("time_scale",32);
                    this.manager.read("fixed_frame_rate_flag",1);
                }
            }

            let width=(this.manager.get("pic_width_in_mbs_minus1")+1)*16;
            let height=(this.manager.get("pic_height_in_map_units_minus1")+1)*16;

            if(timing_info_present_flag){
                let fps = this.manager.get("time_scale") / this.manager.get("num_units_in_tick");
                if(this.manager.get("fixed_frame_rate_flag"))
                    fps = fps/2;


                console.log("H.264 SPS: -> video size %dx%d, %d fps, profile(%d) %s\n",
                    width, height, fps, profile_idc);
            } else {
                console.log("H.264 SPS: -> video size %dx%d, unknown fps %s\n",
                    width, height, profile_idc);
            }
        } while (0);
    }
    getHeader() {
        return this.manager.buffer;
    }
    change_fps(timescale){
        this.manager.edit("time_scale", timescale);
    }
}

module.exports = {
    getTimestampMicro: getTimestampMicro,
    getTimestamp: getTimestamp,
    appendLogForMessage: appendLogForMessage,
    CustomLogger: CustomLogger,
    appendLog: appendLog,
    FutureLog: FutureLog,
    H264BitEditTools: H264BitEditTools
};