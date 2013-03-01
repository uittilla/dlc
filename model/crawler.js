"use strict";
/*
 * Author:   Ibbo (mark.ibbotson@manheim.co.uk)
 * Purpose:  Weekly backlink checker API
 */

var http, EventEmitter, url, WlcMongo, CrawlAgent, cheerio, Crawler, client, tidy, DEBUG, config;

http = require('http');
EventEmitter = require('events').EventEmitter;
url = require('url');
WlcMongo = require('./mongo');
CrawlAgent = require('./agent');
cheerio = require('cheerio');
config = require('../config');


DEBUG = config.DEBUG;

Crawler = {
 __proto__: EventEmitter.prototype,   // inherit EventEmitter

 in_array: function(search, key) {
    var i;
    for(i in search) {
        if(search[i] !== undefined) {

            if(search[i].url === key) {
               // console.log("We got this one");
                return true;
            }

        }
    }
    //console.log("Not present");
    return false;
 },

 init: function(host, anchor_text, links, id, targets) {

    var agent, self, $, internals, grab, visited_count, crawled, j, matched, maxMatches, errors,live_backlink, status, anchor_match, masters, matches;

    agent         = CrawlAgent.init(host, links, id);// web crawler
    self          = this;                            // self = this
    $             = null;                            // Cheerio
    internals     = [];                              // internal links storage
    matches       = [];                              // local store for target url matches
    grab          = config.GRAB,                     // grabs internal links (< 100)
    visited_count = 0;                               // count of pages visited
    crawled       = 0;                               // count of pages crawled success
    j             = 0;                               // temp var to count max matches
    matched       = 0;                               // number of matches found
    maxMatches    = 0;                               // max number of matches found
    errors        = 0;                               // number of pages errored
    live_backlink = 0;                               // live backlink indicator
    status        = 0;                               // page visit status code (apache)
    anchor_match  = 0;                               // indicate anchor match
    masters       = targets;                         // target_urls
    agent.timeout = 15000;                           // page view timeout
    agent.setMaxListeners(25);                       // max listeners (net sockets)


    var start = new Date().getTime();                // runtime metrics

    agent.on('next', function(err, worker, data) {
      try {
         visited_count++;

         if(data && data.host) {
            if(visited_count === 1) {
               status = data.status;                 // we only desire the status code from page 1
            }
         }

         if(!err ) {
           crawled++;

          // console.log("Data", data);

           if(data && data.redirect.location.length > 0 && visited_count === 1) {
              console.log("redirect",data.redirect )
           }

           var tmp = data.host.uri;
           
           if(tmp.match("www.")) { tmp = tmp.replace("www.", ""); } 

           if(DEBUG) {
              console.log(url.parse(tmp));
              console.log("data", data.host);
              console.log("status", status);
           }

           // host matching regex for link finding
           var regExp = new RegExp("^(http|https)://(www\.)?" + url.parse(tmp).host  + "($|/)");

           // jQuery object server side 
           $ = cheerio.load(data.body, {lowerCaseTags:true, lowerCaseAttributeNames: true, ignoreWhitespace: true});

           //console.log(data.body);

           /*
            * Section to find clean and append links to crawl
            */
           if(grab && agent._pending.length < 99 && internals.length < 99) {
             try{
                 if(DEBUG) {
                    console.log("regex", regExp);
                    console.log("data", data.host);
                 }

                 var last;

                 // finds internal links
                 var nodes =  $('a').map(function (i, el) {

                    var href = $(this).attr('href');
                    if(href !== undefined && href !== '') {

                       // lowercase the url (another anti web crawling pattern)
                       href = href.trim().toLowerCase();     

                       console.log("Matching", regExp);
                       // test for locality
                       var isLocal = (href.substring(0,4) === "http") ? regExp.test(href) : true;

                       if(DEBUG)
                         console.log(href + " is " + (isLocal ? "local" : "not local"));

                       if(isLocal && !href.match("google")) {
                         // resolve links that dont start with http
                         if(!/^http/.test(href)) {
                            href = url.resolve(tmp, href);
                         }

                         /*
                          * So the crafty bastards sometimes add stuff to aid our crawler in failing
                          * How about a url starting with //, sure its valid but they point elsewhere
                          * leading us to another domain.
                          * Urls that are simply www.* also validate as local and thus off it goes
                          * There is also the honey pot (a hidden area that only crawlers can fall into
                          * Watch those slow ones throwing timeouts and 404's probably a honey pot
                          * CamalCase urls are also frequent, so we just lowercase the lot and have done with it 
                          * There are many tricks up the sleeves of these folks so be aware they are out
                          * to prevent you from crawling them. Its our job to crush their hopes :)  
                          *
                          * In essence these folks are out to make us fail. This makes optimumnLabs very angry !!! 
                          */
                         if(href !== undefined && !/^\/\//.test(href) && !/^www/.test(href) ) {
                            console.log(href + " is local");
                            return href;
                         }
                       }
                    }

                    href = null;
                  }).join('::-::');

                  internals = nodes.split('::-::');

                  // remove traling slash if there is one
                  // this prevent urls like www.domain.com and  www.domain.com/ been duplicated
                  internals = internals.filter(function (elem, pos) {
                    if( elem.substr(-1) == '/') {
                        elem = elem.substr(0,  elem.length - 1);
                    }
                    return elem;
                  });

                  /*
                   * The above link finder does not sanitize our links
                   * So we do this here using filter
                   */

                  // removes dupes
                  internals = internals.filter(function (elem, pos) {
                     return internals.indexOf(elem) === pos;
                  });

                  // removes unrequired links
                  internals = internals.filter(function (elem, pos) {
                     return !(/^(javascript|JavaScript|mail|#)/i).test(elem);
                  });

                 // removes unrequired links
                  internals = internals.filter(function (elem, pos) {
                     return !(/#/i).test(elem);
                  });

                  // removes unrequired feed links
                  internals = internals.filter(function (elem, pos) {
                     return !(/(feed|feed\/|rss|rss\|rss2|rss2\/)$/i).test(elem);
                  });
                 
                  // finally drop any of the following bad urls
                  internals = internals.filter(function (elem, pos) {
                    return !(/\.(bmp|BMP|exe|EXE|jpeg|JPEG|swf|SWF|pdf|PDF|gif|GIFF|png|PNG|jpg|JPG|doc|DOC|avi|AVI|mov|MOV|mpg|MPG|tiff|TIFF|zip|ZIP|tgz|TGZ|xml|XML|xml|XML|rss|RSS|mp3|MP3|ogg|OGG|wav|WAV|rar|RAR)$/i).test(elem);
                  });

                  //internals = (internals.length > 100) ? internals.splice(0, 99) : internals;
                  for (var i in internals) {
                    if(internals[i] !== undefined && internals[i] !== '' && !agent.findLink(internals[i]) ) {
                       if((agent.pending() + visited_count < 100)) {
                           //console.log("appending link %s", internals[i])
                           agent.addLink(internals[i]);
                       }
                    } else {
                      // console.log("used that link %s", internals[i])
                    }
                  }

                } catch(e) {

                }
            }  else {
                grab = false;
            }

            // lower case anchor text 
            if(anchor_text !== undefined && anchor_text.length > 1) {
               anchor_text = anchor_text.toLowerCase();
            }

            // strip traling slash from target (you would not beleive how it fails to match if you dont)
            if( masters[0].substr(-1) == '/') {
                masters[0] = masters[0].substr(0,  masters[0].length - 1);
            }

            // Target matching
            $("a[href^='" + masters[0] + "']").each(function(i)
            {
                // clean ones only
                if($(this).attr('href') !== undefined)
                {
                    j++;
                    matched++;

                    console.log("Found match on page", worker.current, $(this).attr('href'));

                    // we need all matched links
                    if(!self.in_array(matches, worker.current)) {
                         matches.push({"url": worker.current});
                    }

                    if(visited_count <= 1) {
                        live_backlink = 1;
                        if(DEBUG)
                          console.log("Active backlink found %d, %d", j, matched);
                    }
                }
  
                // anchor text match here 
                if($(this).html() !== "undefined") {
                    var anchor = $(this).html().toLowerCase();

                    if(visited_count <= 1) {
                        if(anchor === anchor_text) {
                            anchor_match = 1;
                            //if(DEBUG)
                                console.log("Exact anchor match found");
                        }
                         else
                        {
                            if(!anchor_text.match("Image") && anchor.match(anchor_text)){
                                anchor_match = 2;
                                //if(DEBUG)
                                    console.log("Partial anchor match found");
                            }
                            else
                            {
                               if(/img src/.test(anchor)) {
                                   anchor_match = 3;
                                   console.log("Image anchor match found");
                               }
                            }
                        }
                    }
                }
            });

            if(j > maxMatches) {
                maxMatches = j;
            }
            else
            {
                if(DEBUG)
                  console.log("J should be < maxmatches %d %d", j, maxMatches)
            }

            j = 0;
            nodes = 0;

            if(agent.pending() + visited_count >= 99) {
                grab = false;
            }
          
            // Running commentary
            console.log("Page: %d %s, grab: %s, matched: %d, max matches: %d viewed %d", agent._pending.length, agent.current, grab, matched, maxMatches, visited_count);

            // save landing page results   
            if(visited_count === 1) { 
              self.emit('status',  null, { "is_live" : live_backlink, "status" : status, "anchor_match" : anchor_match});
            }

            $ = null;

        } else {
            // if your here its bad
            errors++;
            console.log("crawler err %s %d", err.host.uri, err.status);

            if(err && err.status && visited_count === 1) {
                status = err.status;

                console.log("1st page %d, %d", visited_count, err.status);

                if(err.status !== 200) {
                    worker.stop();
                }
            }
        }

        // call next page 
        worker.next();
    }
     catch(e)
    {
       console.log("Oh whats happened here", e);
       worker.next();
    }
  });

  // Listens for a agent stop event
  agent.once('stop', function() {
     // populate local metrics for passing to mongo 
     var running_time = new Date().getTime() - start;
     var data = {
        "viewed"       : visited_count,
        "crawled"      : crawled,
        "error"        : errors,
        "runtime"      : running_time,
        "is_live"      : live_backlink,
        "matched"      : matched,
        "max_matches"  : maxMatches,
        "status"       : status,
        "anchor_match" : anchor_match,
        "internals"    : []
     };

     if(matched > 0) {
         data["internals"] = matches;
     }

     console.log("Agent done, status %d, viewed %d, crawled %d, failed on %d", status, visited_count, crawled, errors);

     visited_count=0;
     crawled=0;
     internals = [];

     self.emit('stop', null, data);

     agent.removeAllListeners();
     agent = null;
   });

   agent.start();

   return this;
 }
}

module.exports = Crawler;
