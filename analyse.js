function fixation_time_per_scene(trial, eye) {
  // summed fixation time per each scene ///////////////////////////////////////
  var data = trial.data[eye];
  var scene_times = [0,0,0,0,0,0,0,0];
  for (var i=0; i<data.length; ++i) {
    var d = data[i];
    if (d.type != 'fix') continue;
    scene_times[getSceneIndex(d.x, d.y)] += d.duration;
  }
  for (var i=0; i<scene_times.length; i++) {
    scene_times[i] *= 100/trial.duration;
    scene_times[i] = scene_times[i].toFixed(1) + ' %';
  }
  return scene_times;  
}

/// Returns 'one_scene', 'two_scenes_one_side', 'two_sides' or null.
function getSaccadeType(sacc) {
  var s1 = getSceneIndex(sacc.x0, sacc.y0), s2 = getSceneIndex(sacc.x1, sacc.y1);
  if (s1 == null || s2 == null) return null;
  if (s1 == s2) return 'one_scene';
  else if ((s1 < 4 && s2 < 4) || (s1 >= 4 && s2 >= 4)) return 'two_scenes_one_side';
  else return 'two_sides';
}

function count_saccade_types(trial, eye) {
  var data = trial.data[eye];
  var saccades = {one_scene: 0, two_scenes_one_side: 0, two_sides: 0};
  for (var i=0; i<data.length; ++i) {
    var d = data[i];
    if (d.type != 'sacc') continue;
    var type = getSaccadeType(d);
    if (type != null) saccades[type]++;
  }
  return saccades;
}

function analyse(trial, eye) {
  console.log('Duration: ' + trial.duration / 1000 + ' sec');
  console.log('Fixation time per scene: ' + JSON.stringify(fixation_time_per_scene(trial, eye)));
  
  // number of fixations per scene /////////////////////////////////////////////
  var data = trial.data[eye];
  var scene_fixations = [0,0,0,0,0,0,0,0];
  for (var i=0; i<data.length; ++i) {
    var d = data[i];
    if (d.type != 'fix') continue;
    scene_fixations[getSceneIndex(d.x, d.y)]++;
  }
  console.log('Fixations per scene: ' + JSON.stringify(scene_fixations));
  
  
  console.log('Saccade types: ' + JSON.stringify(count_saccade_types(trial, eye)));
}

/// Returns an array with the minimum and the maximum pupil values. Pass an array
/// of gazes to the function.
function getPupilInterval(data) {
  var p_min = null, p_max = null;
  for (var i=0; i<data.length; i++) {
    if (data[i].type != 'fix') continue;
    if (p_min == null || p_min > data[i].pupil) p_min = data[i].pupil;
    if (p_max == null || p_max < data[i].pupil) p_max = data[i].pupil;
  }
  return [p_min, p_max];
}

var scene_centers = [[133,134], [133,395], [394,134], [394,395],
                     [707,134], [707,395], [967,134], [967,395]];
function getSceneIndex(x, y) {
  for (var i=0; i<scene_centers.length; ++i) {
    var dx = Math.abs(scene_centers[i][0]-x), dy = Math.abs(scene_centers[i][1]-y);
    if (dx <= 130 && dy <= 130) return i;
  }
  return null;
}

function getProblemSide(x,y) {
  var s = getSceneIndex(x,y);
  if (s == null) return null;
  if (s < 4) return 'l';
  return 'r';
}

if (typeof(exports) != 'undefined') exports.getSceneIndex = getSceneIndex;
