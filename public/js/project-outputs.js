import { app, storage } from './firebase-init.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getStorage, ref, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const db = getFirestore(app);

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

document.addEventListener('DOMContentLoaded', async function() {
    const projectId = getQueryParam('projectId');
    const userId = localStorage.getItem('loggedInUserId');

    const projectRef = doc(db, 'users', userId, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    const projectData = projectDoc.data();
    const projectName = projectData.name;

    document.getElementById('project-name').innerText = projectName;

    const plotNames = [
        'solar_plot.png',
        'solar_heatmap.png',
        'solar_monthly_heatmap.png',
        'load_plot.png',
        'net_energy_plot.png',
        'wind_plot.png',
	    'diesel_plot.png',
	    'battery_plot.png',
	    'net_battery_plot.png',
        'load_serviced_plot.png',
        'financial_expenses.png'
    ]

    const plotsContainer = document.getElementById('plotsContainer');

    for (const plotName of plotNames) {
        const plotRef = ref(storage, `${userId}/${projectId}/${plotName}`);
        try {
            const url = await getDownloadURL(plotRef);
            const img = document.createElement('img');
            img.src = url;
            img.alt = plotName;
            img.style.width = '100%';
            plotsContainer.appendChild(img);
        } catch (error) {
            console.log(`No image found for ${plotName}:`)
        }
    }
});