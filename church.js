// ==========================================
// STATE MANAGEMENT
// ==========================================

const APP_STATE = {
    sermons: [
        { 
            id: 1, 
            title: 'The Power of Faith', 
            date: 'October 5, 2025', 
            description: 'An inspiring message on how faith can move mountains and transform lives.', 
            mediaUrl: null, 
            mediaType: null 
        }
    ],
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

function initApp() {
    checkAdminStatus();
    setupEventListeners();
    setupNavigation();
    setupCarousel();
    renderAllContent();
    updateStats();
    
    // Load initial page from hash or default to home
    const initialPage = window.location.hash.substring(1) || 'home';
    navigateToPage(initialPage);
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

function checkAdminStatus() {
    APP_STATE.isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    
    if (APP_STATE.isAdmin) {
        document.body.classList.add('admin-logged-in');
    } else {
        document.body.classList.remove('admin-logged-in');
    }
}

function handleAdminLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('login-error');
    
    if (password === 'admin123') {
        sessionStorage.setItem('isAdmin', 'true');
        APP_STATE.isAdmin = true;
        checkAdminStatus();
        closeModal('admin-modal');
        showToast('Logged in successfully!');
        document.getElementById('admin-login-form').reset();
        errorEl.classList.add('hidden');
    } else {
        errorEl.classList.remove('hidden');
    }
}

function handleAdminLogout() {
    sessionStorage.removeItem('isAdmin');
    APP_STATE.isAdmin = false;
    checkAdminStatus();
    showToast('Logged out successfully');
}

// ==========================================
// NAVIGATION
// ==========================================

function setupNavigation() {
    // Desktop nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });
    
    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking nav links
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
    
    // Hash change for browser back/forward
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.substring(1) || 'home';
        navigateToPage(page, false);
    });
    
    // Sticky header on scroll
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
    // Update hash without triggering hashchange event
    if (updateHash) {
        window.location.hash = pageId;
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        APP_STATE.currentPage = pageId;
    }
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
    
    // Scroll to top
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
    
    // Create indicators
    slides.forEach((_, index) => {
        const indicator = document.createElement('button');
        indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
        indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
        indicator.addEventListener('click', () => goToSlide(index));
        indicatorsContainer.appendChild(indicator);
    });
    
    // Navigation buttons
    if (prevBtn) prevBtn.addEventListener('click', () => changeSlide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeSlide(1));
    
    // Auto-play carousel
    startCarouselAutoPlay();
    
    // Pause on hover
    const carousel = document.getElementById('hero-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopCarouselAutoPlay);
        carousel.addEventListener('mouseleave', startCarouselAutoPlay);
    }
}

function changeSlide(direction) {
    const track = document.getElementById('carousel-track');
    const slides = track.querySelectorAll('.carousel-slide');
    const totalSlides = slides.length;
    
    APP_STATE.carouselIndex = (APP_STATE.carouselIndex + direction + totalSlides) % totalSlides;
    goToSlide(APP_STATE.carouselIndex);
}

