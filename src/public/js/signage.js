(function () {
  var videoEl    = document.getElementById('sg-video');
  var noVideoEl  = document.getElementById('sg-no-video');
  var npBar      = document.getElementById('sg-np-bar');
  var timeEl     = document.getElementById('sg-time');
  var dateEl     = document.getElementById('sg-date');
  var songEl     = document.getElementById('sg-song');
  var artistEl   = document.getElementById('sg-artist');
  var albumEl    = document.getElementById('sg-album');
  var trackEl    = document.getElementById('sg-carousel-track');
  var emptyEl    = document.getElementById('sg-carousel-empty');

  var videos = [];
  var images = [];
  var vidIdx = 0;

  /* ── Reloj ─────────────────────────────────────────────────── */
  function updateClock() {
    var now = new Date();
    timeEl.textContent = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    dateEl.textContent = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  setInterval(updateClock, 1000);
  updateClock();

  /* ── Carga de media ────────────────────────────────────────── */
  function loadMedia() {
    return fetch('/api/signage/carousel')
      .then(function (r) { return r.json(); })
      .then(function (items) {
        videos = items.filter(function (i) { return i.type === 'video'; }).map(function (i) { return i.url; });
        images = items.filter(function (i) { return i.type === 'image'; }).map(function (i) { return i.url; });
        buildCarousel();
        if (videos.length > 0 && videoEl.paused) playNext();
      })
      .catch(function () {});
  }

  /* ── Reproductor de videos (área principal) ─────────────────── */
  function playNext() {
    if (videos.length === 0) {
      videoEl.classList.remove('visible');
      noVideoEl.classList.remove('hidden');
      return;
    }
    noVideoEl.classList.add('hidden');
    videoEl.classList.add('visible');

    videoEl.src = videos[vidIdx % videos.length];
    vidIdx++;
    videoEl.muted = true;
    videoEl.play().catch(function () {});
  }

  videoEl.addEventListener('ended', playNext);
  videoEl.addEventListener('error', function () {
    setTimeout(playNext, 1000);
  });

  /* ── Carrusel de imágenes (ticker horizontal) ──────────────── */
  function buildCarousel() {
    trackEl.innerHTML = '';

    if (images.length === 0) {
      emptyEl.style.display = '';
      trackEl.style.animation = 'none';
      return;
    }
    emptyEl.style.display = 'none';

    // Duplicar imágenes para loop continuo
    var all = images.concat(images);
    all.forEach(function (url) {
      var img = document.createElement('img');
      img.src = url;
      img.alt = '';
      trackEl.appendChild(img);
    });

    // Calcular el ancho del primer grupo para el desplazamiento
    // Esperamos a que las imágenes carguen para medir el ancho real
    var loaded = 0;
    var imgs = trackEl.querySelectorAll('img');
    var firstHalf = Array.prototype.slice.call(imgs, 0, images.length);

    function tryStart() {
      loaded++;
      if (loaded < firstHalf.length) return;
      var totalW = 0;
      firstHalf.forEach(function (img) {
        totalW += img.offsetWidth + 10; // 10px gap
      });
      var duration = Math.max(images.length * 5, 15); // min 15s
      trackEl.style.setProperty('--ticker-shift', '-' + totalW + 'px');
      trackEl.style.animationDuration = duration + 's';
    }

    firstHalf.forEach(function (img) {
      if (img.complete) {
        tryStart();
      } else {
        img.addEventListener('load', tryStart);
        img.addEventListener('error', tryStart);
      }
    });
  }

  /* ── Spotify ───────────────────────────────────────────────── */
  function updateSpotify() {
    fetch('/api/signage/nowplaying')
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (s.active && s.song) {
          songEl.textContent   = s.song;
          artistEl.textContent = s.artist;
          if (s.albumArt) { albumEl.src = s.albumArt; albumEl.style.display = ''; }
          else            { albumEl.style.display = 'none'; }
          npBar.classList.add('visible');
        } else {
          npBar.classList.remove('visible');
        }
      })
      .catch(function () { npBar.classList.remove('visible'); });
  }

  /* ── Arranque ──────────────────────────────────────────────── */
  loadMedia();
  updateSpotify();
  setInterval(updateSpotify, 60000);
  setInterval(loadMedia, 5 * 60 * 1000);
})();
