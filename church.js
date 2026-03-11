// ==========================================
// CONFIG — Set this to your deployed backend
// ==========================================
const API_BASE = 'https://mfm-backend.onrender.com/api';

// ==========================================
// SERVER WAKE-UP UTILITY
// ==========================================

// Pings the server every 13 minutes to prevent Render free tier sleep
function keepServerAwake() {
    setInterval(async () => {
        try {
            await fetch(`${API_BASE.replace('/api', '')}/wake`);
        } catch (e) { /* silent */ }
    }, 13 * 60 * 1000);
}

// Wakes the server and waits until it responds (max 90 seconds)
async function wakeServer() {
    const MAX_WAIT = 90000;
    const INTERVAL = 3000;
    const start = Date.now();

    while (Date.now() - start < MAX_WAIT) {
        try {
            const res = await fetch(`${API_BASE.replace('/api', '')}/health`);
            if (res.ok) return true;
        } catch (e) { /* still sleeping */ }
        await new Promise(r => setTimeout(r, INTERVAL));
    }
    return false;
}

// ==========================================
// STATE MANAGEMENT
// ==========================================

const APP_STATE = {
    sermons: [],
    events: [],
    booklets: [],
    activities: [],
    isAdmin: false,
    currentPage: 'home',
    editingItem: null,
    carouselIndex: 0,
    carouselInterval: null
};

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Hide admin buttons immediately before any async calls
    setAdminUI(false);
    setupEventListeners();
    setupNavigation();
    setupCarousel();

    // Wake the backend before making any API calls
    await wakeServer();

    await checkAdminStatus();
    await loadAllContent();
    updateStats();

    // Keep server alive while user is on the page
    keepServerAwake();

    const initialPage = window.location.hash.substring(1) || 'home';
    navigateToPage(initialPage);
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

// Token stored in localStorage — persists across page reloads
// are blocked by browsers (SameSite policy), so we use Bearer token instead.

function getToken() {
    return localStorage.getItem('adminToken');
}

function setAdminUI(isAdmin) {
    APP_STATE.isAdmin = isAdmin;
    document.body.classList.toggle('admin-logged-in', isAdmin);

    // Explicitly control admin button visibility
    const adminEls = ['admin-upload-btn', 'admin-upload-btn-mobile', 'admin-logout-btn', 'admin-logout-btn-mobile'];
    adminEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isAdmin ? '' : 'none';
    });

    // Show/hide login link
    const loginLink = document.getElementById('admin-login-link');
    if (loginLink) loginLink.style.display = isAdmin ? 'none' : '';

    // Re-render cards to show/hide edit+delete buttons
    renderAllContent();
}

async function checkAdminStatus() {
    const token = getToken();
    if (!token) { setAdminUI(false); return; }

    try {
        const res = await fetch(`${API_BASE}/auth/verify`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
            setAdminUI(true);
        } else {
            localStorage.removeItem('adminToken');
            setAdminUI(false);
        }
    } catch (e) {
        setAdminUI(false);
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();

    const passwordInput = document.getElementById('admin-password');
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.querySelector('#admin-modal button[type="submit"]')
                   || document.querySelector('#admin-login-form button');
    const password = passwordInput.value;
    const email = 'admin@mfmifesowapo.org';

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Logging in...'; }
    if (errorEl) errorEl.classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        console.log('[Auth] Login response status:', res.status);
        const data = await res.json();
        console.log('[Auth] Login response data:', JSON.stringify(data));

        if (res.ok && data.success) {
            if (!data.token) {
                console.error('[Auth] Login succeeded but no token in response!', data);
                if (errorEl) { errorEl.textContent = 'Server error: no token returned.'; errorEl.classList.remove('hidden'); }
                return;
            }
            localStorage.setItem('adminToken', data.token);
            console.log('[Auth] Token stored. Verify storage:', !!localStorage.getItem('adminToken'));
            setAdminUI(true);
            closeModal('admin-modal');
            showToast('Logged in successfully!');
            document.getElementById('admin-login-form').reset();
            if (errorEl) errorEl.classList.add('hidden');
        } else {
            if (errorEl) {
                errorEl.textContent = data.message || 'Incorrect password.';
                errorEl.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error('[Auth] Login fetch error:', err);
        if (errorEl) {
            errorEl.textContent = 'Unable to connect. Server may be starting up — try again in 10 seconds.';
            errorEl.classList.remove('hidden');
        }
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Login'; }
    }
}

async function handleAdminLogout() {
    localStorage.removeItem('adminToken');
    setAdminUI(false);
    showToast('Logged out successfully');
}

// ==========================================
// NAVIGATION
// ==========================================

function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });

    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    window.addEventListener('hashchange', () => {
        const page = window.location.hash.substring(1) || 'home';
        navigateToPage(page, false);
    });

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const header = document.getElementById('site-header');
        const currentScroll = window.pageYOffset;
        if (currentScroll > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    });
}

