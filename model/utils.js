"use strict";
/*
 * Author:   Ibbo (mark.ibbotson@manheim.co.uk)
 * Purpose:  Utils
 */

var Utils, fs, mongo, set, stream, entry, bs, csv;

fs    = require('fs');
mongo = require('./mongo');
bs    = require('nodestalker');
csv   = require('./parseCsv');

Utils = {

    // saves mongo results to csv
    saveResults: function() {
        stream = fs.createWriteStream(dirname + "/results.csv", {'flags': 'a'});
        stream.write(set);

        set = "Start Date, Last Checked, Status, Source URL, Target URL, Anchor Text, Is live, Anchor match, Targets Matched, Max Matches, Pages viewed, Success, Failed,  sitewide\r\n";

        mongo.findAll(function(err, result) {
            for(entry in result) {

                set = "'" + result[entry].link_start_date + "','" + result[entry].last_checked + "','" + result[entry].status + "','" + encodeURI(result[entry].source_url)  + "','" + encodeURI(result[entry].target_url) + "','" + result[entry].anchor_text + "'," + result[entry].is_live +  "," + result[entry].anchor_match +  "," + result[entry].matched +  result[entry].max_matches +  "," + "," +  result[entry].viewed + ",'" + (result[entry].crawled || 0)  + ",'" + (result[entry].error || 0) + ",'" + result[entry].site_wide + "'\r\n";
                // result[entry].link_start_date + ", " + result[entry].last_checked + ", " + result[entry].source_url + ", " + result[entry].target_url + ", " + result[entry].status + ", " + result[entry].anchor_text + ", " + result[entry].is_live + ", " + result[entry].matched + "\r\n"
                stream.write(set);
            }
        });
    },

    // Takes mongo entries and pushed to bs queue
    addToQueue: function () {
        var source, master, combo, client;

        client = bs.Client("ec2-46-51-151-240.eu-west-1.compute.amazonaws.com", "11300");

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

                        combo  = {"source":source, "master": master, "anchor": result[entry].anchor_text};

                        //  && result[entry]["is_live"] === 0 && (result[entry]["status"] === 200 || result[entry]["status"] === 0
                        if(result[entry] !== undefined && result[entry]["is_live"] === 0) {
                            client.put(JSON.stringify(combo), 0, 0, 10000).onSuccess(function(data) {
                                console.log("Put", data);
                            });
                        }
                    }
                }
            });
        });
    },

    // takes a csv file and pushes entries to mongodb
    addToDatabase: function() {

        var tmp;

        csv.parseCsvFile(__dirname + '/JPCLinks.csv', function(rec) {
            if(rec) {
                for (var i in rec) {
                    if(rec[i] === undefined || rec[i] === '') {
                        delete rec[i];
                    }
                }

                mongo.addRecord(tmp, function(error, res) {
                    if(!error) {
                        console.log("record saved");
                    } else {
                        console.log("Res", res);
                    }
                });
            }
        });
    }
}