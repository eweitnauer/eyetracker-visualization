/// writes the average fixation times
var fs = require('fs');
var parse_file = require('./parse').parse_file;
var getAverageFixationTime = require('./analyse').getAverageFixationTime;
var getValidFixationFraction = require('./analyse').getValidFixationFraction;

var files = ['pbp01', 'pbp02', 'pbp03', 'pbp04', 'pbp05', 'pbp06', 'pbp07',
            'pbp08', 'pbp09', 'pbp10', 'pbp11', 'pbp_me'];
          
var trials = [];
for (var i=0; i<files.length; i++) {
  trials.push(parse_file('DATA/'+files[i]+'.asc', -(1920-1100)*0.5, -(1200-530)*0.5));
}

var fd = fs.openSync('./fix_times.csv', 'w');

var str = "";
var left = 0, right = 0;
for (var tr=0; tr<trials[0].length; tr++) {
  for (var vp=0; vp<trials.length; vp++) {
    if (trials[vp][tr]) {
      var l_good = getValidFixationFraction(trials[vp][tr].data.L),
          r_good = getValidFixationFraction(trials[vp][tr].data.R);
      var eye = (!r_good || (l_good >= r_good)) ? 'L' : 'R';
      var dur = getAverageFixationTime(trials[vp][tr].data[eye]);
      if (eye == 'L') left++; else right++;
    } else { var dur = "0" }

    if (vp<trials.length-1) dur += ',';
    str += dur;
  }
  str += "\n";
}
fs.writeSync(fd, str, null, 'utf8');

console.log(left, right);
