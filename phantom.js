"use strict";

/*
 *  Author: M Ibbotson (Ibbo) <mark.ibbotson@stickyeyes.com>
 *  Purpose: Provide google indexed indicator (defeat captcha in process)
 *  TODO: make sure we dont loop over and over on the captcha and cause upset
 *  NOTE: Do not set vars directly in page.evaluate calls as they are sandboxed. 
 *  You need to return the values followed by a new method (in which you can modify stuff)
 */

var phantom, easyimg, exec, interval, testindex = 0, loadInProgress = false, finished = false, ctext, major_id, minor_id, captcha_count=0, mongo, GoogleIndexed, EventEmitter, bs;

phantom      = require('node-phantom');
easyimg      = require('easyimage');
exec         = require('child_process').exec;
bs           = require('nodestalker');
mongo        = require('./model/mongo'); 
EventEmitter = require('events').EventEmitter;

GoogleIndexed = {
    __proto__: EventEmitter.prototype,   // inherit EventEmitter
    timeout: null,
    steps: [
        // 0 open
        function(page, _url) {
            page.open("http://www.google.co.uk");
            
        },
        // 1 load js
        function(page, _url) {
            page.injectJs('http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js');
        },
        // 3 input query
        function(page, _url) {
            GoogleIndexed.evaluate(page, function(_url) {
                if(document.querySelector('input[name=q]')) {
                   document.querySelector('input[name=q]').value = "site:" + _url;
                }
            }, _url);
        },
        // 4 submit
        function(page, _url) {
            page.evaluate(function() {
                if(document.forms['f']) {
                   var submit = document.forms['f'];
                   submit.submit();
                   return;
                }
            });
        },
        // 5 check results
        function(page, _url) {
            var self = page;

            self.render("/home/ubuntu/wblc/export.jpg");

            page.evaluate(function() {
//                console.log("cookies", document.cookie);
                if(document.getElementById('resultStats')) {
                    var result = document.getElementById('resultStats').innerHTML;
                    
                    if(result) {
                       console.log("resultStats: indexed");
                    } else {
                       console.log("resultStats: not indexed"); 
                    }
                    return { 
                       indexed: true,
                       res: result
                    };
                } else {
                    if(document.querySelector('img')) {
                      var img = document.querySelector('img');
                      console.log("Image", img.getAttribute('src'));
                    }
                    return {indexed: false};
                }
            }, function(err, result) {
                if(!err) {
                    if(result && result.indexed) {
                        // mongo save here
                        console.log("result", result.res || "not indexed");
                        testindex = 10;
                        mongo.update({source_url: _url}, {is_indexed: result.res ? 1 : 0}, function(err, res) {
                           if(!err) {
                             console.log("tis saved");
                           }
                        });
                    }
                }
            });
        },
        // 6 check for and call captcha
        function(page, _url) {
            loadInProgress = true;

            page.evaluate(function() {
                if(document.querySelector('img')) {
                  var img = document.querySelector('img');
                  return {image: img};
                }

                return {image: null};

            }, function(err, result) {

                if(result.image && /sorry/.test(result.image.src)) {
                    console.log("OK");

                    captcha_count++;

                    easyimg.crop(
                        {
                            src:'/home/ubuntu/wblc/export.jpg', dst:'/home/ubuntu/wblc/perl/export-cropped.png',
                            gravity:'NorthWest',
                            cropwidth:200, cropheight:80,
                            x:28, y: 135
                        },
                        function(err, stdout, stderr) {
                            if (err) throw err;
                            console.log('Cropped');
                        });

                    exec("/usr/bin/perl /home/ubuntu/wblc/perl/main.pl", function(err, stdout, stderr) {
                        if(!err) {
                            var res  = JSON.parse(stdout);
                            ctext    = res.text;
                            major_id = res.major_id;     // keep this is captcha text fails
                            minor_id = res.minor_id;

                            loadInProgress = false;

                            console.log("Captcha", res);
                        }
                    });
                } else {
                    loadInProgress = false;
                }
            });
        },
        // 7 add captcha text if(any)
        function(page, _url) {
            var self = GoogleIndexed;
            if(ctext) {
                self.evaluate(page, function(ctext) {
                    console.log("Got text", ctext);
                    if(document.getElementById('captcha')) {
                       document.getElementById('captcha').value = ctext;
                    }
                }, ctext);
            }
        },
        // 8 find form and submit
        function(page, _url) {
            if(ctext) {
                page.evaluate(function() {
                    console.log(document.querySelectorAll('html')[0].outerHTML);

                    if(document.getElementById('captcha')) {
                       console.log("Filled", document.getElementById('captcha').value);
                    }

                    if(document.forms[0]) {
                        console.log("Found form");
                        var forms = document.forms[0];
                        var newForm = document.createElement('form');

                        try{
                            newForm.submit.apply(forms);
                        } catch(e) {
                            console.log("Like fuk it will!!!", e);
                        }
                    }
                });
            }
        },
        // 9 check for results or captcha
        function(page, _url) {
            page.evaluate(function() {
                if(document.getElementById('resultStats')) {
                    var result = document.getElementById('resultStats').innerHTML;

                    if(result) { 
                       console.log("resultStats: indexed");
                    } else {
                       console.log("resultStats: not indexed"); 
                    }

                    return { 
                       indexed: true,
                       res: result
                    };

                } else {
                    if(document.querySelector('img')) {
                      var img = document.querySelector('img');
                      console.log("Image", img.getAttribute('src'));
                    }

                    return {indexed: false};
                }
            }, function(err, result) {
                if(!err) {
                    if(result && result.indexed) {
                        captcha_count=0;                          
                        testindex = 10;
                        console.log("result", result.res || "not indexed");

                        mongo.update({source_url: _url}, {is_indexed: result.res ? 1 : 0}, function(err, res) {
                           if(!err) {
                             console.log("tis saved");
                           }    
                        }); 

                        // mongo save here
                    }
                }
            });

        },

        // 10 bad captcha
        function(page, _url) {
            page.evaluate(function() {
                if(document.querySelector('img')) {
                    return {pass: false};
                }

                return {pass: true};
            }, function(err, result) {
                if(!err) {

                    if(captcha_count >= 3) {
                       process.exit(); 
                    }

                    if(!major_id) {
                        // cannot claim bad if it no major_id
                        process.exit();
                    }

                    if(!result.pass) {
                        var command = "/usr/bin/perl /home/ubuntu/wblc/perl/error.pl " + major_id + " " + minor_id;
                        console.log("Running badPicture2", command);
                        exec(command, function(err, stdout, stderr) {
                            if(!err) {
                                // rollback test
                                console.log("stdout", stdout);
                                console.log("stderr", stderr);
                            }
                        });
                        // rollback recaptcha
                        // potential halting problem right here!!!
                        testindex = 5;
                    }
                }
            });
        },
        // 11 done
        function(){
            console.log("done");
            clearTimeout(GoogleIndexed.timeout);
        }
    ],
    init: function(_url) {
      // they eventually start to stick on 6
      this.timeout = setTimeout(function() {
          process.exit();
      }, 60000);

      this.visit(_url);
      return this;  
    },

    evaluate: function(page, func) {
      var args = [].slice.call(arguments, 2);
      var fn = "function() { return (" + func.toString() + ").apply(this, " + JSON.stringify(args) + ");}";
      return page.evaluate(fn);
    },


    visit: function(_url) {
      console.log(_url);
      var self = this;

      // "--cookies-file=cookies.txt",

      phantom.create(function(err,ph) {
        ph.createPage(function(err,page) {
           page.onConsoleMessage = function(msg) {
              console.log("MESSAGE", msg);
           };
           page.onLoadStarted = function() {
              loadInProgress = true;
           };
           page.onLoadFinished = function() {
              loadInProgress = false;
           };
           page.onError = function (msg, trace) {
              console.log(msg);
             // trace.forEach(function(item) {
             //   console.log('  ', item.file, ':', item.line);
             // });
           }

           interval = setInterval(function() {
             if (!loadInProgress && typeof self.steps[testindex] == "function") {
                console.log("step " + (testindex + 1));
                self.steps[testindex](page, _url);
                testindex++;
             }
             if (typeof self.steps[testindex] != "function") {
               console.log("test complete!");
               clearTimeout(interval);
               ph.exit();
               self.emit('done');
             }
           }, 50);
        });
      }); // "--cookies-file=cookies.txt");
    }
};


var client  = bs.Client();

function go() {
    client.watch('phantom').onSuccess(function(data) {
      client.reserve().onSuccess(function(job) {
          try {
   	     var run = GoogleIndexed.init(job.data);

   	     run.once('done', function() {
               client.deleteJob(job.id).onSuccess(function(del_msg) {
                  testindex = 0;
                  //go();                        
                  process.exit();
               });				
             });
          } catch(e) {
              console.log("Phantom threw a wobbly", e); 
          } 
       });    
    });
}

go();
