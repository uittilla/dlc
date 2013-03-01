var csv = require('../parseCsv');
var mongo = require('../mongo');
var tmp;

csv.parseCsvFile(__dirname + '/jpc.csv', function(rec) {

   if(rec) {

       for (var i in rec) {
         console.log(rec);
         if(rec[i] === undefined || rec[i] === '') {
           delete rec[i];
         }
       }
      // console.log(rec);


      tmp = rec;

      if(tmp) {
      //console.log("tmp", tmp);

       mongo.addRecord(tmp, function(error, res) {
           if(!error) {
                console.log("record saved");
           } else {
                 console.log("Res", res);
           }
       });
      }

      //console.log("Record", rec);

   }

});
