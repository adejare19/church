
document.addEventListener('DOMContentLoaded', () => {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.nav-link-mobile');
    const menuOpenIcon = document.getElementById('menu-open-icon');
    const menuCloseIcon = document.getElementById('menu-close-icon');
    const logoLink = document.querySelector('.nav-link-logo');

    // --- In-memory Database ---
    let sermonsData = [
        { id: 1, title: 'The Power of Faith', date: 'October 5, 2025', description: 'An inspiring message on how faith can move mountains.', mediaUrl: null, mediaType: null },
    ];
    let flyersData = [];
    let activitiesData = [];
    let bookletsData = [];

    let editingState = { type: null, id: null };

    // --- Navigation ---
    function showPage(pageId) {
        pages.forEach(p => p.classList.toggle('hidden', p.id !== pageId));
        if (pageId !== 'sermon-player') closeMobileMenu();
    }
    
    function closeMobileMenu() {
        mobileMenu.classList.add('hidden');
        menuOpenIcon.classList.remove('hidden');
        menuCloseIcon.classList.add('hidden');
    }

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        menuOpenIcon.classList.toggle('hidden');
        menuCloseIcon.classList.toggle('hidden');
    });

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1) || 'home';
        showPage(hash);
    });

    // --- Sermon Player ---
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sermon-link')) {
            e.preventDefault();
            const id = e.target.dataset.id;
            const sermon = sermonsData.find(s => s.id == id);
            if (sermon) {
                document.getElementById('player-title').textContent = sermon.title;
                document.getElementById('player-date').textContent = sermon.date;
                document.getElementById('player-description').textContent = sermon.description;
                const container = document.getElementById('media-player-container');
                container.innerHTML = sermon.mediaUrl 
                    ? `<video src="${sermon.mediaUrl}" controls class="w-full h-full"></video>` 
                    : '<p class="text-white">No media available.</p>';
                showPage('sermon-player');
            }
        }
    });

    // --- Admin & Modals ---
    const uploadModal = document.getElementById('upload-modal');
    const adminModal = document.getElementById('admin-login-modal');

    document.getElementById('upload-main-btn').addEventListener('click', () => {
        resetUploadForm();
        uploadModal.classList.remove('hidden');
    });
    document.getElementById('cancel-upload-btn').addEventListener('click', () => uploadModal.classList.add('hidden'));

    document.getElementById('admin-login-link').addEventListener('click', () => adminModal.classList.remove('hidden'));
    document.getElementById('cancel-login-btn').addEventListener('click', () => adminModal.classList.add('hidden'));

    document.getElementById('admin-login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('admin-password').value === 'admin123') {
            sessionStorage.setItem('isAdmin', 'true');
            checkAdminStatus();
            adminModal.classList.add('hidden');
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    });

    function checkAdminStatus() {
        const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
        document.getElementById('upload-main-btn').classList.toggle('hidden', !isAdmin);
        document.getElementById('logout-btn').classList.toggle('hidden', !isAdmin);
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem('isAdmin');
        checkAdminStatus();
    });

    // --- CRUD: THE MULTIPLE UPLOAD LOGIC ---
    const uploadForm = document.getElementById('upload-form');
    
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const contentType = document.getElementById('content-type').value;
        const title = document.getElementById('content-title').value;
        const description = document.getElementById('content-description').value;
        const files = document.getElementById('content-file').files;

        if (editingState.id) {
            // Edit existing (one file)
            updateItem(editingState.type, editingState.id, { title, description, file: files[0] });
        } else {
            // CREATE NEW (Multiple Files)
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const displayTitle = files.length > 1 ? `${title} (${i + 1})` : title;
                    createItem(contentType, { title: displayTitle, description, file: files[i] });
                }
            } else {
                createItem(contentType, { title, description, file: null });
            }
        }
        
        uploadModal.classList.add('hidden');
        renderAll();
    });

    function createItem(type, data) {
        const fileUrl = data.file ? URL.createObjectURL(data.file) : null;
        const newItem = {
            id: Date.now() + Math.random(), // Unique ID
            title: data.title,
            description: data.description,
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        };

        if (type === 'sermon') {
            newItem.mediaUrl = fileUrl;
            newItem.mediaType = data.file ? data.file.type : null;
            sermonsData.push(newItem);
        } else if (type === 'flyer') {
            newItem.imageUrl = fileUrl || 'https://placehold.co/600x400?text=Flyer';
            flyersData.push(newItem);
        } else if (type === 'booklet') {
            newItem.fileUrl = fileUrl;
            bookletsData.push(newItem);
        } else if (type === 'activity') {
            activitiesData.push(newItem);
        }
    }

    function updateItem(type, id, data) {
        let arr = type === 'sermon' ? sermonsData : type === 'flyer' ? flyersData : bookletsData;
        let item = arr.find(i => i.id == id);
        if (item) {
            item.title = data.title;
            item.description = data.description;
            if (data.file) {
                item.mediaUrl = URL.createObjectURL(data.file);
            }
        }
    }

    function resetUploadForm() {
        editingState = { type: null, id: null };
        uploadForm.reset();
        document.getElementById('modal-title').textContent = 'Upload New Content';
        document.getElementById('content-type').disabled = false;
    }

    // --- Rendering ---
    function renderAll() {
        renderSermons();
        // Add renderFlyers(), renderActivities() calls here as needed
    }

    function renderSermons() {
        const grid = document.getElementById('sermons-grid');
        const recentGrid = document.getElementById('recent-sermons-grid');
        grid.innerHTML = '';
        recentGrid.innerHTML = '';
        
        [...sermonsData].reverse().forEach(s => {
            const html = `
                <div class="bg-white rounded-lg shadow-lg p-6 relative">
                    <p class="text-sm text-gray-500">${s.date}</p>
                    <h4 class="text-xl font-bold">${s.title}</h4>
                    <p class="text-gray-600 mb-4">${s.description}</p>
                    <a href="#" class="sermon-link text-amber-600 font-semibold" data-id="${s.id}">Listen Now &rarr;</a>
                </div>`;
            grid.insertAdjacentHTML('beforeend', html);
        });
        
        // Populate recent (first 3)
        sermonsData.slice(-3).reverse().forEach(s => {
            recentGrid.insertAdjacentHTML('beforeend', `
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h4 class="font-bold">${s.title}</h4>
                    <a href="#" class="sermon-link text-amber-600" data-id="${s.id}">Listen Now</a>
                </div>`);
        });
    }

    // Initial load
    checkAdminStatus();
    renderAll();
});
