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
                { id: 1, title: 'The Power of Faith', date: 'October 5, 2025', description: 'An inspiring message on how faith can move mountains in our daily lives.', mediaUrl: null, mediaType: null },
                { id: 2, title: 'Grace and Forgiveness', date: 'September 28, 2025', description: 'Discover the true meaning of grace and the freedom that comes with forgiveness.', mediaUrl: null, mediaType: null },
                { id: 3, title: 'A Heart of Gratitude', date: 'September 21, 2025', description: 'Exploring the importance of thankfulness in our spiritual walk.', mediaUrl: null, mediaType: null }
            ];
            let flyersData = [
                {id: 1, title: 'Annual Community Picnic', description: 'Join us for a day of fun, food, and fellowship at the park. All are welcome!', imageUrl: 'https://placehold.co/600x400/FBBF24/333333?text=Community+Picnic'}
            ];
             let activitiesData = [
                {id: 1, title: 'Youth Fellowship', description: 'Every Friday at 6:00 PM in the main hall.'},
                {id: 2, title: "Women's Bible Study", description: 'Every Wednesday at 10:00 AM online.'}
            ];
            let bookletsData = [
                {id: 1, title: 'Weekly Prayer Guide', description: 'A guide to our weekly prayer points and devotionals.', fileUrl: null}
            ];

            let editingState = { type: null, id: null };

            // --- Mobile Menu ---
            function closeMobileMenu() {
                mobileMenu.classList.add('hidden');
                menuOpenIcon.classList.remove('hidden');
                menuCloseIcon.classList.add('hidden');
            }
            mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
            mobileNavLinks.forEach(link => link.addEventListener('click', closeMobileMenu));
            logoLink.addEventListener('click', closeMobileMenu);
            
            // --- Page Navigation ---
            function showPage(pageId) {
                pages.forEach(page => page.classList.toggle('hidden', page.id !== pageId));
                navLinks.forEach(link => link.classList.toggle('active-nav', link.hash === `#${pageId}`));
                if (pageId !== 'sermon-player') closeMobileMenu();
            }

            function handleRouteChange() {
                const playerPage = document.getElementById('sermon-player');
                if(!playerPage.classList.contains('hidden')) {
                    const player = playerPage.querySelector('video, audio');
                    if(player) player.pause();
                }
                const hash = window.location.hash.substring(1) || 'home';
                showPage(hash);
            }
            window.addEventListener('hashchange', handleRouteChange);

            // --- Sermon Player ---
            function showSermonPlayer(sermonId) {
                const sermon = sermonsData.find(s => s.id == sermonId);
                if (!sermon) return;
                document.getElementById('player-title').textContent = sermon.title;
                document.getElementById('player-date').textContent = sermon.date;
                document.getElementById('player-description').textContent = sermon.description;
                const playerContainer = document.getElementById('media-player-container');
                playerContainer.innerHTML = '';
                if (sermon.mediaUrl) {
                    let playerElement = sermon.mediaType.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
                    playerElement.src = sermon.mediaUrl;
                    playerElement.controls = true;
                    playerElement.className = 'w-full h-full';
                    playerContainer.appendChild(playerElement);
                } else {
                    playerContainer.innerHTML = `<p class="text-white">No media available for this sermon.</p>`;
                }
                showPage('sermon-player');
            }
            
            // --- Modal Handling ---
            const uploadModalEl = document.getElementById('upload-modal');
            const adminModalEl = document.getElementById('admin-login-modal');
            const confirmModalEl = document.getElementById('confirm-modal');
            
            const uploadModal = {
                open: () => uploadModalEl.classList.remove('hidden'),
                close: () => uploadModalEl.classList.add('hidden')
            };
            const adminModal = {
                open: () => adminModalEl.classList.remove('hidden'),
                close: () => adminModalEl.classList.add('hidden')
            };
             const confirmModal = {
                open: () => confirmModalEl.classList.remove('hidden'),
                close: () => confirmModalEl.classList.add('hidden')
            };

            document.getElementById('upload-main-btn').addEventListener('click', () => {
                resetUploadForm();
                uploadModal.open();
            });
            document.getElementById('upload-main-btn-mobile').addEventListener('click', () => {
                resetUploadForm();
                uploadModal.open();
            });
            document.getElementById('cancel-upload-btn').addEventListener('click', uploadModal.close);
            document.getElementById('admin-login-link').addEventListener('click', adminModal.open);
            document.getElementById('cancel-login-btn').addEventListener('click', adminModal.close);
            document.getElementById('cancel-confirm-btn').addEventListener('click', confirmModal.close);

            // --- Admin Authentication ---
            const adminLoginForm = document.getElementById('admin-login-form');

            function checkAdminLogin() {
                const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
                document.body.classList.toggle('admin-view', isAdmin);
                document.getElementById('upload-main-btn').classList.toggle('hidden', !isAdmin);
                document.getElementById('logout-btn').classList.toggle('hidden', !isAdmin);
                document.getElementById('upload-main-btn-mobile').classList.toggle('hidden', !isAdmin);
                document.getElementById('logout-btn-mobile').classList.toggle('hidden', !isAdmin);
            }

            adminLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (document.getElementById('admin-password').value === 'admin123') {
                    sessionStorage.setItem('isAdmin', 'true');
                    checkAdminLogin();
                    adminModal.close();
                    adminLoginForm.reset();
                } else {
                    document.getElementById('login-error').classList.remove('hidden');
                }
            });
            
            const performLogout = () => {
                sessionStorage.removeItem('isAdmin');
                checkAdminLogin();
                closeMobileMenu();
            };
            document.getElementById('logout-btn').addEventListener('click', performLogout);
            document.getElementById('logout-btn-mobile').addEventListener('click', performLogout);
            

            // --- RENDER FUNCTIONS ---
            function renderAllContent() {
                renderSermons();
                renderFlyers();
                renderActivities();
                renderBooklets();
            }

            function getAdminControls(type, id) {
                 return `
                    <div class="admin-controls absolute top-2 right-2 space-x-2">
                        <button class="edit-btn p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600" data-type="${type}" data-id="${id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z"></path></svg>
                        </button>
                        <button class="delete-btn p-1 bg-red-500 text-white rounded-full hover:bg-red-600" data-type="${type}" data-id="${id}">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>`;
            }

            function renderSermons() {
                const sermonsGrid = document.getElementById('sermons-grid');
                const recentSermonsGrid = document.getElementById('recent-sermons-grid');
                sermonsGrid.innerHTML = '';
                recentSermonsGrid.innerHTML = '';
                const sortedSermons = [...sermonsData].reverse();
                sortedSermons.forEach(sermon => {
                    const cardHTML = `<div class="bg-white rounded-lg shadow-lg overflow-hidden relative"><div class="p-6">${getAdminControls('sermon', sermon.id)}<p class="text-sm text-gray-500 mb-1">${sermon.date}</p><h4 class="text-xl font-bold mb-2">${sermon.title}</h4><p class="text-gray-600 mb-4">${sermon.description}</p><a href="#" class="sermon-link text-amber-600 hover:text-amber-800 font-semibold" data-id="${sermon.id}">Listen Now &rarr;</a></div></div>`;
                    sermonsGrid.insertAdjacentHTML('beforeend', cardHTML);
                });
                sortedSermons.slice(0, 3).forEach(sermon => {
                     const cardHTML = `<div class="bg-white rounded-lg shadow-lg overflow-hidden relative"><div class="p-6">${getAdminControls('sermon', sermon.id)}<p class="text-sm text-gray-500 mb-1">${sermon.date}</p><h4 class="text-xl font-bold mb-2">${sermon.title}</h4><p class="text-gray-600 mb-4">${sermon.description}</p><a href="#" class="sermon-link text-amber-600 hover:text-amber-800 font-semibold" data-id="${sermon.id}">Listen Now &rarr;</a></div></div>`;
                    recentSermonsGrid.insertAdjacentHTML('beforeend', cardHTML);
                });
            }

            function renderFlyers() {
                const flyersGrid = document.getElementById('flyers-grid');
                flyersGrid.innerHTML = '';
                [...flyersData].reverse().forEach(flyer => {
                    const cardHTML = `<div class="bg-white rounded-lg shadow-lg overflow-hidden relative"><img src="${flyer.imageUrl}" alt="${flyer.title}" class="w-full h-48 object-cover">${getAdminControls('flyer', flyer.id)}<div class="p-6"><h4 class="text-xl font-bold mb-2">${flyer.title}</h4><p class="text-gray-600 mb-4">${flyer.description}</p><a href="#" class="text-amber-600 hover:text-amber-800 font-semibold">View Details &rarr;</a></div></div>`;
                    flyersGrid.insertAdjacentHTML('beforeend', cardHTML);
                });
            }

            function renderActivities() {
                const activitiesList = document.getElementById('activities-list');
                activitiesList.innerHTML = '';
                 [...activitiesData].reverse().forEach(activity => {
                    const itemHTML = `<div class="border-b pb-4 mb-4 relative">${getAdminControls('activity', activity.id)}<p class="font-semibold text-lg">${activity.title}</p><p class="text-gray-600">${activity.description}</p></div>`;
                    activitiesList.insertAdjacentHTML('beforeend', itemHTML);
                 });
            }
            
            function renderBooklets() {
                const bookletsGrid = document.getElementById('booklets-grid');
                bookletsGrid.innerHTML = '';
                [...bookletsData].reverse().forEach(booklet => {
                    const downloadLink = booklet.fileUrl
                        ? `<a href="${booklet.fileUrl}" download="${booklet.title.replace(/\s+/g, '_')}.pdf" class="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition">Download PDF</a>`
                        : `<span class="bg-gray-200 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed">No File</span>`;
                    
                    const cardHTML = `<div class="bg-white rounded-lg shadow-lg overflow-hidden p-6 flex flex-col items-center text-center relative">${getAdminControls('booklet', booklet.id)}<svg class="w-16 h-16 text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v11.494m-9-5.747h18"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"></path></svg><h4 class="text-xl font-bold mb-2">${booklet.title}</h4><p class="text-gray-600 mb-4">${booklet.description}</p>${downloadLink}</div>`;
                    bookletsGrid.insertAdjacentHTML('beforeend', cardHTML);
                });
            }

            // --- CRUD LOGIC ---

            function resetUploadForm() {
                editingState = { type: null, id: null };
                document.getElementById('upload-form').reset();
                document.getElementById('modal-title').textContent = 'Upload New Content';
                document.getElementById('submit-upload-btn').textContent = 'Upload';
                document.getElementById('content-type').disabled = false;
            }

            const uploadForm = document.getElementById('upload-form');
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const contentType = document.getElementById('content-type').value;
                const title = document.getElementById('content-title').value;
                const description = document.getElementById('content-description').value;
                const file = document.getElementById('content-file').files[0];

                if (editingState.id) { // We are editing
                    updateItem(editingState.type, editingState.id, { title, description, file });
                } else { // We are creating
                    createItem(contentType, { title, description, file });
                }
                
                uploadModal.close();
            });

            function createItem(type, data) {
                 let fileUrl = data.file ? URL.createObjectURL(data.file) : null;
                 const newItem = {
                     id: Date.now(),
                     title: data.title,
                     description: data.description,
                 };

                switch(type) {
                    case 'sermon':
                        newItem.date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        newItem.mediaUrl = fileUrl;
                        newItem.mediaType = data.file ? data.file.type : null;
                        sermonsData.push(newItem);
                        renderSermons();
                        break;
                    case 'flyer':
                         newItem.imageUrl = fileUrl || `https://placehold.co/600x400/FBBF24/333333?text=${encodeURIComponent(data.title)}`;
                         flyersData.push(newItem);
                         renderFlyers();
                        break;
                    case 'booklet':
                        newItem.fileUrl = fileUrl;
                        bookletsData.push(newItem);
                        renderBooklets();
                        break;
                    case 'activity':
                        activitiesData.push(newItem);
                        renderActivities();
                        break;
                }
            }

            function updateItem(type, id, data) {
                const getDataArray = () => {
                    switch (type) {
                        case 'sermon': return sermonsData;
                        case 'flyer': return flyersData;
                        case 'activity': return activitiesData;
                        case 'booklet': return bookletsData;
                    }
                };
                const renderFunction = () => {
                     switch (type) {
                        case 'sermon': renderSermons(); break;
                        case 'flyer': renderFlyers(); break;
                        case 'activity': renderActivities(); break;
                        case 'booklet': renderBooklets(); break;
                    }
                };

                let dataArray = getDataArray();
                const itemIndex = dataArray.findIndex(i => i.id == id);
                if (itemIndex === -1) return;

                dataArray[itemIndex].title = data.title;
                dataArray[itemIndex].description = data.description;
                
                if (data.file) {
                    const fileUrl = URL.createObjectURL(data.file);
                    if (type === 'sermon') {
                         if (dataArray[itemIndex].mediaUrl) URL.revokeObjectURL(dataArray[itemIndex].mediaUrl);
                         dataArray[itemIndex].mediaUrl = fileUrl;
                         dataArray[itemIndex].mediaType = data.file.type;
                    } else if (type === 'flyer') {
                        if (dataArray[itemIndex].imageUrl && dataArray[itemIndex].imageUrl.startsWith('blob:')) URL.revokeObjectURL(dataArray[itemIndex].imageUrl);
                        dataArray[itemIndex].imageUrl = fileUrl;
                    } else if (type === 'booklet') {
                        if (dataArray[itemIndex].fileUrl) URL.revokeObjectURL(dataArray[itemIndex].fileUrl);
                        dataArray[itemIndex].fileUrl = fileUrl;
                    }
                }
                renderFunction();
            }

            function populateEditForm(type, id) {
                 const getDataArray = () => {
                    switch (type) {
                        case 'sermon': return sermonsData;
                        case 'flyer': return flyersData;
                        case 'activity': return activitiesData;
                        case 'booklet': return bookletsData;
                    }
                };
                let dataArray = getDataArray();
                const item = dataArray.find(i => i.id == id);
                if (!item) return;

                editingState = { type, id };
                document.getElementById('modal-title').textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
                document.getElementById('submit-upload-btn').textContent = 'Save Changes';
                document.getElementById('content-type').value = type;
                document.getElementById('content-type').disabled = true;
                document.getElementById('content-title').value = item.title;
                document.getElementById('content-description').value = item.description;

                uploadModal.open();
            }
            
            function showDeleteConfirmation(type, id) {
                const confirmBtn = document.getElementById('confirm-delete-btn');
                confirmModal.open();

                // Clone and replace the button to remove old event listeners
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

                newConfirmBtn.addEventListener('click', () => {
                    deleteItem(type, id);
                    confirmModal.close();
                });
            }

            function deleteItem(type, id) {
                switch (type) {
                    case 'sermon': 
                        sermonsData = sermonsData.filter(i => i.id != id);
                        renderSermons();
                        break;
                    case 'flyer':
                        flyersData = flyersData.filter(i => i.id != id);
                        renderFlyers();
                        break;
                    case 'activity':
                        activitiesData = activitiesData.filter(i => i.id != id);
                        renderActivities();
                        break;
                    case 'booklet':
                        bookletsData = bookletsData.filter(i => i.id != id);
                        renderBooklets();
                        break;
                }
            }


            // --- GLOBAL CLICK HANDLER ---
            document.body.addEventListener('click', (e) => {
                const sermonLink = e.target.closest('.sermon-link');
                const editBtn = e.target.closest('.edit-btn');
                const deleteBtn = e.target.closest('.delete-btn');

                if (sermonLink) {
                    e.preventDefault();
                    showSermonPlayer(sermonLink.dataset.id);
                    window.scrollTo(0, 0);
                } else if (editBtn) {
                    populateEditForm(editBtn.dataset.type, editBtn.dataset.id);
                } else if (deleteBtn) {
                    showDeleteConfirmation(deleteBtn.dataset.type, deleteBtn.dataset.id);
                }
            });
            
            // --- Initial Load ---
            renderAllContent();
            handleRouteChange(); 
            checkAdminLogin(); 
        });