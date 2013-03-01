"use strict";
/*
 * Author:   Ibbo (mark.ibbotson@manheim.co.uk)
 * Purpose:  Weekly backlink checker mongo db API
 */

var config = require('../config');

var mongoose = require('mongoose');
mongoose.connect('mongodb://' + config.mongo.host +'/wlc');

/*
 * sets up a mongoose schema for our data mapping
 */

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Matches = new Schema({
    'url'  : String
});

var Wlc = new Schema({
    'link_start_date': String,
    'last_checked'   : String,
    'source_url'     : String,
    'target_url'     : String,
    'anchor_text'    : String,
    'is_live'        : Number,
    'anchor_match'   : Number,
    'is_sitewide'    : Number,
    'is_indexed'     : Number,
    'client_name'    : String,
    'matched'        : Number,
    'status'         : Number,
    'viewed'         : Number,
    "crawled"        : Number,
    "error"          : Number,
    "runtime"        : Number,
    'max_matches'    : Number,
    'site_wide'      : String,
    "matches"        : [Matches]
});

/*
 * Create our model (interface)
 */

mongoose.model('wlc', Wlc);
var Wlc = mongoose.model('wlc');

var WlcMongo = {
    // find all records
    findAll: function(callback) {
        Wlc.find({}, function (err, results) {
            if(!err)
                callback( null, results )
        });
    },

    // insert new
    addRecord: function(entry, callback) {
        var entry = new Wlc(entry);

        entry.save(function (err) {
            if(err) {console.log("ooops", err)}
            callback();
        });
    },

    //Find by URL
    findByUrl: function(url, callback) {
        Wlc.find({'source_url':url}, function (err, results) {
            if (!err) {
                callback(null, results);
            }
        });
    },

    //Find by target URL
    findByTargetUrl: function(url, callback) {
        Wlc.find({'url':url}, function (err, results) {
            if (!err) {
                callback(null,results);
            }
        });
    },

    //Find by ID
    findById: function(id, callback) {
        Wlc.findById(id, function (err, vehicle) {
            if (!err) {
                callback(null, vehicle);
            }
        });
    },

    // update a record based on criteria
    update: function(criteria, data, callback) {

        Wlc.update(criteria, data, function(err, res){
            console.log("criteria", criteria);
            console.log("data", data);
            if(!err) {
                callback(null, res);
            } else {
                console.log("Bollox", err)
            }
        });
    }

};

module.exports = WlcMongo;
