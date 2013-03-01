var csvjs = require('csvjs');
var fs = require('fs');
var json;
    json = [];

var stream = fs.createReadStream("./JPCLinks.csv");

stream.addListener('data', function(data){
   if(data !== undefined) {
      csvjs.parse(data, { col_sep: ",", row_sep: '\r\n' }, function(err, row) {

         console.log("Row", row);

         return json.push(row);
      });
   }
});

process.nextTick(function() {
  console.log("json", json);
});
