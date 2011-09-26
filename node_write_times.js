var fs = require('fs');
var parse_file = require('./parse').parse_file;

var files = ['pbp01', 'pbp02', 'pbp03', 'pbp04', 'pbp05', 'pbp06', 'pbp07',
            'pbp08', 'pbp09', 'pbp10', 'pbp11', 'pbp_me'];
          
var trials = [];
for (var i=0; i<files.length; i++) {
  trials.push(parse_file('DATA/'+files[i]+'.asc'));
}

var fd = fs.openSync('./times.csv', 'w');

var str = "";
for (var tr=0; tr<trials[0].length; tr++) {
  for (var vp=0; vp<trials.length; vp++) {
    if (trials[vp][tr]) { var dur = String(trials[vp][tr].duration/1000);}
    else { var dur = "0" }
    if (vp<trials.length-1) dur += ',';
    str += dur;
  }
  str += "\n";
}
fs.writeSync(fd, str, null, 'utf8');
