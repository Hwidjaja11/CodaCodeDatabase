// Role Hangman: words are roles from docs/data/people.json.
(function () {
  var root = document.getElementById("hangman");
  if (!root) return;
  var MAX = 6, people = [], used = [];

  function dataUrl() {
    var s = document.getElementsByTagName("script");
    for (var i = 0; i < s.length; i++) if (/javascripts\/hangman\.js/.test(s[i].src)) return new URL("../data/people.json", s[i].src).href;
    return "data/people.json";
  }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

  function pickRole() {
    var map = {};
    people.forEach(function (p) {
      p.roles.forEach(function (r) {
        if (!/[A-Za-z]/.test(r)) return;
        (map[r] = map[r] || {}).depts = (map[r].depts || []).concat(p.departments);
      });
    });
    var roles = Object.keys(map);
    var fresh = roles.filter(function (r) { return used.indexOf(r) < 0; });
    if (!fresh.length) { used = []; fresh = roles; }
    var role = rnd(fresh); used.push(role);
    return { word: role.toUpperCase(), role: role, hint: rnd(map[role].depts) };
  }

  function holders(role) {
    return people.filter(function (p) { return p.roles.indexOf(role) >= 0; }).map(function (p) { return p.name; });
  }

  function gallows(wrong) {
    var parts = [
      '<circle cx="110" cy="52" r="14"/>',
      '<line x1="110" y1="66" x2="110" y2="112"/>',
      '<line x1="110" y1="76" x2="90" y2="98"/>',
      '<line x1="110" y1="76" x2="130" y2="98"/>',
      '<line x1="110" y1="112" x2="94" y2="140"/>',
      '<line x1="110" y1="112" x2="126" y2="140"/>'
    ];
    return '<svg viewBox="0 0 180 170" class="hm-svg" aria-label="' + wrong + ' of ' + MAX + ' wrong guesses">' +
      '<g class="hm-frame"><line x1="20" y1="160" x2="100" y2="160"/><line x1="40" y1="160" x2="40" y2="20"/>' +
      '<line x1="40" y1="20" x2="110" y2="20"/><line x1="110" y1="20" x2="110" y2="38"/></g>' +
      '<g class="hm-man">' + parts.slice(0, wrong).join("") + '</g></svg>';
  }

  function start() {
    var g = pickRole(), guessed = {}, wrong = 0, over = false;

    function masked() {
      return g.word.split("").map(function (c) {
        return /[A-Z]/.test(c) ? (guessed[c] || over ? c : "_") : c;
      });
    }
    function won() { return g.word.split("").every(function (c) { return !/[A-Z]/.test(c) || guessed[c]; }); }

    function guess(c) {
      if (over || guessed[c]) return;
      guessed[c] = true;
      if (g.word.indexOf(c) < 0) wrong++;
      if (won() || wrong >= MAX) over = true;
      draw();
    }

    function draw() {
      root.innerHTML = "";
      var top = el("div", "hm-top");
      var pic = el("div", "hm-pic"); pic.innerHTML = gallows(wrong);
      var side = el("div", "hm-side");
      side.appendChild(el("p", "quiz-meta", "Hint: someone with this role works in the " + g.hint + " Department"));
      var word = el("div", "hm-word");
      masked().forEach(function (c, idx) {
        var s = el("span", "hm-letter" + (/[A-Z]/.test(c) ? "" : " hm-letter--gap") + (over && !guessed[g.word[idx]] && /[A-Z]/.test(c) ? " hm-letter--missed" : ""), c === " " ? " " : c);
        word.appendChild(s);
      });
      side.appendChild(word);
      side.appendChild(el("p", "quiz-meta", "Wrong guesses: " + wrong + " of " + MAX));
      top.appendChild(pic); top.appendChild(side); root.appendChild(top);

      if (over) {
        var win = won();
        var m = el("p", "quiz-msg " + (win ? "quiz-msg--ok" : "quiz-msg--bad"),
          (win ? "You got it! " : "Out of guesses. ") + "The role is " + g.role + (holders(g.role).length ? ", held by " + holders(g.role).join(", ") + "." : "."));
        root.appendChild(m);
        var again = el("button", "quiz-next", "New word"); again.type = "button";
        again.addEventListener("click", start); root.appendChild(again); again.focus();
        return;
      }
      var keys = el("div", "hm-keys");
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(function (c) {
        var b = el("button", "hm-key", c); b.type = "button";
        if (guessed[c]) { b.disabled = true; b.classList.add(g.word.indexOf(c) >= 0 ? "hm-key--hit" : "hm-key--miss"); }
        b.addEventListener("click", function () { guess(c); });
        keys.appendChild(b);
      });
      root.appendChild(keys);
    }
    start.onKey = function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var c = (e.key || "").toUpperCase();
      if (/^[A-Z]$/.test(c) && document.activeElement && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) guess(c);
    };
    draw();
  }

  document.addEventListener("keydown", function (e) { if (start.onKey) start.onKey(e); });
  fetch(dataUrl()).then(function (r) { return r.json(); }).then(function (d) { people = d; start(); })
    .catch(function () { root.textContent = "Could not load the people file."; });
})();
