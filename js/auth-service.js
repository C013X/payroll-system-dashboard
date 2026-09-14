const AuthService = (() => {
    const state = {
        currentUser: null,
        isAuthenticated: false,
        sessionTimeout: 30 * 60 * 1000,
        maxLoginAttempts: 5,
        loginAttempts: 0
    };

    const users = [
        {
            id: 1,
            email: 'admin@payroll.com',
            password: 'Admin123!',
            name: 'Admin User',
            role: 'admin',
            permissions: ['view_all', 'edit_payroll', 'manage_employees', 'view_reports', 'manage_settings']
        },
        {
            id: 2,
            email: 'emp@payroll.com',
            password: 'Employee123!',
            name: 'John Employee',
            role: 'employee',
            permissions: ['clock_in', 'view_hours', 'view_payroll']
        }
    ];

    const handleLogin = async (event) => {
        event.preventDefault();
        
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked;

        if (!email || !password) {
            showError('Please enter both email and password');
            return;
        }

        if (state.loginAttempts >= state.maxLoginAttempts) {
            showError('Too many login attempts. Please try again later.');
            SecurityManager.logAuditEvent('LOGIN_BLOCKED', `Email: ${email}`, 'CRITICAL');
            return;
        }

        showLoading(true);
        clearMessages();

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const user = authenticateUser(email, password);
            
            if (user) {
                state.loginAttempts = 0;
                state.currentUser = user;
                state.isAuthenticated = true;

                storeSession(user, rememberMe);
                SecurityManager.logAuditEvent('LOGIN_SUCCESS', `Email: ${email}, Role: ${user.role}`, 'INFO');
                showSuccess(`Welcome back, ${user.name}!`);

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                state.loginAttempts++;
                SecurityManager.logAuditEvent('LOGIN_FAILED', `Email: ${email}`, 'WARNING');
                showError('Invalid email or password. Please try again.');
                
                document.getElementById('loginForm').style.animation = 'shake 0.5s';
                setTimeout(() => {
                    document.getElementById('loginForm').style.animation = '';
                }, 500);
            }
        } catch (error) {
            console.error('Login error:', error);
            SecurityManager.logAuditEvent('LOGIN_ERROR', error.message, 'ERROR');
            showError('An error occurred during login. Please try again.');
        } finally {
            showLoading(false);
        }
    };

    const authenticateUser = (email, password) => {
        const sanitizedEmail = SecurityManager.sanitizeInput(email);
        const user = users.find(u => u.email === sanitizedEmail);
        
        if (user && user.password === password) {
            return user;
        }
        
        return null;
    };

    const storeSession = (user, rememberMe) => {
        const sessionToken = SecurityManager.generateSessionToken();
        const csrfToken = SecurityManager.generateCSRFToken();

        sessionStorage.setItem('currentUser', JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions
        }));
        sessionStorage.setItem('currentEmployeeId', user.id);
        sessionStorage.setItem('sessionToken', sessionToken);
        sessionStorage.setItem('csrfToken', csrfToken);
        sessionStorage.setItem('loginTime', new Date().toISOString());

        if (rememberMe) {
            const rememberData = {
                email: user.email,
                token: sessionToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };
            localStorage.setItem('rememberMe', JSON.stringify(rememberData));
        }
    };

    const checkSession = () => {
        const currentUser = sessionStorage.getItem('currentUser');
        const sessionToken = sessionStorage.getItem('sessionToken');

        if (currentUser && sessionToken) {
            state.currentUser = JSON.parse(currentUser);
            state.isAuthenticated = true;
            return true;
        }

        const rememberMe = localStorage.getItem('rememberMe');
        if (rememberMe) {
            const rememberData = JSON.parse(rememberMe);
            if (new Date(rememberData.expiresAt) > new Date()) {
                state.currentUser = users.find(u => u.email === rememberData.email);
                state.isAuthenticated = true;
                return true;
            } else {
                localStorage.removeItem('rememberMe');
            }
        }

        return false;
    };

    const logout = () => {
        sessionStorage.clear();
        localStorage.removeItem('rememberMe');
        state.currentUser = null;
        state.isAuthenticated = false;
        SecurityManager.logAuditEvent('LOGOUT', 'User logged out', 'INFO');
        window.location.href = 'login.html';
    };

    const getCurrentUser = () => {
        return state.currentUser;
    };

    const isAuthenticated = () => {
        return state.isAuthenticated;
    };

    const hasPermission = (permission) => {
        if (!state.currentUser) return false;
        return state.currentUser.permissions && state.currentUser.permissions.includes(permission);
    };

    const showError = (message) => {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
        }
    };

    const showSuccess = (message) => {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.classList.add('show');
        }
    };

    const showLoading = (isLoading) => {
        const loadingDiv = document.getElementById('loadingIndicator');
        if (loadingDiv) {
            loadingDiv.style.display = isLoading ? 'block' : 'none';
        }
        
        const loginButton = document.querySelector('.login-button');
        if (loginButton) {
            loginButton.disabled = isLoading;
            loginButton.style.opacity = isLoading ? '0.6' : '1';
        }
    };

    const clearMessages = () => {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        if (errorDiv) errorDiv.classList.remove('show');
        if (successDiv) successDiv.classList.remove('show');
    };

    return {
        handleLogin,
        checkSession,
        logout,
        getCurrentUser,
        isAuthenticated,
        hasPermission
    };
})();

window.addEventListener('DOMContentLoaded', () => {
    if (AuthService.checkSession()) {
        window.location.href = 'index.html';
    }
});
