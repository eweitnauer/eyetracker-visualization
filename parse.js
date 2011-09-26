function Trial() {
  this.duration = 0; // in ms
  this.image = null; // filename of shown image
  this.data = {'L': [], 'R': []}; // gaze data as arrays for left and right eye
}

/// Internal function for retrieving which gaze was active at a given time.
/// idx_lo, idx_hi are an open interval in which the index of the gaze data is
/// searched. (Binary search).
Trial.prototype._getEventIndex = function(t, eye, idx_lo, idx_hi) {
  var d = this.data[eye];
  if (idx_hi - idx_lo < 2) { if (idx_lo >= 0) return idx_lo; else return null; }
  var idx = Math.floor((idx_lo+idx_hi) * 0.5);
  if (d[idx].t1 < t) return this._getEventIndex(t, eye, idx, idx_hi);
  else if (d[idx].t0 > t) return this._getEventIndex(t, eye, idx_lo, idx);
  else return idx;
}

Trial.prototype.getEventIndex = function(t, eye) {
  var d = this.data[eye];
  if (d.length == 0) return null;
  return this._getEventIndex(t, eye, -1, d.length);
}

/// Retrieve the gaze that occured at the passed time for the passed eye ('L' or
/// 'R'). If no gaze is recorded for that time, null is returned.
Trial.prototype.getEvent = function(t, eye) {
  return this.data[eye][this.getEventIndex(t, eye)];
}

function Gaze() {
  this.type = 'none';
}

Gaze.createFixation = function(eye, t0, t1, x, y, pupil) {
  var g = new Gaze();
  g.type = 'fix';
  g.eye = eye;
  g.t0 = t0; g.t1 = t1; g.duration = t1-t0+2;
  g.x = x; g.y = y; g.pupil = pupil;
  return g;
}

Gaze.createSaccade = function(eye, t0, t1, x0, y0, x1, y1) {
  var g = new Gaze();
  g.type = 'sacc';
  g.eye = eye;
  g.t0 = t0; g.t1 = t1; g.duration = t1-t0+2;
  g.x0 = x0; g.y0 = y0; g.x1 = x1; g.y1 = y1; 
  return g;
}

Gaze.prototype.copy = function() {
  if (this.type == 'fix') return Gaze.createFixation(this.eye, this.t0, this.t1, this.x, this.y, this.pupil);
  else if (this.type == 'sacc') return Gaze.createSaccade(this.eye, this.t0, this.t1, this.x0, this.y0, this.x1, this.y1);
  else return new Gaze();
}

// ajax
ajaxGetUrl = function(url) {
  var AJAX;
  if(window.XMLHttpRequest){AJAX=new XMLHttpRequest();}
  else{AJAX=new ActiveXObject('Microsoft.XMLHTTP');}
  if(AJAX){
    AJAX.open('GET',url,false);
    AJAX.send(null);
    return AJAX.responseText;
  }
  return null;
}

function parse_file(file_name, dx, dy) {
  var file;
  if (typeof(require) != 'undefined') {
    getSceneIndex = require('./analyse').getSceneIndex;
    file = require('fs').readFileSync(file_name, 'utf8').split('\n');
  } else {
    file = ajaxGetUrl(file_name).split("\n");
  }

  var trials = [], trial, t_t0;
  for (var line=0; line < file.length; ++line) {
    // MSG START_TRIAL
    file[line].replace(/MSG\s+(\d+)\s+START_TRIAL\s+(\d+)/, function(m, time, number) {
      trial = new Trial();
    });

    // MSG IMG_LOAD
    file[line].replace(/MSG\s+(\d+)\s+IMG_LOAD\s+(\S+)/, function(m, time, file_name) {
      trial.image = file_name;
    });
    
    // MSG DISPLAY_ON
    file[line].replace(/MSG\s+(\d+)\s+\d\s+DISPLAY_ON/, function(m, time) {
      t_t0 = parseInt(time);
    });
    
    // MSG ENDBUTTON
    file[line].replace(/MSG\s+(\d+)\s+ENDBUTTON/, function(m, time) {
      trial.duration = time - t_t0 + 2;
    });
    
    // MSG END_TRIAL
    file[line].replace(/MSG\s+(\d+)\s+END_TRIAL\s+(\d+)/, function(m, time, number) {
      trials.push(trial);
    });
    
    // EFIX
    file[line].replace(/EFIX\s+([LR])\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d\.]+)\s+([\d\.]+)\s+(\d+)/, function(m, eye, t0, t1, dt, x, y, pupil) {
      trial.data[eye].push(Gaze.createFixation(eye, parseInt(t0)-t_t0, parseInt(t1)-t_t0,
                           parseFloat(x)+dx, parseFloat(y)+dy, parseInt(pupil)));
    });

    // ESACC
    file[line].replace(/ESACC\s+([LR])\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+(\d+)/,
      function(m, eye, t0, t1, dt, x0, y0, x1, y1, foo, bar)
    {
      trial.data[eye].push(Gaze.createSaccade(eye, parseInt(t0)-t_t0, parseInt(t1)-t_t0,
                           parseFloat(x0)+dx, parseFloat(y0)+dy,
                           parseFloat(x1)+dx, parseFloat(y1)+dy));
    });
  }
  remove_outliers(trials);
  return trials;
}

if (typeof(exports) != 'undefined') {
  exports.parse_file = parse_file;
}

/// This function removes saccades and fixations that are not onto one of the
/// scenes.
function remove_outliers(trials) {
  var removed = function(d) {
    if (d.length==0) return [];
    var res = [];
    // leave first entry alone
    res.push(d[0].copy());
    for (var i=1; i<d.length; i++) {
      if (d[i].type == 'fix' && getSceneIndex(d[i].x, d[i].y) != null) res.push(d[i].copy());
      else if (d[i].type == 'sacc') {
        var gaze = d[i].copy();
        res.push(gaze);
        if (getSceneIndex(d[i].x1, d[i].y1) == null) {
          // if the end point of the saccade is not valid, search for the next saccade
          // with valid end point and merge them
          var j = i+1;
          while (j<d.length) {
            if (d[j].type == 'sacc' && getSceneIndex(d[j].x1, d[j].y1) != null) {
              gaze.x1 = d[j].x1; gaze.y1 = d[j].y1;
              gaze.t1 = d[j].t1; gaze.duration = d[j].t1-gaze.t0+2;
              break;
            }
            j++;
          }
          i=j+1;
        }
      }
    }
    return res;
  }
  
  for (var i=0; i<trials.length; i++) {
    trials[i].data_valid = { L: removed(trials[i].data.L),
                             R: removed(trials[i].data.R) };
  }
}
