var timer = 2;  // minutes

function safe_tags(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function updateJira() {
  var count = localStorage['issue_count'] || 0, alert=0, content = "",
      person = ( localStorage.getItem('person') || 'assignee' );
  var xhr = new XMLHttpRequest();
  xhr.open("GET", jira_url + "/rest/api/2/search?jql=assignee%20%3D%20currentUser()" +
      (localStorage.getItem('versions_query') &&  localStorage.getItem('versions_query').length > 0 ? localStorage.getItem('versions_query') : '') +
      "%20AND%20status%20in%20(" + (localStorage['statuses'].length > 0 ? localStorage['statuses'] : 'Open') +
      ")%20ORDER%20BY%20status%20ASC%2C%20fixVersion%20ASC%2C%20rank%20ASC%2C%20priority%20DESC%2C%20key%20ASC&fields=priority,status,summary,issuetype,updated,fixVersions,comment," + person,
    false);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
        if(xhr.responseText.indexOf('issues') > 0) {
          var issues = JSON.parse(xhr.responseText).issues;
          if (count != issues.length) {
            count = issues.length;
          }
          localStorage['issue_count'] = count;
          chrome.browserAction.setBadgeText({text: count.toString()});

          priors = localStorage.getItem('priors') || ',Blocker,Critical,';

          for (var i = 0; i < issues.length; i++) {
            var issue = issues[i], notes = "";
            if ( issue.fields.priority && issue.fields.priority.name && (priors.indexOf(',' + issue.fields.priority.name + ',') > -1) ) { alert=1; }

            // Make sure that those versions hidden from the options page are never displayed
            if (issue.fields.fixVersions && issue.fields.fixVersions[0] && issue.fields.fixVersions[0].name) {
              var v = issue.fields.fixVersions[0].name
              if (localStorage.getItem('versions.' + v) === null) {
                localStorage.setItem('versions.' + v, 1);
                if ( v.indexOf('Milestone') > -1 || v.indexOf('3.') > -1 ) {
                  localStorage.setItem('versions.' + v, 0); }
                else if ( (m = v.match(/(^[A-Z]+)-(\d+$)/)) ) {
                  if ( m[1] == "REL" && m[2] < 1000 ) { localStorage.setItem('versions.' + v, 0); }
                  if ( m[1] == "SHT" ) { localStorage.setItem('versions.' + v, 0); } }
              }
            }
            
            // Load status transitions via AJAX if cache is outdated or nonexistent
            transitions = "";
            old_date = new Date( localStorage.getItem(issue.key + '.updated') || 0 );
            new_date = new Date( issue.fields.updated );
            if ( new_date.getTime() > old_date.getTime() ) { transitions = getTransitions(issue.key); }
            else { transitions = localStorage.getItem(issue.key + '.transitions') }

            var subbar =  "";
            if ( localStorage.getItem('subbar') != 0 ) {
              subbar = "<div class='subbar'>" +
                      "<img alt='Type' title='Type' class='issuetype icon' src='" +
                      issue.fields.issuetype.iconUrl +
                      "' />" +
                      (issue.fields.priority ? "<img alt='Priority' title='Priority' class='priority icon' src='" + issue.fields.priority.iconUrl + "' />" : "") +
                      "<img alt='Status' title='Status' class='status icon' src='" +
                      issue.fields.status.iconUrl + "' />" +
                      "<span class='updated'>" + (localStorage.getItem('rel_time') == 0 ? new_date.toLocaleString() : new_date.toRelativeTime()) + "</span>" +
                      (issue.fields[person].name ? "<button class='person btn btn-link btn-mini' data-action='comment' " +
                      "data-issue='" + issue.key + "' data-person='" + issue.fields[person].name + "'>" +
                      issue.fields[person].displayName + "</button>" : "") +
                      "</div>";
            }

            content +=    "<div class='issue-container' id='" + issue.key + "'>" +
                          "<a class='key' target='_blank' href='" + jira_url + "/browse/" + issue.key + "'>" +
                          issue.key + "</a>" +
                          "<div class='btn-act'><div class='btn-group'>" + transitions + "</div>" +
                          "<a title='Comments' href='#comment' class='btn btn-mini btn-comment' data-action='comment' role='button' data-toggle='modal' data-issue='" + issue.key + "'>" +
                          "<i class='icon-comment'></i> " + (issue.fields.comment.comments.length || "+") + "</a></div>" +
                          subbar +
                          "<div class='issue-maininfo'><a class='summary' target='_blank' href='" + jira_url + "/browse/" + issue.key + "'>" +
                          safe_tags(issue.fields.summary) + "</a>" +
                          "<form data-issue='" + issue.key + "' class='note-form'>" + notes + "</form>" +
                          "<a title='Todo List' class='add-note btn btn-mini' data-action='add-note' data-issue='" + issue.key + "'>" +
                          "<span class='icon-edit' data-action='add-note' data-issue='" + issue.key + "'>" +
                          "</span></a></div></div>";
          }
          
          var search_bar = '';
          if (!localStorage.getItem('search_bar') || localStorage.getItem('search_bar') == 'top') {
            search_bar = '<div id="navbar" class="navbar navbar-fixed-top"><div class="navbar-inner"><a class="brand" target="_blank" href="' + jira_url + '/CreateIssue.jspa">New Issue</a><form class="pull-right" id="search-form"><input id="search-input" type="search" tabindex="1" results="5" placeholder="Search"></form></div></div>';
          }
          else if (localStorage.getItem('search_bar') == 'bot') {
            search_bar = '<div id="navbar" class="navbar navbar-fixed-bottom"><div class="navbar-inner"><a class="brand" target="_blank" href="' + jira_url + '/CreateIssue.jspa">New Issue</a><form class="pull-right" id="search-form"><input id="search-input" type="search" tabindex="1" results="5" placeholder="Search"></form></div></div>';
          }
          
          content = search_bar + content;

          localStorage.setItem('html_cache', content);

          if (alert == 0) { chrome.browserAction.setBadgeBackgroundColor({color: [20, 20, 20, 230]}); }
          else if (alert == 1) { chrome.browserAction.setBadgeBackgroundColor({color: [220, 20, 20, 230]}); }
        }
        else { return false; }
    }
  };
  xhr.send();
}


