import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

// ─────────────────────────────────────────────
//  UNIVERSITY OF PERADENIYA — REAL CAMPUS LOCATIONS
// ─────────────────────────────────────────────
const LOCATIONS = [
  {
    id: 'lion',
    title: 'Senate Lion Statue',
    shortName: 'Lion Statue',
    location: 'In front of Senate Building',
    faculty: 'Senate Grounds • University of Peradeniya',
    facultyTag: 'senate',
    description: 'The monumental carved stone lion statue standing prominently before the Senate Building at the University of Peradeniya.',
    category: 'Senate Grounds',
    thumbnail: '/thumbnails/lion_thumb.jpg',
    splats: '1.70M Splats',
    rawSplats: '1,695,684 pts',
    fileSize: '103.5 MB',
    file: import.meta.env.VITE_SPLAT_LION_URL || '/splats/lion.ply',
    cameraUp: [0, -1, 0],
    cameraPos: [0, 0, 4.5],
    cameraLookAt: [0, 0, 0],
  },
  {
    id: 'gyro',
    title: 'Engineering Gyroscope',
    shortName: 'Gyroscope',
    location: 'Faculty of Engineering Entrance',
    faculty: 'Faculty of Engineering • University of Peradeniya',
    facultyTag: 'engineering',
    description: 'The iconic rotational mechanical gyroscope sculpture welcoming visitors at the Faculty of Engineering entrance.',
    category: 'Faculty of Engineering',
    thumbnail: '/thumbnails/gyro_thumb.png',
    splats: '2.85M Splats',
    rawSplats: '2,848,512 pts',
    fileSize: '173.9 MB',
    keywords: 'gyroscope gyro mechanical rotational engineering sculpture landmark peradeniya entrance',
    file: import.meta.env.VITE_SPLAT_GYRO_URL || '/splats/gyro.ply',
    cameraUp: [0, -1, 0],
    cameraPos: [0, 0, 4.5],
    cameraLookAt: [0, 0, 0],
  },
];

// ─────────────────────────────────────────────
//  DOM REFERENCES
// ─────────────────────────────────────────────
const landing           = document.getElementById('landing');
const viewerScreen      = document.getElementById('viewer-screen');
const splatContainer    = document.getElementById('splat-container');
const locationCards     = document.getElementById('locationCards');
const backBtn           = document.getElementById('backBtn');
const switchSceneBtn    = document.getElementById('switchSceneBtn');
const switchBtnText     = document.getElementById('switchBtnText');
const resetCamBtn       = document.getElementById('resetCameraBtn');
const nameHud           = document.getElementById('locationNameHud');
const subHud            = document.getElementById('locationSubHud');
const loadingOverlay    = document.getElementById('loadingOverlay');
const loadingTitle      = document.getElementById('loadingTitle');
const loadingLoc        = document.getElementById('loadingLocation');
const progressBar       = document.getElementById('progressBar');
const progressText      = document.getElementById('progressText');
const heroExploreBtn    = document.getElementById('heroExploreBtn');
const promoBtn          = document.getElementById('promoBtn');

// Search & Filter DOM
const searchInput       = document.getElementById('searchInput');
const searchClearBtn    = document.getElementById('searchClearBtn');
const searchCategoryBtn = document.getElementById('searchCategoryBtn');
const categoryLabel     = document.getElementById('categoryLabel');
const searchSubmitBtn   = document.getElementById('searchSubmitBtn');
const filterChips       = document.querySelectorAll('.filter-chip');
const resultsCount      = document.getElementById('resultsCount');

// ─────────────────────────────────────────────
//  STATE & FAVORITES (LOCALSTORAGE)
// ─────────────────────────────────────────────
let viewer          = null;
let activeScene     = null;
let isTransitioning = false;
let currentFilter   = 'all';
let searchQuery     = '';

const FAVORITES_KEY = 'uop_3d_tour_favorites';

function getFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

