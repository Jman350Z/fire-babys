/* ============================================================
   Fire Babys Rebellion — firebabys.online
   Shared behaviour: mobile nav, scroll reveals, footer year,
   and the hero roster element filter. No dependencies.
   ============================================================ */

(function () {
  "use strict";

  /* Flag JS availability so CSS only hides reveal targets
     when we can actually reveal them again. */
  document.documentElement.classList.add("js");

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------- Mobile nav ---------- */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (header && toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    /* Close the menu as soon as a link is tapped (same-page anchors). */
    var nav = header.querySelector(".site-nav");
    if (nav) {
      nav.addEventListener("click", function (event) {
        if (event.target.closest("a")) {
          header.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "Open menu");
        }
      });
    }
  }

  /* ---------- Scroll reveals ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Roster filter (heroes + mission pages) ---------- */
  var filterBar = document.querySelector("[data-roster-filter]");
  var roster = document.querySelector("[data-roster]");
  if (filterBar && roster) {
    var cards = Array.prototype.slice.call(roster.querySelectorAll("[data-element]"));
    var countEl = document.querySelector("[data-roster-count]");
    var total = cards.length;

    function applyFilter(value) {
      var shown = 0;
      cards.forEach(function (card) {
        var match = value === "all" || card.getAttribute("data-element") === value;
        card.classList.toggle("is-hidden", !match);
        if (match) { shown += 1; }
      });
      if (countEl) {
        countEl.textContent = "Showing " + shown + " of " + total + " heroes";
      }
    }

    filterBar.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-filter]");
      if (!btn) { return; }
      filterBar.querySelectorAll("[data-filter]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      applyFilter(btn.getAttribute("data-filter"));
    });

    applyFilter("all");
  }
})();
