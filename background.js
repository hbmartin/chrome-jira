var timer = 2;  // minutes

// First run
if (localStorage['statuses'] === undefined) {
  var statuses = "", xhr_statuses = new XMLHttpRequest();
  xhr_statuses.open("GET", jira_url + "/rest/api/2/status", false);
  xhr_statuses.onreadystatechange = function() {
    if (xhr_statuses.readyState == 4) {
      stats=JSON.parse(xhr_statuses.responseText);
      for (var i = 0; i < stats.length; i++) {
        stat = stats[i];
        if (stat.name != "Resolved"  && stat.name != "Closed" && stat.name != "Invalid") {
          localStorage.setItem("stat." + stat.name, 1);
          statuses += ("\"" + stat.name + "\",");
        }
      }
      localStorage['statuses'] = encodeURI(statuses.replace(/(^,)|(,$)/g, ""));
      localStorage.setItem('prior.Blocker', 1);
      localStorage.setItem('prior.Critical', 1);
      chrome.browserAction.setBadgeBackgroundColor({color: [20, 20, 20, 230]});
      chrome.browserAction.setBadgeText({text: "..."});
    }
    else { console.log(xhr_statuses.readyState); }
  };
  xhr_statuses.send();
}

function updateJira() {
  var count = localStorage['issue_count'] || 0, alert=0, content = "",
      person = ( localStorage.getItem('person') || 'assignee' );
  var xhr = new XMLHttpRequest();
  xhr.open("GET", jira_url + "/rest/api/2/search?jql=assignee%20%3D%20currentUser()" +
      (localStorage.getItem('versions_query') &&  localStorage.getItem('versions_query').length > 0 ? localStorage.getItem('versions_query') : '') +
      "%20AND%20status%20in%20(" + (localStorage['statuses'].length > 0 ? localStorage['statuses'] : 'Open') +
      ")%20ORDER%20BY%20status%20ASC%2C%20fixVersion%20ASC%2C%20rank%20ASC%2C%20priority%20DESC%2C%20key%20ASC&fields=priority,status,summary,issuetype,updated,fixVersions," + person,
    false);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
        if(xhr.responseText.indexOf('issues') > 0) {
          var issues = JSON.parse(xhr.responseText).issues;
          if (count != issues.length) {
            count = issues.length;
          }
          chrome.browserAction.setBadgeBackgroundColor({color: [20, 20, 20, 200]});
          localStorage['issue_count'] = count;
          chrome.browserAction.setBadgeText({text: count.toString()});

          priors = localStorage.getItem('priors') || ',Blocker,Critical,';

          for (var i = 0; i < issues.length; i++) {
            var issue = issues[i], notes = "";
            if ( priors.indexOf((',' + issue.fields.priority.name + ',')) > -1 ) { alert=1; }

            // Make sure that those versions hidden from the options page are never displayed
            v = issue.fields.fixVersions[0].name;
            if (localStorage.getItem('versions.' + v) === null) {
              localStorage.setItem('versions.' + v, 1);
              if ( v.indexOf('Milestone') > -1 || v.indexOf('3.') > -1 ) {
                localStorage.setItem('versions.' + v, 0); }
              else if ( (m = v.match(/(^[A-Z]+)-(\d+$)/)) ) {
                if ( m[1] == "REL" && m[2] < 1000 ) { localStorage.setItem('versions.' + v, 0); }
                if ( m[1] == "SHT" ) { localStorage.setItem('versions.' + v, 0); } }
            }
            
            // Load status transitions via AJAX if cache is outdated or nonexistent
            transitions = "";
            old_date = new Date( localStorage.getItem(issue.key + '.updated') || 0 );
            new_date = new Date( issue.fields.updated );
            if ( new_date.getTime() > old_date.getTime() ) { transitions = getTransitions(issue.key); }
            else { transitions = localStorage.getItem(issue.key + '.transitions') }

            var subbar =  "<div class='subbar'>" +
                          "<img class='issuetype icon' src='" +
                          issue.fields.issuetype.iconUrl +
                          "' /><img class='priority icon' src='" +
                          issue.fields.priority.iconUrl +
                          "' /><img class='status icon' src='" +
                          issue.fields.status.iconUrl + "' />" +
                          "<span class='updated'>" + new_date.toDateString() + " " + new_date.toLocaleTimeString() + "</span>" +
                          "<button class='person btn btn-link btn-mini' data-action='comment' " +
                          "data-issue='" + issue.key + "' data-person='" + issue.fields[person].name + "'>" +
                          issue.fields[person].displayName + "</button>" +
                          "</div>";
            if ( localStorage.getItem('subbar') == 0 ) { subbar = ""; }

            content +=    "<div class='issue-container' id='" + issue.key + "'>" +
                          "<a class='key' target='_blank' href='" + jira_url + "/browse/" + issue.key + "'>" +
                          issue.key + "</a>" +
                          "<div class='btn-act'><div class='btn-group'>" + transitions + "</div>" +
                          "<a href='#comment' class='btn btn-mini comment' data-action='comment' role='button' data-toggle='modal' data-issue='" + issue.key + "'>" +
                          "<i class='icon-comment'></i>Comment</a></div>" +
                          subbar +
                          "<a class='summary' target='_blank' href='" + jira_url + "/browse/" + issue.key + "'>" +
                          issue.fields.summary + "</a>" +
                          "<form data-issue='" + issue.key + "' class='note-form'>" + notes + "</form>" +
                          "<p class='add-note btn btn-mini' data-action='add-note' data-issue='" + issue.key + "'>" +
                          "<span class='icon-edit' data-action='add-note' data-issue='" + issue.key + "'>" +
                          "</span></p></div>";
          }
        } else { return false; }
    }
  };
  xhr.send();
  localStorage.setItem('html_cache', content);

  if (alert == 0) { chrome.browserAction.setBadgeBackgroundColor({color: [20, 20, 20, 230]}); }
  else if (alert == 1) { chrome.browserAction.setBadgeBackgroundColor({color: [220, 20, 20, 230]}); }
}

// Make sure initialization has been done
if (localStorage['statuses'] !== undefined) { updateJira(); }
var timerId = setInterval(updateJira, timer * 60000);    //60,000 milliseconds == 1 minute

// Handle Jira keyword in omnibox
chrome.omnibox.onInputEntered.addListener(function(text) {
  chrome.tabs.getSelected(null, function(tab) {
    chrome.tabs.update(tab.id, {
      url: jira_url + "/secure/QuickSearch.jspa?searchString=" + text
    });
  });
});

