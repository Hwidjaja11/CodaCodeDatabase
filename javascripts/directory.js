/* Smart Directory Table: reads docs/data/people.json (the one place to edit people). */
(function () {
  var root = document.getElementById("directory");
  if (!root) return;

  var body = document.getElementById("dir-body");
  var search = document.getElementById("dir-search");
  var deptSel = document.getElementById("dir-dept");
  var count = document.getElementById("dir-count");
  var empty = document.getElementById("dir-empty");
  var heads = root.querySelectorAll("th[data-key]");
  var people = [];
  var sort = { key: "rank", dir: 1 };

  function dataUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (/javascripts\/directory\.js/.test(scripts[i].src)) {
        return new URL("../data/people.json", scripts[i].src).href;
      }
    }
    return "data/people.json";
  }

  function text(p) {
    return [p.rank == null ? "" : "rank " + p.rank, p.name, p.roles.join(" "), p.departments.join(" "), p.all ? "all" : ""]
      .join(" ").toLowerCase();
  }

  function sortValue(p, key) {
    if (key === "rank") return p.rank == null ? Infinity : p.rank;
    if (key === "name") return p.name.toLowerCase();
    if (key === "roles") return p.roles.join(", ").toLowerCase();
    return p.departments.join(", ").toLowerCase();
  }

  function visible() {
    var words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var dept = deptSel.value;
    var rows = people.filter(function (p) {
      if (dept && p.departments.indexOf(dept) === -1) return false;
      var t = text(p);
      return words.every(function (w) { return t.indexOf(w) !== -1; });
    });
    rows.sort(function (a, b) {
      var x = sortValue(a, sort.key), y = sortValue(b, sort.key);
      if (x < y) return -sort.dir;
      if (x > y) return sort.dir;
      return a.order - b.order;
    });
    return rows;
  }

  function cell(tag, content, cls) {
    var td = document.createElement(tag || "td");
    if (cls) td.className = cls;
    if (content != null) td.textContent = content;
    return td;
  }

  function render() {
    var rows = visible();
    body.textContent = "";
    rows.forEach(function (p) {
      var tr = document.createElement("tr");
      tr.appendChild(cell("td", p.rank == null ? "" : p.rank, "dir-rank"));
      tr.appendChild(cell("td", p.name, "dir-name"));
      tr.appendChild(cell("td", p.roles.join(", ")));
      var td = cell("td");
      if (p.all) {
        var all = document.createElement("span");
        all.className = "dir-chip dir-chip--all";
        all.textContent = "All";
        td.appendChild(all);
      }
      p.departments.forEach(function (d) {
        var chip = document.createElement("span");
        chip.className = "dir-chip dir-chip--" + d.toLowerCase();
        chip.textContent = d;
        td.appendChild(chip);
      });
      tr.appendChild(td);
      body.appendChild(tr);
    });
    count.textContent = "Showing " + rows.length + " of " + people.length + " people";
    empty.hidden = rows.length !== 0;
    heads.forEach(function (th) {
      th.setAttribute("aria-sort", th.dataset.key === sort.key ? (sort.dir === 1 ? "ascending" : "descending") : "none");
    });
  }

  function csvEscape(v) {
    v = String(v == null ? "" : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function downloadCsv() {
    var lines = [["Rank", "Name", "Main Role(s)", "Department(s)"].join(",")];
    visible().forEach(function (p) {
      lines.push([p.rank == null ? "" : p.rank, p.name, p.roles.join("; "),
        (p.all ? ["All"] : []).concat(p.departments).join("; ")].map(csvEscape).join(","));
    });
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "codacode-directory.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  heads.forEach(function (th) {
    th.querySelector("button").addEventListener("click", function () {
      var key = th.dataset.key;
      sort = { key: key, dir: sort.key === key ? -sort.dir : 1 };
      render();
    });
  });
  search.addEventListener("input", render);
  deptSel.addEventListener("change", render);
  document.getElementById("dir-clear").addEventListener("click", function () {
    search.value = "";
    deptSel.value = "";
    sort = { key: "rank", dir: 1 };
    render();
  });
  document.getElementById("dir-csv").addEventListener("click", downloadCsv);

  fetch(dataUrl()).then(function (r) { return r.json(); }).then(function (data) {
    people = data.map(function (p, i) { p.order = i; return p; });
    var depts = {};
    people.forEach(function (p) { p.departments.forEach(function (d) { depts[d] = true; }); });
    Object.keys(depts).sort().forEach(function (d) {
      var o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      deptSel.appendChild(o);
    });
    render();
  }).catch(function () {
    count.textContent = "Could not load the directory data.";
  });
})();
