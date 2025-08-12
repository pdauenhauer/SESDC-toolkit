mapboxgl.accessToken = 'pk.eyJ1IjoicGRhdWVuaGF1ZXIiLCJhIjoiY21jZmZ5cHRtMDhiOTJscHRkYnoxeWEyYiJ9.LSAsi18IPvNqF57ETi6TNg';

let settingsMap = null;
let settingsMarker = null;

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

function loadSettingsMapCoordinates(latitude, longitude) {
    if (settingsMap && settingsMarker && !isNaN(latitude) && !isNaN(longitude)) {
        settingsMap.setCenter([longitude, latitude]);
        settingsMarker.setLngLat([longitude, latitude]);
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

window.initializeSettingsMap = initializeSettingsMap;
window.loadSettingsMapCoordinates = loadSettingsMapCoordinates;
window.updateSettingsMap = updateSettingsMap;

/*
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [0, 0], 
    zoom: 4,
    attributionControl: false
});

const marker = new mapboxgl.Marker({ draggable: true })
    .setLngLat([0, 0])
    .addTo(map);

map.on('click', (e) => {
    const { lng, lat } = e.lngLat;
    marker.setLngLat([lng, lat]);

    document.getElementById('location-latitude').value = lat.toFixed(6);
    document.getElementById('location-longitude').value = lng.toFixed(6);
});

marker.on('dragend', () => {
    const { lng, lat } = marker.getLngLat();

    document.getElementById('location-latitude').value = lat.toFixed(6);
    document.getElementById('location-longitude').value = lng.toFixed(6);
});

function updateMap() {
    const latitude = parseFloat(document.getElementById('location-latitude').value);
    const longitude = parseFloat(document.getElementById('location-longitude').value);

    if (!isNaN(latitude) && !isNaN(longitude)) {
        map.setCenter([longitude, latitude]);
        marker.setLngLat([longitude, latitude]);
    } 
}

const modal = document.getElementById('inputsModal');
modal.addEventListener('transitionend', () => {
    if (modal.classList.contains('active')) {
        map.resize();
    }
});

document.getElementById('location-latitude').addEventListener('input', updateMap);
document.getElementById('location-longitude').addEventListener('input', updateMap);
*/