var issue="";

function closeModal() {
  document.getElementById('comment').style.visibility="hidden";
  document.getElementById('content').style.display="block";
  document.body.style.height="";
}
function sendComment() {
  comment = document.getElementById('comment-text').innerText;
  issue = document.getElementById('comment-text').getAttribute("data-issue");
  document.getElementById('comment').getElementsByClassName('modal-body')[0].innerHTML="<center><h2>Sending comment...</h2></center>";
  var xhr = new XMLHttpRequest();
  xhr.open("POST", jira_url + "/rest/api/2/issue/" + issue + "/comment", false);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      document.getElementById('comment').getElementsByClassName('modal-body')[0].innerHTML="<center><h2>Sent!</h2></center>";
    }
  };
  xhr.send(JSON.stringify( {body: comment} ));
  closeModal();
}

function saveNote(e) {
  issue = e.target.getAttribute('data-issue');
  _issue = document.getElementById(issue);
  _form = _issue.getElementsByClassName('note-form')[0];
  notes = _form.getElementsByTagName('input');
  _notes = [];
  for (var i = 0; i < notes.length; i++) {
    note = notes[i].value;
    if (/\S/.test(note)) {
      _notes.push(note);
    }
  }
  localStorage.setItem(issue + ".notes", JSON.stringify(_notes));
}
function delNote(e) {
  _div = e.target;
  _form = _div.getElementsByClassName('note-form')[0];
  i = 0;
  // Find the parent <div>
  while (_div.nodeName != "DIV") { _div = _div.parentNode; i++; }
  _div.parentNode.removeChild(_div);
  saveNote(e);
}
function addNote(_form, issue, note_val, i) {
  _dom = document.createElement("div");
  if (note_val === undefined) {
    _dom.innerHTML="<span class='del-note' data-issue='" + issue + "' data-action='del-note'>&times;</span><input type='text' data-issue='" + issue + "'>";
  }
  else {
    _dom.innerHTML="<span class='del-note' data-issue='" + issue + "' data-action='del-note'>&times;</span><input type='text' data-issue='" + issue + "' value='" + note_val + "'>";
  }
  _dom.childNodes[0].addEventListener('click', delNote);
  _dom.childNodes[1].addEventListener('blur', saveNote);
  _dom.childNodes[1].addEventListener('keypress', function(e){
      if(e.which == 13) {
        this.blur();
        addNote(_form, issue);
        _form.lastChild.lastChild.focus();
        if(e.preventDefault) { e.preventDefault(); }
      }
    });
  _form.appendChild(_dom);
  _dom.focus();
}

function btnAction(e) {
  issue = e.target.getAttribute('data-issue');
  _issue = document.getElementById(issue);
  action = e.target.getAttribute('data-action');
  if ( action == 'comment' ) {
    if ( e.target.getAttribute('data-person') ) {
      document.getElementById('comment-text').innerHTML = ("[~" + e.target.getAttribute('data-person') + "]");
    }
    document.getElementById('modal-title').innerHTML = issue + " " + (document.getElementById(issue).getElementsByClassName("summary")[0].innerText);
    document.getElementById('comment').style.visibility="visible";
    document.getElementById('content').style.display="none";
    document.getElementById('comment-text').setAttribute("data-issue", issue);
    document.body.style.height="520px";
    document.getElementById('comment-text').focus();
    
    document.getElementById('prev_comments').innerHTML = "...";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", jira_url + "/rest/api/2/issue/" + issue + "/comment", false);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var comments = JSON.parse(xhr.responseText).comments;
        var _dom = "";
        comments.reverse();
        for (var i = 0; i < comments.length; i++) {
          var c = comments[i];
          created = new Date(c.created);
          _dom += "<div class='comment_box prev_c'><div class='sender'>" + c.author.displayName +
                  "<span class='date'>" + created.toDateString() + " " + created.toLocaleTimeString() + "</span>" +
                  "</div>" + c.body + "</div>";
        }
        document.getElementById('prev_comments').innerHTML = _dom;
      }
      else {
        console.log(xhr.readyState);
      }
    };
    xhr.send();
    return;
  }
  else if (isNaN(action) === false) {
    // Status transitions are numerical actions
    _issue.getElementsByClassName("btn-group")[0].innerHTML="<h5>Updating...</h5>";
    _btnGroup = _issue.getElementsByClassName("btn-group")[0];
    var xhr = new XMLHttpRequest();
    xhr.open("POST", jira_url + "/rest/api/2/issue/" + issue + "/transitions", false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        _btnGroup.innerHTML="<h5>Saved!</h5>";
      }
      else
      {
        _btnGroup.innerHTML="<h5>Failed :(</h5>";
      }
    };
    xhr.send(JSON.stringify( {transition: action} ));
    
    // Update buttons
    _btnGroup.innerHTML = getTransitions(issue);
  }
  else if ( action == 'add-note' ) {
    addNote(_issue.getElementsByClassName('note-form')[0], issue);
  }
  else { console.log('unknown action'); }
  chrome.extension.getBackgroundPage().updateJira();
}

