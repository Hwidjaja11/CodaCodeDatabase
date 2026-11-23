// Two Truths and a Lie: 12 kinds of statement, all generated from the data files.
(function () {
  var root = document.getElementById("truths");
  if (!root) return;
  var F = window.CodaFun, el = F.el, ROUNDS = 8, D;
  var plural = function (n, w) { return n + " " + w + (n === 1 ? "" : "s"); };
  function offBy(n) { var v = n + F.rnd([-2, -1, 1, 2]); return v < 1 || v === n ? null : v; }
  function inDept(p, d) { return F.has(p.departments, d); }

  // Each generator: (truth) -> {text, fix} or null. For a lie, `text` is false and `fix` is the true version.
  var GENS = {
    hasRole: function (t) {
      var p = F.rnd(D.people), no = D.allRoles.filter(function (r) { return !F.has(p.roles, r); }), r = t ? F.rnd(p.roles) : F.rnd(no);
      if (!r) return null;
      return { text: p.name + " has the role " + r + ".", fix: p.name + (t ? " has" : " does not have") + " the role " + r + "." };
    },
    inDept: function (t) {
      var p = F.rnd(D.people), no = D.allDepts.filter(function (d) { return !inDept(p, d); }), d = t ? F.rnd(p.departments) : F.rnd(no);
      if (!d) return null;
      return { text: p.name + " is in the " + d + " Department.", fix: p.name + (t ? " is" : " is not") + " in the " + d + " Department." };
    },
    notInDept: function (t) {
      var p = F.rnd(D.people), no = D.allDepts.filter(function (d) { return !inDept(p, d); }), d = t ? F.rnd(no) : F.rnd(p.departments);
      if (!d) return null;
      return { text: p.name + " is not in the " + d + " Department.", fix: p.name + (t ? " is not" : " is") + " in the " + d + " Department." };
    },
    deptCount: function (t) {
      var p = F.rnd(D.people), n = p.departments.length, v = t ? n : offBy(n);
      return v && { text: p.name + " works in " + plural(v, "department") + ".", fix: p.name + " works in " + plural(n, "department") + "." };
    },
    roleCount: function (t) {
      var p = F.rnd(D.people), n = p.roles.length, v = t ? n : offBy(n);
      return v && { text: p.name + " has " + plural(v, "role") + ".", fix: p.name + " has " + plural(n, "role") + "." };
    },
    deptSize: function (t) {
      var d = F.rnd(D.allDepts), n = D.people.filter(function (p) { return inDept(p, d); }).length, v = t ? n : offBy(n);
      return v && { text: "The " + d + " Department has " + plural(v, "member") + ".", fix: "The " + d + " Department has " + plural(n, "member") + "." };
    },
    leaderTitle: function (t) {
      var l = F.rnd(D.leaders);
      var holders = D.leaders.filter(function (x) { return x.dept === l.dept && x.title === l.title; }).map(function (x) { return x.person.name; });
      var other = D.people.filter(function (p) { return !F.has(holders, p.name); });
      var who = t ? l.person : F.rnd(other);
      if (!who) return null;
      return { text: who.name + " is a " + l.title + " in the " + l.dept + " Department.", fix: who.name + (t ? " is" : " is not") + " a " + l.title + " in the " + l.dept + " Department." };
    },
    leads: function (t) {
      var lead = D.leaders.map(function (l) { return l.person.name; });
      var pool = D.people.filter(function (p) { return t ? F.has(lead, p.name) : !F.has(lead, p.name); });
      if (!pool.length) return null;
      var p = F.rnd(pool);
      return { text: p.name + " leads a department.", fix: p.name + (t ? " leads" : " does not lead") + " a department." };
    },
    together: function (t) {
      var d = F.rnd(D.allDepts), inside = D.people.filter(function (p) { return inDept(p, d); }), outside = D.people.filter(function (p) { return !inDept(p, d); });
      if (inside.length < 2 || (!t && !outside.length)) return null;
      var two = F.pick(inside, 2), a = two[0], b = t ? two[1] : F.rnd(outside);
      return { text: a.name + " and " + b.name + " are both in the " + d + " Department.", fix: t ? a.name + " and " + b.name + " are both in the " + d + " Department." : b.name + " is not in the " + d + " Department." };
    },
    bothDepts: function (t) {
      var multi = D.people.filter(function (p) { return p.departments.length >= 2; });
      if (!multi.length) return null;
      var p = F.rnd(multi), two, no = D.allDepts.filter(function (d) { return !inDept(p, d); });
      if (t) two = F.pick(p.departments, 2); else { if (!no.length) return null; two = [F.rnd(p.departments), F.rnd(no)]; }
      return { text: p.name + " works in both " + two[0] + " and " + two[1] + ".", fix: t ? p.name + " works in both " + two[0] + " and " + two[1] + "." : p.name + " is not in the " + two[1] + " Department." };
    },
    rank: function (t) {
      var ranked = D.people.filter(function (p) { return p.rank != null; });
      if (!ranked.length) return null;
      var p = F.rnd(ranked), v = t ? p.rank : offBy(p.rank);
      return v && { text: p.name + " is ranked number " + v + " in the Directory.", fix: p.name + " is ranked number " + p.rank + " in the Directory." };
    },
    barcode: function (t) {
      var withNum = D.people.filter(function (p) { return p.num != null; });
      if (!withNum.length) return null;
      var p = F.rnd(withNum), v = t ? p.num : offBy(p.num);
      return v && { text: p.name + "'s barcode number starts with " + F.pad2(v) + ".", fix: p.name + "'s barcode number starts with " + F.pad2(p.num) + "." };
    },
    totals: function (t) {
      var w = F.rnd(["people", "departments"]);
      var n = w === "people" ? D.people.length : D.depts.length, v = t ? n : offBy(n);
      return v && { text: "The Directory lists " + plural(v, w === "people" ? "person" : "department").replace("persons", "people") + ".", fix: "The Directory lists " + (w === "people" ? n + (n === 1 ? " person" : " people") : plural(n, "department")) + "." };
    }
  };
  var KEYS = Object.keys(GENS);

  function round() {
    var kinds = F.shuffle(KEYS), truth = [true, true, false], items = [], texts = {}, usedKinds = {};
    for (var i = 0; i < 3; i++) {
      var s = null;
      for (var k = 0; k < kinds.length && !s; k++) {
        if (usedKinds[kinds[k]]) continue;
        for (var t = 0; t < 12 && !s; t++) { s = GENS[kinds[k]](truth[i]); if (s && texts[s.text]) s = null; }
        if (s) usedKinds[kinds[k]] = 1;
      }
      if (!s) return null;
      texts[s.text] = 1; s.lie = !truth[i]; items.push(s);
    }
    return F.shuffle(items);
  }

  function start() {
    var rounds = [], safety = 0;
    while (rounds.length < ROUNDS && safety++ < 200) { var r = round(); if (r) rounds.push(r); }
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
          Array.prototype.forEach.call(list.children, function (c, k) { c.disabled = true; c.classList.add(items[k].lie ? "quiz-opt--wrong" : "quiz-opt--right"); });
          var lie = items.filter(function (x) { return x.lie; })[0];
          msg.textContent = (ok ? "You spotted it! " : "Not quite. ") + "The lie was “" + lie.text + "” The truth: " + lie.fix;
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

  F.load().then(function (d) { D = d; window.CodaTruthsTest = { round: round, gens: GENS }; start(); })
    .catch(function () { root.textContent = "Could not load the data files."; });
})();
