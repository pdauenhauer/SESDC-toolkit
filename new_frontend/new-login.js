document.addEventListener('DOMContentLoaded', () => {
    const toggleLinks = document.querySelectorAll('.toggle-form');
    
    toggleLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
        
            if (loginForm.classList.contains('visible')) {
                loginForm.classList.remove('visible');
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                registerForm.classList.add('visible');
            } else {
                registerForm.classList.remove('visible');
                registerForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                loginForm.classList.add('visible');
            }
        });
    });
});