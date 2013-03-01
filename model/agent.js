"use strict";
/*
 * Author:   Ibbo (mark.ibbotson@manheim.co.uk)
 * Purpose:  Crawler agent (TODO port this to BAT TOOL);
 */

var http, https, EventEmitter, url, request, DEBUG, config;

http = require('http');
https = require('https');
EventEmitter = require('events').EventEmitter;
url = require('url');
request = require('request');
config = require('../config');

var Iconv  = require('iconv').Iconv;
var iconv = new Iconv('UTF-8', 'ASCII//IGNORE');

var zlib = require('zlib');

DEBUG = config.DEBUG;

/*
 * Agent
 */
var Agent = {
    __proto__: EventEmitter.prototype,// inherit EventEmitter
    _maxLinks: 100,                   // max links to grab / parse
    _seen: [],                        // internal store for seen pages
    _pending: [],                     // internal store for yet to visit pages
    current: null,                    // current page
    running: false,                   // agent is running
    timeout: 10000,                   // default request timeout
    host: {},                         // host data container see url.parse
    viewed: 0,                        // number of viewed pages
    erred: 0,                         // number of pages errored
    id: null,                         // beanstalk job.id
    headers: [                        // only crawl pages with a valid header
        'text/html',
        'text/xhtml',
        'application/xhtml',
        'text/html;charset=ISO-8859-1',
        'text/html; charset=UTF-8'
    ],

    // landing method
    init: function (host, links, id) {    // bootup
        this._pending  = links;           // append our links to pending
        this.host      = url.parse(host); // host data
        this.id        = id;              // beanstalk job.id
        this.current   = host;            // current page to visit
        this.viewed    = 0;

       // console.log(this.current);

        this.setMaxListeners(25);         // bump up our max listeners
       // this._pending.push(this.current); // add the current page

        return this;
    },

    // Only consume page content types that are listed above
    // This will return true when followredicts = true
    isValidHeader: function (header) {
        var h;
        if(header !== undefined) {
          for (h in this.headers) {
            if (this.headers[h] !== undefined && header.match(this.headers[h])) {
              return true;
            }
          }
        }
        return false;
    },

    /*
     * This method call request which returns our page (if exists)
     * We check here for redirects etc
     */
    visitLink: function() {
        var self, status, location,redirect, page, options, l_status;

        // TODO check out the following rules and make sure its right
        self     = this;
        options  = {                            // options for the request
            "uri"            : this.current || this.host.href,
            "timeout"        : 20000,          // initial timeout
            "maxRedirects"   : 8,              // max redirects allowed
            "followRedirect" : false, //!!((self.viewed == 0)),  // follow the redirects (if any)
            "encoding"       : null,
            "headers"        : {
                'User-Agent': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/536.11 (KHTML, like Gecko) Ubuntu/12.04 Chromium/20.0.1132.47 Chrome/20.0.1132.47'
            }
        };

        if(DEBUG)
          console.log(options);

        try {
          /*
           * Calls request
           * Params: options <see above>
           */
           var output;
           request(options, function (error, res, body) {

              if(!error) {
                try{

                  if(res.headers['content-encoding'] === 'gzip') {
                      zlib.gunzip(body, function(err, result) {
                          if(err) return console.error(err);
                          console.log("Found compressed");
                          body = result.toString('utf-8', 0, result.length);
                      });
                  }

                  status = res.statusCode;
                  setTimeout(function() {
    
                   if(self.isValidHeader(res.headers['content-type'])) {
                      if(DEBUG) {
                        console.log("Headers", res.headers['content-type']);
                        console.log(status)
                      }

                    redirect = {"status":"", "location":""};
                   
                    // Redirects found under this.redirects
                    if (this.redirects && this.redirects.length > 0) {

                      var re = this.redirects[this.redirects.length - 1];
                      location = re.redirectUri;
                      status   = re.statusCode;
                      page = url.parse(location);
                      self.host = url.parse(location);

                      // allow a redirect on 1st page (pending business review)
                      if(self.viewed === 1) {
                         status           = re.statusCode;

                         self.current     = page.href;
                         self.host = url.parse(location);

                         options.host     = page.host;
                         options.protocol = page.protocol;
                         options.port     = (/https/.test(options.protocol)) ? 443 : 80;

                         redirect         = {
                                 "status":status, "location":location
                         };
                      }
                    }

                    if(body) {
                      if(DEBUG) {
                        console.log("host", self.host);
                        console.log("status", status);
                      }

                    //  console.log("Page Body", body);

                      var data = {"host": options, "status": status, "viewed": self.viewed, "redirect": redirect, "body": body};

                      (status === 200 ) ? self.emit('next', null, self, data) :
                                          self.emit('next', {"error": status,"status": status, "host": options}, self, null);
                    }
                     else
                    {
                      self.emit('next', {"error": status, "status": status, "host": options}, self, null);
                    }

                    options  = null;
                    status   = null;
                    redirect = null;
                    body     = null;

                  }
                   else  // report back error (will continue the crawl)
                  {
                      self.emit('next', {"error": "Bad Header", "host": options, "status": status}, self, null);
                  }
                 }, 1500);
                }
                 catch(e)
                {
                    self.erred++;
                    console.log("Try catch", e);
                    self.emit('next', {"error": e, "host": options, "status": status || 0 }, self, null);
                }
              }
               else // report back error (will continue the crawl)
              {
                  self.erred++;
                  console.log("Request error", error);
                  self.emit('next', {"error": error, "host": options, "status": status || 0 }, self, null);
              }

          });

        }
         catch(e)
        {
            self.emit('next', {"crawler": e}, self, null);
            console.log("DEAD HERE");
        }
    },

    // shifts around _pending and _seen (reflecting our crawl)
    getNext: function() {

        if(this.pending() === 0 && this.viewed > 1)
        {   // if its crawled 100 pages
            console.log("HIT MAX");          // indicate so
            this.emit('stop');               // and emit a stop
        }
         else
        {
          this.current = this._pending.shift();

          if(!this.running) {              // setup our running status
             this.running = true;
          }

          if(this.viewed === 0) {
             this.current = this.host.href;
          }

          this.visitLink();

          this._seen.push(this.current);

          this.viewed++;
        }
    },

    // add a new link (if not exists) to _pending
    addLink: function(link) {
        this._pending.push(link);
    },

    // ensures we do not have duplicate links
    findLink: function(link) {
        for(var l in this._pending) {
            if(this._pending[l] === link)
                return true;
        }

        for(var l in this._seen) {
            if(this._seen[l] === link)
                return true;
        }

        return link === this.current;
    },

    getNumLinks: function() {
       return ((this._seen.length || 0) + (this._pending.length || 0));
    },

    // starts the agent crawling
    start: function () {
        this.running = true;
        this.getNext();
    },

    // stops the agent and clears it down. send a stop event
    stop: function () {
        this.running = false;
        this.viewed = 0;
        this.viewed = null;
        this.emit('stop');
        this.removeAllListeners();
    },

    // simple agent method to kick next
    next: function () {
        this.getNext();
    },

    // return pending _length
    pending: function() {
        return this._pending.length || 0;
    },

    // return _seen length
    seen: function () {
        return this._seen.length || 0;
    }
};

module.exports = Agent;
