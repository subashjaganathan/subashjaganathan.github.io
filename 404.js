// The checklist moved from /personal-cyber-hygiene-checklist/ to /zero-to-secure/; keep old deep links working.
(function () {
  var old = "/personal-cyber-hygiene-checklist/";
  if (location.pathname.indexOf(old) === 0) {
    location.replace("/zero-to-secure/" + location.pathname.slice(old.length) + location.search + location.hash);
  }
})();
