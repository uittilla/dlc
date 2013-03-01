var mongo = require('../mongo'),
bs        = require('nodestalker');

var Iconv  = require('iconv').Iconv;
var iconv = new Iconv('UTF-8', 'ASCII//IGNORE');

var client = bs.Client("ec2-54-247-53-163.eu-west-1.compute.amazonaws.com", "11300");

client.use('wlc').onSuccess(function(data) {
    mongo.findAll(function(err, result) {

        for(entry in result) {

            if(result[entry].source_url != undefined && result[entry].target_url !== undefined ) {

                if(!/http/.test(result[entry].source_url)) {
                    result[entry].source_url = "http://" + result[entry].source_url;
                }

                source = result[entry].source_url;
                master = result[entry].target_url;

                if(result[entry].anchor_text === "*[Image]") {
                    result[entry].anchor_text = "Image";
                }

                result[entry].anchor_text = iconv.convert(result[entry].anchor_text);

                combo  = {"source":source, "master": master, "anchor": result[entry].anchor_text};

                if(result[entry] !== undefined) {
                    console.log("IS_LIVE", combo);
                    client.put(JSON.stringify(combo), 0, 0, 10000).onSuccess(function(data) {
                        console.log("Put", data);
                        //  console.log(result[entry]);
                    });
                }
            }
        }
    });
});
