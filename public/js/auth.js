const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-message');
        const loginBtn = document.querySelector('button[type="submit"]');

        // Simple loading state
        if (loginBtn) {
            loginBtn.textContent = 'Logging in...';
            loginBtn.disabled = true;
        }

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Store user info in localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('role', data.role);

                // Redirect based on role
                switch (data.role) {
                    case 'Customer':
                        window.location.href = '/customer.html';
                        break;
                    case 'RDC':
                        window.location.href = '/rdc.html';
                        break;
                    case 'Driver':
                        window.location.href = '/driver.html';
                        break;
                    case 'Manager':
                        window.location.href = '/manager.html';
                        break;
                    default:
                        if (errorMsg) errorMsg.textContent = 'Unknown role assigned to user.';
                }
            } else {
                if (errorMsg) errorMsg.textContent = data.message;
                if (loginBtn) {
                    loginBtn.textContent = 'Login';
                    loginBtn.disabled = false;
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            if (errorMsg) errorMsg.textContent = 'Connection error. Please try again.';
            if (loginBtn) {
                loginBtn.textContent = 'Login';
                loginBtn.disabled = false;
            }
        }
    });
}

const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const full_name = document.getElementById('reg-fullname').value;
        const email = document.getElementById('reg-email').value;
        const role = document.getElementById('reg-role').value;
        const password = document.getElementById('reg-password').value;
        const errorMsg = document.getElementById('reg-error-message');
        const submitBtn = document.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.textContent = 'Creating...';
            submitBtn.disabled = true;
        }

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name, email, role, password })
            });

            const data = await response.json();

            if (data.success) {
                alert('Registration successful! Please login with your email.');
                if (role === 'Driver') {
                    window.location.href = 'login-driver.html';
                } else {
                    window.location.href = 'login-customer.html';
                }
            } else {
                if (errorMsg) errorMsg.textContent = data.message;
                if (submitBtn) {
                    submitBtn.textContent = 'Sign Up';
                    submitBtn.disabled = false;
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (errorMsg) errorMsg.textContent = 'Connection error. Please try again.';
            if (submitBtn) {
                submitBtn.textContent = 'Sign Up';
                submitBtn.disabled = false;
            }
        }
    });
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
}
