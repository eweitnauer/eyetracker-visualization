var can, ctx, trials, img, trial_btns = [], file_btns = [], 
    curr_file = null, curr_trial=0, curr_img, curr_time, time_label, timeline,
    timer_id = null, last_time, main_eye='L', other_eye='R';
    
var file_list = {
  prefix: 'DATA/',
  postfix: '.asc',
  files: ['pbp01', 'pbp02', 'pbp03', 'pbp04', 'pbp05', 'pbp06', 'pbp07',
          'pbp08', 'pbp09', 'pbp10', 'pbp11', 'pbp_me']
};

var solved = [[1,0,0,1,1,1,1,1,1,0,1,1,1,1,1,0,0,0,1,1,0,1,1,0,1,1,1,0,1,1,1,0,1],
              [1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,0,0,0],
              [1,0,0,1,1,1,0,1,1,0,0,1,1,1,1,0,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,0],
              [0,1,0,1,0,1,1,1,1,0,0,0,1,1,0,0,1,0,1,0,0,1,1,1,1,1,1,1,1,1,1,0,1],
              [1,0,0,1,0,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,0,0,1,1,0,1,1,1,1,1],
              [0,1,0,1,0,1,0,1,1,0,0,1,1,0,1,0,1,0,1,1,0,1,1,0,0,1,1,0,1,1,1,0,1],
              [0,1,1,1,1,1,1,1,1,1,0,1,1,0,0,0,1,0,1,1,0,1,1,0,1,1,0,1,0,1,0,1,1],
              [1,0,0,1,1,1,1,1,1,1,0,1,1,1,0,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,1,1],
              [1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1],
              [1,1,0,1,1,1,1,1,1,1,0,1,1,0,1,0,1,0,1,0,0,1,1,0,0,1,1,1,1,1,1,0,1],
              [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,0,0,0,0,0],
              [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]];

var g_info = ['hi','hi','hi','hi','hi','hi','hi','hi'];

$ = function(id) { return document.getElementById(id); }

function init() {
  // add file buttons
  addButtons($('files'), file_list.files, false, loadFile);
  
  // setup timeline and canvas
  can = $('canvas');
  can.width = 1100; can.height = 530;
  ctx = can.getContext('2d');
  time_label = $('tl_label');
  timeline = $('timeline');
  timeline.addEventListener("change", function(evt) {setTrialTime(event.target.valueAsNumber)}, false);    
  
  // load the first file
  loadFile(0);
}

function play(event) {
  if (timer_id) pause();
  else {
    if (curr_time >= trials[curr_trial].duration-1) setTrialTime(0);
    last_time = Date.now();
    timer_id = setInterval(stepTime, 1000/30);
    event.target.innerHTML = 'Pause';
  }
}

function pause() {
  if (timer_id) clearInterval(timer_id);
  timer_id = null;
  $('play_btn').innerHTML = 'Play';
}

function stepTime() {
  var t = Date.now(), dt = 0.5*(t-last_time);
  last_time = t;
  if (curr_time+dt >= trials[curr_trial].duration) {
    setTrialTime(trials[curr_trial].duration-1);
    pause();
  } else {
    setTrialTime(curr_time+dt);
  }
}

function loadFile(idx) {
  pause();
  curr_file = idx;
  // parse eyetracking file
  var filename = file_list.prefix + file_list.files[idx] + file_list.postfix;
  console.log('parsing ' + filename + '...');
  trials = parse_file(filename, -(1920-1100)*0.5, -(1200-530)*0.5);
  console.log('Loaded ' + trials.length + ' trials.');
  setCurrentButton(idx, $('files').childNodes);
  // add trial buttons
  addButtons($('trials'), trials, true, showTrial);
  // show trial
  if (curr_trial >= trials.length) curr_trial = trials.length -1;
  if (curr_trial >= 0) showTrial(curr_trial);
}

function showTrial(idx) {
  setCurrentButton(idx, $('trials').childNodes);
  curr_trial = idx;
  analyse_trial();
  // load the image
  curr_img = new Image();
  curr_img.src = "IMAGES/" + trials[idx].image;
  // setup the timeline
  timeline.min = 0;
  timeline.max = trials[idx].duration;
  timeline.value = 0;
  timeline.step = 2;
  setTrialTime(0);
}

