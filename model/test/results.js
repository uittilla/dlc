"use strict";

var fs, mongo, set, stream, entry;

fs = require('fs');
mongo = require('../mongo');

stream = fs.createWriteStream(__dirname + "/results.csv", {'flags': 'a'});
set = "Start Date, Last Checked, Status, Source URL, Target URL, Anchor Text, Is live, Anchor match, Targets Matched, Max Matches, Pages viewed, Success, Failed\r\n";
stream.write(set);

mongo.findAll(function(err, result) {
    for(entry in result) {

        set = result[entry].link_start_date + "," + result[entry].last_checked + "," + result[entry].status + "," + encodeURI(result[entry].source_url)  + "," + encodeURI(result[entry].target_url) + "," + result[entry].anchor_text + "," + result[entry].is_live +  "," + result[entry].anchor_match +  "," + result[entry].matched + "," + result[entry].max_matches +  "," +  result[entry].viewed + "," + result[entry].crawled  + "," + result[entry].error + "\r\n";
        // result[entry].link_start_date + ", " + result[entry].last_checked + ", " + result[entry].source_url + ", " + result[entry].target_url + ", " + result[entry].status + ", " + result[entry].anchor_text + ", " + result[entry].is_live + ", " + result[entry].matched + "\r\n"
        stream.write(set);
    }
});

// stream.close();