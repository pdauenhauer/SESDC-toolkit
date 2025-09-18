import { app } from './firebase-init.js';
import { getFirestore, doc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const db = getFirestore(app);

class ProjectSettings {
    constructor() {
        this.currentProjectId = null;
        this.defaultSettings = {
            laborCost: 25.00,
            projectInflationRate: 3.0,
            landLeasingCost: 1000.00,
            licensingCost: 5000.00,
            otherCapitalCosts: 10000.00,
            energyPrice: 0.15,
            latitude: null,
            longitude: null,
        };
        this.currentSettings = { ...this.defaultSettings };
        this.initializeEventListeners();
        // Remove the problematic call - we'll initialize the map when needed
        // this.initializeSettingsMap();
    }

    initializeEventListeners() {
        // Settings button click
        document.getElementById('projectSettingsBtn')?.addEventListener('click', () => {
            this.showProjectSettings();
        });

        // Back button click
        document.getElementById('backToInputsBtn')?.addEventListener('click', () => {
            this.showProjectInputs();
        });

        // Save settings button
        document.querySelector('.save-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset settings button
        document.querySelector('.reset-settings-btn')?.addEventListener('click', () => {
            this.resetSettings();
        });

        // Close modal - ensure we reset to inputs view
        document.getElementById('closeInputsModal')?.addEventListener('click', () => {
            this.showProjectInputs();
        });

        // Input validation listeners
        this.addInputValidationListeners();
    }

    showProjectSettings() {
        // Hide project inputs content
        document.getElementById('projectInputsContent').style.display = 'none';
        // Show project settings content
        document.getElementById('projectSettingsContent').style.display = 'block';
        
        // Update modal title
        document.getElementById('modalTitle').textContent = 'Project Settings';
        
        // Show back button, hide settings button
        const settingsBtn = document.getElementById('projectSettingsBtn');
        const backBtn = document.getElementById('backToInputsBtn');
        if (settingsBtn) settingsBtn.style.display = 'none';
        if (backBtn) backBtn.style.display = 'flex';
        
        // Load current settings
        this.loadSettingsToForm();
        
        // Initialize the settings map if available
        if (typeof window.initializeSettingsMap === 'function') {
            setTimeout(() => {
                window.initializeSettingsMap();
            }, 100);
        }
    }

    showProjectInputs() {
        // Show project inputs content
        document.getElementById('projectInputsContent').style.display = 'block';
        // Hide project settings content
        document.getElementById('projectSettingsContent').style.display = 'none';
        
        // Update modal title
        document.getElementById('modalTitle').textContent = 'Project Inputs';
        
        // Show settings button, hide back button
        const settingsBtn = document.getElementById('projectSettingsBtn');
        const backBtn = document.getElementById('backToInputsBtn');
        if (settingsBtn) settingsBtn.style.display = 'flex';
        if (backBtn) backBtn.style.display = 'none';
    }

    loadSettingsToForm() {
        // Load numeric values
        const elements = {
            'project-inflation-rate': this.currentSettings.projectInflationRate,
            'land-leasing-cost': this.currentSettings.landLeasingCost,
            'licensing-cost': this.currentSettings.licensingCost,
            'other-capital-costs': this.currentSettings.otherCapitalCosts,
            'labor-cost': this.currentSettings.laborCost,
            'energy-price': this.currentSettings.energyPrice,
            'settings-location-latitude': this.currentSettings.latitude,
            'settings-location-longitude': this.currentSettings.longitude
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '';
            }
        });
        
        // Update map if coordinates exist and map functions are available
        if (this.currentSettings.latitude && this.currentSettings.longitude && typeof window.loadSettingsMapCoordinates === 'function') {
            window.loadSettingsMapCoordinates(
                this.currentSettings.latitude,
                this.currentSettings.longitude
            );
        }
    }

    async saveSettings() {
        try {
            // Collect settings from form
            const newSettings = {
                projectInflationRate: parseFloat(document.getElementById('project-inflation-rate')?.value) || this.defaultSettings.projectInflationRate,
                landLeasingCost: parseFloat(document.getElementById('land-leasing-cost')?.value) || this.defaultSettings.landLeasingCost,
                licensingCost: parseFloat(document.getElementById('licensing-cost')?.value) || this.defaultSettings.licensingCost,
                otherCapitalCosts: parseFloat(document.getElementById('other-capital-costs')?.value) || this.defaultSettings.otherCapitalCosts,
                laborCost: parseFloat(document.getElementById('labor-cost')?.value) || this.defaultSettings.laborCost,
                energyPrice: parseFloat(document.getElementById('energy-price')?.value) || this.defaultSettings.energyPrice,
                latitude: parseFloat(document.getElementById('settings-location-latitude')?.value) || null,
                longitude: parseFloat(document.getElementById('settings-location-longitude')?.value) || null,
            };

            // Validate settings
            if (this.validateSettings(newSettings)) {
                this.currentSettings = { ...newSettings };
                
                // Save to localStorage for immediate use
                this.saveToLocalStorage();
                
                // Save to Firebase
                await this.saveToFirebase();
                
                // Show success message
                this.showMessage('Settings saved successfully!', 'success');
                
                // Auto-hide message after 3 seconds
                setTimeout(() => {
                    this.hideMessage();
                }, 3000);
                
                console.log('Project settings saved:', this.currentSettings);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showMessage('Error saving settings. Please try again.', 'error');
        }
    }

    async saveToFirebase() {
        if (!this.currentProjectId) {
            console.warn('No project ID available for Firebase save');
            return;
        }

        try {
            const userId = localStorage.getItem('loggedInUserId');
            if (!userId) {
                throw new Error('User not logged in');
            }

            const projectRef = doc(db, 'users', userId, 'projects', this.currentProjectId);
            
            // Save settings under a 'projectSettings' field
            await updateDoc(projectRef, {
                projectSettings: this.currentSettings,
                lastModified: new Date().toISOString()
            });

            console.log('Settings saved to Firebase successfully');
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            throw error; // Re-throw to be caught by saveSettings()
        }
    }

    async loadFromFirebase(projectId) {
        this.currentProjectId = projectId;

        try {
            const userId = localStorage.getItem('loggedInUserId');
            if (!userId) {
                console.warn('User not logged in, using default settings');
                this.currentSettings = { ...this.defaultSettings };
                return;
            }

            const projectRef = doc(db, 'users', userId, 'projects', projectId);
            const projectDoc = await getDoc(projectRef);

            if (projectDoc.exists()) {
                const projectData = projectDoc.data();
                
                if (projectData.projectSettings) {
                    // Use Firebase settings as primary source
                    this.currentSettings = { ...this.defaultSettings, ...projectData.projectSettings };
                    console.log('Settings loaded from Firebase');
                } else {
                    // Fall back to localStorage if no Firebase settings
                    this.loadFromLocalStorage(projectId);
                    console.log('No Firebase settings found, using localStorage');
                }
            } else {
                console.warn('Project not found in Firebase');
                this.currentSettings = { ...this.defaultSettings };
            }
        } catch (error) {
            console.error('Error loading from Firebase:', error);
            // Fall back to localStorage on error
            this.loadFromLocalStorage(projectId);
        }
    }

    validateSettings(settings) {
        // Validate numeric ranges
        if (settings.projectInflationRate < 0 || settings.projectInflationRate > 10) {
            this.showMessage('Inflation rate must be between 0% and 10%', 'error');
            return false;
        }
        
        // Validate that costs are non-negative
        if (settings.landLeasingCost < 0 || settings.licensingCost < 0 || settings.otherCapitalCosts < 0) {
            this.showMessage('All cost values must be non-negative', 'error');
            return false;
        }
        
        if (settings.laborCost < 0) {
            this.showMessage('Labor cost cannot be negative', 'error');
            return false;
        }
        
        return true;
    }

    async resetSettings() {
        // Confirm reset
        if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            this.currentSettings = { ...this.defaultSettings };
            this.loadSettingsToForm();
            this.saveToLocalStorage();
            
            // Also save to Firebase
            try {
                await this.saveToFirebase();
                this.showMessage('Settings reset to defaults', 'success');
            } catch (error) {
                console.error('Error resetting settings in Firebase:', error);
                this.showMessage('Settings reset locally, but failed to sync with server', 'warning');
            }
            
            setTimeout(() => {
                this.hideMessage();
            }, 3000);
        }
    }

    saveToLocalStorage() {
        if (this.currentProjectId) {
            const storageKey = `projectSettings_${this.currentProjectId}`;
            localStorage.setItem(storageKey, JSON.stringify(this.currentSettings));
        }
    }

    loadFromLocalStorage(projectId) {
        this.currentProjectId = projectId;
        const storageKey = `projectSettings_${projectId}`;
        const savedSettings = localStorage.getItem(storageKey);
        
        if (savedSettings) {
            try {
                this.currentSettings = { ...this.defaultSettings, ...JSON.parse(savedSettings) };
            } catch (error) {
                console.error('Error loading saved settings:', error);
                this.currentSettings = { ...this.defaultSettings };
            }
        } else {
            this.currentSettings = { ...this.defaultSettings };
        }
    }

    addInputValidationListeners() {
        // Add real-time validation for numeric inputs
        const numericInputs = [
            'project-inflation-rate', 'land-leasing-cost',
            'licensing-cost', 'other-capital-costs',
            'labor-cost', 'energy-price'
        ];

        numericInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.validateInput(e.target);
                });
                
                input.addEventListener('blur', (e) => {
                    this.formatInput(e.target);
                });
            }
        });
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.getAttribute('min')) || 0;
        const max = parseFloat(input.getAttribute('max')) || Infinity;
        
        // Remove previous validation classes
        input.classList.remove('invalid', 'valid');
        
        if (isNaN(value) || value < min || value > max) {
            input.classList.add('invalid');
        } else {
            input.classList.add('valid');
        }
    }

    formatInput(input) {
        const value = parseFloat(input.value);
        if (!isNaN(value) && input.step === '0.01') {
            input.value = value.toFixed(2);
        }
    }

    showMessage(text, type) {
        // Remove existing message
        this.hideMessage();
        
        // Create message element
        const message = document.createElement('div');
        message.className = `settings-message ${type} show`;
        message.textContent = text;
        
        // Insert at top of settings content
        const settingsContent = document.getElementById('projectSettingsContent');
        if (settingsContent) {
            settingsContent.insertBefore(message, settingsContent.firstChild);
        }
    }

    hideMessage() {
        const existingMessage = document.querySelector('.settings-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // Public method to get current settings for use in other modules
    getSettings() {
        return { ...this.currentSettings };
    }

    // Public method to set project ID and load settings (Firebase-first approach)
    async setProjectId(projectId) {
        await this.loadFromFirebase(projectId);
    }

    // Legacy method for backward compatibility
    loadFromLocalStorage(projectId) {
        this.currentProjectId = projectId;
        const storageKey = `projectSettings_${projectId}`;
        const savedSettings = localStorage.getItem(storageKey);
        
        if (savedSettings) {
            try {
                this.currentSettings = { ...this.defaultSettings, ...JSON.parse(savedSettings) };
            } catch (error) {
                console.error('Error loading saved settings:', error);
                this.currentSettings = { ...this.defaultSettings };
            }
        } else {
            this.currentSettings = { ...this.defaultSettings };
        }
    }
}

// Initialize the project settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.projectSettings = new ProjectSettings();
});

// Export for use in other modules
export default ProjectSettings;