// Clock In/Out Manager Module
const ClockInManager = (() => {
    let db;
    let currentEmployeeId = null;
    let isClockedIn = false;
    let clockInTime = null;
    let clockOutTime = null;

    // Initialize Clock In Manager with Database
    const init = async (database) => {
        db = database;
        await loadEmployeeStatus();
        await loadTodayStats();
        await loadRecentEvents();
        updateClock();
        setInterval(updateClock, 1000);
    };

    // Update live clock display
    const updateClock = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: false });
        const clockTimeDisplay = document.getElementById('clockTime');
        if (clockTimeDisplay) {
            clockTimeDisplay.textContent = timeString;
        }

        if (isClockedIn && clockInTime) {
            const elapsed = now - new Date(clockInTime);
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            
            const hoursWorkedDisplay = document.getElementById('hoursWorkedToday');
            if (hoursWorkedDisplay) {
                hoursWorkedDisplay.textContent = `${hours}h ${minutes}m`;
            }
        }
    };

    // Load Employee Status
    const loadEmployeeStatus = async () => {
        try {
            const employeeId = sessionStorage.getItem('currentEmployeeId') || 1;
            currentEmployeeId = employeeId;
            
            const transaction = db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            
            const employee = await new Promise((resolve, reject) => {
                const request = store.get(parseInt(employeeId));
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (employee) {
                document.getElementById('currentUserName').textContent = employee.name || 'Employee';
                document.getElementById('currentEmployeeId').textContent = employee.id;
                await checkClockInStatus();
            }
        } catch (error) {
            console.error('Failed to load employee status:', error);
            SecurityManager.logAuditEvent('LOAD_EMPLOYEE_FAILED', error.message, 'ERROR');
        }
    };

    // Check if employee is currently clocked in
    const checkClockInStatus = async () => {
        try {
            const transaction = db.transaction(['clockEvents'], 'readonly');
            const store = transaction.objectStore('clockEvents');
            
            const allEvents = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            const today = new Date().toDateString();
            const todayEvents = allEvents.filter(e => 
                new Date(e.timestamp).toDateString() === today &&
                e.employeeId === parseInt(currentEmployeeId)
            );

            if (todayEvents.length > 0) {
                const lastEvent = todayEvents[todayEvents.length - 1];
                
                if (lastEvent.eventType === 'clockIn') {
                    isClockedIn = true;
                    clockInTime = lastEvent.timestamp;
                    updateClockDisplay();
                } else if (lastEvent.eventType === 'clockOut') {
                    isClockedIn = false;
                    clockOutTime = lastEvent.timestamp;
                    updateClockDisplay();
                }
            }
        } catch (error) {
            console.error('Failed to check clock status:', error);
        }
    };

    // Update clock display
    const updateClockDisplay = () => {
        const clockStatus = document.getElementById('clockStatus');
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');
        const todayClockInTimeDisplay = document.getElementById('todayClockInTime');
        const todayClockOutTimeDisplay = document.getElementById('todayClockOutTime');

        if (isClockedIn) {
            clockStatus.textContent = '✓ Clocked In';
            clockStatus.style.color = '#00ff41';
            if (clockInBtn) clockInBtn.style.display = 'none';
            if (clockOutBtn) clockOutBtn.style.display = 'inline-block';
            
            if (clockInTime && todayClockInTimeDisplay) {
                const inTime = new Date(clockInTime);
                todayClockInTimeDisplay.textContent = inTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }
        } else {
            clockStatus.textContent = 'Not Clocked In';
            clockStatus.style.color = '#ff4444';
            if (clockInBtn) clockInBtn.style.display = 'inline-block';
            if (clockOutBtn) clockOutBtn.style.display = 'none';
            
            if (clockOutTime && todayClockOutTimeDisplay) {
                const outTime = new Date(clockOutTime);
                todayClockOutTimeDisplay.textContent = outTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }
        }
    };

    // Clock In Function
    const clockIn = async () => {
        try {
            if (isClockedIn) {
                alert('Already clocked in!');
                return;
            }

            const now = new Date().toISOString();
            const clockEvent = {
                employeeId: parseInt(currentEmployeeId),
                eventType: 'clockIn',
                timestamp: now,
                latitude: null,
                longitude: null,
                notes: 'Clocked in via web app'
            };

            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        clockEvent.latitude = position.coords.latitude;
                        clockEvent.longitude = position.coords.longitude;
                        saveClockEvent(clockEvent);
                    },
                    () => {
                        saveClockEvent(clockEvent);
                    }
                );
            } else {
                saveClockEvent(clockEvent);
            }
        } catch (error) {
            console.error('Clock in failed:', error);
            SecurityManager.logAuditEvent('CLOCK_IN_FAILED', error.message, 'ERROR');
            alert('Failed to clock in');
        }
    };

    // Clock Out Function
    const clockOut = async () => {
        try {
            if (!isClockedIn) {
                alert('Not clocked in!');
                return;
            }

            const now = new Date().toISOString();
            const clockEvent = {
                employeeId: parseInt(currentEmployeeId),
                eventType: 'clockOut',
                timestamp: now,
                latitude: null,
                longitude: null,
                notes: 'Clocked out via web app'
            };

            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        clockEvent.latitude = position.coords.latitude;
                        clockEvent.longitude = position.coords.longitude;
                        saveClockEvent(clockEvent);
                    },
                    () => {
                        saveClockEvent(clockEvent);
                    }
                );
            } else {
                saveClockEvent(clockEvent);
            }
        } catch (error) {
            console.error('Clock out failed:', error);
            SecurityManager.logAuditEvent('CLOCK_OUT_FAILED', error.message, 'ERROR');
            alert('Failed to clock out');
        }
    };

    // Save Clock Event to Database
    const saveClockEvent = async (clockEvent) => {
        try {
            const transaction = db.transaction(['clockEvents'], 'readwrite');
            const store = transaction.objectStore('clockEvents');
            
            await new Promise((resolve, reject) => {
                const request = store.add(clockEvent);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (clockEvent.eventType === 'clockIn') {
                isClockedIn = true;
                clockInTime = clockEvent.timestamp;
                alert('✓ Successfully clocked in');
                SecurityManager.logAuditEvent('CLOCK_IN', `Employee: ${currentEmployeeId}`, 'INFO');
            } else {
                isClockedIn = false;
                clockOutTime = clockEvent.timestamp;
                alert('✓ Successfully clocked out');
                SecurityManager.logAuditEvent('CLOCK_OUT', `Employee: ${currentEmployeeId}`, 'INFO');
            }

            updateClockDisplay();
            await loadTodayStats();
            await loadRecentEvents();
        } catch (error) {
            console.error('Failed to save clock event:', error);
            SecurityManager.logAuditEvent('SAVE_CLOCK_EVENT_FAILED', error.message, 'ERROR');
            alert('Failed to save clock event');
        }
    };

    // Load Today's Statistics
    const loadTodayStats = async () => {
        try {
            const transaction = db.transaction(['clockEvents'], 'readonly');
            const store = transaction.objectStore('clockEvents');
            
            const allEvents = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            const today = new Date().toDateString();
            const todayEvents = allEvents.filter(e => 
                new Date(e.timestamp).toDateString() === today &&
                e.employeeId === parseInt(currentEmployeeId)
            ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            let totalMinutes = 0;

            for (let i = 0; i < todayEvents.length; i += 2) {
                const clockInEvent = todayEvents[i];
                const clockOutEvent = todayEvents[i + 1];

                if (clockInEvent && clockOutEvent) {
                    const inTime = new Date(clockInEvent.timestamp);
                    const outTime = new Date(clockOutEvent.timestamp);
                    const durationMinutes = (outTime - inTime) / (1000 * 60);
                    totalMinutes += durationMinutes;
                }
            }

            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);
            
            const hoursDisplay = document.getElementById('hoursWorkedToday');
            if (hoursDisplay) {
                hoursDisplay.textContent = `${hours}h ${minutes}m`;
            }
        } catch (error) {
            console.error('Failed to load today stats:', error);
        }
    };

    // Load Recent Events
    const loadRecentEvents = async () => {
        try {
            const transaction = db.transaction(['clockEvents'], 'readonly');
            const store = transaction.objectStore('clockEvents');
            
            const allEvents = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            const employeeEvents = allEvents
                .filter(e => e.employeeId === parseInt(currentEmployeeId))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10);

            const tbody = document.getElementById('recentClockEventsBody');
            if (tbody) {
                tbody.innerHTML = '';

                employeeEvents.forEach(event => {
                    const eventDate = new Date(event.timestamp);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${eventDate.toLocaleDateString()}</td>
                        <td>${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>${event.eventType === 'clockIn' ? '🕐 Clock In' : '🕑 Clock Out'}</td>
                        <td>${event.notes || '--'}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Failed to load recent events:', error);
        }
    };

    return {
        init,
        clockIn,
        clockOut,
        getCurrentStatus: () => ({
            isClockedIn,
            clockInTime,
            clockOutTime,
            employeeId: currentEmployeeId
        })
    };
})();
