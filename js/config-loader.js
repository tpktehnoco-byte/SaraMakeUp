
const DEFAULT_LANGUAGE = 'de';
let currentLanguage = localStorage.getItem('selectedLanguage') || DEFAULT_LANGUAGE;
let translations = null; // samo ovdje
let pack = null;
let langData = null;
let packages = null;
const packagesContainer = document.getElementById('packages-container');
const bookingForm = document.getElementById('booking-form');
const bookingFormButton = document.getElementById('submitBtn');
const loadPacks = document.getElementById('loadPacks');
const successMessage = document.querySelector(".success-message");
const selectedPackageName = document.getElementById('selected-package-name');
const packageIdInput = document.getElementById('package-id-input');
const modaloverlay = document.getElementById("modal-overlay");
const dyn = document.querySelector(".dyn-container");
const heroslider = document.getElementById("hero-slider");
const filterButtons = document.querySelectorAll('.filter-btn');
let slides = [];
let currentSlide = 0;
let slideInterval = null;
let sliderContainer;
let allImages = [];
let lastFocusedElement;
const API_KEY = 'AIzaSyC0vpKBRl6jL7CzRFWU1STXJopGt4u86Io';
const ROOT_FOLDER_ID = '1yBKwuMbTD4Qjy-UVnKtb2qigX98y8sUA';
const CATEGORY_MAP = {
    'Studio Shooting Make-Up': 'studio-shooting',
    'Shooting Make-Up': 'photoshoot',
    'Bridal Make-Up': 'bridal',
    'Event Make-Up': 'event'
};
/**
 * Kreira HTML element sa zadatim atributima i sadržajem.
 * @param {string} tag - HTML tag (npr. 'div', 'button').
 * @param {object} attrs - Objekat sa atributima (npr. { class: 'my-class', id: 'my-id' }).
 * @param {string} content - Sadržaj elementa (može sadržati HTML).
 * @returns {HTMLElement}
 */
