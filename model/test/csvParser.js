var csv = require('csv');
var fs = require('fs');

var i = 0;

var parsed = [];

var d       = new Date();
var year  = d.getFullYear();
var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
var day   = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();

csv()
    .from.stream(fs.createReadStream(__dirname+'/jpc.csv'))
    .to.path(__dirname+'/sample.out')
    .transform( function(data){
        data.unshift(data.pop());
        return data;
    })
    .on('record', function(data,index){

        if(i !== 0) {

            if(data[3] != '') {

              parsed.push( {
                "client_name": data[0],
                "link_start_date" : (data[1] == '') ? (year + "-" + month + "-" + day) : data[1],
                "link_end_date": (data[2] == '') ? 0 : data[2],
                "source_url" : data[3],
                "target_url": data[4],
                "anchor_text": data[5]
              });

            }

        }
        i++;
    })
    .on('end', function(count){
        console.log(parsed);
        console.log('Number of lines: '+count);
    })
    .on('error', function(error){
        console.log(error.message);
    });