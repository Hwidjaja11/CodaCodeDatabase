// Two Truths and a Lie: statements are generated from docs/data/people.json.
(function () {
  var root = document.getElementById("truths");
  if (!root) return;
  var ROUNDS = 8, people = [];

  function dataUrl() {
    var s = document.getElementsByTagName("script");
    for (var i = 0; i < s.length; i++) if (/javascripts\/truths\.js/.test(s[i].src)) return new URL("../data/people.json", s[i].src).href;
    return "data/people.json";
  }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function flat(a) { return [].concat.apply([], a); }

  function facts() {
    var roles = uniq(flat(people.map(function (p) { return p.roles; })));
    var depts = uniq(flat(people.map(function (p) { return p.departments; })));
    return { roles: roles, depts: depts };
  }

  // Each generator returns {text, fix} for a true or false statement, or null if impossible.
  var gens = [
    function (truth, f) { // person has role
      var p = rnd(people), r;
      if (truth) { r = rnd(p.roles); return { text: p.name + " has the role " + r + ".", fix: p.name + " has the role " + r + "." }; }
      var no = f.roles.filter(function (x) { return p.roles.indexOf(x) < 0; });
      if (!no.length) return null; r = rnd(no);
      return { text: p.name + " has the role " + r + ".", fix: p.name + " does not have the role " + r + "." };
    },
    function (truth, f) { // person in department
      var p = rnd(people), d;
      if (truth) { d = rnd(p.departments); return { text: p.name + " is in the " + d + " Department.", fix: p.name + " is in the " + d + " Department." }; }
      var no = f.depts.filter(function (x) { return p.departments.indexOf(x) < 0; });
      if (!no.length) return null; d = rnd(no);
      return { text: p.name + " is in the " + d + " Department.", fix: p.name + " is not in the " + d + " Department." };
    },
    function (truth) { // number of departments for a person
      var p = rnd(people), n = p.departments.length, shown = truth ? n : n + rnd([-1, 1, 2]);
      if (shown < 1 || (!truth && shown === n)) return null;
      return { text: p.name + " works in " + shown + " department" + (shown === 1 ? "" : "s") + ".", fix: p.name + " works in " + n + " department" + (n === 1 ? "" : "s") + "." };
    },
    function (truth, f) { // department size
      var d = rnd(f.depts), n = people.filter(function (p) { return p.departments.indexOf(d) >= 0; }).length;
      var shown = truth ? n : n + rnd([-1, 1, 2]);
      if (shown < 1 || (!truth && shown === n)) return null;
      return { text: "The " + d + " Department has " + shown + " member" + (shown === 1 ? "" : "s") + ".", fix: "The " + d + " Department has " + n + " member" + (n === 1 ? "" : "s") + "." };
    },
    function (truth) { // number of roles for a person
      var p = rnd(people), n = p.roles.length, shown = truth ? n : n + rnd([-1, 1, 2]);
      if (shown < 1 || (!truth && shown === n)) return null;
      return { text: p.name + " has " + shown + " role" + (shown === 1 ? "" : "s") + ".", fix: p.name + " has " + n + " role" + (n === 1 ? "" : "s") + "." };
    }
  ];

  function statement(truth, f) {
    for (var t = 0; t < 40; t++) { var s = rnd(gens)(truth, f); if (s) return s; }
    return null;
  }

  function round() {
    var f = facts(), items = [], texts = {};
    var kinds = [true, true, false];
    for (var i = 0; i < kinds.length; i++) {
      var s = null;
      for (var t = 0; t < 40; t++) { s = statement(kinds[i], f); if (s && !texts[s.text]) break; s = null; }
      if (!s) return null;
      texts[s.text] = 1; s.lie = !kinds[i]; items.push(s);
    }
    return shuffle(items);
  }

  function start() {
    var rounds = [];
    while (rounds.length < ROUNDS) { var r = round(); if (r) rounds.push(r); }
    var i = 0, score = 0;

    function show() {
      root.innerHTML = "";
      if (i >= rounds.length) return finish();
      var items = rounds[i];
      root.appendChild(el("div", "quiz-meta", "Round " + (i + 1) + " of " + rounds.length + "  ·  Score: " + score));
      var bar = el("div", "quiz-bar"), fill = el("div", "quiz-fill");
      fill.style.width = (i / rounds.length * 100) + "%"; bar.appendChild(fill); root.appendChild(bar);
      root.appendChild(el("h2", "quiz-q", "Which one is the lie?"));
      var list = el("div", "quiz-options"), msg = el("p", "quiz-msg"), next = el("button", "quiz-next", i + 1 < rounds.length ? "Next round" : "See results");
      next.type = "button"; next.hidden = true;
      items.forEach(function (it) {
        var b = el("button", "quiz-opt", it.text); b.type = "button";
        b.addEventListener("click", function () {
          var ok = it.lie; if (ok) score++;
          Array.prototype.forEach.call(list.children, function (c, k) {
            c.disabled = true;
            c.classList.add(items[k].lie ? "quiz-opt--wrong" : "quiz-opt--right");
          });
          var lie = items.filter(function (x) { return x.lie; })[0];
          msg.textContent = (ok ? "You spotted it! " : "Not quite. ") + "The lie was \"" + lie.text + "\" The truth: " + lie.fix;
          msg.className = "quiz-msg " + (ok ? "quiz-msg--ok" : "quiz-msg--bad");
          next.hidden = false; next.focus();
        });
        list.appendChild(b);
      });
      next.addEventListener("click", function () { i++; show(); });
      root.appendChild(list); root.appendChild(msg); root.appendChild(next);
    }
    function finish() {
      var pct = score / rounds.length;
      root.innerHTML = "";
      root.appendChild(el("h2", "quiz-q", "You caught " + score + " of " + rounds.length + " lies"));
      root.appendChild(el("p", "quiz-msg", pct === 1 ? "Flawless. Nobody can fool you." : pct >= 0.6 ? "Sharp eyes! You know CodaCode well." : "Tricky! Try the Directory, then play again."));
      var again = el("button", "quiz-next", "Play again"); again.type = "button";
      again.addEventListener("click", start); root.appendChild(again);
    }
    show();
  }

  fetch(dataUrl()).then(function (r) { return r.json(); }).then(function (d) { people = d; start(); })
    .catch(function () { root.textContent = "Could not load the people file."; });
})();