function createElement(tag, attrs = {}, content = '') {
    const el = document.createElement(tag);
    for (const key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
    if (content) {
        // Koristimo innerHTML za sadržaj sa ikonama, ali je bezbedno jer mi ga kontrolišemo
        el.innerHTML = content;
    }
    return el;
}
/**
 * Sprječava fokus da napusti modal koristeći Tab i Shift+Tab.
 * Zatvara modal na pritisak tastera Escape.
 */
function trapFocus(e) {
    const modal = e.currentTarget;
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    if (e.key === 'Escape') {
        // Pozovi showDialog(null) da zatvoriš modal
        // Ovo će automatski očistiti i event listener
        showDialog(null);
    }
}
async function setLanguage(lang) {
    try {
        if (!translations) {
            const res = await fetch('global.json');
            translations = await res.json();
        }
        if (!pack) {
            const res1 = await fetch('data.json');
            pack = await res1.json();
        }
        langData = translations[lang];
        if (!langData) {
            console.error(`Language '${lang}' not found. Falling back to '${DEFAULT_LANGUAGE}'.`);
            lang = DEFAULT_LANGUAGE;
            langData = translations[lang];
        }
        const pcgLang = pack[lang];
        packages = pcgLang.packages;
        if (!pcgLang) {
            console.error(`Language '${lang}' not found. Falling back to '${DEFAULT_LANGUAGE}'.`);
            lang = DEFAULT_LANGUAGE;
            pcgLang = packages[lang];
        }
        if (!pcgLang) {
            packagesContainer.innerHTML = "<p>Pakete konnten nicht geladen werden.</p>";
            return;
        }
        localStorage.setItem('selectedLanguage', lang);
        document.documentElement.lang = lang;
        let canonicalUrl = 'https://tpktehnoco-byte.github.io/sara/';
        if (lang !== 'de') {
            canonicalUrl += lang + '/'; // npr. .../sara/en/
        }
        let linkTag = document.querySelector('link[rel="canonical"]');
        if (linkTag) {
            linkTag.href = canonicalUrl;
        } else {
            linkTag = document.createElement('link');
            linkTag.rel = 'canonical';
            linkTag.href = canonicalUrl;
            document.head.appendChild(linkTag);
        }
        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const path = el.getAttribute('data-translate-key').split('.');
            let value = langData;
            for (const k of path) value = value?.[k];
            if (value != null) el.textContent = value;
        }); document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang, langData } }));
    } catch (err) {
        console.error("Could not load translations:", err);
    }
}
async function pcgLoader() {
    // Priprema kontejnera
    packagesContainer.innerHTML = '';

    // Intro Paketi
    const intro = createElement('div', { class: 'package-card' });
    intro.appendChild(createElement('h3', {}, langData.booking.pageTitle));
    intro.appendChild(createElement('p', {}, langData.booking.introText));
    intro.appendChild(createElement('a', { href: 'mailto:paintedbysara@hotmail.com', 'aria-label': 'E-Mail an paintedbysara@hotmail.com senden' }, langData.booking.textMail));
    packagesContainer.appendChild(intro);

    // Paketi
    packages.forEach(pkg => {
        const packageCard = createElement('div', { class: 'package-card' });

        packageCard.appendChild(createElement('h3', {}, pkg.name));
        packageCard.appendChild(createElement('h4', { class: 'price' }, pkg.price));
        packageCard.appendChild(createElement('h5', { class: 'duration' }, pkg.duration));
        packageCard.appendChild(createElement('p', { class: 'description' }, pkg.description));

        const bookButton = createElement('button', { class: 'styleMeniBtn', 'data-packages-id': pkg.id }, langData.navigator.Booking2);
        bookButton.addEventListener('click', openBookingModal);
        packageCard.appendChild(bookButton);

        if (pkg.details && pkg.details.trim() !== "") {
            const extraBtn = createElement('button', {
                class: 'styleMeniBtn extraBtn',
                'data-packages-id': pkg.id,
                'data-packages-name': pkg.name,
                'data-packages-details': pkg.details,
                'data-packages-img': pkg.img,
                'data-packages-duration': pkg.duration
            }, langData.booking.extraBtn);
            extraBtn.addEventListener('click', loadPacketContent);
            packageCard.appendChild(extraBtn);
        }

        packagesContainer.appendChild(packageCard);
    });
}
function loadPacketContent(event) {
    try {
        const button = event.target;
        const packageId = button.getAttribute('data-packages-id');
        const packageName = button.getAttribute('data-packages-name');
        const packageduration = button.getAttribute('data-packages-duration');
        const packageimg = button.getAttribute('data-packages-img');
        const packagedetails = button.getAttribute('data-packages-details');
        document.querySelector('#modal-title').textContent = packageName;
        document.querySelector('#modal-subtitle').textContent = packageduration;
        document.querySelector('#modal-text').innerHTML = packagedetails;
        const img = document.querySelector('#modal-image');
        img.src = packageimg;
        img.alt = packageId;
        showDialog('modal');
        // Fokus na naslov sekcije za bolju pristupačnost
        const heading = document.querySelector("#modal-subtitle");
        if (heading) { setTimeout(() => heading.focus(), 300); }
    } catch (err) { console.error("Greška pri učitavanju sadržaja:", err); }
}
function openBookingModal(event) {
    const button = event.target;
    const packageId = button.getAttribute('data-packages-id');
    const packageName = button.parentElement.querySelector('h3').textContent;
    packageIdInput.value = packageId;
    selectedPackageName.textContent = `Pakete: ${packageName}`;
    bookingFormButton.disabled = false;
    showDialog('booking-modal');
}
async function initSlider() {
    try {
        sliderContainer = document.querySelector('.hero-slider');
        if (!sliderContainer) return;
        const response = await fetch('image-list.json');
        const imageNames = await response.json();
        if (imageNames.length === 0) return;
        imageNames.forEach((imageName, index) => {
            const slideElement = document.createElement('div');
            slideElement.classList.add('slide');
            if (index === 0) {
                slideElement.classList.add('active');
            }
            slideElement.style.backgroundImage = `url('images/${imageName}')`;
            sliderContainer.appendChild(slideElement); // Dodajemo na kraj
            slides.push(slideElement);
        });
        const placeholderSlide = sliderContainer.querySelector('.slide:not([style])');
        if (placeholderSlide) {
            placeholderSlide.remove();
        }
        startSlideShow();
    } catch (error) {
        console.error("Slider konnte nicht initialisiert werden:", error);
    }
}
function heroOff(off = true) {
    startSlideShow(off);
    if (off == false) {
        heroslider.classList.remove("off");
        dyn.style.display = "none";
        dyn.style.opacity = 0;
        scroll(top);
    }
    else { heroslider.classList.add("off"); }
}
function advanceSlide() {
    // Sakrij trenutni slajd
    slides[currentSlide].classList.remove('active');

    // Idi na sljedeći slajd (vrati se na 0 ako je na kraju)
    currentSlide = (currentSlide + 1) % slides.length;

    // Prikaži novi slajd
    slides[currentSlide].classList.add('active');
}
function startSlideShow(pause = false) {
    if (pause) {
        clearInterval(slideInterval); // zaustavi interval
    } else {
        slideInterval = setInterval(advanceSlide, 10000); // pokreni interval
    }
}
function showDropDown(dropdownId, buttonId) {
    // Dohvati elemente
    const dropdown = document.getElementById(dropdownId);
    const button = document.getElementById(buttonId);
    // Provjeri da li elementi postoje
    if (!dropdown || !button) {
        console.error(`Element not found: dropdownId=${dropdownId}, buttonId=${buttonId}`);
        return;
    }
    // Dohvati sve dropdownove i dugmiće
    const allDropdowns = document.querySelectorAll(".hbdropdown-content");
    const allButtons = document.querySelectorAll(".styleMeniBtn[aria-controls]");
    // Zatvori sve ostale dropdownove
    allDropdowns.forEach(el => {
        if (el !== dropdown) {
            el.classList.remove("show");
            el.setAttribute("aria-hidden", "true");
        }
    });
    // Deaktiviraj sva ostala dugmića
    allButtons.forEach(el => {
        if (el !== button) {
            el.classList.remove("active");
            el.setAttribute("aria-expanded", "false");
        }
    });
    // Otvori/zatvori trenutni dropdown
    const isOpen = dropdown.classList.contains("show");
    if (!isOpen) {
        dropdown.classList.add("show");
        button.classList.add("active");
        dropdown.setAttribute("aria-hidden", "false");
        button.setAttribute("aria-expanded", "true");

        // Fokus na prvi link u dropdownu za bolju pristupačnost
        const firstLink = dropdown.querySelector("a");
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    } else {
        dropdown.classList.remove("show");
        button.classList.remove("active");
        dropdown.setAttribute("aria-hidden", "true");
        button.setAttribute("aria-expanded", "false");
    }
}
function togleHbMeni(event) {
    // Dohvati elemente
    const hbMeni = document.getElementById("main-navigation");
    const hbButton = document.getElementById("navIcon");
    const hbAbout = document.getElementById("kontakt");
    // Provjeri trenutno stanje menija
    const isMenuOpen = hbMeni.classList.contains("responsive");
    if (!isMenuOpen) {
        // Otvori meni
        hbMeni.classList.add("responsive");
        hbAbout.style.display = 'grid';
        hbButton.setAttribute("aria-expanded", "true");
        hbButton.setAttribute("aria-label", "Menü schließen");
    }
    else {
        // Zatvori meni
        hbMeni.classList.remove("responsive");
        hbAbout.style.display = 'none';
        hbButton.setAttribute("aria-expanded", "false");
        hbButton.setAttribute("aria-label", "Menü öffnen");
        scroll(top);
    }
}
function hbReset() {
    const drdmenu = document.querySelector(".hbdropdown-content.show");
    const btn = document.querySelector(".styleMeniBtn.active");
    if (drdmenu) drdmenu.classList.remove("show");
    if (btn) btn.classList.remove("active");
}
function showDialog(idCall = null) {
    const allModals = document.querySelectorAll(".modal-container");

    if (idCall == null) {
        // --- ZATVORANJE MODALA ---
        hbReset();

        // --- ČIŠĆENJE MODALA PRI ZATVARANJU ---
        const successDiv = document.getElementById('success-message');
        const errorDiv = document.getElementById('error-message');
        const form = document.getElementById('booking-form');

        if (successDiv) successDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';

        if (form) {
            form.style.display = 'block'; // Vrati formu
            form.reset(); // Obriši podatke
        }

        allModals.forEach(dialog => {
            dialog.style.display = 'none';
            dialog.removeEventListener('keydown', trapFocus);
        });
        modaloverlay.style.display = 'none';

        if (lastFocusedElement && lastFocusedElement.focus) {
            lastFocusedElement.focus();
        }

    } else {
        // --- OTVARANJE MODALA ---
        const dialogForm = document.getElementById(idCall);
        if (!dialogForm) return;

        lastFocusedElement = document.activeElement;

        allModals.forEach(dialog => dialog.style.display = 'none');
        dialogForm.style.display = 'flex';
        modaloverlay.style.display = 'block';

        const focusableElements = dialogForm.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        dialogForm.addEventListener('keydown', trapFocus);
    }
}
function loadModalContent(group, sectionKey) {
    try {

        const data = langData[group];
        const section = data[sectionKey]; // npr. "AboutMe1", "AboutMe2", "AboutMe3"
        if (!section) {
            console.error(`Section '${sectionKey}' not found in language '${currentLanguage}'`);
            return;
        }
        // Popuni tekst
        document.querySelector('#modal-title').textContent = section.title;
        document.querySelector('#modal-subtitle').textContent = section.subtitle;
        document.querySelector('#modal-text').innerHTML = section.text;
        // Popuni sliku
        const img = document.querySelector('#modal-image');
        img.src = section.image;
        img.alt = section.subtitle;

        //Aktiviraj dialog 
        showDialog('modal');
        // Fokus na naslov sekcije za bolju pristupačnost
        const heading = document.querySelector("#modal-subtitle");
        if (heading) { setTimeout(() => heading.focus(), 300); }
        heroOff(false);
    } catch (err) { console.error("Greška pri učitavanju sadržaja:", err); }
}
function loadContent() {
    try {
        dyn.innerHTML = "";
        hbReset();
        togleHbMeni();
        heroOff();
        dyn.style.display = "grid";
        dyn.style.opacity = 1;
    } catch (err) { console.error("Greška pri učitavanju sadržaja:", err); }
}
async function loadPortfolio(categoryToFilter) {
    if (!dyn) {
        console.error("Dyn-container nije pronađen!");
        return;
    }
    dyn.classList.add('portfolio-view');
    // 1. Priprema stranice (koristimo vaše funkcije)
    loadContent();

    // 2. Prikaži dinamički kontejner za portfolio


    // 3. Učitaj slike samo ako nisu već učitane
    if (allImages.length === 0) {
        dyn.innerHTML = '<h2 data-translate-key="portfolio.title">Portfolio</h2><p data-translate-key="portfolio.loading">Lade Bilder...</p>';
        await initializePortfolio();
    } else {
        // Ako su već učitane, samo osveži filtere
        setupFilterListeners();
    }

    // 4. Primeni filter
    applyFilter(categoryToFilter);

    // 5. Skrolijaj do vrha
    dyn.scrollIntoView({ behavior: 'smooth' });
}
async function initializePortfolio() {
    try {
        const rootItems = await fetchFilesFromFolder(ROOT_FOLDER_ID);
        const subfolders = rootItems.filter(item =>
            item.mimeType === 'application/vnd.google-apps.folder' &&
            CATEGORY_MAP[item.name]
        );

        const imageFetchPromises = subfolders.map(async (folder) => {
            const categoryClass = CATEGORY_MAP[folder.name];
            const images = await fetchFilesFromFolder(folder.id);
            return images.map(img => ({ ...img, category: categoryClass }));
        });

        const imageArrays = await Promise.all(imageFetchPromises);
        allImages = imageArrays.flat();

        renderMasonryGallery(allImages);
        setupFilterListeners();

    } catch (error) {
        console.error("Greška pri inicijalizaciji portfolija:", error);
        if (dyn) dyn.innerHTML = '<h2>Portfolio</h2><p>Portfolio konnte nicht geladen werden.</p>';
    }
}
function renderMasonryGallery(images) {
    if (!dyn) return;

    // Gradimo HTML unutar kontejnera
    let html = `
            <h2 data-translate-key="portfolio.title">Portfolio</h2>
            <div class="portfolio-filters" role="group" aria-label="Portfolio filtern">
                <button class="filter-btn active" data-filter="all" data-translate-key="portfolio.filterAll">Alle</button>
                <button class="filter-btn" data-filter="bridal" data-translate-key="portfolio.filterBridal">Bridal Make-Up</button>
                <button class="filter-btn" data-filter="photoshoot" data-translate-key="portfolio.filterPhotoshoot">Shooting Make-Up</button>
                <button class="filter-btn" data-filter="event" data-translate-key="portfolio.filterEvent">Event Make-Up</button>
                <button class="filter-btn" data-filter="studio-shooting" data-translate-key="portfolio.filterStudio">Studio Shooting Make-Up</button>
            </div>
            <div class="portfolio-grid">
        `;

    if (images.length === 0) {
        html += '<p>Keine Bilder im Portfolio gefunden.</p>';
    } else {
        images.forEach(image => {
            if (image.mimeType.startsWith('image/')) {
                const thumbnailUrl = `https://drive.google.com/thumbnail?id=${image.id}&sz=w800`;
                const fullImageUrl = `https://drive.google.com/uc?id=${image.id}`;
                const altText = image.name.replace(/\.(jpg|jpeg|png|webp)$/i, '');

                html += `
                        <div class="portfolio-item ${image.category}">
                            <img src="${thumbnailUrl}" alt="${altText}" loading="lazy">
                            <div class="portfolio-overlay">
                                <h3>${altText}</h3>
                            </div>
                        </div>
                    `;
            }
        });
    }

    html += '</div>'; // Zatvori portfolio-grid
    dyn.innerHTML = html;

    // Dodaj event listenere na sve slike NAKON što su dodane u DOM
    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('img');
            const fullImageUrl = `https://drive.google.com/uc?id=${img.src.match(/id=([^&]+)/)[1]}`;
            const altText = img.alt;

            // Popuni POSTOJEĆI modal
            document.querySelector('#modal-title').textContent = altText;
            document.querySelector('#modal-subtitle').textContent = '';
            document.querySelector('#modal-text').innerHTML = '';
            const modalImg = document.querySelector('#modal-image');
            modalImg.src = fullImageUrl;
            modalImg.alt = altText;

            // Pozovi POSTOJEĆU funkciju za prikaz moda
            showDialog('modal');
        });
    });
}
async function fetchFilesFromFolder(folderId) {
    const query = `'${folderId}' in parents and trashed=false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${API_KEY}&fields=files(id,name,mimeType)`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Greška: ${response.status}`);
    const data = await response.json();
    return data.files || [];
}
function applyFilter(filter) {
    document.querySelectorAll('.portfolio-item').forEach(item => {
        if (filter === 'all' || item.classList.contains(filter)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
}
function setupFilterListeners() {
    filterButtons.forEach(btn => {
        // Ukloni postojeće listenere da ne bi bili duplirani
        btn.replaceWith(btn.cloneNode(true));
    });
    // Dodaj nove listenere
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyFilter(btn.dataset.filter);
        });
    });
}
function handleFormSubmit(event) {
    event.preventDefault();
    console.log("Form submission started.");

    const serviceID = "service_709y3uf";
    const templateID = "template_6y889t8";

    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    const form = document.getElementById('booking-form');

    // Sakrij prethodne poruke
    if (successDiv) successDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';

    emailjs.sendForm(serviceID, templateID, event.target)
        .then(function (response) {
            console.log('SUCCESS!', response.status, response.text);

            // --- USPEH: Sakrij formu i prikaži poruku ---
            if (form) {
                form.style.display = 'none';
            }
            if (successDiv) {
                // Koristimo čvrsti tekst da bismo bili sigurni da se prikaže
                successDiv.textContent = langData.booking.successMessage;
                console.log("Success message set. Showing element."); // Debug
                successDiv.style.display = 'block';
            }

        }, function (error) {
            console.log('FAILED...', error);

            // --- GREŠKA: Prikaži grešku, ali ostavi formu vidljivom ---
            if (errorDiv) {
                // Koristimo čvrsti tekst i za grešku
                errorDiv.textContent = langData.booking.alertErr;
                console.log("Error message set. Showing element."); // Debug
                errorDiv.style.display = 'block';
            }
        });
}
setLanguage(currentLanguage);
document.addEventListener('DOMContentLoaded', () => {
    // Činimo funkcije globalnim da je moguće pozvati iz HTML-a
    window.loadPortfolio = loadPortfolio;
    window.loadModalContent = loadModalContent;
    window.showDropDown = showDropDown;
    window.togleHbMeni = togleHbMeni;

    // Inicijalizacija komponenti koje postoje na svim stranama
    initSlider();

    // --- DODAVANJE EVENT LISTENERA SA PROVERAMA ---
    // Ovo sprečava greške na stranicama gde ovi elementi ne postoje

    if (modaloverlay) {
        modaloverlay.addEventListener("click", () => showDialog(null));
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', handleFormSubmit);
    }

    // Provera za close dugmiće unutar modala
    const closeButtons = document.querySelectorAll(".close");
    if (closeButtons.length > 0) {
        closeButtons.forEach(btnClose => {
            btnClose.addEventListener("click", () => showDialog(null));
        });
    }

    if (loadPacks) {
        loadPacks.addEventListener("click", pcgLoader);
    }

    const navIcon = document.getElementById("navIcon");
    if (navIcon) {
        navIcon.addEventListener("click", togleHbMeni);
    }

    // EmailJS inicijalizacija
    emailjs.init("L8p1GFojeE3tOoMu6");

    // Event za promenu jezika
    document.addEventListener('languageChanged', (event) => {
        pcgLoader(event);
    });

    // Globalni ESC key handler
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            // Proveri da li je modal otvoren i zatvori ga
            const openModal = document.querySelector(".modal-container[style*='flex']");
            if (openModal) {
                showDialog(null);
                return; // Zaustavi dalje izvršavanje ako je modal zatvoren
            }

            // Zatvori hamburger meni ako je otvoren
            const hbMenu = document.querySelector(".hbMeni.responsive");
            if (hbMenu) {
                togleHbMeni();
            }
        }
    });
});




