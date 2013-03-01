"use strict";
/*
 * Author:   Ibbo (mark.ibbotson@manheim.co.uk)
 * Purpose:  Weekly backlink checker API
 */

var http, EventEmitter, url, WlcMongo, CrawlAgent, cheerio, bs, masters, Crawler, client, tidy, config, io, _socket, l_client;

http       = require('http');
url        = require('url');
WlcMongo   = require('./model/mongo');
cheerio    = require('cheerio');
bs         = require('nodestalker');
Crawler    = require('./model/crawler');
config     = require('./config');
io         = require('socket.io-client');

var options = {
    'reconnect': true,
    'reconnection delay': 500,
    'max reconnection attempts': 10
};

_socket = io.connect('http://<you wish>', options);

if(_socket) {

    _socket.on('reconnect', function(data) {
        console.log("DLM restart detected, killing myself");
        process.exit();   
    });

    _socket.on('connect', function (socket) {

        console.log("connected...", socket)

        _socket.on('queue', function(data) {

            console.log(data);

            client     = bs.Client(data.host, 11300);
            l_client   = bs.Client(); 

            client.watch('wlc').onSuccess(function(data) {
                function resJob() {

                    var data, master, link, d, crawler, year, month, day, site_wide;

                    // beanstalk reserve Job
                    client.reserve().onSuccess(function(job) {

                        try {
                            // job data is a json string containing source/target/anchor
                            data   = JSON.parse(job.data);
                            master = data.master;

                            console.log("Running", data);

                            // removes masters trailing /
                            if(/\/$/.test(master)) {
                                master = master.replace(/\/$/, '');
                            }

                            // tbs
                            if(master.substr(-1) === '/') {
                                master = master.substr(0, master.length - 1);
                            }

                            masters = [master];

                            link    = url.parse(data.source);
                            d       = new Date();

                            // data.source = "http://www.bellerockentertainment.com/online-slots/major-millions-progressive.php";
                            // masters = ['http://www.bellerockentertainment.com/'];
                            // data.anchor = "online casino";

                            l_client.use('phantom').onSuccess(function(d) {
                              l_client.put(data.source).onSuccess(function(dt) {});                               
                            });

                            crawler = Crawler.init(data.source, data.anchor, [link.path], job.id, masters);

                            crawler.once('status', function(err, res){
                                if(!err) {
                                    WlcMongo.update({"source_url": data.source, "target_url": data.master, "anchor_text": data.anchor},
                                        {
                                            "is_live"        : res.is_live,
                                            "status"         : res.status,
                                            "anchor_match"   : res.anchor_match
                                        },
                                        function(err, res) {}
                                    );
                                }
                            });

                            crawler.once('stop', function(err, res){

                                if(!err) {

                                    year  = d.getFullYear();
                                    month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                    day   = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();

                                    site_wide = ((res.matched / res.max_matches) / res.viewed) * 100;

                                    if(isNaN(site_wide)) {
                                        site_wide = 0;
                                    }

                                    // saves (updates) to mongo db
                                    WlcMongo.update({"source_url": data.source, "target_url": data.master, "anchor_text": data.anchor},
                                        {
                                            "is_live"        : res.is_live,
                                            "matched"        : res.matched,
                                            "status"         : res.status,
                                            "anchor_match"   : res.anchor_match,
                                            "viewed"         : res.viewed,
                                            "crawled"        : res.crawled,
                                            "error"          : res.error,
                                            "runtime"        : res.runtime,
                                            "max_matches"    : res.max_matches,
                                            "site_wide"      : site_wide + "%",
                                            "last_checked"   : day + "/" + month + "/" + year,
                                            "matches"        : res.internals

                                        }, function(err, res){

                                            if(!err) {
                                                console.log("saved");
                                                client.deleteJob(job.id).onSuccess(function(del_msg) {
                                                    crawler.removeAllListeners();
                                                    crawler = null;

                                                    //if(res.viewed === 1) {
                                                    //    console.log("Bad landing page, quitting");
                                                    process.exit();
                                                    //} else {

                                                    //resJob();
                                                    //}

                                                });
                                            }
                                        });
                                }
                                else
                                {
                                    console.log("Stop err", err);
                                }
                            });
                        } catch(e) {
                            client.deleteJob(job.id).onSuccess(function(del_msg) {
                                crawler.removeAllListeners();
                                crawler = null;
                                // resJob();
                                //process.nextTick(process.exit());
                                process.exit();

                            });
                        }

                    });
                }

                resJob();
            });
        });

    });
}

