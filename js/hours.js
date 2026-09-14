// Hours Manager Module
const HoursManager = (() => {
    let db;

    const init = async (database) => {
        db = database;
        setDefaultDates();
    };

    const setDefaultDates = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        const lastDay = new Date(firstDay.getTime() + 6 * 24 * 60 * 60 * 1000);
        
        const fromInput = document.getElementById('hoursDateFrom');
        const toInput = document.getElementById('hoursDateTo');
        
        if (fromInput) fromInput.valueAsDate = firstDay;
        if (toInput) toInput.valueAsDate = lastDay;
    };

    const filterHours = async () => {
        try {
            const dateFromInput = document.getElementById('hoursDateFrom');
            const dateToInput = document.getElementById('hoursDateTo');
            
            const dateFrom = dateFromInput?.valueAsDate || new Date();
            const dateTo = dateToInput?.valueAsDate || new Date();

            // Placeholder for hours filtering
            const tbody = document.getElementById('hoursTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">No hours data found</td></tr>';
            }

            alert('Hours filter applied. (Showing sample data)');
        } catch (error) {
            console.error('Failed to filter hours:', error);
            alert('Failed to filter hours: ' + error.message);
        }
    };

    return {
        init,
        filterHours
    };
})();