function navigateToPage(pageId, updateHash = true) {
    if (updateHash) {
        window.location.hash = pageId;
    }

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        APP_STATE.currentPage = pageId;
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// HERO CAROUSEL
// ==========================================

function setupCarousel() {
    const track = document.getElementById('carousel-track');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const indicatorsContainer = document.getElementById('carousel-indicators');

    if (!track) return;

    const slides = track.querySelectorAll('.carousel-slide');
    const totalSlides = slides.length;

    if (totalSlides === 0) return;

    if (indicatorsContainer) {
        slides.forEach((_, index) => {
            const indicator = document.createElement('button');
            indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
            indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
            indicator.addEventListener('click', () => goToSlide(index));
            indicatorsContainer.appendChild(indicator);
        });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => changeSlide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeSlide(1));

    startCarouselAutoPlay();

    const carousel = document.getElementById('hero-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopCarouselAutoPlay);
        carousel.addEventListener('mouseleave', startCarouselAutoPlay);
    }
}

function changeSlide(direction) {
    const track = document.getElementById('carousel-track');
    if (!track) return;
    const slides = track.querySelectorAll('.carousel-slide');
    const totalSlides = slides.length;
    if (totalSlides === 0) return;

    APP_STATE.carouselIndex = (APP_STATE.carouselIndex + direction + totalSlides) % totalSlides;
    goToSlide(APP_STATE.carouselIndex);
}

function goToSlide(index) {
    const track = document.getElementById('carousel-track');
    if (!track) return;
    const slides = track.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');

    APP_STATE.carouselIndex = index;

    const offset = -100 * index;
    track.style.transform = `translateX(${offset}%)`;

    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });

    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
    });
}

function startCarouselAutoPlay() {
    stopCarouselAutoPlay();
    APP_STATE.carouselInterval = setInterval(() => {
        changeSlide(1);
    }, 5000);
}

function stopCarouselAutoPlay() {
    if (APP_STATE.carouselInterval) {
        clearInterval(APP_STATE.carouselInterval);
        APP_STATE.carouselInterval = null;
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);

    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleAdminLogout);

    const logoutBtnMobile = document.getElementById('admin-logout-btn-mobile');
    if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleAdminLogout);

    const adminLoginLink = document.getElementById('admin-login-link');
    if (adminLoginLink) {
        adminLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('admin-modal');
        });
    }

    const uploadBtn = document.getElementById('admin-upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            resetUploadForm();
            openModal('upload-modal');
        });
    }

    const uploadBtnMobile = document.getElementById('admin-upload-btn-mobile');
    if (uploadBtnMobile) {
        uploadBtnMobile.addEventListener('click', () => {
            resetUploadForm();
            openModal('upload-modal');
            const mobileToggle = document.getElementById('mobile-toggle');
            const navMenu = document.getElementById('nav-menu');
            if (mobileToggle && navMenu) {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) uploadForm.addEventListener('submit', handleUpload);

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    document.getElementById('cancel-login')?.addEventListener('click', () => closeModal('admin-modal'));
    document.getElementById('cancel-upload')?.addEventListener('click', () => closeModal('upload-modal'));

    const contactForm = document.getElementById('contact-form');
    if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);

    const sermonSearch = document.getElementById('sermon-search');
    if (sermonSearch) {
        sermonSearch.addEventListener('input', (e) => {
            filterSermons(e.target.value);
        });
    }

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });
}

