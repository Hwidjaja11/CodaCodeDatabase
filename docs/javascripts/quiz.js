// Who's Who quiz: 13 kinds of question, all built from the data files.
(function () {
  var root = document.getElementById("quiz");
  if (!root) return;
  var F = window.CodaFun, ROUNDS = 10, D;

  function opts(correct, wrong, n) {
    wrong = F.uniq(wrong.filter(function (x) { return x !== correct; }));
    if (wrong.length < (n || 3)) return null;
    return F.shuffle(F.pick(wrong, n || 3).concat(correct));
  }
  function names(list) { return list.map(function (p) { return p.name; }); }
  function person() { return F.rnd(D.people); }

  var KINDS = {
    role: function () {
      var r = F.rnd(D.allRoles), has = D.people.filter(function (p) { return F.has(p.roles, r); });
      var c = F.rnd(has).name, o = opts(c, names(D.people.filter(function (p) { return !F.has(p.roles, r); })));
      return o && { text: "Who is a " + r + "?", options: o, correct: c };
    },
    dept: function () {
      var d = F.rnd(D.allDepts), has = D.people.filter(function (p) { return F.has(p.departments, d); });
      var c = F.rnd(has).name, o = opts(c, names(D.people.filter(function (p) { return !F.has(p.departments, d); })));
      return o && { text: "Who is in the " + d + " Department?", options: o, correct: c };
    },
    title: function () {
      var p = person(), c = F.rnd(p.roles), o = opts(c, D.allRoles.filter(function (r) { return !F.has(p.roles, r); }));
      return o && { text: "Which of these is one of " + p.name + "'s roles?", options: o, correct: c };
    },
    deptof: function () {
      var p = person(), c = F.rnd(p.departments), o = opts(c, D.allDepts.filter(function (x) { return !F.has(p.departments, x); }), 2);
      return o && { text: "Which department is " + p.name + " in?", options: o, correct: c };
    },
    leader: function () {
      var l = F.rnd(D.leaders);
      var same = D.leaders.filter(function (x) { return x.dept === l.dept && x.title === l.title; }).map(function (x) { return x.person.name; });
      var o = opts(l.person.name, names(D.people).filter(function (n) { return !F.has(same, n); }));
      return o && { text: "Who is a " + l.title + " in the " + l.dept + " Department?", options: o, correct: l.person.name };
    },
    describe: function () {
      var withDesc = D.depts.filter(function (x) { return x.description; });
      if (!withDesc.length) return null;
      var d = F.rnd(withDesc), o = opts(d.name, D.depts.map(function (x) { return x.name; }), 3);
      return o && { text: "Which department is this? “" + d.description + "”", options: o, correct: d.name };
    },
    deptsize: function () {
      var d = F.rnd(D.allDepts), n = D.people.filter(function (p) { return F.has(p.departments, d); }).length;
      var o = opts(String(n), [n + 1, n + 2, n + 3, n - 1, n - 2].filter(function (x) { return x > 0; }).map(String));
      return o && { text: "How many people are in the " + d + " Department?", options: o.sort(function (a, b) { return a - b; }), correct: String(n) };
    },
    rolecount: function () {
      var p = person(), n = p.roles.length;
      var o = opts(String(n), [n + 1, n + 2, n - 1, n + 3, n - 2].filter(function (x) { return x > 0; }).map(String));
      return o && { text: "How many roles does " + p.name + " have?", options: o.sort(function (a, b) { return a - b; }), correct: String(n) };
    },
    rank: function () {
      var ranked = D.people.filter(function (p) { return p.rank != null; });
      if (!ranked.length) return null;
      var p = F.rnd(ranked), o = opts(p.name, names(D.people));
      return o && { text: "Who is ranked #" + p.rank + " in the Directory?", options: o, correct: p.name };
    },
    barcode: function () {
      var withNum = D.people.filter(function (p) { return p.num != null; });
      if (!withNum.length) return null;
      var p = F.rnd(withNum), o = opts(p.name, names(withNum));
      return o && { text: "Barcode numbers start with the person's number. Who has a barcode beginning with " + F.pad2(p.num) + "?", options: o, correct: p.name };
    },
    both: function () {
      var multi = D.people.filter(function (p) { return p.departments.length >= 2; });
      if (!multi.length) return null;
      var p = F.rnd(multi), two = F.pick(p.departments, 2);
      var has = function (x) { return F.has(x.departments, two[0]) && F.has(x.departments, two[1]); };
      var o = opts(p.name, names(D.people.filter(function (x) { return !has(x); })));
      return o && { text: "Who works in both the " + two[0] + " and " + two[1] + " departments?", options: o, correct: p.name };
    },
    notrole: function () {
      var many = D.people.filter(function (x) { return x.roles.length >= 3; });
      if (!many.length) return null;
      var p = F.rnd(many), not = D.allRoles.filter(function (r) { return !F.has(p.roles, r); });
      if (!not.length) return null;
      var c = F.rnd(not);
      return { text: "Which of these is NOT one of " + p.name + "'s roles?", options: F.shuffle(F.pick(p.roles, 3).concat(c)), correct: c };
    },
    isleader: function () {
      var lead = F.uniq(D.leaders.map(function (l) { return l.person.name; }));
      var non = names(D.people).filter(function (n) { return !F.has(lead, n); });
      if (F.rnd([true, false])) { var o = opts(F.rnd(lead), non); return o && { text: "Which of these people is a department leader?", options: o, correct: o.filter(function (n) { return F.has(lead, n); })[0] }; }
      var o2 = opts(F.rnd(non), lead); return o2 && { text: "Which of these people is NOT a department leader?", options: o2, correct: o2.filter(function (n) { return F.has(non, n); })[0] };
    }
  };
  function makeSet() {
    var qs = [], seen = {}, used = {}, keys = Object.keys(KINDS), tries = 0;
    while (qs.length < ROUNDS && tries++ < 400) {
      var min = Math.min.apply(null, keys.map(function (k) { return used[k] || 0; }));
      var pool = keys.filter(function (k) { return (used[k] || 0) <= min + 0.5; });
      var k = F.rnd(pool), q = KINDS[k]();
      if (!q || seen[q.text] || q.options.indexOf(q.correct) < 0) { used[k] = (used[k] || 0) + 0.01; continue; }
      seen[q.text] = 1; used[k] = (used[k] || 0) + 1; qs.push(q);
    }
    return qs;
  }

  function start() {
    var qs = makeSet(), i = 0, score = 0, el = F.el;
    function show() {
      root.innerHTML = "";
      if (i >= qs.length) return finish();
      var q = qs[i];
      root.appendChild(el("div", "quiz-meta", "Question " + (i + 1) + " of " + qs.length + "  ·  Score: " + score));
      var bar = el("div", "quiz-bar"), fill = el("div", "quiz-fill");
      fill.style.width = (i / qs.length * 100) + "%"; bar.appendChild(fill); root.appendChild(bar);
      root.appendChild(el("h2", "quiz-q", q.text));
      var list = el("div", "quiz-options"), msg = el("p", "quiz-msg"), next = el("button", "quiz-next", i + 1 < qs.length ? "Next" : "See results");
      next.type = "button"; next.hidden = true;
      q.options.forEach(function (o) {
        var b = el("button", "quiz-opt", o); b.type = "button";
        b.addEventListener("click", function () {
          var ok = o === q.correct; if (ok) score++;
          Array.prototype.forEach.call(list.children, function (c) { c.disabled = true; if (c.textContent === q.correct) c.classList.add("quiz-opt--right"); });
          if (!ok) b.classList.add("quiz-opt--wrong");
          msg.textContent = ok ? "Correct!" : "Not quite. It's " + q.correct + ".";
          msg.className = "quiz-msg " + (ok ? "quiz-msg--ok" : "quiz-msg--bad");
          next.hidden = false; next.focus();
        });
        list.appendChild(b);
      });
      next.addEventListener("click", function () { i++; show(); });
      root.appendChild(list); root.appendChild(msg); root.appendChild(next);
    }
    function finish() {
      var pct = score / qs.length;
      root.innerHTML = "";
      root.appendChild(el("h2", "quiz-q", "You scored " + score + " out of " + qs.length));
      root.appendChild(el("p", "quiz-msg", pct === 1 ? "Perfect! You know the whole studio." : pct >= 0.7 ? "Great job! You know the team well." : pct >= 0.4 ? "Not bad. Check the Directory and try again." : "Time to meet the team. Try the Directory, then play again!"));
      var again = el("button", "quiz-next", "Play again"); again.type = "button";
      again.addEventListener("click", start); root.appendChild(again);
    }
    show();
  }

  F.load().then(function (d) { D = d; window.CodaQuizTest = { make: makeSet }; start(); })
    .catch(function () { root.textContent = "Could not load the data files."; });
})();
