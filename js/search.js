// DOM Elements
const searchInput = document.getElementById('searchInput');
const hamburger = document.querySelector('.hamburger');
const clearSearch = document.getElementById('clearSearch');
const universeFilter = document.getElementById('universeFilter');
const seriesFilter = document.getElementById('seriesFilter');
const sortFilter = document.getElementById('sortFilter');
const charactersGrid = document.getElementById('charactersGrid');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const resultsCount = document.getElementById('resultsCount');
const viewButtons = document.querySelectorAll('.view-btn');
const characterModal = document.getElementById('characterModal');
const modalClose = document.getElementById('modalClose');
const modalContent = document.querySelector('.modal-content');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');
const imageModal = document.getElementById('imageModal');
const imageModalClose = document.querySelector('.image-modal-close');
const modalImage = document.getElementById('modalImage');
const imageModalCaption = document.querySelector('.image-modal-caption');

// Global Variables
let allCharacters = [];
let characterMap = {};
let allSeriesMap = {};
let filteredCharacters = [];
let currentCharacterIndex = -1;
let currentCharacterList = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadCharacters();
    setupEventListeners();
    setupTheme();
    checkUrlForCharacter();
});

// Mobile Menu Toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close menu when clicking links
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Image Path Helpers - FIXED LOGO PATHS
function getCharacterLogo(character) {
    // If logo is already a full path, use it
    if (character.logo && character.logo.includes('/')) {
        return character.logo;
    }

    // Try to extract character name from ID for logo
    const charName = character.name?.toLowerCase().replace(/\s+/g, '_') || 'default';
    const characterId = character.id || '';
    
    // Try different possible logo locations
    const possiblePaths = [
        `assets/images/logos/${charName}_logo.jpeg`,
        `assets/images/logos/${characterId.replace('-', '_')}_logo.jpeg`,
        `assets/images/logos/${characterId}_logo.jpeg`,
        character.universe === 'Marvel' 
            ? 'assets/images/logos/marvel_logo.jpeg'
            : character.universe === 'DC'
                ? 'assets/images/logos/dc_logo.jpeg'
                : 'assets/images/logos/anime_logo.jpeg',
        `https://via.placeholder.com/300x400/1a1a2e/ffffff?text=${encodeURIComponent(character.name.charAt(0))}`
    ];

    return possiblePaths[0];
}

function getGalleryImagePath(imageFilename, characterId) {
    // If it's already a full path, use it
    if (imageFilename.includes('/')) {
        return imageFilename;
    }

    // Try different possible locations
    const possiblePaths = [
        `assets/images/characters/${imageFilename}`,
        `assets/images/gallery/${imageFilename}`,
        imageFilename,
        `https://via.placeholder.com/600x800/1a1a2e/ffffff?text=${encodeURIComponent(imageFilename.split('.')[0])}`
    ];

    return possiblePaths[0];
}

