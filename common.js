jira_url = localStorage['jira_url'];

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