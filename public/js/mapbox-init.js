// Need to add your mapbox token here
// mapboxgl.accessToken = '';

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