// ==========================================
// MODAL MANAGEMENT
// ==========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ==========================================
// LOAD ALL CONTENT FROM BACKEND
// ==========================================

async function loadAllContent() {
    await Promise.all([loadSermons(), loadEvents(), loadResources()]);
}

async function loadSermons() {
    try {
        const res = await fetch(`${API_BASE}/sermons`);
        const data = await res.json();
        if (data.success) {
            APP_STATE.sermons = data.data.map(s => ({
                id: s.id,
                title: s.title,
                description: s.description || '',
                date: new Date(s.sermon_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                preacher: s.preacher || '',
                series: s.series || '',
                mediaUrl: s.files && s.files.length > 0 ? s.files[0].url : null,
                mediaType: s.files && s.files.length > 0 ? s.files[0].type : null,
            }));
        }
    } catch (err) {
        console.error('[loadSermons]', err);
    }
    renderSermons();
}

async function loadEvents() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        const data = await res.json();
        if (data.success) {
            APP_STATE.events = data.data.map(e => ({
                id: e.id,
                title: e.title,
                description: e.description || '',
                date: new Date(e.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                location: e.location || '',
                time: e.time || '',
                imageUrl: e.flyer_url || 'https://placehold.co/600x400/d4af37/1a202c?text=Event',
            }));
        }
    } catch (err) {
        console.error('[loadEvents]', err);
    }
    renderEvents();
}

async function loadResources() {
    try {
        const res = await fetch(`${API_BASE}/resources`);
        const data = await res.json();
        if (data.success) {
            APP_STATE.booklets = data.data
                .filter(r => r.category === 'booklet' || r.category === 'general')
                .map(r => ({
                    id: r.id,
                    title: r.title,
                    description: r.description || '',
                    date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    fileUrl: r.files && r.files.length > 0 ? r.files[0].url : null,
                    fileName: r.files && r.files.length > 0 ? r.files[0].name : null,
                    fileType: r.files && r.files.length > 0 ? r.files[0].type : null,
                }));

            APP_STATE.activities = data.data
                .filter(r => r.category === 'activity')
                .map(r => ({
                    id: r.id,
                    title: r.title,
                    description: r.description || '',
                    date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    fileUrl: r.files && r.files.length > 0 ? r.files[0].url : null,
                }));
        }
    } catch (err) {
        console.error('[loadResources]', err);
    }
    renderBooklets();
}

// ==========================================
// CONTENT UPLOAD
// ==========================================

function resetUploadForm() {
    const form = document.getElementById('upload-form');
    if (form) form.reset();
    document.getElementById('upload-modal-title').textContent = 'Upload New Content';
    document.getElementById('content-type').disabled = false;
    APP_STATE.editingItem = null;
}

