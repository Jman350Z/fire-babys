/* Fire Babys Rebellion — Mission 1 (3D) loader.
   Mounts the Godot Web build (game/index.html) into #game-root on
   rebellion.html when the player hits Play, so the ~40 MB game only
   downloads on demand. External file only — the site's zero-inline
   rule holds. The game build itself is external-file only too
   (game/index.js + game/boot.js + game/index.css). */
(function () {
  "use strict";
  var root = document.getElementById("game-root");
  var btn = document.getElementById("game-play");
  if (!root || !btn) {
    return;
  }
  btn.addEventListener("click", function () {
    var frame = document.createElement("iframe");
    frame.className = "game-screen";
    frame.src = "game/index.html";
    frame.title = "Fire Babys Rebellion — Mission 1: Operation First Ember (playable 3D game)";
    frame.setAttribute("allowfullscreen", "");
    frame.setAttribute("allow", "fullscreen; autoplay");

    var bar = document.createElement("div");
    bar.className = "game-bar";
    var fs = document.createElement("button");
    fs.type = "button";
    fs.className = "btn btn-ghost";
    fs.textContent = "Fullscreen";
    fs.addEventListener("click", function () {
      if (frame.requestFullscreen) {
        frame.requestFullscreen();
      }
    });
    bar.appendChild(fs);

    root.textContent = "";
    root.classList.add("game-live");
    root.appendChild(frame);
    root.appendChild(bar);
    root.scrollIntoView({ block: "center", behavior: "smooth" });
  });
})();
