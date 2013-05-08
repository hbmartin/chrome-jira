function saveOpts(e) {
  setTimeout(function() {
    saveOpts_async(e);
  }, 20);
}

function saveOpts_async(e) {
  var statuses = "";
  var priors   = "";
  var versions_query = "";
  var opts = document.getElementsByTagName('input');
  for (i = 0; i < opts.length; i++){
    if (opts[i].name == 'status') {
      if (opts[i].checked) {
        // localStorage[opts[i].id] is used for checkbox UI
        // statuses is used to prerecord request string for Jira
        localStorage.setItem("stat." + opts[i].id, 1);
        statuses += ("\"" + opts[i].id + "\",");
      }
      else {
        localStorage.setItem("stat." + opts[i].id, 0);
      }
    }
    else if (opts[i].name == 'priors') {
      if (opts[i].checked) {
        localStorage.setItem("prior." + opts[i].id, 1);
        priors += ("," + opts[i].id + ",");
      }
      else {
        localStorage.setItem("prior." + opts[i].id, 0);
      }
    }
    else if (opts[i].id == 'subbar') {
      if (opts[i].checked) {
        localStorage.setItem("subbar", 1);
        document.getElementById('person').disabled = false;
        document.getElementById('rel_time').disabled = false;
      }
      else {
        localStorage.setItem("subbar", 0);
        document.getElementById('person').disabled = true;
        document.getElementById('rel_time').disabled = true;
      }
    }
    else {
      if (opts[i].type == "checkbox") {
        if (opts[i].checked) { localStorage[opts[i].id] = 1; }
        else { localStorage[opts[i].id] = 0; }
      }
      else { localStorage[opts[i].id] = opts[i].value; }
    }
    localStorage['been_run'] = 1;
  }

  // regex strips trailing and leading commas
  // encode here since this is used ONLY for Jira request
  if ( !(statuses.length > 0) ) {
    alert("At least one status must be selected.");
    document.getElementById('Open').checked = true;
    statuses='Open';
  }
  localStorage['statuses'] = encodeURI(statuses.replace(/(^,)|(,$)/g, ""));
  
  if (versions_query.length > 0) { localStorage['versions_query'] = encodeURI(" AND (fixVersion in (" + versions_query.replace(/(^,)|(,$)/g, "") + "))"); }
  else { localStorage.removeItem('versions_query'); }

  localStorage['priors'] = priors;
  localStorage.setItem('search_bar', document.getElementById('search_bar').value);
  localStorage.setItem('person', document.getElementById('person').value);
  localStorage.setItem('rel_time', (document.getElementById('rel_time').value == 'absolute' ? 0 : 1));
  chrome.extension.sendMessage("updateJira");
}

function loadOpts() {
  if (jira_url.indexOf('openx.org') == -1) { var dc = document.getElementById('customfield_10020'); dc.parentNode.removeChild(dc); }
  var _jira_url = document.getElementById('jira_url');
  _jira_url.value = jira_url;
  _jira_url.addEventListener('keyup', function(e){
    localStorage['jira_url'] = jira_url = this.value;
    if(e.which == 13) { location.reload(); }
  });
  var xhr_status = new XMLHttpRequest();
  xhr_status.open("GET", jira_url + "/rest/api/2/status", true);
  xhr_status.onreadystatechange = function() {
    if (xhr_status.readyState == 4) {
      stats=JSON.parse(xhr_status.responseText);
      for (var i = 0; i < stats.length; i++) {
        stat = stats[i];
        var stat_dom = document.createElement("label");
        stat_dom.innerHTML= "<input type='checkbox' name='status' id='" +
                                stat.name + "' " +
                                (localStorage["stat." + stat.name] == 1 ? "checked" : '') +
                                " /><img class='icon' src='" +
                                stat.iconUrl +
                                "' />" + stat.name;
        document.getElementById('opts-form').appendChild(stat_dom);
      }
      checkboxes = document.getElementsByName('status');
      for (i = 0; i < checkboxes.length; i++){
        checkboxes[i].onclick = saveOpts;
      }
    }
  };
  xhr_status.send();
  
  var xhr_priority = new XMLHttpRequest();
  xhr_priority.open("GET", jira_url + "/rest/api/2/priority", true);
  xhr_priority.onreadystatechange = function() {
    if (xhr_priority.readyState == 4) {
      priors=JSON.parse(xhr_priority.responseText);
      for (var j = 0; j < priors.length; j++) {
        prior = priors[j];
        var prior_dom = document.createElement("label");
        prior_dom.innerHTML= "<input type='checkbox' name='priors' id='" +
                                prior.name + "' " +
                                (localStorage["prior." + prior.name] == 1 ? "checked" : '') +
                                " /><img class='icon' src='" +
                                prior.iconUrl +
                                "' />" + prior.name;
        document.getElementById('alert-form').appendChild(prior_dom);
      }
      checkboxesp = document.getElementsByName('priors');
      for (i = 0; i < checkboxesp.length; i++){
        checkboxesp[i].onclick = saveOpts;
      }
    }
  };
  xhr_priority.send();

  var xhr_versions = new XMLHttpRequest();
  xhr_versions.open("GET", jira_url + "/rest/api/2/project/ADS/versions", true);
  xhr_versions.onreadystatechange = function() {
    if (xhr_versions.readyState == 4) {
      versions=JSON.parse(xhr_versions.responseText);
      versions_list = [];
      for (var k = 0; k < versions.length; k++) {
        versions_list.push(versions[k].name);
      }
      versions_list.sort();
      for (var k = 0; k < versions_list.length; k++) {
        v = versions_list[k];
        if ( v.indexOf('Milestone') > -1 || v.indexOf('3.') > -1 ) { continue; }
        var m = v.match(/(^[A-Z]+)-(\d+$)/);
        if ( m ) {
          if ( m[1] == "REL" && m[2] < 1000 ) { continue; }
          if ( m[1] == "SHT" ) { continue; } }
        var v_dom = document.createElement("label");
        v_dom.innerHTML= "<input type='checkbox' name='versions' id='" +
                                v + "' " +
                                (localStorage["versions." + v] == 1 ? "checked" : '') +
                                " />" + v;
        v_dom.childNodes[0].onclick = saveOpts;
        document.getElementById('versions-form').appendChild(v_dom);
      }
    }
  };
  xhr_versions.send();
  if ( localStorage.getItem("subbar") == 0 ) { document.getElementById('subbar').checked = false; }
  else { document.getElementById('subbar').checked = true; }
  document.getElementById('subbar').onclick = saveOpts;
  
  if (localStorage.getItem('rel_time')) {
    document.getElementById('rel_time').value = (localStorage.getItem('rel_time') == 0 ? 'absolute' : 'relative');
  }
  document.getElementById('rel_time').onchange = saveOpts;

  if (localStorage.getItem('person')) { document.getElementById('person').value = localStorage.getItem('person'); }
  document.getElementById('person').onchange = saveOpts;

  if (localStorage.getItem('search_bar')) { document.getElementById('search_bar').value = localStorage.getItem('search_bar'); }
  document.getElementById('search_bar').onchange = saveOpts;

  if (!(localStorage['been_run'] == 1)) {
    var msg = document.createElement("h2");
    msg.innerHTML="&#8598; Search Jira by typing 'jira [ticket number]' in the location bar above.";
    msg.id="motd";
    document.getElementById('content').insertBefore(msg, document.getElementById('content').childNodes[1]);
  }

}

window.onload = loadOpts;
addEventListener("unload", function (event) { saveOpts("close_window"); });