var myip, xhr_myip = new XMLHttpRequest();
xhr_myip.open("GET", "http://jsonip.com/", false);
xhr_myip.onreadystatechange = function() {
  if (xhr_myip.readyState == 4) {
    myip = JSON.parse(xhr_myip.responseText)['ip'];
    if (myip == "206.169.198.1") {
      localStorage['jira_url'] = "https://jira.pasadena.openx.org";
    } else {
      chrome.windows.getAll({populate:true}, function(winData) {
        var i, j, t, tabs = [];
        var winTabs, totTabs, match;
        var url_re = /(^|\s)(((https?:\/\/)?[\w-]+(\.[\w-]+)+)\.?(:\d+)?(\/\S*)?)/gi;
        window_loop:
        for (i in winData) {
          winTabs = winData[i].tabs;
          totTabs = winTabs.length;
          for (j=0; j<totTabs; j++) {
            t = winTabs[j].url;
            if (t.indexOf('jira') > -1 && t.indexOf('chrome.google.com') == -1 ) {
              match = url_re.exec(t);
              // gets http(s)://domain
              localStorage['jira_url'] = match[3];
              break window_loop;
            }
          }
        }
      });
    }
  }
};
xhr_myip.send();

// First run
if (localStorage['statuses'] === undefined) {
  var statuses = "", xhr_myip = new XMLHttpRequest();
  xhr_myip.open("GET", jira_url + "/rest/api/2/status", false);
  xhr_myip.onreadystatechange = function() {
    if (xhr_myip.readyState == 4) {
      stats=JSON.parse(xhr_myip.responseText);
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
    else { console.log(xhr_myip.readyState); }
  };
  xhr_myip.send();
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

chrome.extension.onMessage.addListener(function(msg,sender,sendResponse){
  if (msg == "updateJira"){
    console.log("async update");
    setTimeout(updateJira, 2);
  }
});
