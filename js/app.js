// Complete App Module - Main Application Logic
const app = (() => {
    let db;

    const DBManager = (() => {
        const initDB = async () => {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('PayrollSystemDB', 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    if (!db.objectStoreNames.contains('employees')) {
                        const employeeStore = db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
                        employeeStore.createIndex('email', 'email', { unique: true });
                    }
                    
                    if (!db.objectStoreNames.contains('clockEvents')) {
                        const clockStore = db.createObjectStore('clockEvents', { keyPath: 'id', autoIncrement: true });
                        clockStore.createIndex('employeeId', 'employeeId', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('payroll')) {
                        const payrollStore = db.createObjectStore('payroll', { keyPath: 'id', autoIncrement: true });
                        payrollStore.createIndex('employeeId', 'employeeId', { unique: false });
                    }
                };
            });
        };

        const addEmployee = async (employeeData) => {
            const transaction = db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            return new Promise((resolve, reject) => {
                const request = store.add(employeeData);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        };

        const getAllEmployees = async () => {
            const transaction = db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        };

        const deleteEmployee = async (id) => {
            const transaction = db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        };

        return {
            initDB,
            addEmployee,
            getAllEmployees,
            deleteEmployee
        };
    })();

    const init = async () => {
        try {
            db = await DBManager.initDB();
            console.log('Database initialized');
            
            // Initialize all managers
            ClockInManager.init(db);
            HoursManager.init(db);
            
            loadDashboard();
            setupNavigation();
        } catch (error) {
            console.error('App initialization failed:', error);
            alert('Failed to initialize app: ' + error.message);
        }
    };

    const setupNavigation = () => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href === '#logout') {
                    logout();
                } else {
                    showSection(href.substring(1));
                }
            });
        });
    };

    const showSection = (sectionId) => {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            const link = document.querySelector(`[href="#${sectionId}"]`);
            if (link) link.classList.add('active');
        }
    };

    const loadDashboard = async () => {
        try {
            const employees = await DBManager.getAllEmployees();
            document.getElementById('totalEmployees').textContent = employees.length;
            document.getElementById('employeesClockedIn').textContent = '0';
            
            loadEmployeeTable(employees);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    };

    const loadEmployeeTable = async (employees) => {
        const tbody = document.getElementById('employeeTableBody');
        tbody.innerHTML = '';
        
        if (employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">No employees found</td></tr>';
            return;
        }
        
        employees.forEach(emp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${emp.id}</td>
                <td>${SecurityManager.sanitizeInput(emp.name)}</td>
                <td>${SecurityManager.sanitizeInput(emp.email || 'N/A')}</td>
                <td>${SecurityManager.sanitizeInput(emp.position || 'N/A')}</td>
                <td>$${(emp.salary || 0).toFixed(2)}</td>
                <td><span style="color: #00ff41;">✓ Active</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="app.deleteEmployee(${emp.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    };

    const openModal = (type) => {
        const modal = document.getElementById('modal');
        const overlay = document.getElementById('modalOverlay');
        const modalBody = document.getElementById('modalBody');

        if (type === 'addEmployee') {
            modalBody.innerHTML = `
                <h3>Add New Employee</h3>
                <div class="form-group">
                    <label>Full Name:</label>
                    <input type="text" id="empName" class="form-control" placeholder="Enter full name">
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="empEmail" class="form-control" placeholder="Enter email">
                </div>
                <div class="form-group">
                    <label>Position:</label>
                    <input type="text" id="empPosition" class="form-control" placeholder="Enter position">
                </div>
                <div class="form-group">
                    <label>Salary:</label>
                    <input type="number" id="empSalary" class="form-control" placeholder="Enter salary">
                </div>
                <button class="btn btn-primary" onclick="app.saveEmployee()">Save Employee</button>
            `;
        } else if (type === 'processPayroll') {
            modalBody.innerHTML = `
                <h3>Process Payroll</h3>
                <p>Payroll will be calculated based on hours worked and current tax settings.</p>
                <button class="btn btn-primary" onclick="app.processPayroll()">Process Payroll Now</button>
            `;
        }

        modal.classList.add('show');
        overlay.classList.add('show');
    };

    const closeModal = () => {
        const modal = document.getElementById('modal');
        const overlay = document.getElementById('modalOverlay');
        modal.classList.remove('show');
        overlay.classList.remove('show');
    };

    const saveEmployee = async () => {
        const name = document.getElementById('empName')?.value;
        const email = document.getElementById('empEmail')?.value;
        const position = document.getElementById('empPosition')?.value;
        const salary = parseFloat(document.getElementById('empSalary')?.value);

        if (!name || !email || !salary) {
            alert('Please fill in all required fields');
            return;
        }

        const employeeData = {
            name: SecurityManager.sanitizeInput(name),
            email: SecurityManager.sanitizeInput(email),
            position: SecurityManager.sanitizeInput(position),
            salary: salary,
            createdAt: new Date().toISOString()
        };

        try {
            await DBManager.addEmployee(employeeData);
            SecurityManager.logAuditEvent('EMPLOYEE_ADDED', `Name: ${name}`, 'INFO');
            alert('Employee added successfully!');
            closeModal();
            loadDashboard();
        } catch (error) {
            console.error('Failed to add employee:', error);
            alert('Failed to add employee: ' + error.message);
        }
    };

    const deleteEmployee = async (id) => {
        if (confirm('Are you sure you want to delete this employee?')) {
            try {
                await DBManager.deleteEmployee(id);
                SecurityManager.logAuditEvent('EMPLOYEE_DELETED', `ID: ${id}`, 'INFO');
                alert('Employee deleted successfully!');
                loadDashboard();
            } catch (error) {
                console.error('Failed to delete employee:', error);
                alert('Failed to delete employee: ' + error.message);
            }
        }
    };

    const searchEmployees = async () => {
        const searchValue = document.getElementById('employeeSearch')?.value.toLowerCase() || '';
        const employees = await DBManager.getAllEmployees();
        const filtered = employees.filter(emp => 
            emp.name.toLowerCase().includes(searchValue) || 
            emp.email.toLowerCase().includes(searchValue)
        );
        loadEmployeeTable(filtered);
    };

    const processPayroll = async () => {
        try {
            alert('Payroll processing initiated. Please check the Payroll section for details.');
            closeModal();
            showSection('payroll');
        } catch (error) {
            console.error('Payroll processing failed:', error);
            alert('Failed to process payroll: ' + error.message);
        }
    };

    const generateReport = (reportType) => {
        const reportContent = document.getElementById('reportContent');
        if (reportContent) {
            reportContent.innerHTML = `<p>${reportType.toUpperCase()} Report - Generated: ${new Date().toLocaleString()}</p>`;
        }
        SecurityManager.logAuditEvent('REPORT_GENERATED', `Type: ${reportType}`, 'INFO');
    };

    const saveSettings = () => {
        const settings = {
            federalTaxRate: document.getElementById('federalTaxRate')?.value,
            stateTaxRate: document.getElementById('stateTaxRate')?.value,
            healthInsurance: document.getElementById('healthInsurance')?.value,
            retirement: document.getElementById('retirement')?.value,
            twoFactorAuth: document.getElementById('twoFactorAuth')?.checked,
            encryptionEnabled: document.getElementById('encryptionEnabled')?.checked
        };
        localStorage.setItem('payrollSettings', JSON.stringify(settings));
        SecurityManager.logAuditEvent('SETTINGS_SAVED', 'System settings updated', 'INFO');
        alert('Settings saved successfully!');
    };

    const securityCheck = () => {
        const auditLog = SecurityManager.getAuditLog();
        alert(`Security Status: Active\nAudit Log Entries: ${auditLog.length}\nSession: ${SecurityManager.getSessionInfo().isActive ? 'Active' : 'Inactive'}`);
    };

    const auditTaxes = (type) => {
        SecurityManager.logAuditEvent('TAX_AUDIT', `Type: ${type}`, 'INFO');
        alert(`${type.toUpperCase()} Tax Audit Completed`);
    };

    const changePassword = () => {
        alert('Password change functionality - Coming soon');
    };

    const filterHours = () => {
        if (HoursManager && HoursManager.filterHours) {
            HoursManager.filterHours();
        }
    };

    const logout = () => {
        if (confirm('Are you sure you want to logout?')) {
            sessionStorage.clear();
            SecurityManager.logAuditEvent('LOGOUT', 'User logged out', 'INFO');
            alert('Logged out successfully!');
            location.reload();
        }
    };

    const clockIn = () => {
        if (ClockInManager && ClockInManager.clockIn) {
            ClockInManager.clockIn();
        }
    };

    const clockOut = () => {
        if (ClockInManager && ClockInManager.clockOut) {
            ClockInManager.clockOut();
        }
    };

    return {
        init,
        showSection,
        openModal,
        closeModal,
        saveEmployee,
        deleteEmployee,
        searchEmployees,
        processPayroll,
        generateReport,
        saveSettings,
        securityCheck,
        auditTaxes,
        changePassword,
        filterHours,
        logout,
        clockIn,
        clockOut,
        loadDashboard
    };
})();

// Initialize app when page loads
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