async function handleUpload(e) {
    e.preventDefault();

    const contentType = document.getElementById('content-type').value;
    const title = document.getElementById('content-title').value;
    const description = document.getElementById('content-description').value;
    const files = document.getElementById('content-file').files;
    const submitBtn = e.target.querySelector('[type="submit"]') || e.target.querySelector('button');

    if (APP_STATE.editingItem) {
        updateContent(APP_STATE.editingItem.type, APP_STATE.editingItem.id, { title, description, file: files[0] });
        showToast('Content updated successfully!');
        closeModal('upload-modal');
        renderAllContent();
        updateStats();
        return;
    }

    const endpointMap = { sermon: 'sermons', event: 'events', booklet: 'resources', activity: 'resources' };
    const endpoint = endpointMap[contentType];
    if (!endpoint) return;

    const token = getToken();
    if (!token) {
        showToast('You must be logged in to upload.');
        return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading...'; }

    const filesToUpload = files.length > 0 ? Array.from(files) : [null];
    let success = false;

    for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const displayTitle = filesToUpload.length > 1 ? `${title} (${i + 1})` : title;

        const formData = new FormData();
        formData.append('title', displayTitle);
        formData.append('description', description);

        if (contentType === 'sermon') {
            formData.append('sermon_date', new Date().toISOString().split('T')[0]);
        } else if (contentType === 'event') {
            formData.append('event_date', new Date().toISOString().split('T')[0]);
        } else {
            formData.append('category', contentType);
        }

        if (file) formData.append('files', file);

        try {
            console.log('[Upload] Sending to:', `${API_BASE}/${endpoint}`, '| Token exists:', !!token);
            const res = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.success) {
                success = true;
            } else if (res.status === 401) {
                localStorage.removeItem('adminToken');
                setAdminUI(false);
                showToast('Session expired. Please log in again.');
                break;
            } else {
                console.error('[Upload] Server error:', res.status, data);
                showToast(data.message || `Upload failed (${res.status}). Check browser console for details.`);
                break;
            }
        } catch (err) {
            showToast('Network error. Please check your connection.');
            break;
        }
    }

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Upload'; }

    if (success) {
        showToast(`${filesToUpload.length} item(s) uploaded successfully!`);
        closeModal('upload-modal');
        await loadAllContent();
        updateStats();
    }
}

function updateContent(type, id, data) {
    let collection;
    switch (type) {
        case 'sermon': collection = APP_STATE.sermons; break;
        case 'event': collection = APP_STATE.events; break;
        case 'booklet': collection = APP_STATE.booklets; break;
        case 'activity': collection = APP_STATE.activities; break;
        default: return;
    }
    const item = collection.find(i => i.id === id);
    if (item) {
        item.title = data.title;
        item.description = data.description;
        if (data.file) {
            const fileUrl = URL.createObjectURL(data.file);
            if (type === 'sermon') { item.mediaUrl = fileUrl; item.mediaType = data.file.type; }
            else if (type === 'event') { item.imageUrl = fileUrl; }
            else { item.fileUrl = fileUrl; }
        }
    }
}

async function deleteContent(type, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const token = getToken();
    if (!token) { showToast('You must be logged in to delete.'); return; }

    const endpointMap = { sermon: 'sermons', event: 'events', booklet: 'resources', activity: 'resources' };
    const endpoint = endpointMap[type];

    try {
        const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('Content deleted successfully');
            await loadAllContent();
            updateStats();
        } else {
            showToast(data.message || 'Delete failed.');
        }
    } catch (err) {
        showToast('Network error. Could not delete.');
    }
}

function editContent(type, id) {
    let item;
    switch (type) {
        case 'sermon': item = APP_STATE.sermons.find(s => s.id === id); break;
        case 'event': item = APP_STATE.events.find(e => e.id === id); break;
        case 'booklet': item = APP_STATE.booklets.find(b => b.id === id); break;
        case 'activity': item = APP_STATE.activities.find(a => a.id === id); break;
        default: return;
    }
    if (!item) return;

    APP_STATE.editingItem = { type, id };
    document.getElementById('upload-modal-title').textContent = 'Edit Content';
    document.getElementById('content-type').value = type;
    document.getElementById('content-type').disabled = true;
    document.getElementById('content-title').value = item.title;
    document.getElementById('content-description').value = item.description;
    openModal('upload-modal');
}

// ==========================================
// RENDERING
// ==========================================

function renderAllContent() {
    renderSermons();
    renderEvents();
    renderBooklets();
}