function analyse_trial() {
  g_info = fixation_time_per_scene(trials[curr_trial], main_eye);
  $('res1').innerHTML = solved[curr_file][curr_trial] ? 'solved' : 'NOT solved';
  var sacc = count_saccade_types(trials[curr_trial], main_eye);
  $('sacc_numbers').innerHTML = sacc.one_scene + " / " + sacc.two_scenes_one_side + " / " + sacc.two_sides;
  if (trials[curr_trial].data_valid) { 
    drawSaccadeTimeline(trials[curr_trial].data_valid[main_eye]);
    drawSaccadeTimeline2(trials[curr_trial].data_valid[main_eye]);
    drawPupilTimeline(trials[curr_trial].data_valid[main_eye]);
  }
}

function drawPupilTimeline(d) {
  // paint saccade types on timeline
  var ctx = $('pupils').getContext('2d');
  ctx.clearRect(0,0,1090,20);
  ctx.strokeStyle = 'gray';
  ctx.lineWidth = 1;
  ctx.strokeRect(0,0,1090,20);
  ctx.strokeStyle = 'black';
  var p_int = getPupilInterval(d);
  ctx.beginPath();
  ctx.moveTo(0,20);
  for (var i=0; i<d.length; i++) {
    if (d[i].type != 'fix') continue;
    var x = 1090 * ((d[i].t0+d[i].t1)/2) / trials[curr_trial].duration;
    var y = 20 - 20 * (d[i].pupil-p_int[0]) / (p_int[1]-p_int[0]);
    ctx.lineTo(x,y);
  }
  ctx.stroke();
}

function drawSaccadeTimeline(d) {
  // paint saccade types on timeline
  var ctx = $('saccades2').getContext('2d');
  ctx.clearRect(0,0,1090,20);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(0,20);
  ctx.moveTo(0,10);
  ctx.lineTo(1090,10);
  ctx.moveTo(1090,0);
  ctx.lineTo(1090,20);
  ctx.stroke();
  var t0 = 0;
  var side = 'l';
  for (var i=0; i<d.length; i++) {
    if (d[i].type != 'sacc') continue;
    var x = 1090 * (d[i].t0+d[i].t1)/2 / trials[curr_trial].duration;
    var type = getSaccadeType(d[i]);
    if (type == 'one_scene') {
      ctx.fillStyle = 'gray';
      ctx.fillRect(x-1,5,2,10);
    } else if (type == 'two_scenes_one_side') {
      ctx.fillStyle = 'black';
      ctx.fillRect(x-1,2,2,16);
    } else if (type == 'two_sides') {
      side = getProblemSide(d[i].x0,d[i].y0);
      if (side == 'l') ctx.fillStyle = 'rgba(255,0,0,0.3)';
      else if (side == 'r') ctx.fillStyle = 'rgba(0,0,255,0.3)';
      else ctx.fillStyle = 'gray';
      var x0 = 1090 * t0 / trials[curr_trial].duration;
      t0 = (d[i].t0+d[i].t1)/2;
      ctx.fillRect(x0,0,x-x0,20);
    }
  }
  if (side == 'l') ctx.fillStyle = 'rgba(0,0,255,0.3)';
  else if (side == 'r') ctx.fillStyle = 'rgba(255,0,0,0.3)';
  var x0 = 1090 * t0 / trials[curr_trial].duration;
  ctx.fillRect(x0,0,1090-x0,20);        
}

function drawSaccadeTimeline(d) {
  // paint saccade types on timeline
  var ctx = $('saccades').getContext('2d');
  ctx.clearRect(0,0,1090,20);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(0,20);
  ctx.moveTo(0,10);
  ctx.lineTo(1090,10);
  ctx.moveTo(1090,0);
  ctx.lineTo(1090,20);
  ctx.stroke();
  for (var i=0; i<d.length; i++) {
    if (d[i].type != 'sacc') continue;
    var t = getSaccadeType(d[i]);
    if (t == null) continue;
    else if (t == 'one_scene') ctx.fillStyle = 'gray';
    else if (t == 'two_scenes_one_side') ctx.fillStyle = 'orange';
    else if (t == 'two_sides') ctx.fillStyle = 'red';
    var x = 1090 * ((d[i].t0+d[i].t1)/2) / trials[curr_trial].duration;
    ctx.fillRect(x-2, 0, 4, 20);
    ctx.strokeRect(x-2, 0, 4, 20);
  }
}

