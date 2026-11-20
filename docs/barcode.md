---
title: Barcode Lookup
---
# Barcode Lookup

Type the 16-digit number printed under a CodaCode Studio ID barcode to see the main details for that person and open their page.

<div id="barcode-lookup" class="bc">
<form id="bc-form" class="bc-form" autocomplete="off">
<input id="bc-input" class="bc-input" type="text" inputmode="numeric" placeholder="0000 0000 0000 0000" aria-label="Barcode number">
<button type="submit">Look up</button>
<button id="bc-clear" type="button">Clear</button>
</form>
<p id="bc-msg" class="bc-msg" role="status" aria-live="polite"></p>
<div id="bc-result"></div>
<p class="bc-note">Spaces and dashes are fine. The number holds the person's number, executive level, departments, main roles and check digits.</p>
</div>
