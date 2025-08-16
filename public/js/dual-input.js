class DualInputHandler {
    constructor() {
        this.isCalculating = false; // Prevent infinite loops
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Listen for changes on all percent and dollar inputs
        document.addEventListener('input', (e) => {
            // Add null check for e.target
            if (!e.target || !e.target.classList) return;
            
            if (e.target.classList.contains('percent-input')) {
                this.handlePercentInput(e.target);
            } else if (e.target.classList.contains('dollar-input')) {
                this.handleDollarInput(e.target);
            } else if (e.target.classList.contains('capex-input')) {
                this.handleCapexInput(e.target);
            }
        });

        // Listen for focus to add visual indicators
        document.addEventListener('focus', (e) => {
            // Add null check for e.target
            if (!e.target || !e.target.classList) return;
            
            if (e.target.classList.contains('percent-input') || e.target.classList.contains('dollar-input')) {
                this.addFocusIndicator(e.target);
            }
        }, true);

        // Listen for blur to remove visual indicators
        document.addEventListener('blur', (e) => {
            // Add null check for e.target
            if (!e.target || !e.target.classList) return;
            
            if (e.target.classList.contains('percent-input') || e.target.classList.contains('dollar-input')) {
                this.removeFocusIndicator(e.target);
            }
        }, true);
    }

    handlePercentInput(percentInput) {
        if (this.isCalculating) return;

        const dollarInputId = percentInput.dataset.dollar;
        const capexInputId = percentInput.dataset.capex;
        const dollarInput = document.getElementById(dollarInputId);
        const capexInput = document.getElementById(capexInputId);

        if (!dollarInput || !capexInput) return;

        const percentValue = parseFloat(percentInput.value);
        const capexValue = parseFloat(capexInput.value);

        // Clear previous state classes
        this.clearStateClasses(percentInput);
        this.clearStateClasses(dollarInput);

        if (isNaN(percentValue) || percentValue === '') {
            // If percent is empty, clear dollar input
            this.isCalculating = true;
            dollarInput.value = '';
            this.isCalculating = false;
            this.hideCapexWarning(percentInput);
            return;
        }

        if (isNaN(capexValue) || capexValue <= 0) {
            // Show warning if CAPEX is not entered
            this.showCapexWarning(percentInput);
            percentInput.classList.add('needs-capex');
            return;
        }

        // Hide warning and calculate dollar amount
        this.hideCapexWarning(percentInput);
        
        const dollarValue = (percentValue / 100) * capexValue;
        
        this.isCalculating = true;
        dollarInput.value = dollarValue.toFixed(2);
        this.isCalculating = false;

        // Add visual indicators
        percentInput.classList.add('manual-entry');
        dollarInput.classList.add('auto-calculated', 'just-calculated');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            dollarInput.classList.remove('just-calculated');
        }, 300);
    }

    handleDollarInput(dollarInput) {
        if (this.isCalculating) return;

        const percentInputId = dollarInput.dataset.percent;
        const capexInputId = dollarInput.dataset.capex;
        const percentInput = document.getElementById(percentInputId);
        const capexInput = document.getElementById(capexInputId);

        if (!percentInput || !capexInput) return;

        const dollarValue = parseFloat(dollarInput.value);
        const capexValue = parseFloat(capexInput.value);

        // Clear previous state classes
        this.clearStateClasses(percentInput);
        this.clearStateClasses(dollarInput);

        if (isNaN(dollarValue) || dollarValue === '') {
            // If dollar is empty, clear percent input
            this.isCalculating = true;
            percentInput.value = '';
            this.isCalculating = false;
            this.hideCapexWarning(dollarInput);
            return;
        }

        if (isNaN(capexValue) || capexValue <= 0) {
            // Show warning if CAPEX is not entered
            this.showCapexWarning(dollarInput);
            dollarInput.classList.add('needs-capex');
            return;
        }

        // Hide warning and calculate percentage
        this.hideCapexWarning(dollarInput);
        
        const percentValue = (dollarValue / capexValue) * 100;
        
        this.isCalculating = true;
        percentInput.value = percentValue.toFixed(2);
        this.isCalculating = false;

        // Add visual indicators
        dollarInput.classList.add('manual-entry');
        percentInput.classList.add('auto-calculated', 'just-calculated');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            percentInput.classList.remove('just-calculated');
        }, 300);
    }

    handleCapexInput(capexInput) {
        // When CAPEX changes, recalculate any existing percent/dollar pairs
        const capexId = capexInput.id;
        
        // Find all inputs that depend on this CAPEX
        const dependentInputs = document.querySelectorAll(`[data-capex="${capexId}"]`);
        
        dependentInputs.forEach(input => {
            if (input.classList.contains('percent-input')) {
                this.handlePercentInput(input);
            } else if (input.classList.contains('dollar-input')) {
                this.handleDollarInput(input);
            }
        });
    }

    showCapexWarning(input) {
        const inputGroup = input.closest('.dual-input-group');
        if (inputGroup) {
            const warning = inputGroup.querySelector('.missing-capex-warning');
            if (warning) {
                warning.style.display = 'block';
            }
        }
    }

    hideCapexWarning(input) {
        const inputGroup = input.closest('.dual-input-group');
        if (inputGroup) {
            const warning = inputGroup.querySelector('.missing-capex-warning');
            if (warning) {
                warning.style.display = 'none';
            }
        }
    }

    clearStateClasses(input) {
        if (!input || !input.classList) return;
        input.classList.remove('auto-calculated', 'manual-entry', 'needs-capex', 'just-calculated');
    }

    addFocusIndicator(input) {
        if (!input) return;
        const wrapper = input.closest('.input-wrapper');
        if (wrapper) {
            wrapper.style.transform = 'scale(1.02)';
            wrapper.style.transition = 'transform 0.2s ease';
        }
    }

    removeFocusIndicator(input) {
        if (!input) return;
        const wrapper = input.closest('.input-wrapper');
        if (wrapper) {
            wrapper.style.transform = 'scale(1)';
        }
    }

    // Public method to get the final values for form submission
    getCalculatedValues() {
        const results = {};
        
        // Get all dual input groups
        const dualInputGroups = document.querySelectorAll('.dual-input-group');
        
        dualInputGroups.forEach(group => {
            const percentInput = group.querySelector('.percent-input');
            const dollarInput = group.querySelector('.dollar-input');
            
            if (percentInput && dollarInput) {
                const fieldName = percentInput.id.replace('-percent', '');
                
                results[fieldName] = {
                    percent: parseFloat(percentInput.value) || 0,
                    dollar: parseFloat(dollarInput.value) || 0,
                    hasValidPair: !isNaN(parseFloat(percentInput.value)) && !isNaN(parseFloat(dollarInput.value))
                };
            }
        });
        
        return results;
    }

    // Public method to validate all dual inputs before form submission
    validateAllInputs() {
        const errors = [];
        const dualInputGroups = document.querySelectorAll('.dual-input-group');
        
        dualInputGroups.forEach(group => {
            const percentInput = group.querySelector('.percent-input');
            const dollarInput = group.querySelector('.dollar-input');
            
            if (!percentInput || !dollarInput) return;
            
            const capexInputId = percentInput.dataset.capex;
            const capexInput = document.getElementById(capexInputId);
            
            // Check if CAPEX is missing but values are entered
            if ((percentInput.value || dollarInput.value) && (!capexInput || !capexInput.value || capexInput.value <= 0)) {
                const labelElement = group.querySelector('.dual-input-label');
                const fieldName = labelElement ? labelElement.textContent : 'Unknown field';
                errors.push(`${fieldName}: Capital Expenditure must be entered first`);
            }
            
            // Check for negative values
            if (parseFloat(percentInput.value) < 0) {
                const labelElement = group.querySelector('.dual-input-label');
                const fieldName = labelElement ? labelElement.textContent : 'Unknown field';
                errors.push(`${fieldName}: Percentage cannot be negative`);
            }
            
            if (parseFloat(dollarInput.value) < 0) {
                const labelElement = group.querySelector('.dual-input-label');
                const fieldName = labelElement ? labelElement.textContent : 'Unknown field';
                errors.push(`${fieldName}: Dollar amount cannot be negative`);
            }
        });
        
        return errors;
    }

    // Public method to clear all dual inputs
    clearAllInputs() {
        const allInputs = document.querySelectorAll('.percent-input, .dollar-input');
        allInputs.forEach(input => {
            input.value = '';
            this.clearStateClasses(input);
        });
        
        // Hide all warnings
        const warnings = document.querySelectorAll('.missing-capex-warning');
        warnings.forEach(warning => {
            warning.style.display = 'none';
        });
    }
}

// Initialize the dual input handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dualInputHandler = new DualInputHandler();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DualInputHandler;
}