function toggleFavorite(id) {
  try {
    const favs = getFavorites();
    favs[id] = !favs[id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return favs[id];
  } catch (e) {
    return false;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─────────────────────────────────────────────
//  FILTERING & SEARCH LOGIC
// ─────────────────────────────────────────────
function getFilteredLocations() {
  return LOCATIONS.filter((loc) => {
    // 1. Category filter
    const matchesCategory =
      currentFilter === 'all' || loc.facultyTag === currentFilter;

    // 2. Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesCategory;

    const searchableText = `${loc.title} ${loc.shortName} ${loc.location} ${loc.faculty} ${loc.category} ${loc.description} ${loc.keywords}`.toLowerCase();
    return matchesCategory && searchableText.includes(q);
  });
}

function updateResultsHeader(shownCount, totalCount) {
  if (!resultsCount) return;

  const q = searchQuery.trim();
  if (q) {
    resultsCount.innerHTML = `Showing <strong>${shownCount}</strong> of <strong>${totalCount}</strong> landmarks matching "<em>${escapeHtml(q)}</em>"`;
  } else if (currentFilter !== 'all') {
    const catName = currentFilter === 'senate' ? 'Senate Grounds' : 'Faculty of Engineering';
    resultsCount.innerHTML = `Showing <strong>${shownCount}</strong> landmarks in <strong>${catName}</strong>`;
  } else {
    resultsCount.innerHTML = `Showing all <strong>${shownCount}</strong> reconstructed landmarks`;
  }
}

// ─────────────────────────────────────────────
//  RENDER DRIBBLE SHOT CARDS
// ─────────────────────────────────────────────
function renderCards() {
  locationCards.innerHTML = '';
  const favorites = getFavorites();
  const filtered = getFilteredLocations();

  updateResultsHeader(filtered.length, LOCATIONS.length);

  // If no items match search/filter
  if (filtered.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'no-results-box';
    emptyBox.innerHTML = `
      <div class="no-results-icon">🔍</div>
      <h3 class="no-results-title">No matching landmarks found</h3>
      <p class="no-results-desc">No landmarks match "${escapeHtml(searchQuery)}". Try searching for "lion", "gyro", or "engineering".</p>
      <button class="reset-search-btn" id="resetSearchBtn" type="button">Clear Search & Filters</button>
    `;
    locationCards.appendChild(emptyBox);

    const resetBtn = document.getElementById('resetSearchBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchQuery = '';
        currentFilter = 'all';
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.classList.add('hidden');
        if (categoryLabel) categoryLabel.textContent = 'All';
        filterChips.forEach((chip) => {
          chip.classList.toggle('active', chip.getAttribute('data-filter') === 'all');
        });
        renderCards();
      });
    }
    return;
  }

  filtered.forEach((loc) => {
    const isLiked = !!favorites[loc.id];
    const card = document.createElement('div');
    card.className = 'dribbble-shot-card';
    card.id = `card-${loc.id}`;

    card.innerHTML = `
      <div class="shot-thumbnail-wrap">
        <img src="${loc.thumbnail}" alt="${loc.title}" class="shot-img" loading="lazy" />
        <div class="shot-badge-3d" title="Interactive 3D Gaussian Splat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16.5l-9 5.25-9-5.25V7.5l9-5.25 9 5.25v9z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <div class="shot-overlay">
          <span class="shot-explore-btn">
            <span>Explore 3D Scene</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </div>
      </div>
      <div class="shot-info-row">
        <div class="shot-author-col">
          <div class="author-avatar">${loc.id === 'lion' ? '🏛️' : '⚙️'}</div>
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="shot-title">${loc.title}</span>
              <span class="pro-badge">3DGS</span>
            </div>
            <div class="shot-location-text">📍 ${loc.location}</div>
          </div>
        </div>
        <div class="shot-stats-col">
          <span class="stat-badge" title="Actual Gaussian Splat Count: ${loc.rawSplats}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3m10-10h-3M5 12H2"/></svg>
            ${loc.splats}
          </span>
          <span class="stat-badge" title="Actual PLY File Size">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${loc.fileSize}
          </span>
          <button class="stat-fav-btn ${isLiked ? 'liked' : ''}" title="${isLiked ? 'Saved in your favorites' : 'Save to favorites'}" data-favid="${loc.id}" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span class="fav-label">${isLiked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    `;

    // Click card opens 3D Viewer
    card.addEventListener('click', (e) => {
      // Don't open viewer if clicking the favorite button
      if (e.target.closest('.stat-fav-btn')) return;
      openViewer(loc);
    });

    // Favorite button click
    const favBtn = card.querySelector('.stat-fav-btn');
    if (favBtn) {
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowLiked = toggleFavorite(loc.id);
        favBtn.classList.toggle('liked', nowLiked);
        favBtn.title = nowLiked ? 'Saved in your favorites' : 'Save to favorites';
        const label = favBtn.querySelector('.fav-label');
        if (label) label.textContent = nowLiked ? 'Saved' : 'Save';
        const svg = favBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', nowLiked ? 'currentColor' : 'none');
      });
    }

    locationCards.appendChild(card);
  });
}

renderCards();

// ─────────────────────────────────────────────
//  SEARCH & FILTER EVENT LISTENERS
// ─────────────────────────────────────────────
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchClearBtn) {
      searchClearBtn.classList.toggle('hidden', searchQuery.length === 0);
    }
    renderCards();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchQuery = '';
      searchInput.value = '';
      if (searchClearBtn) searchClearBtn.classList.add('hidden');
      renderCards();
    }
  });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener('click', () => {
    searchQuery = '';
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    searchClearBtn.classList.add('hidden');
    renderCards();
  });
}

if (searchSubmitBtn) {
  searchSubmitBtn.addEventListener('click', () => {
    renderCards();
  });
}

// Category dropdown button cycling: All -> Senate -> Engineering -> All
const CATEGORY_CYCLE = ['all', 'senate', 'engineering'];
const CATEGORY_NAMES = {
  all: 'All',
  senate: 'Senate',
  engineering: 'Engineering',
};

