var spawn = require('child_process').spawn;
var fs = require('fs');

var tidy = (function() {
    this.html = function(str, callback) {
        var buffer = '';
        var error = '';

        if (!callback) {
            throw new Error('No callback provided for tidy.html');
        }
        var ptidy = spawn(
            'tidy',
            [
                '--quiet',
                'y',
                '--force-output',
                'y',
                '--bare',
                'y',
                '--break-before-br',
                'y',
                '--hide-comments',
                'y',
                '--output-xhtml',
                'y',
                '--fix-uri',
                'y',
                '--wrap',
                '0'
            ]);

        ptidy.stdout.on('data', function (data) {
            buffer += data;
        });

        ptidy.stderr.on('data', function (data) {
            error += data;
        });

        ptidy.on('exit', function (code) {
            //fs.writeFileSync('last_tidy.html', buffer, 'binary');
            callback(buffer);
        });

        ptidy.stdin.write(str);
        ptidy.stdin.end();
    }
    return this;
})();

module.exports = tidy;