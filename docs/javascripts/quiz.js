// Who's Who quiz: builds questions from docs/data/people.json.
(function () {
  var root = document.getElementById("quiz");
  if (!root) return;
  var ROUNDS = 10;
  var people = [];

  function dataUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (/javascripts\/quiz\.js/.test(scripts[i].src)) return new URL("../data/people.json", scripts[i].src).href;
    }
    return "data/people.json";
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(a, n) { return shuffle(a).slice(0, n); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  function makeQuestion() {
    var kinds = shuffle(["role", "dept", "title", "deptof"]);
    var allRoles = uniq([].concat.apply([], people.map(function (p) { return p.roles; })));
    var allDepts = uniq([].concat.apply([], people.map(function (p) { return p.departments; })));
    for (var k = 0; k < kinds.length; k++) {
      var kind = kinds[k], p, others, correct, options, text;
      if (kind === "role") {
        var role = pick(allRoles, 1)[0];
        var has = people.filter(function (x) { return x.roles.indexOf(role) >= 0; });
        others = people.filter(function (x) { return x.roles.indexOf(role) < 0; });
        if (!has.length || others.length < 3) continue;
        correct = pick(has, 1)[0].name;
        options = pick(others, 3).map(function (x) { return x.name; });
        text = "Who is a " + role + "?";
      } else if (kind === "dept") {
        var d = pick(allDepts, 1)[0];
        var inD = people.filter(function (x) { return x.departments.indexOf(d) >= 0; });
        others = people.filter(function (x) { return x.departments.indexOf(d) < 0; });
        if (!inD.length || others.length < 3) continue;
        correct = pick(inD, 1)[0].name;
        options = pick(others, 3).map(function (x) { return x.name; });
        text = "Who is in the " + d + " Department?";
      } else if (kind === "title") {
        p = pick(people, 1)[0];
        var notRoles = allRoles.filter(function (r) { return p.roles.indexOf(r) < 0; });
        if (!p.roles.length || notRoles.length < 3) continue;
        correct = pick(p.roles, 1)[0];
        options = pick(notRoles, 3);
        text = "Which of these is one of " + p.name + "'s roles?";
      } else {
        p = pick(people, 1)[0];
        var notD = allDepts.filter(function (x) { return p.departments.indexOf(x) < 0; });
        if (!p.departments.length || notD.length < 2) continue;
        correct = pick(p.departments, 1)[0];
        options = pick(notD, 3);
        text = "Which department is " + p.name + " in?";
      }
      return { text: text, correct: correct, options: shuffle(options.concat(correct)) };
    }
    return null;
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function start() {
    var qs = [], seen = {}, tries = 0;
    while (qs.length < ROUNDS && tries++ < 200) {
      var q = makeQuestion();
      if (!q || seen[q.text]) continue;
      seen[q.text] = 1; qs.push(q);
    }
    var i = 0, score = 0;

    function show() {
      root.innerHTML = "";
      if (i >= qs.length) return finish();
      var q = qs[i];
      root.appendChild(el("div", "quiz-meta", "Question " + (i + 1) + " of " + qs.length + "  ·  Score: " + score));
      var bar = el("div", "quiz-bar"); var fill = el("div", "quiz-fill");
      fill.style.width = (i / qs.length * 100) + "%"; bar.appendChild(fill); root.appendChild(bar);
      root.appendChild(el("h2", "quiz-q", q.text));
      var list = el("div", "quiz-options"), msg = el("p", "quiz-msg"), next = el("button", "quiz-next", i + 1 < qs.length ? "Next" : "See results");
      next.type = "button"; next.hidden = true;
      q.options.forEach(function (o) {
        var b = el("button", "quiz-opt", o); b.type = "button";
        b.addEventListener("click", function () {
          var ok = o === q.correct;
          if (ok) score++;
          Array.prototype.forEach.call(list.children, function (c) {
            c.disabled = true;
            if (c.textContent === q.correct) c.classList.add("quiz-opt--right");
          });
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
      var line = pct === 1 ? "Perfect! You know the whole studio." : pct >= 0.7 ? "Great job! You know the team well." : pct >= 0.4 ? "Not bad. Check the Directory and try again." : "Time to meet the team. Try the Directory, then play again!";
      root.innerHTML = "";
      root.appendChild(el("h2", "quiz-q", "You scored " + score + " out of " + qs.length));
      root.appendChild(el("p", "quiz-msg", line));
      var again = el("button", "quiz-next", "Play again"); again.type = "button";
      again.addEventListener("click", start);
      root.appendChild(again);
    }
    show();
  }

  fetch(dataUrl()).then(function (r) { return r.json(); }).then(function (d) {
    people = d; start();
  }).catch(function () { root.textContent = "Could not load the people file."; });
})();