// Load all characters from data.json with reference resolution
async function loadCharacters() {
    try {
        const response = await fetch('data/data.json');
        const data = await response.json();

        // Build character map and resolve references
        const { characters, characterMap: map, seriesMap } = processAllCharacters(data);
        allCharacters = characters;
        characterMap = map;
        allSeriesMap = seriesMap;

        // Get unique series for filter
        const seriesSet = new Set(['all']);
        Object.values(allSeriesMap).forEach(seriesName => {
            seriesSet.add(seriesName);
        });

        // Populate series filter
        populateSeriesFilter([...seriesSet]);

        // Initial render
        filteredCharacters = [...allCharacters];
        renderCharacters();
        updateResultsCount();

        // Hide loading
        loading.style.display = 'none';

    } catch (error) {
        console.error('Error loading characters:', error);
        loading.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading characters. Please try again later.</p>
            </div>
        `;
    }
}

// Process all characters from all worlds and resolve references
function processAllCharacters(data) {
    const characterMap = {};
    const seriesMap = {};
    const allCharacters = [];

    // First pass: build map of all non-reference characters and collect series info
    data.Worlds.forEach(world => {
        world.series.forEach(series => {
            // Store series info
            seriesMap[series.id] = series.name;

            series.characters.forEach(character => {
                if (!character.reference) {
                    // Initialize character with appearances array
                    const charWithMetadata = {
                        ...character,
                        universe: world.name,
                        originalSeries: series.name,
                        seriesId: series.id,
                        appearsIn: [series.id]
                    };

                    if (!characterMap[character.id]) {
                        characterMap[character.id] = charWithMetadata;
                    } else {
                        if (!characterMap[character.id].appearsIn.includes(series.id)) {
                            characterMap[character.id].appearsIn.push(series.id);
                        }
                    }
                }
            });
        });
    });

    // Second pass: handle references
    data.Worlds.forEach(world => {
        world.series.forEach(series => {
            series.characters.forEach(character => {
                if (character.reference) {
                    const charId = character.character_id;
                    if (characterMap[charId]) {
                        if (!characterMap[charId].appearsIn.includes(series.id)) {
                            characterMap[charId].appearsIn.push(series.id);
                        }
                    }
                }
            });
        });
    });

    // Convert map to array and add metadata
    for (const charId in characterMap) {
        const charData = characterMap[charId];

        // Add default rating if not present
        if (!charData.rating) {
            charData.rating = (Math.random() * 2 + 8).toFixed(1);
        }

        // Add default logo if not present
        if (!charData.logo) {
            charData.logo = getCharacterLogo(charData);
        }

        // Get series names for this character
        const seriesNames = charData.appearsIn.map(seriesId => seriesMap[seriesId] || 'Unknown');
        charData.seriesNames = seriesNames;

        // Add to final array
        allCharacters.push({
            id: charId,
            ...charData
        });
    }

    return { characters: allCharacters, characterMap, seriesMap };
}

// Populate series filter
function populateSeriesFilter(seriesList) {
    seriesFilter.innerHTML = '<option value="all">All Series</option>';
    seriesList.forEach(series => {
        if (series !== 'all') {
            const option = document.createElement('option');
            option.value = series;
            option.textContent = series;
            seriesFilter.appendChild(option);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', debounce(filterCharacters, 300));

    // Clear search
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        filterCharacters();
        searchInput.focus();
    });

    // Filters
    universeFilter.addEventListener('change', filterCharacters);
    seriesFilter.addEventListener('change', filterCharacters);
    sortFilter.addEventListener('change', filterCharacters);

    // View toggle
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            charactersGrid.className = `characters-grid ${btn.dataset.view}-view`;
        });
    });

    // Modal close
    modalClose.addEventListener('click', closeModal);
    characterModal.querySelector('.modal-overlay').addEventListener('click', closeModal);

    // Modal navigation
    modalPrev.addEventListener('click', showPreviousCharacter);
    modalNext.addEventListener('click', showNextCharacter);

    // Image modal
    imageModalClose.addEventListener('click', closeImageModal);
    imageModal.querySelector('.image-modal-overlay').addEventListener('click', closeImageModal);

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeImageModal();
        }
    });
}

// Setup theme
function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';

    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = themeToggle.querySelector('i');

    // Set correct icon based on theme
    if (savedTheme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        const icon = themeToggle.querySelector('i');
        // Toggle icons correctly
        if (newTheme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    });
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Filter characters based on search and filters
function filterCharacters() {
    const searchTerm = searchInput.value.toLowerCase();
    const universe = universeFilter.value;
    const series = seriesFilter.value;
    const sortBy = sortFilter.value;

    filteredCharacters = allCharacters.filter(character => {
        // Search filter
        const matchesSearch = searchTerm === '' ||
            character.name.toLowerCase().includes(searchTerm) ||
            (character.alias && character.alias.some(alias => alias.toLowerCase().includes(searchTerm))) ||
            (character.title && character.title.some(title => title.toLowerCase().includes(searchTerm))) ||
            (character.abilities && character.abilities.some(ability =>
                ability.name.toLowerCase().includes(searchTerm) ||
                ability.short_description.toLowerCase().includes(searchTerm)
            ));

        // Universe filter
        const matchesUniverse = universe === 'all' || character.universe === universe;

        // Series filter - check if character appears in the selected series
        const matchesSeries = series === 'all' ||
            (character.seriesNames && character.seriesNames.includes(series));

        return matchesSearch && matchesUniverse && matchesSeries;
    });

    // Sort characters
    sortCharacters(sortBy);

    // Render results
    renderCharacters();
    updateResultsCount();
}

// Sort characters
function sortCharacters(sortBy) {
    switch (sortBy) {
        case 'name':
            filteredCharacters.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'rating':
            filteredCharacters.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
            break;
        case 'universe':
            filteredCharacters.sort((a, b) => a.universe.localeCompare(b.universe) || a.name.localeCompare(b.name));
            break;
    }
}

// Render character cards
function renderCharacters() {
    charactersGrid.innerHTML = '';

    if (filteredCharacters.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    filteredCharacters.forEach((character, index) => {
        const card = createCharacterCard(character, index);
        charactersGrid.appendChild(card);
    });
}

// Create character card element
function createCharacterCard(character, index) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.index = index;

    // Use LOGO for the card image
    const imageUrl = getCharacterLogo(character);

    // Get primary series name for display
    const primarySeries = character.originalSeries || character.seriesNames?.[0] || 'Unknown';

    card.innerHTML = `
        <div class="character-image">
            <img src="${imageUrl}" alt="${character.name}" 
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/300x400/1a1a2e/ffffff?text=${encodeURIComponent(character.name.charAt(0))}'">
            <span class="character-universe ${character.universe ? character.universe.toLowerCase() : 'unknown'}">
                ${character.universe || 'Unknown'}
            </span>
        </div>
        <div class="character-content">
            <h3 class="character-name">${character.name}</h3>
            <p class="character-alias">
                ${character.alias && character.alias.length > 0 ? character.alias[0] : ''}
            </p>
            <div class="character-rating">
                <div class="stars">
                    ${getStarRating(character.rating)}
                </div>
                <span class="rating-value">${character.rating}/10</span>
            </div>
            <div class="character-tags">
                <span class="tag">${primarySeries}</span>
                ${character.seriesNames && character.seriesNames.length > 1
            ? `<span class="tag">+${character.seriesNames.length - 1} more</span>`
            : ''}
            </div>
        </div>
        <div class="character-actions">
            <button class="view-details-btn">
                <i class="fas fa-eye"></i> View Details
            </button>
        </div>
    `;

    // Add click event
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.view-details-btn')) {
            openCharacterModal(index);
        }
    });

    // View details button
    card.querySelector('.view-details-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openCharacterModal(index);
    });

    return card;
}

// Helper function to create star rating display
function getStarRating(rating) {
    const numericRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }

    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }

    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }

    return stars;
}

// Update results count
function updateResultsCount() {
    resultsCount.textContent = `${filteredCharacters.length} character${filteredCharacters.length !== 1 ? 's' : ''} found`;
}

// Open character modal
function openCharacterModal(index) {
    currentCharacterIndex = parseInt(index);
    currentCharacterList = filteredCharacters;

    const character = filteredCharacters[index];
    renderModalContent(character);
    characterModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Load videos for this character
    loadCharacterVideos(character.id);
}

// Render modal content
function renderModalContent(character) {
    // For modal main image: use first gallery image or logo
    let mainImageUrl;
    if (character.gallery && character.gallery.length > 0) {
        mainImageUrl = getGalleryImagePath(character.gallery[0], character.id);
    } else {
        mainImageUrl = getCharacterLogo(character);
    }

    modalContent.innerHTML = `
        <div class="modal-character">
            <div class="modal-character-image">
                <img src="${mainImageUrl}" alt="${character.name}" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/350x450/1a1a2e/ffffff?text=${encodeURIComponent(character.name.charAt(0))}'">
            </div>
            <div class="modal-character-info">
                <h2>${character.name}</h2>
                <p class="modal-character-alias">
                    ${character.alias ? character.alias.join(' • ') : ''}
                </p>
                <div class="modal-rating">
                    <div class="rating-stars">
                        ${getStarRating(character.rating)}
                    </div>
                    <span class="rating-value">${character.rating}/10</span>
                </div>
                <span class="modal-universe ${character.universe ? character.universe.toLowerCase() : 'unknown'}">
                    ${character.universe || 'Unknown'} Universe
                </span>
                <div class="modal-series">
                    <p><strong>Appears in:</strong> ${character.seriesNames ? character.seriesNames.join(', ') : 'Unknown'}</p>
                </div>
                <div class="modal-description">
                    <p>${character.title ? character.title.join(' • ') : ''}</p>
                </div>
            </div>
        </div>
        
        ${character.appearance ? `
        <div class="modal-section">
            <h3><i class="fas fa-user"></i> Appearance</h3>
            <div class="appearance-grid">
                ${renderAppearance(character.appearance)}
            </div>
        </div>` : ''}
        
        ${character.armor_costume && character.armor_costume.length > 0 ? `
        <div class="modal-section">
            <h3><i class="fas fa-shield-alt"></i> Armor & Costume</h3>
            <div class="abilities-grid">
                ${renderArmor(character.armor_costume)}
            </div>
        </div>` : ''}
        
        ${character.abilities && character.abilities.length > 0 ? `
        <div class="modal-section">
            <h3><i class="fas fa-bolt"></i> Abilities</h3>
            <div class="abilities-grid">
                ${renderAbilities(character.abilities)}
            </div>
        </div>` : ''}
        
        ${character.gallery && character.gallery.length > 0 ? `
        <div class="modal-section">
            <h3><i class="fas fa-images"></i> Gallery</h3>
            <div class="image-slider">
                <div class="slider-container" id="gallerySlider">
                    ${renderGallery(character.gallery, character.id)}
                </div>
            </div>
        </div>` : ''}
        
        <div class="modal-section">
            <h3><i class="fas fa-video"></i> Recommended Videos</h3>
            <div class="videos-grid" id="videosGrid">
                <!-- Videos will be loaded here -->
            </div>
        </div>
    `;

    // Add click events to gallery images - FIXED GALLERY CLICK
    const gallerySlider = document.getElementById('gallerySlider');
    if (gallerySlider) {
        gallerySlider.querySelectorAll('.slider-image').forEach((sliderImg, imgIndex) => {
            const imgElement = sliderImg.querySelector('img');
            const imagePath = getGalleryImagePath(character.gallery[imgIndex], character.id);
            
            sliderImg.addEventListener('click', (e) => {
                e.stopPropagation();
                openImageModal(imagePath, character.name);
            });
            
            // Also make the overlay clickable
            const overlay = sliderImg.querySelector('.slider-image-overlay');
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openImageModal(imagePath, character.name);
                });
            }
        });
    }

    // Update modal navigation buttons
    updateModalNavigation();
}

// Render appearance details
function renderAppearance(appearance) {
    if (!appearance) return '<p>No appearance data available.</p>';

    let html = '';

    // Helper function to render a body part
    const renderBodyPart = (part, title) => {
        if (!part) return '';

        return Object.entries(part).map(([key, value]) => `
            <div class="appearance-item">
                <h4>${key.replace('_', ' ').toUpperCase()}</h4>
                <p>${value}</p>
            </div>
        `).join('');
    };

    // Render head, body, and lower_body
    html += renderBodyPart(appearance.head, 'Head');
    html += renderBodyPart(appearance.body, 'Body');
    html += renderBodyPart(appearance.lower_body, 'Lower Body');

    return html || '<p>No detailed appearance data available.</p>';
}

// Render armor details
function renderArmor(armor) {
    if (!armor || !Array.isArray(armor)) {
        return '<p>No armor data available.</p>';
    }

    return armor.map(item => {
        const key = Object.keys(item)[0];
        const value = item[key];
        return `
            <div class="ability-card">
                <h4>
                    <span class="ability-name">${key.replace('_', ' ').toUpperCase()}</span>
                </h4>
                <p class="ability-desc">${value}</p>
            </div>
        `;
    }).join('');
}

// Render abilities
function renderAbilities(abilities) {
    if (!abilities || !Array.isArray(abilities)) {
        return '<p>No abilities data available.</p>';
    }

    return abilities.map(ability => `
        <div class="ability-card">
            <h4>
                <span class="ability-name">${ability.name}</span>
                <span class="ability-type ${ability.type}">${ability.type ? ability.type.toUpperCase() : 'UNKNOWN'}</span>
            </h4>
            <p class="ability-desc">${ability.short_description || 'No description available.'}</p>
            ${ability.full_description ? `<p class="ability-full">${ability.full_description}</p>` : ''}
        </div>
    `).join('');
}

// Render gallery - FIXED GALLERY RENDERING
function renderGallery(gallery, characterId) {
    if (!gallery || !Array.isArray(gallery)) {
        return '<p>No gallery images available.</p>';
    }
    
    return gallery.map((img, index) => {
        const imgPath = getGalleryImagePath(img, characterId);
        const imgName = img.split('/').pop() || `Image ${index + 1}`;
        
        return `
            <div class="slider-image" data-index="${index}">
                <img src="${imgPath}" alt="${characterId} gallery image ${index + 1}" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/220x180/1a1a2e/ffffff?text=Gallery'">
                <div class="slider-image-overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
        `;
    }).join('');
}

// Load character-specific videos
async function loadCharacterVideos(characterId) {
    const videosGrid = document.getElementById('videosGrid');
    videosGrid.innerHTML = '<div class="loading-videos"><i class="fas fa-spinner fa-spin"></i> Loading videos...</div>';

    try {
        const response = await fetch('data/videos.json');
        const data = await response.json();

        // Filter videos for this specific character
        const characterVideos = data.videos.filter(video =>
            video.character_id === characterId
        );

        if (characterVideos.length === 0) {
            // Smart fallback: Get videos from the same universe or related characters
            const relatedVideos = getSmartFallbackVideos(characterId, data.videos);
            if (relatedVideos.length > 0) {
                displayVideos(relatedVideos);
            } else {
                videosGrid.innerHTML = '<p class="no-videos">No videos available for this character.</p>';
            }
            return;
        }

        displayVideos(characterVideos);

    } catch (error) {
        console.error('Error loading videos:', error);
        videosGrid.innerHTML = '<p class="no-videos">Unable to load videos at this time.</p>';
    }
}

// Smart fallback videos system
function getSmartFallbackVideos(characterId, allVideos) {
    const character = allCharacters.find(c => c.id === characterId);
    if (!character) return [];

    const fallbackVideos = [];
    const seenVideoIds = new Set();

    // Priority 1: Videos from same series
    if (character.seriesNames) {
        const sameSeriesCharacters = allCharacters.filter(c =>
            c.seriesNames && c.seriesNames.some(s => character.seriesNames.includes(s)) &&
            c.id !== characterId
        );

        sameSeriesCharacters.forEach(char => {
            const charVideos = allVideos.filter(v => v.character_id === char.id);
            charVideos.forEach(video => {
                if (fallbackVideos.length < 3 && !seenVideoIds.has(video.youtube_id)) {
                    fallbackVideos.push(video);
                    seenVideoIds.add(video.youtube_id);
                }
            });
        });
    }

    // Priority 2: Videos from same universe
    if (fallbackVideos.length < 3) {
        const sameUniverseCharacters = allCharacters.filter(c =>
            c.universe === character.universe &&
            c.id !== characterId
        );

        sameUniverseCharacters.forEach(char => {
            const charVideos = allVideos.filter(v => v.character_id === char.id);
            charVideos.forEach(video => {
                if (fallbackVideos.length < 3 && !seenVideoIds.has(video.youtube_id)) {
                    fallbackVideos.push(video);
                    seenVideoIds.add(video.youtube_id);
                }
            });
        });
    }

    return fallbackVideos;
}

// Helper function to display videos
function displayVideos(videos) {
    const videosGrid = document.getElementById('videosGrid');

    if (!videos || videos.length === 0) {
        videosGrid.innerHTML = '<p class="no-videos">No videos available for this character.</p>';
        return;
    }

    // Limit to 3 videos
    const displayVideos = videos.slice(0, 3);

    videosGrid.innerHTML = displayVideos.map(video => `
        <div class="video-card" onclick="window.open('https://www.youtube.com/watch?v=${video.youtube_id}', '_blank')">
            <div class="video-thumbnail" style="background-image: url('https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg')">
                <div class="video-play">
                    <i class="fas fa-play"></i>
                </div>
                <div class="video-duration">
                    <span>${video.duration}</span>
                </div>
            </div>
            <div class="video-info">
                <h4>${video.title}</h4>
                <div class="video-meta">
                    <span><i class="far fa-eye"></i> ${video.views}</span>
                    <span><i class="far fa-clock"></i> ${video.duration}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Open image modal - FIXED FUNCTION
function openImageModal(imageUrl, characterName = '') {
    modalImage.src = imageUrl;
    modalImage.onerror = function() {
        this.src = 'https://via.placeholder.com/800x600/1a1a2e/ffffff?text=Image+Not+Found';
    };
    
    // if (imageModalCaption) {
    //     imageModalCaption.textContent = characterName ? `Image of ${characterName}` : 'Gallery Image';
    // }
    
    imageModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close image modal
function closeImageModal() {
    imageModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Update modal navigation buttons
function updateModalNavigation() {
    modalPrev.disabled = currentCharacterIndex <= 0;
    modalNext.disabled = currentCharacterIndex >= currentCharacterList.length - 1;
}

// Show previous character
function showPreviousCharacter() {
    if (currentCharacterIndex > 0) {
        currentCharacterIndex--;
        const character = currentCharacterList[currentCharacterIndex];
        renderModalContent(character);
        loadCharacterVideos(character.id);
    }
}

// Show next character
function showNextCharacter() {
    if (currentCharacterIndex < currentCharacterList.length - 1) {
        currentCharacterIndex++;
        const character = currentCharacterList[currentCharacterIndex];
        renderModalContent(character);
        loadCharacterVideos(character.id);
    }
}

// Close modal
function closeModal() {
    characterModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Check URL for character parameter
function checkUrlForCharacter() {
    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');

    if (characterId) {
        // Find character by ID
        const characterIndex = allCharacters.findIndex(char => char.id === characterId);
        if (characterIndex !== -1) {
            // Find character in filtered list
            const filteredIndex = filteredCharacters.findIndex(char => char.id === characterId);
            if (filteredIndex !== -1) {
                openCharacterModal(filteredIndex);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {

    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking links
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
    
    // Close modals on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Close any open modals
            const modals = document.querySelectorAll('.modal, .image-modal');
            modals.forEach(modal => {
                if (modal.style.display === 'flex' || modal.style.display === 'block') {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        }
    });
});