function goToSlide(index) {
    const track = document.getElementById('carousel-track');
    const slides = track.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    APP_STATE.carouselIndex = index;
    
    // Update slide position
    const offset = -100 * index;
    track.style.transform = `translateX(${offset}%)`;
    
    // Update active states
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
    }, 5000); // Change slide every 5 seconds
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
    // Admin login
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Admin logout (desktop)
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }
    
    // Admin logout (mobile)
    const logoutBtnMobile = document.getElementById('admin-logout-btn-mobile');
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', handleAdminLogout);
    }
    
    // Admin login link
    const adminLoginLink = document.getElementById('admin-login-link');
    if (adminLoginLink) {
        adminLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('admin-modal');
        });
    }
    
    // Upload button (desktop)
    const uploadBtn = document.getElementById('admin-upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            resetUploadForm();
            openModal('upload-modal');
        });
    }
    
    // Upload button (mobile)
    const uploadBtnMobile = document.getElementById('admin-upload-btn-mobile');
    if (uploadBtnMobile) {
        uploadBtnMobile.addEventListener('click', () => {
            resetUploadForm();
            openModal('upload-modal');
            // Close mobile menu after opening modal
            const mobileToggle = document.getElementById('mobile-toggle');
            const navMenu = document.getElementById('nav-menu');
            if (mobileToggle && navMenu) {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
    
    // Upload form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    document.getElementById('cancel-login')?.addEventListener('click', () => closeModal('admin-modal'));
    document.getElementById('cancel-upload')?.addEventListener('click', () => closeModal('upload-modal'));
    
    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
    
    // Sermon search
    const sermonSearch = document.getElementById('sermon-search');
    if (sermonSearch) {
        sermonSearch.addEventListener('input', (e) => {
            filterSermons(e.target.value);
        });
    }
    
    // Modal overlay clicks
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
// CONTENT UPLOAD & CRUD
// ==========================================

function resetUploadForm() {
    const form = document.getElementById('upload-form');
    if (form) form.reset();
    
    document.getElementById('upload-modal-title').textContent = 'Upload New Content';
    document.getElementById('content-type').disabled = false;
    APP_STATE.editingItem = null;
}

function handleUpload(e) {
    e.preventDefault();
    
    const contentType = document.getElementById('content-type').value;
    const title = document.getElementById('content-title').value;
    const description = document.getElementById('content-description').value;
    const files = document.getElementById('content-file').files;
    
    if (APP_STATE.editingItem) {
        // Update existing item
        updateContent(APP_STATE.editingItem.type, APP_STATE.editingItem.id, {
            title,
            description,
            file: files[0]
        });
        showToast('Content updated successfully!');
    } else {
        // Create new item(s)
        if (files.length > 0) {
            // Multiple files
            Array.from(files).forEach((file, index) => {
                const displayTitle = files.length > 1 ? `${title} (${index + 1})` : title;
                createContent(contentType, {
                    title: displayTitle,
                    description,
                    file
                });
            });
            showToast(`${files.length} item(s) uploaded successfully!`);
        } else {
            // No file
            createContent(contentType, { title, description, file: null });
            showToast('Content created successfully!');
        }
    }
    
    closeModal('upload-modal');
    renderAllContent();
    updateStats();
}

function createContent(type, data) {
    const newItem = {
        id: Date.now() + Math.random(),
        title: data.title,
        description: data.description,
        date: new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        })
    };
    
    if (data.file) {
        newItem.fileUrl = URL.createObjectURL(data.file);
        newItem.fileName = data.file.name;
        newItem.fileType = data.file.type;
    }
    
    switch (type) {
        case 'sermon':
            newItem.mediaUrl = newItem.fileUrl;
            newItem.mediaType = newItem.fileType;
            APP_STATE.sermons.push(newItem);
            break;
        case 'event':
            newItem.imageUrl = newItem.fileUrl || 'https://placehold.co/600x400/d4af37/1a202c?text=Event';
            APP_STATE.events.push(newItem);
            break;
        case 'booklet':
            APP_STATE.booklets.push(newItem);
            break;
        case 'activity':
            APP_STATE.activities.push(newItem);
            break;
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
            if (type === 'sermon') {
                item.mediaUrl = fileUrl;
                item.mediaType = data.file.type;
            } else if (type === 'event') {
                item.imageUrl = fileUrl;
            } else {
                item.fileUrl = fileUrl;
            }
        }
    }
}

function deleteContent(type, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    switch (type) {
        case 'sermon':
            APP_STATE.sermons = APP_STATE.sermons.filter(s => s.id !== id);
            break;
        case 'event':
            APP_STATE.events = APP_STATE.events.filter(e => e.id !== id);
            break;
        case 'booklet':
            APP_STATE.booklets = APP_STATE.booklets.filter(b => b.id !== id);
            break;
        case 'activity':
            APP_STATE.activities = APP_STATE.activities.filter(a => a.id !== id);
            break;
    }
    
    renderAllContent();
    updateStats();
    showToast('Content deleted successfully');
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
    
    // Clear grids
    sermonsGrid.innerHTML = '';
    if (homeGrid) homeGrid.innerHTML = '';
    
    if (APP_STATE.sermons.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    // Render all sermons (reverse chronological)
    [...APP_STATE.sermons].reverse().forEach(sermon => {
        sermonsGrid.appendChild(createSermonCard(sermon));
    });
    
    // Render recent sermons on home page (latest 3)
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
            <a href="#sermon-player" class="card-link" data-sermon-id="${sermon.id}">
                Listen Now →
            </a>
            <div class="card-admin-controls">
                <button class="btn btn-sm btn-secondary" onclick="editContent('sermon', ${sermon.id})">Edit</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteContent('sermon', ${sermon.id})">Delete</button>
            </div>
        </div>
    `;
    
    // Add click event for sermon link
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
    
    // Render all events
    [...APP_STATE.events].reverse().forEach(event => {
        eventsGrid.appendChild(createEventCard(event));
    });
    
    // Render recent events on home (latest 3)
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
            <h3 class="card-title">${escapeHtml(event.title)}</h3>
            <p class="card-description">${escapeHtml(event.description)}</p>
            <div class="card-admin-controls">
                <button class="btn btn-sm btn-secondary" onclick="editContent('event', ${event.id})">Edit</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteContent('event', ${event.id})">Delete</button>
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
    
    const imageUrl = 'https://placehold.co/600x400/d4af37/1a202c?text=Booklet';
    
    card.innerHTML = `
        <div class="card-image" style="background-image: url('${imageUrl}')">
            <div class="card-badge">PDF</div>
        </div>
        <div class="card-content">
            <p class="card-date">${booklet.date}</p>
            <h3 class="card-title">${escapeHtml(booklet.title)}</h3>
            <p class="card-description">${escapeHtml(booklet.description)}</p>
            ${booklet.fileUrl ? `<a href="${booklet.fileUrl}" download="${booklet.fileName || 'booklet.pdf'}" class="card-link">Download →</a>` : ''}
            <div class="card-admin-controls">
                <button class="btn btn-sm btn-secondary" onclick="editContent('booklet', ${booklet.id})">Edit</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteContent('booklet', ${booklet.id})">Delete</button>
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
    
    // Update player info
    document.getElementById('player-title').textContent = sermon.title;
    document.getElementById('player-date').textContent = sermon.date;
    document.getElementById('player-description').textContent = sermon.description;
    
    // Update media player
    const playerMedia = document.getElementById('player-media');
    if (sermon.mediaUrl && sermon.mediaType) {
        if (sermon.mediaType.startsWith('video')) {
            playerMedia.innerHTML = `<video src="${sermon.mediaUrl}" controls class="w-full h-full"></video>`;
        } else if (sermon.mediaType.startsWith('audio')) {
            playerMedia.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 1rem;">
                    <svg width="80" height="80" fill="currentColor" viewBox="0 0 16 16" style="color: #d4af37;">
                        <path d="M8 3a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a6 6 0 1 1 12 0v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1V8a5 5 0 0 0-5-5z"/>
                    </svg>
                    <audio src="${sermon.mediaUrl}" controls style="width: 80%; max-width: 500px;"></audio>
                </div>
            `;
        }
    } else {
        playerMedia.innerHTML = `
            <div style="color: rgba(255,255,255,0.7); text-align: center;">
                <p>No media available for this sermon.</p>
            </div>
        `;
    }
    
    // Navigate to player
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

function handleContactSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value;
    
    // In a real app, this would send to a backend
    console.log('Contact form submission:', { name, email, subject, message });
    
    showToast('Thank you! Your message has been sent successfully.');
    document.getElementById('contact-form').reset();
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
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Make functions globally accessible for inline onclick handlers
window.editContent = editContent;
window.deleteContent = deleteContent;