function renderSermons() {
    const sermonsGrid = document.getElementById('sermons-grid');
    const homeGrid = document.getElementById('home-sermons-grid');
    const emptyState = document.getElementById('sermons-empty');

    if (!sermonsGrid) return;

    sermonsGrid.innerHTML = '';
    if (homeGrid) homeGrid.innerHTML = '';

    if (APP_STATE.sermons.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    [...APP_STATE.sermons].reverse().forEach(sermon => {
        sermonsGrid.appendChild(createSermonCard(sermon));
    });

    if (homeGrid) {
        const recentSermons = APP_STATE.sermons.slice(-3).reverse();
        recentSermons.forEach(sermon => {
            homeGrid.appendChild(createSermonCard(sermon));
        });
    }
}

function createSermonCard(sermon) {
    const card = document.createElement('div');
    card.className = 'sermon-card';

    const imageUrl = sermon.mediaType?.startsWith('video')
        ? (sermon.mediaUrl || 'https://placehold.co/600x400/d4af37/1a202c?text=Sermon')
        : 'https://placehold.co/600x400/d4af37/1a202c?text=Sermon';

    card.innerHTML = `
        <div class="card-image" style="background-image: url('${imageUrl}')">
            ${sermon.mediaType ? '<div class="card-badge">Media</div>' : ''}
        </div>
        <div class="card-content">
            <p class="card-date">${sermon.date}</p>
            <h3 class="card-title">${escapeHtml(sermon.title)}</h3>
            <p class="card-description">${escapeHtml(sermon.description)}</p>
            ${sermon.preacher ? `<p class="card-preacher"><em>By ${escapeHtml(sermon.preacher)}</em></p>` : ''}
            <a href="#sermon-player" class="card-link" data-sermon-id="${sermon.id}">
                Listen Now →
            </a>
            <div class="card-admin-controls">
                <button class="btn btn-sm btn-secondary" onclick="editContent('sermon', '${sermon.id}')">Edit</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteContent('sermon', '${sermon.id}')">Delete</button>
            </div>
        </div>
    `;

    card.querySelector('.card-link').addEventListener('click', (e) => {
        e.preventDefault();
        playSermon(sermon.id);
    });

    return card;
}

function renderEvents() {
    const eventsGrid = document.getElementById('events-grid');
    const homeGrid = document.getElementById('home-events-grid');
    const emptyState = document.getElementById('events-empty');

    if (!eventsGrid) return;

    eventsGrid.innerHTML = '';
    if (homeGrid) homeGrid.innerHTML = '';

    if (APP_STATE.events.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (homeGrid) homeGrid.innerHTML = '<p class="text-center text-muted">No upcoming events at this time.</p>';
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    [...APP_STATE.events].reverse().forEach(event => {
        eventsGrid.appendChild(createEventCard(event));
    });

    if (homeGrid) {
        const recentEvents = APP_STATE.events.slice(-3).reverse();
        recentEvents.forEach(event => {
            homeGrid.appendChild(createEventCard(event));
        });
    }
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';

    card.innerHTML = `
        <div class="card-image" style="background-image: url('${event.imageUrl}')"></div>
        <div class="card-content">
            <p class="card-date">${event.date}</p>
            ${event.time ? `<p class="card-time">⏰ ${escapeHtml(event.time)}</p>` : ''}
            <h3 class="card-title">${escapeHtml(event.title)}</h3>
            <p class="card-description">${escapeHtml(event.description)}</p>
            ${event.location ? `<p class="card-location">📍 ${escapeHtml(event.location)}</p>` : ''}
            <div class="card-admin-controls">
                <button class="btn btn-sm btn-secondary" onclick="editContent('event', '${event.id}')">Edit</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteContent('event', '${event.id}')">Delete</button>
            </div>
        </div>
    `;

    return card;
}

function renderBooklets() {
    const bookletsGrid = document.getElementById('booklets-grid');
    const emptyState = document.getElementById('booklets-empty');

    if (!bookletsGrid) return;

    bookletsGrid.innerHTML = '';

    if (APP_STATE.booklets.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    [...APP_STATE.booklets].reverse().forEach(booklet => {
        bookletsGrid.appendChild(createBookletCard(booklet));
    });
}

function createBookletCard(booklet) {
    const card = document.createElement('div');
    card.className = 'booklet-card';

    card.innerHTML = `
        <div class="card-image" style="background-image: url('https://placehold.co/600x400/d4af37/1a202c?text=Booklet')">
            <div class="card-badge">PDF</div>
        </div>
        <div class="card-content">
            <p class="card-date">${booklet.date}</p>
            <h3 class="card-title">${escapeHtml(booklet.title)}</h3>
            <p class="card-description">${escapeHtml(booklet.description)}</p>
            ${booklet.fileUrl ? `<a href="${booklet.fileUrl}" download="${booklet.fileName || 'booklet.pdf'}" class="card-link">Download →</a>` : ''}
            <div class="card-admin-controls">
                <button class="btn btn-sm btn-secondary" onclick="editContent('booklet', '${booklet.id}')">Edit</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteContent('booklet', '${booklet.id}')">Delete</button>
            </div>
        </div>
    `;

    return card;
}

// ==========================================
// SERMON PLAYER
// ==========================================

function playSermon(id) {
    const sermon = APP_STATE.sermons.find(s => s.id === id);
    if (!sermon) return;

    document.getElementById('player-title').textContent = sermon.title;
    document.getElementById('player-date').textContent = sermon.date;
    document.getElementById('player-description').textContent = sermon.description;

    const playerMedia = document.getElementById('player-media');
    if (sermon.mediaUrl && sermon.mediaType) {
        if (sermon.mediaType.startsWith('video')) {
            playerMedia.innerHTML = `<video src="${sermon.mediaUrl}" controls class="w-full h-full"></video>`;
        } else if (sermon.mediaType.startsWith('audio')) {
            playerMedia.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;">
                    <svg width="80" height="80" fill="currentColor" viewBox="0 0 16 16" style="color:#d4af37;">
                        <path d="M8 3a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a6 6 0 1 1 12 0v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1V8a5 5 0 0 0-5-5z"/>
                    </svg>
                    <audio src="${sermon.mediaUrl}" controls style="width:80%;max-width:500px;"></audio>
                </div>
            `;
        }
    } else {
        playerMedia.innerHTML = `<div style="color:rgba(255,255,255,0.7);text-align:center;"><p>No media available for this sermon.</p></div>`;
    }

    navigateToPage('sermon-player');
}

// ==========================================
// SEARCH & FILTER
// ==========================================

function filterSermons(query) {
    const sermonsGrid = document.getElementById('sermons-grid');
    if (!sermonsGrid) return;

    const filtered = APP_STATE.sermons.filter(sermon =>
        sermon.title.toLowerCase().includes(query.toLowerCase()) ||
        sermon.description.toLowerCase().includes(query.toLowerCase())
    );

    sermonsGrid.innerHTML = '';

    if (filtered.length === 0) {
        sermonsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">🔍</div>
                <h3>No Results Found</h3>
                <p>Try adjusting your search terms</p>
            </div>
        `;
        return;
    }

    filtered.reverse().forEach(sermon => {
        sermonsGrid.appendChild(createSermonCard(sermon));
    });
}

// ==========================================
// STATS UPDATE
// ==========================================

function updateStats() {
    const statSermons = document.getElementById('stat-sermons');
    const statEvents = document.getElementById('stat-events');
    const statBooklets = document.getElementById('stat-booklets');

    if (statSermons) statSermons.textContent = APP_STATE.sermons.length;
    if (statEvents) statEvents.textContent = APP_STATE.events.length;
    if (statBooklets) statBooklets.textContent = APP_STATE.booklets.length;
}

// ==========================================
// CONTACT FORM
// ==========================================

async function handleContactSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value;

    const submitBtn = e.target.querySelector('[type="submit"]') || e.target.querySelector('button');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }

    try {
        const res = await fetch(`${API_BASE}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, message }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showToast('Thank you! Your message has been sent successfully.');
            document.getElementById('contact-form').reset();
        } else {
            showToast(data.message || 'Failed to send. Please try again.');
        }
    } catch (err) {
        showToast('Network error. Please try again.');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }
    }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, duration);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.editContent = editContent;
window.deleteContent = deleteContent;
