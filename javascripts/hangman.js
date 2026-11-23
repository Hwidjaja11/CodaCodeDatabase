// Hangman: guess a role, a department, or a teammate's name. Built from the data files.
(function () {
  var root = document.getElementById("hangman");
  if (!root) return;
  var F = window.CodaFun, el = F.el, MAX = 6, D, category = "mixed", used = {};
  var CATS = [["mixed", "Mixed"], ["roles", "Roles"], ["departments", "Departments"], ["people", "People"]];
  var stats = { wins: 0, losses: 0, streak: 0, best: 0 };

  try { var sv = JSON.parse(localStorage.getItem("coda_hangman") || "null"); if (sv) stats = sv; } catch (e) {}
  function saveStats() { try { localStorage.setItem("coda_hangman", JSON.stringify(stats)); } catch (e) {} }

  function holders(role) { return D.people.filter(function (p) { return F.has(p.roles, role); }).map(function (p) { return p.name; }); }

  var BUILD = {
    roles: function () {
      var roles = D.allRoles.filter(function (r) { return /[A-Za-z]/.test(r); });
      var role = F.rnd(roles), who = holders(role);
      var depts = F.uniq(F.flat(D.people.filter(function (p) { return F.has(p.roles, role); }).map(function (p) { return p.departments; })));
      return { key: "r:" + role, word: role, kind: "role", hint: "A role held by someone in the " + F.rnd(depts) + " Department",
               reveal: "The role is " + role + (who.length ? ", held by " + who.join(", ") + "." : ".") };
    },
    departments: function () {
      var d = F.rnd(D.allDepts), info = D.depts.filter(function (x) { return x.name === d; })[0];
      var n = D.people.filter(function (p) { return F.has(p.departments, d); }).length;
      return { key: "d:" + d, word: d, kind: "department",
               hint: info && info.description ? info.description : "A CodaCode department with " + n + " member" + (n === 1 ? "" : "s"),
               reveal: "The department is " + d + " (" + n + " member" + (n === 1 ? "" : "s") + ")." };
    },
    people: function () {
      var p = F.rnd(D.people), nm = F.short(p.name);
      return { key: "p:" + nm, word: nm, kind: "person",
               hint: "A teammate in the " + F.rnd(p.departments) + " Department with the role " + F.rnd(p.roles),
               reveal: "The teammate is " + p.name + "." };
    }
  };

  function newGame() {
    var cat = category, g, tries = 0;
    do {
      cat = category === "mixed" ? F.rnd(["roles", "departments", "people"]) : category;
      g = BUILD[cat]();
    } while (used[g.key] && ++tries < 25);
    used[g.key] = 1;
    if (Object.keys(used).length > 12) used = {};
    g.word = g.word.toUpperCase();
    return g;
  }

  function gallows(wrong) {
    var parts = ['<circle cx="110" cy="52" r="14"/>', '<line x1="110" y1="66" x2="110" y2="112"/>', '<line x1="110" y1="76" x2="90" y2="98"/>',
      '<line x1="110" y1="76" x2="130" y2="98"/>', '<line x1="110" y1="112" x2="94" y2="140"/>', '<line x1="110" y1="112" x2="126" y2="140"/>'];
    return '<svg viewBox="0 0 180 170" class="hm-svg" aria-label="' + wrong + ' of ' + MAX + ' wrong guesses">' +
      '<g class="hm-frame"><line x1="20" y1="160" x2="100" y2="160"/><line x1="40" y1="160" x2="40" y2="20"/><line x1="40" y1="20" x2="110" y2="20"/><line x1="110" y1="20" x2="110" y2="38"/></g>' +
      '<g class="hm-man">' + parts.slice(0, wrong).join("") + '</g></svg>';
  }

  function start() {
    var g = newGame(), guessed = {}, wrong = 0, over = false;
    function isL(c) { return /[A-Z]/.test(c); }
    function won() { return g.word.split("").every(function (c) { return !isL(c) || guessed[c]; }); }
    function guess(c) {
      if (over || guessed[c]) return;
      guessed[c] = true;
      if (g.word.indexOf(c) < 0) wrong++;
      if (won() || wrong >= MAX) {
        over = true;
        if (won()) { stats.wins++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
        else { stats.losses++; stats.streak = 0; }
        saveStats();
      }
      draw();
    }

    function draw() {
      root.innerHTML = "";
      var tabs = el("div", "hm-cats");
      CATS.forEach(function (c) {
        var b = el("button", "hm-cat" + (c[0] === category ? " hm-cat--on" : ""), c[1]); b.type = "button";
        b.addEventListener("click", function () { if (c[0] !== category) { category = c[0]; start(); } });
        tabs.appendChild(b);
      });
      root.appendChild(tabs);

      var top = el("div", "hm-top"), pic = el("div", "hm-pic"); pic.innerHTML = gallows(wrong);
      var side = el("div", "hm-side");
      side.appendChild(el("p", "quiz-meta", "Guess the " + g.kind + ". Hint: " + g.hint));
      var word = el("div", "hm-word");
      g.word.split("").forEach(function (c) {
        var miss = over && isL(c) && !guessed[c];
        word.appendChild(el("span", "hm-letter" + (isL(c) ? "" : " hm-letter--gap") + (miss ? " hm-letter--missed" : ""),
          isL(c) ? (guessed[c] || over ? c : "_") : (c === " " ? " " : c)));
      });
      side.appendChild(word);
      side.appendChild(el("p", "quiz-meta", "Wrong guesses: " + wrong + " of " + MAX + "  ·  Wins: " + stats.wins + "  ·  Streak: " + stats.streak + " (best " + stats.best + ")"));
      top.appendChild(pic); top.appendChild(side); root.appendChild(top);

      if (over) {
        var win = won();
        root.appendChild(el("p", "quiz-msg " + (win ? "quiz-msg--ok" : "quiz-msg--bad"), (win ? "You got it! " : "Out of guesses. ") + g.reveal));
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
      if (/^[A-Z]$/.test(c) && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) guess(c);
    };
    draw();
  }

  document.addEventListener("keydown", function (e) { if (start.onKey) start.onKey(e); });
  F.load().then(function (d) { D = d; start(); }).catch(function () { root.textContent = "Could not load the data files."; });
})();
