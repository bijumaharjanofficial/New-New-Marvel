// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const heroSlider = document.querySelector('.hero-slider');
const featuredGrid = document.querySelector('.featured-grid');

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
    
    // Return the first path that exists or placeholder
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

// Theme Toggle
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update icon
    const icon = themeToggle.querySelector('i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
const icon = themeToggle.querySelector('i');
icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

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

// Hero Slider
async function loadHeroSlider() {
    try {
        // Use placeholder images
        const slides = [
            {
                image: 'assets/images/marvel-hero-slider-001.jpeg',
                title: 'Marvel Universe',
                description: 'Explore the world of Marvel heroes'
            },
            {
                image: 'assets/images/dc-hero-slider-001.jpeg',
                title: 'DC Universe',
                description: 'Discover the legends of DC comics'
            },
            {
                image: 'assets/images/superhero-slider-001.jpeg',
                title: 'Superhero Hub',
                description: 'Your ultimate guide to superheroes'
            }
        ];

        // Create slides
        slides.forEach((slide, index) => {
            const slideElement = document.createElement('div');
            slideElement.className = `slide ${index === 0 ? 'active' : ''}`;
            slideElement.style.backgroundImage = `url('${slide.image}')`;
            slideElement.setAttribute('data-index', index);

            const slideContent = document.createElement('div');
            slideContent.className = 'slide-content';
            slideContent.innerHTML = `
                <div class="slide-text">
                    <h2>${slide.title}</h2>
                    <p>${slide.description}</p>
                </div>
            `;

            slideElement.appendChild(slideContent);
            heroSlider.appendChild(slideElement);
        });

        // Start slider animation
        startSlider();
    } catch (error) {
        console.error('Error loading hero slider:', error);
        // Fallback slides
        const fallbackSlides = [
            {
                image: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
                title: 'Marvel Universe',
                description: 'Explore the world of Marvel heroes'
            },
            {
                image: 'https://images.unsplash.com/photo-1620336655055-bd87c5d1d73f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
                title: 'DC Universe',
                description: 'Discover the legends of DC comics'
            }
        ];

        fallbackSlides.forEach((slide, index) => {
            const slideElement = document.createElement('div');
            slideElement.className = `slide ${index === 0 ? 'active' : ''}`;
            slideElement.style.backgroundImage = `url('${slide.image}')`;
            heroSlider.appendChild(slideElement);
        });

        startSlider();
    }
}

function startSlider() {
    const slides = document.querySelectorAll('.slide');
    if (slides.length === 0) return;

    let currentSlide = 0;

    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

// Load Featured Characters
async function loadFeaturedCharacters() {
    try {
        const response = await fetch('data/data.json');
        const data = await response.json();

        // Build character map and resolve references
        const { characters } = processAllCharacters(data);

        // Select featured characters: one from each major series
        const featuredChars = getFeaturedCharactersBySeries(characters);

        // Display featured characters
        displayFeaturedCharacters(featuredChars);
    } catch (error) {
        console.error('Error loading featured characters:', error);
        featuredGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load featured characters. Please try again later.</p>
            </div>
        `;
    }
}

// Get one featured character from each major series
function getFeaturedCharactersBySeries(characters) {
    // Define priority series for each universe
    const prioritySeries = {
        'DC': ['Batman Series', 'Superman Series', 'Justice League Series'],
        'Marvel': ['Avengers Series'],
        'Anime': ['Naruto Series', 'One Piece Series', 'Demon Slayer Series']
    };

    const featured = [];
    const usedCharacterIds = new Set();

    // For each universe, get one character from each priority series
    Object.entries(prioritySeries).forEach(([universe, seriesList]) => {
        seriesList.forEach(seriesName => {
            // Find characters in this universe and series
            const seriesChars = characters.filter(char => 
                char.universe === universe && 
                char.seriesNames && 
                char.seriesNames.includes(seriesName) &&
                !usedCharacterIds.has(char.id)
            );
            
            if (seriesChars.length > 0) {
                // Get the highest rated character from this series
                const bestChar = seriesChars.reduce((best, current) =>
                    parseFloat(current.rating) > parseFloat(best.rating) ? current : best
                );
                
                featured.push(bestChar);
                usedCharacterIds.add(bestChar.id);
            }
        });
    });

    // If we don't have enough featured characters, add more
    if (featured.length < 6) {
        const remainingChars = characters.filter(char => !usedCharacterIds.has(char.id));
        remainingChars
            .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
            .slice(0, 6 - featured.length)
            .forEach(char => {
                featured.push(char);
                usedCharacterIds.add(char.id);
            });
    }

    return featured.slice(0, 6);
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

    // Convert map to array
    for (const charId in characterMap) {
        const charData = characterMap[charId];

        // Add default rating if not present
        if (!charData.rating) {
            charData.rating = (Math.random() * 2 + 8).toFixed(1);
        }

        // Add logo if not present
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

// Display featured characters
function displayFeaturedCharacters(characters) {
    if (!characters || characters.length === 0) {
        featuredGrid.innerHTML = '<p class="no-featured">No featured characters available.</p>';
        return;
    }
    
    featuredGrid.innerHTML = '';
    
    characters.forEach((character, index) => {
        const characterCard = document.createElement('div');
        characterCard.className = 'featured-card';
        characterCard.style.animationDelay = `${index * 0.1}s`;
        
        // Use LOGO for the card image
        const imageUrl = getCharacterLogo(character);
        
        // Get primary series name
        const primarySeries = character.originalSeries || character.seriesNames?.[0] || 'Unknown';
        
        characterCard.innerHTML = `
            <div class="featured-image">
                <img src="${imageUrl}" alt="${character.name}" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x400/1a1a2e/ffffff?text=${encodeURIComponent(character.name.charAt(0))}'">
                <span class="featured-universe ${character.universe ? character.universe.toLowerCase() : 'unknown'}">
                    ${character.universe || 'Unknown'}
                </span>
            </div>
            <div class="featured-content">
                <h3>${character.name}</h3>
                <p class="featured-alias">${character.alias ? character.alias[0] : character.title ? character.title[0] : ''}</p>
                <div class="featured-rating">
                    <div class="stars">
                        ${getStarRating(character.rating)}
                    </div>
                    <span class="rating-value">${character.rating}/10</span>
                </div>
                <div class="featured-tags">
                    <span class="tag">${primarySeries}</span>
                    <span class="tag">${character.universe}</span>
                </div>
            </div>
        `;
        
        // Add click event to redirect to search page with character filter
        characterCard.addEventListener('click', () => {
            window.location.href = `search.html?character=${character.id}`;
        });
        
        featuredGrid.appendChild(characterCard);
    });
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHeroSlider();
    loadFeaturedCharacters();

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
});