if (searchCategoryBtn) {
  searchCategoryBtn.addEventListener('click', () => {
    const currentIndex = CATEGORY_CYCLE.indexOf(currentFilter);
    const nextIndex = (currentIndex + 1) % CATEGORY_CYCLE.length;
    currentFilter = CATEGORY_CYCLE[nextIndex];
    if (categoryLabel) {
      categoryLabel.textContent = CATEGORY_NAMES[currentFilter];
    }
    // Sync filter chips
    filterChips.forEach((chip) => {
      chip.classList.toggle('active', chip.getAttribute('data-filter') === currentFilter);
    });
    renderCards();
  });
}

// Filter chips
filterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const filter = chip.getAttribute('data-filter');
    currentFilter = filter;
    if (categoryLabel) {
      categoryLabel.textContent = CATEGORY_NAMES[filter] || 'All';
    }
    filterChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    renderCards();
  });
});

// ─────────────────────────────────────────────
//  PROGRESS HELPERS
// ─────────────────────────────────────────────
function setProgress(pct) {
  const p = Math.min(Math.max(pct, 0), 100);
  progressBar.style.width = p + '%';
  progressText.textContent = Math.round(p) + '%';
}

function showLoading(loc) {
  loadingTitle.textContent = 'Loading 3D Gaussian Splats…';
  loadingLoc.textContent   = `${loc.title} (${loc.category})`;
  setProgress(0);
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  UPDATE VIEWER HUD
// ─────────────────────────────────────────────
function updateHud(loc) {
  nameHud.textContent = loc.title;
  subHud.textContent  = loc.faculty;

  // Find the other scene for fast switcher
  const otherScene = LOCATIONS.find(l => l.id !== loc.id);
  if (otherScene) {
    switchBtnText.textContent = `View ${otherScene.shortName}`;
    switchSceneBtn.title = `Switch to ${otherScene.title}`;
  }
}

// ─────────────────────────────────────────────
//  VIEWER LIFECYCLE
// ─────────────────────────────────────────────
async function openViewer(loc) {
  if (isTransitioning) return;
  isTransitioning = true;

  landing.classList.add('hidden');
  viewerScreen.classList.remove('hidden');
  updateHud(loc);
  showLoading(loc);
  activeScene = loc;

  try {
    // Tear down previous viewer if switching
    if (viewer) {
      viewer.stop();
      splatContainer.innerHTML = '';
      viewer = null;
    }

    // Ensure container has layout before initializing
    const width = window.innerWidth;
    const height = window.innerHeight;

    viewer = new GaussianSplats3D.Viewer({
      rootElement: splatContainer,
      cameraUp:              loc.cameraUp,
      initialCameraPosition: loc.cameraPos,
      initialCameraLookAt:   loc.cameraLookAt,
      showLoadingUI: false,
    });

    if (viewer.renderer) {
      viewer.renderer.setSize(width, height);
    }
    if (viewer.camera) {
      viewer.camera.aspect = width / height;
      viewer.camera.updateProjectionMatrix();
    }

    await viewer.addSplatScene(loc.file, {
      progressiveLoad: false,
      showLoadingUI: false,
      onProgress: (pct) => setProgress(pct * 100),
    });

    // Enable full 360° spherical orbit without clamping
    for (const controls of [viewer.controls, viewer.perspectiveControls, viewer.orthographicControls]) {
      if (controls) {
        controls.minPolarAngle = 0; // Look from directly above
        controls.maxPolarAngle = Math.PI; // Full rotation from underneath
        controls.minAzimuthAngle = -Infinity; // Unlimited 360° continuous horizontal orbit
        controls.maxAzimuthAngle = Infinity;
        controls.rotateSpeed = 1.0; // Responsive orbit speed
        controls.update();
      }
    }

    hideLoading();
    viewer.start();
  } catch (err) {
    console.error('Failed to load 3DGS scene:', err);
    loadingTitle.textContent = 'Unable to Load 3D Scene';
    loadingLoc.textContent   = 'Please ensure the .ply file is in public/splats/';
  }

  isTransitioning = false;
}

function goBackToLanding() {
  if (isTransitioning) return;
  if (viewer) {
    viewer.stop();
    splatContainer.innerHTML = '';
    viewer = null;
    activeScene = null;
    window.viewer = null;
  }
  viewerScreen.classList.add('hidden');
  landing.classList.remove('hidden');
  hideLoading();
}

function switchLocation() {
  if (!activeScene || isTransitioning) return;
  const nextLoc = LOCATIONS.find(l => l.id !== activeScene.id) || LOCATIONS[0];
  openViewer(nextLoc);
}

// ─────────────────────────────────────────────
//  EVENT LISTENERS
// ─────────────────────────────────────────────
backBtn.addEventListener('click', goBackToLanding);
switchSceneBtn.addEventListener('click', switchLocation);

if (heroExploreBtn) {
  heroExploreBtn.addEventListener('click', () => openViewer(LOCATIONS[0]));
}
if (promoBtn) {
  promoBtn.addEventListener('click', () => openViewer(LOCATIONS[0]));
}

resetCamBtn.addEventListener('click', () => {
  if (!viewer || !activeScene) return;
  viewer.camera?.position.set(...activeScene.cameraPos);
  viewer.camera?.lookAt(...activeScene.cameraLookAt);
});