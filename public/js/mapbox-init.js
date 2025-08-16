mapboxgl.accessToken = 'pk.eyJ1IjoicGRhdWVuaGF1ZXIiLCJhIjoiY21jZmZ5cHRtMDhiOTJscHRkYnoxeWEyYiJ9.LSAsi18IPvNqF57ETi6TNg';

let settingsMap = null;
let settingsMarker = null;
let inputsMap = null;
let inputsMarker = null;

// Initialize the settings map (for project settings modal)
function initializeSettingsMap() {
    const mapContainer = document.getElementById('settings-map');
    const latInput = document.getElementById('settings-location-latitude');
    const lonInput = document.getElementById('settings-location-longitude');
    
    if (mapContainer && latInput && lonInput && !settingsMap) {
        settingsMap = new mapboxgl.Map({
            container: 'settings-map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [0, 0], 
            zoom: 4,
            attributionControl: false
        });

        settingsMarker = new mapboxgl.Marker({ draggable: true })
            .setLngLat([0, 0])
            .addTo(settingsMap);

        // Map click event
        settingsMap.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            settingsMarker.setLngLat([lng, lat]);
            latInput.value = lat.toFixed(6);
            lonInput.value = lng.toFixed(6);
        });

        // Marker drag event
        settingsMarker.on('dragend', () => {
            const { lng, lat } = settingsMarker.getLngLat();
            latInput.value = lat.toFixed(6);
            lonInput.value = lng.toFixed(6);
        });

        // Input change events
        latInput.addEventListener('input', updateSettingsMap);
        lonInput.addEventListener('input', updateSettingsMap);
    }    
}

// Initialize the inputs map (for project inputs modal)
function initializeInputsMap() {
    const mapContainer = document.getElementById('map');
    const latInput = document.getElementById('location-latitude');
    const lonInput = document.getElementById('location-longitude');
    
    if (mapContainer && latInput && lonInput && !inputsMap) {
        inputsMap = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [0, 0], 
            zoom: 4,
            attributionControl: false
        });

        inputsMarker = new mapboxgl.Marker({ draggable: true })
            .setLngLat([0, 0])
            .addTo(inputsMap);

        // Map click event
        inputsMap.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            inputsMarker.setLngLat([lng, lat]);
            latInput.value = lat.toFixed(6);
            lonInput.value = lng.toFixed(6);
        });

        // Marker drag event
        inputsMarker.on('dragend', () => {
            const { lng, lat } = inputsMarker.getLngLat();
            latInput.value = lat.toFixed(6);
            lonInput.value = lng.toFixed(6);
        });

        // Input change events
        latInput.addEventListener('input', updateInputsMap);
        lonInput.addEventListener('input', updateInputsMap);

        // Resize map when modal becomes visible
        const modal = document.getElementById('inputsModal');
        if (modal) {
            modal.addEventListener('transitionend', () => {
                if (modal.classList.contains('active') && inputsMap) {
                    inputsMap.resize();
                }
            });
        }
    }
}

function updateSettingsMap() {
    const latInput = document.getElementById('settings-location-latitude');
    const lonInput = document.getElementById('settings-location-longitude');
    
    if (latInput && lonInput && settingsMap) {
        const latitude = parseFloat(latInput.value);
        const longitude = parseFloat(lonInput.value);

        if (!isNaN(latitude) && !isNaN(longitude)) {
            settingsMap.setCenter([longitude, latitude]);
            settingsMarker.setLngLat([longitude, latitude]);
        }
    }
}

function updateInputsMap() {
    const latInput = document.getElementById('location-latitude');
    const lonInput = document.getElementById('location-longitude');
    
    if (latInput && lonInput && inputsMap) {
        const latitude = parseFloat(latInput.value);
        const longitude = parseFloat(lonInput.value);

        if (!isNaN(latitude) && !isNaN(longitude)) {
            inputsMap.setCenter([longitude, latitude]);
            inputsMarker.setLngLat([longitude, latitude]);
        }
    }
}

function loadSettingsMapCoordinates(latitude, longitude) {
    if (settingsMap && settingsMarker && !isNaN(latitude) && !isNaN(longitude)) {
        settingsMap.setCenter([longitude, latitude]);
        settingsMarker.setLngLat([longitude, latitude]);
    }
}

function loadInputsMapCoordinates(latitude, longitude) {
    if (inputsMap && inputsMarker && !isNaN(latitude) && !isNaN(longitude)) {
        inputsMap.setCenter([longitude, latitude]);
        inputsMarker.setLngLat([longitude, latitude]);
    }
}

function setupMapObservers() {
    // Observer for inputs modal
    const inputsModal = document.getElementById('inputsModal');
    if (inputsModal) {
        const inputsObserver = new MutationObserver(() => {
            if (inputsModal.classList.contains('active')) {
                setTimeout(initializeInputsMap, 100);
            }
        });
        inputsObserver.observe(inputsModal, { attributes: true, attributeFilter: ['class'] });
    }

    // Observer for settings content
    const settingsContent = document.getElementById('projectSettingsContent');
    if (settingsContent) {
        const settingsObserver = new MutationObserver(() => {
            if (settingsContent.style.display !== 'none') {
                setTimeout(initializeSettingsMap, 100);
            }
        });
        settingsObserver.observe(settingsContent, { attributes: true, attributeFilter: ['style'] });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupMapObservers();
    
    // Try to initialize maps immediately if containers exist
    setTimeout(() => {
        initializeInputsMap();
        initializeSettingsMap();
    }, 100);
});

// Export functions to window for global access
window.initializeSettingsMap = initializeSettingsMap;
window.initializeInputsMap = initializeInputsMap;
window.loadSettingsMapCoordinates = loadSettingsMapCoordinates;
window.loadInputsMapCoordinates = loadInputsMapCoordinates;
window.updateSettingsMap = updateSettingsMap;
window.updateInputsMap = updateInputsMap;