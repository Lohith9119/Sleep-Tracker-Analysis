class SleepDebtCalculator {
    constructor() {
        this.idealSleepHours = 7.5; // Can be personalized
        this.debtHistory = [];
    }
    
    calculateDailyDebt(actualSleep, idealSleep = this.idealSleepHours) {
        return actualSleep - idealSleep;
    }
    
    updateSleepDebt(sleepRecords) {
        const lastWeekRecords = sleepRecords.slice(-7);
        let totalDebt = 0;
        
        lastWeekRecords.forEach(record => {
            const dailyDebt = this.calculateDailyDebt(parseFloat(record.duration));
            totalDebt += dailyDebt;
        });
        
        // Store debt history
        this.debtHistory.push({
            date: new Date().toLocaleDateString(),
            debt: totalDebt,
            recordsCount: lastWeekRecords.length
        });
        
        // Keep only last 30 days
        if (this.debtHistory.length > 30) {
            this.debtHistory = this.debtHistory.slice(-30);
        }
        
        return totalDebt;
    }
    
    getDebtStatus(totalDebt) {
        if (totalDebt >= 2) return { status: "Caught Up", emoji: "🌟", color: "#10b981" };
        if (totalDebt >= -2) return { status: "Slight Debt", emoji: "⚠️", color: "#f59e0b" };
        if (totalDebt >= -7) return { status: "Moderate Debt", emoji: "😕", color: "#f97316" };
        return { status: "High Debt", emoji: "😴", color: "#ef4444" };
    }
    
    getRecoveryPlan(totalDebt) {
        const recoveryHours = Math.abs(totalDebt);
        const dailyIncrease = 0.5; // Safe daily increase
        
        if (recoveryHours <= 0) {
            return "You're caught up on sleep! Maintain your current schedule.";
        }
        
        const recoveryDays = Math.ceil(recoveryHours / dailyIncrease);
        
        return `Add ${dailyIncrease}h to your sleep each night. You'll be caught up in ${recoveryDays} days.`;
    }
    
    renderDebtDisplay() {
        const currentUser = localStorage.getItem("currentUser");
        const sleepRecords = JSON.parse(localStorage.getItem(`${currentUser}_sleepRecords`) || '[]');
        
        if (sleepRecords.length === 0) return;
        
        const totalDebt = this.updateSleepDebt(sleepRecords);
        const debtStatus = this.getDebtStatus(totalDebt);
        const recoveryPlan = this.getRecoveryPlan(totalDebt);
        
        // Create or update debt display
        let debtDisplay = document.getElementById('sleepDebtDisplay');
        if (!debtDisplay) {
            debtDisplay = document.createElement('div');
            debtDisplay.id = 'sleepDebtDisplay';
            debtDisplay.className = 'sleep-debt-card';
            document.querySelector('.dashboard-grid').appendChild(debtDisplay);
        }
        
        debtDisplay.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title"><i class="fas fa-calculator"></i> Sleep Debt</h2>
                </div>
                <div class="debt-content">
                    <div class="debt-main ${totalDebt < 0 ? 'negative' : 'positive'}">
                        <span class="debt-emoji">${debtStatus.emoji}</span>
                        <span class="debt-amount">${totalDebt > 0 ? '+' : ''}${totalDebt.toFixed(1)}h</span>
                        <span class="debt-status">${debtStatus.status}</span>
                    </div>
                    <div class="debt-breakdown">
                        <div class="debt-item">
                            <span class="debt-label">Ideal Sleep/Night:</span>
                            <span class="debt-value">${this.idealSleepHours}h</span>
                        </div>
                        <div class="debt-item">
                            <span class="debt-label">Last Week Avg:</span>
                            <span class="debt-value">${(sleepRecords.slice(-7).reduce((sum, r) => sum + parseFloat(r.duration), 0) / Math.min(7, sleepRecords.length)).toFixed(1)}h</span>
                        </div>
                    </div>
                    <div class="recovery-plan">
                        <h4>Recovery Plan</h4>
                        <p>${recoveryPlan}</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize sleep debt calculator
const sleepDebtCalculator = new SleepDebtCalculator();

// Update debt display when new records are added
function updateSleepDebtDisplay() {
    sleepDebtCalculator.renderDebtDisplay();
}