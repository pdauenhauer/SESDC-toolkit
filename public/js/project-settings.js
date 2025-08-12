// project-settings.js - Handle project settings functionality

class ProjectSettings {
    constructor() {
        this.currentProjectId = null;
        this.defaultSettings = {
            laborCost: 25.00,
            projectInflationRate: 3.0,
            landLeasingCost: 1000.00,
            licensingCost: 5000.00,
            otherCapitalCosts: 10000.00,
            latitude: null,
            longitude: null,
        };
        this.currentSettings = { ...this.defaultSettings };
        this.initializeEventListeners();
        this.initializeSettingsMap();
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
        document.getElementById('projectSettingsBtn').style.display = 'none';
        document.getElementById('backToInputsBtn').style.display = 'flex';
        
        // Load current settings
        this.loadSettingsToForm();
        
        // Add animation class
        document.getElementById('projectSettingsContent').style.animation = 'fadeIn 0.3s ease-in-out';
    }

    showProjectInputs() {
        // Hide project settings content
        document.getElementById('projectSettingsContent').style.display = 'none';
        // Show project inputs content
        document.getElementById('projectInputsContent').style.display = 'block';
        
        // Update modal title
        document.getElementById('modalTitle').textContent = 'Project Inputs';
        
        // Show settings button, hide back button
        document.getElementById('projectSettingsBtn').style.display = 'flex';
        document.getElementById('backToInputsBtn').style.display = 'none';
        
        // Add animation class
        document.getElementById('projectInputsContent').style.animation = 'fadeIn 0.3s ease-in-out';
    }

    loadSettingsToForm() {
        // Populate form fields with current settings
        document.getElementById('labor-cost').value = this.currentSettings.laborCost;
        document.getElementById('project-inflation-rate').value = this.currentSettings.projectInflationRate;
        document.getElementById('land-leasing-cost').value = this.currentSettings.landLeasingCost;
        document.getElementById('licensing-cost').value = this.currentSettings.licensingCost;
        document.getElementById('other-capital-costs').value = this.currentSettings.otherCapitalCosts;

        if (document.getElementById('settings-location-latitude')) {
            document.getElementById('settings-location-latitude').value = this.currentSettings.latitude || '';
        }
        if (document.getElementById('settings-location-longitude')) {
            document.getElementById('settings-location-longitude').value = this.currentSettings.longitude || '';
        }
        
        // Update map if coordinates exist
        if (this.currentSettings.latitude && this.currentSettings.longitude && this.settingsMap) {
            window.loadSettingsMapCoordinates(
                this.currentSettings.latitude,
                this.currentSettings.longitude
            )
        }
    }

    saveSettings() {
        try {
            // Collect settings from form
            const newSettings = {
                projectInflationRate: parseFloat(document.getElementById('project-inflation-rate').value) || this.defaultSettings.projectInflationRate,
                landLeasingCost: parseFloat(document.getElementById('land-leasing-cost').value) || this.defaultSettings.landLeasingCost,
                licensingCost: parseFloat(document.getElementById('licensing-cost').value) || this.defaultSettings.licensingCost,
                otherCapitalCosts: parseFloat(document.getElementById('other-capital-costs').value) || this.defaultSettings.otherCapitalCosts,
                laborCost: parseInt(document.getElementById('labor-cost').value) || this.defaultSettings.laborCost,

                latitude: document.parseFloat(document.getElementById('settings-location-latitude').value) || null,
                longitude: parseFloat(document.getElementById('settings-location-longitude').value) || null,
            };

            // Validate settings
            if (this.validateSettings(newSettings)) {
                this.currentSettings = { ...newSettings };
                
                // Save to localStorage for persistence
                this.saveToLocalStorage();
                
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

    validateSettings(settings) {
        // Validate numeric ranges
        if (settings.projectInflationRate < 0 || settings.projectInflationRate > 10) {
            this.showMessage('Inflation rate must be between 0% and 10%', 'error');
            return false;
        }
        
        if (settings.projectLifetime < 1 || settings.projectLifetime > 50) {
            this.showMessage('Project lifetime must be between 1 and 50 years', 'error');
            return false;
        }
        
        // Validate that costs are non-negative
        if (settings.landLeasingCost < 0 || settings.licensingCost < 0 || settings.otherCapitalCosts < 0) {
            this.showMessage('All cost values must be non-negative', 'error');
            return false;
        }
        
        return true;
    }

    resetSettings() {
        // Confirm reset
        if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            this.currentSettings = { ...this.defaultSettings };
            this.loadSettingsToForm();
            this.saveToLocalStorage();
            this.showMessage('Settings reset to defaults', 'success');
            
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
            'labor-cost'
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
        settingsContent.insertBefore(message, settingsContent.firstChild);
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

    // Public method to set project ID when modal opens
    setProjectId(projectId) {
        this.loadFromLocalStorage(projectId);
    }
}

// Initialize the project settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.projectSettings = new ProjectSettings();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectSettings;
}