---
title: Directory
---
# CodaCode Directory

Everyone at CodaCode Game Dev Studios in one table. Type to search, pick a department, click a column heading to sort, or download the results as a spreadsheet.

<div id="directory" class="dir">
<div class="dir-controls">
<input id="dir-search" type="search" placeholder="Search name, role, or department..." aria-label="Search the directory">
<select id="dir-dept" aria-label="Filter by department"><option value="">All departments</option></select>
<button id="dir-clear" type="button">Clear</button>
<button id="dir-csv" type="button">Download CSV</button>
</div>
<p id="dir-count" class="dir-count" aria-live="polite"></p>
<div class="dir-scroll">
<table class="dir-table">
<thead>
<tr>
<th data-key="rank" scope="col" aria-sort="none"><button type="button">Rank</button></th>
<th data-key="name" scope="col" aria-sort="none"><button type="button">Name</button></th>
<th data-key="roles" scope="col" aria-sort="none"><button type="button">Main Role(s)</button></th>
<th data-key="departments" scope="col" aria-sort="none"><button type="button">Department(s)</button></th>
</tr>
</thead>
<tbody id="dir-body"></tbody>
</table>
</div>
<p id="dir-empty" class="dir-empty" hidden>No one matches that. Try clearing the filters.</p>
<p class="dir-note">Rank: blank means no rank (ranks are for executives only). People marked "All" work across every department; the departments listed are their main ones.</p>
</div>
