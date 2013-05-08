jira_url = localStorage['jira_url'] || "http://jira.pasadena.openx.org";

// Pass an Issue ID to get an HTML string
function getTransitions(issue) {
  var j = 0;
  var transitions = "";
  var xhr_transitions = new XMLHttpRequest();
  xhr_transitions.open("GET", jira_url + "/rest/api/2/issue/" + issue + "/transitions", false);
  xhr_transitions.onreadystatechange = function() {
    if (xhr_transitions.readyState == 4) {
        if(xhr_transitions.responseText.indexOf('transitions') > 0) {
          var ts = JSON.parse(xhr_transitions.responseText).transitions;
          for (j = 0; j < ts.length; j++) {
            var t = ts[j];
            transitions += "<button data-action='" + t.id + "' class='btn btn-mini' data-issue='" + issue + "'>" + t.name + "</button>";
          }
          localStorage.setItem(issue + '.transitions', transitions);
        }
    }
  };
  xhr_transitions.send();
  return transitions;
}

/**
 * Returns a description of this date in relative terms.
 * https://raw.github.com/jherdman/javascript-relative-time-helpers/
 **/

 Date.prototype.toRelativeTime = (function() {

  var _ = function(options) {
    var opts = processOptions(options);

    var now = opts.now || new Date();
    var delta = now - this;
    var future = (delta <= 0);
    delta = Math.abs(delta);

    // special cases controlled by options
    if (delta <= opts.nowThreshold) {
      return future ? 'Right now' : 'Just now';
    }
    if (opts.smartDays && delta <= 6 * MS_IN_DAY) {
      return toSmartDays(this, now);
    }

    var units = null;
    for (var key in CONVERSIONS) {
      if (delta < CONVERSIONS[key])
        break;
      units = key; // keeps track of the selected key over the iteration
      delta = delta / CONVERSIONS[key];
    }

    // pluralize a unit when the difference is greater than 1.
    delta = Math.floor(delta);
    if (delta !== 1) { units += "s"; }
    return [delta, units, future ? "from now" : "ago"].join(" ");
  };

  var processOptions = function(arg) {
    if (!arg) arg = 0;
    if (typeof arg === 'string') {
      arg = parseInt(arg, 10);
    }
    if (typeof arg === 'number') {
      if (isNaN(arg)) arg = 0;
      return {nowThreshold: arg};
    }
    return arg;
  };

  var toSmartDays = function(date, now) {
    var day;
    var weekday = date.getDay(),
        dayDiff = weekday - now.getDay();
    if (dayDiff == 0)       day = 'Today';
    else if (dayDiff == -1) day = 'Yesterday';
    else if (dayDiff == 1 && date > now)  day = 'Tomorrow';
    else                    day = WEEKDAYS[weekday];
    return day + " at " + date.toLocaleTimeString();
  };

  var CONVERSIONS = {
    millisecond: 1, // ms    -> ms
    second: 1000,   // ms    -> sec
    minute: 60,     // sec   -> min
    hour:   60,     // min   -> hour
    day:    24,     // hour  -> day
    month:  30,     // day   -> month (roughly)
    year:   12      // month -> year
  };
  var MS_IN_DAY = (CONVERSIONS.millisecond * CONVERSIONS.second * CONVERSIONS.minute * CONVERSIONS.hour * CONVERSIONS.day);

  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return _;

})();