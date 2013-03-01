#!/usr/bin/perl -w
# Bad.pl name file as bad

use strict;
use lib substr(__FILE__, 0, rindex (__FILE__, "/"));

use ccproto_client;
use api_consts;

# your connect information
my $HOST =	'';		#HOST
my $PORT =	;			#PORT
my $USERNAME =	'';		#LOGIN
my $PASSWORD =	'';	#PASSWORD

my $PIC_FILE_NAME = "export-cropped.png";

my $ccp = new ccproto();

$ccp->init();
print "Logging in...";
if( $ccp->login( $HOST, $PORT, $USERNAME, $PASSWORD ) < 0 ) {
    print " FAILED\n";
    exit 1;
} else {
    print " OK\n";
}
print "Naming picture ".$major_id."/".$minor_id." as bad\n";
$ccp->picture_bad2( $major_id, $minor_id );
$ccp->close();

exit 0;
