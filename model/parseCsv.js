var fs = require('fs')
var sys = require('sys')

var parseCsv = {

    parseCsvFile: function (fileName, callback){

        //console.log(fileName);

        var stream = fs.createReadStream(fileName)
        var iteration = 0, header = [], buffer = ""

        var pattern = /(?:^|,)("(?:[^"]+)*"|[^,]*)/g

        stream.addListener('data', function(data){
            buffer+=data.toString()
            var parts = buffer.split('\n');

            parts.forEach(function(d, i){
                if(d !== undefined) {
                    if(i == parts.length-1) return

                    if(iteration++ == 0 && i == 0){
                        header = d.split(pattern)
                    }else{
                        callback(buildRecord(d))
                    }
                }
            })
            buffer = parts[parts.length-1]
        });

        stream.addListener('end', function(){
            console.log("stream ends");

           // fs.close(stream);
        });

        function buildRecord(str){
            var record = {}
            str.split(pattern).forEach(function(value, index){
                if(value !== undefined && header[index] !== undefined && header[index] != '')
                    header[index] = header[index].replace(" ", "_");
                    if(header[index])  {
                       record[header[index].toLowerCase()] = value.replace(/"/gi, '');
                    }
            });
            return record
        }
    }
};

module.exports = parseCsv;