function loadIssues() {
  if (!localStorage['first_run']){
    localStorage['first_run'] = true;
    window.open(chrome.extension.getURL("options.html"));
    this.window.close()
    return;
  }
  
  document.getElementById("content").innerHTML = localStorage.getItem('html_cache');
  if (document.getElementById('navbar') && document.getElementById('navbar').className.indexOf("navbar-fixed-top") > -1) {
    document.getElementById("content").style.marginTop = document.getElementById('navbar').offsetHeight + "px";
  }

  // Attach event handlers to all buttons
  tags = document.getElementsByTagName('form');
  for (var i = 0; i < tags.length; i++) { tags[i].addEventListener('submit', function(e){return false;}); }
  tags = document.getElementsByClassName('add-note');
  for (var i = 0; i < tags.length; i++) { tags[i].addEventListener('click', btnAction); }
  tags = document.getElementsByClassName('btn');
  for (var i = 0; i < tags.length; i++) { tags[i].addEventListener('click', btnAction); }
  closes = document.getElementsByClassName('close');
  for (var i = 0; i < closes.length; i++) {
    closes[i].addEventListener('click', closeModal);
  }
  document.getElementById('search-form').addEventListener('submit', function(e){window.open(jira_url + "/secure/QuickSearch.jspa?searchString=" + document.getElementById('search-input').value);return false;});

  // Load and display notes
  issues = document.getElementsByClassName('issue-container');
  var issues_length = issues.length ? issues.length : 0;
  for (var i = 0; i < issues_length; i++) {
    issue = issues[i];
    _form = issue.getElementsByClassName('note-form')[0];
    if (( notesStorage = JSON.parse(localStorage.getItem(issue.id + '.notes')) )) {
      for (var j = 0; j < notesStorage.length; j++) {
        addNote(_form, issue.id, notesStorage[j], j);
      }
    }
  }

  document.getElementById("post_comment").addEventListener('click', sendComment);
}
window.onload = loadIssues;

addEventListener("unload", function (event) {
  // Make sure to save all notes, in case user closes popup while focusing on text field
  notes = _form.getElementsByTagName('input');
  issues = {};

  // First iterate through all note objects to save them sequentially in issues object
  for (var i = 0; i < notes.length; i++) {
    note = notes[i].value;
    issue = notes[i].getAttribute('data-issue');
    if ( issues[issue] === undefined ) { issues[issue] = []; }
    if (/\S/.test(note)) {
      issues[issue].push(note);
    }
  }
  // Then iterate through issues object, JSONify, and save
  for (var i in issues) {
    _notes=issues[i];
    localStorage.setItem(i + ".notes", JSON.stringify(_notes));
  }

  chrome.extension.sendMessage("updateJira");

}, true);