function setEye(eye) {
  if (eye == 'L') {
    main_eye = 'L'; other_eye = 'R';
    $('left_btn').className = 'button active';
    $('right_btn').className = 'button';
  }
  else if (eye == 'R') {
    main_eye = 'R'; other_eye = 'L';
    $('left_btn').className = 'button';
    $('right_btn').className = 'button active';
  }
  analyse_trial();
  drawCurrent();
}

function setCurrentButton(idx, btns) {
  for (var i=1; i<btns.length; i++) btns[i].className = btns[i].value==idx ? 'button active' : 'button';
}

function addButtons(div, values, use_idx_as_label, callback) {
  // first remove old buttons (first child is label)
  while (div.childNodes.length > 1) div.removeChild(div.childNodes[1])
  // now add new ones
  for (var i=0; i<values.length; ++i) {
    var a = document.createElement('a');
    a.className = "button";
    a.innerHTML = use_idx_as_label ? i : values[i];
    a.setAttribute('href', '/');
    a.value = i;
    a.addEventListener("click", function(event) {
      callback(event.target.value);
      event.preventDefault();
    });
    div.appendChild(a);
  }
}

function setTrialTime(time) {
  curr_time = time;
  time_label.innerHTML = time/1000 + ' s';
  timeline.value = time;
  drawCurrent();
}

function drawGaze(gaze, alpha) {
  if (!gaze) return;
  var color = (gaze.eye=='L') ? 'rgba(100,0,0,' + alpha +')' : 'rgba(0,0,100,' + alpha + ')';
  if (gaze.type == "sacc") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gaze.x0, gaze.y0);
    ctx.lineTo(gaze.x1, gaze.y1);
    ctx.stroke();
  } else if (gaze.type == "fix") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(gaze.x, gaze.y, Math.sqrt(gaze.pupil/Math.PI)*0.7, 0, 2*Math.PI, true);
    ctx.fill();
  }
}

function drawGazeHistory(time, trial, eye, len) {
  var idx = trial.getEventIndex(time, eye);
  if (idx == null) return;
  var i_min = Math.max(0, idx-len+1);
  for (var i=idx; i>=0 && i>=i_min; i--) drawGaze(trial.data[eye][i], (1-(idx-i)/len)*0.8);
}

function displayInfo(info) {
  ctx.fillStyle = 'black';
  ctx.font = "11pt Arial";
  ctx.textAlign = "center";
  for (var i=0; i<scene_centers.length; ++i) {
    ctx.fillText(info[i], scene_centers[i][0], scene_centers[i][1]+120);
  }
}

function highlightScene(gaze) {
  if (!gaze) return;
  var highlight = function(x,y) {
    var s = getSceneIndex(x, y);
    if (s == null) return;
    ctx.strokeStyle = 'rgb(80,200,80)';
    ctx.lineWidth = 4;
    ctx.strokeRect(scene_centers[s][0]-130, scene_centers[s][1]-130, 260, 260);
  }
  if (gaze.type == 'fix') highlight(gaze.x, gaze.y);
  else if (gaze.type == 'sacc') {
    highlight(gaze.x0, gaze.y0);
    highlight(gaze.x1, gaze.y1);
  }
}

function drawCurrent() {
  if (!curr_img) return;
  var draw = function() {
    ctx.drawImage(curr_img, 0, 0);
    drawGazeHistory(curr_time, trials[curr_trial], main_eye, 6);
    //drawGazeHistory(curr_time, trials[curr_trial], other_eye, 10);
    //drawGaze(trials[curr_trial].getEvent(curr_time, 'L'), 0.7);
    //drawGaze(trials[curr_trial].getEvent(curr_time, 'R'), 0.7);
    displayInfo(g_info);
    highlightScene(trials[curr_trial].getEvent(curr_time, main_eye));
  }
  if (curr_img.complete) draw();
  else curr_img.addEventListener("load", draw);
}
