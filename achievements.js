class AchievementSystem {
    constructor() {
        this.achievements = {
            earlyBird: {
                id: 'earlyBird',
                name: 'Early Bird',
                description: 'Wake up before 6 AM for 3 consecutive days',
                icon: 'fa-sun',
                color: '#f59e0b',
                unlocked: false,
                progress: 0,
                target: 3
            },
            sleepScholar: {
                id: 'sleepScholar',
                name: 'Sleep Scholar',
                description: 'Track sleep for 7 consecutive days',
                icon: 'fa-graduation-cap',
                color: '#7c3aed',
                unlocked: false,
                progress: 0,
                target: 7
            },
            perfectWeek: {
                id: 'perfectWeek',
                name: 'Perfect Week',
                description: 'Get 7+ hours of sleep every day for a week',
                icon: 'fa-trophy',
                color: '#10b981',
                unlocked: false,
                progress: 0,
                target: 7
            },
            environmentMaster: {
                id: 'environmentMaster',
                name: 'Environment Master',
                description: 'Maintain optimal sleep environment for 5 nights',
                icon: 'fa-bed',
                color: '#3b82f6',
                unlocked: false,
                progress: 0,
                target: 5
            },
            consistencyKing: {
                id: 'consistencyKing',
                name: 'Consistency King',
                description: 'Go to bed within 30 minutes of target for 5 days',
                icon: 'fa-crown',
                color: '#f97316',
                unlocked: false,
                progress: 0,
                target: 5
            }
        };
    }
    
    checkAchievements(sleepRecords, environmentData) {
        const unlocked = [];
        
        // Early Bird Achievement
        this.checkEarlyBird(sleepRecords);
        
        // Sleep Scholar Achievement
        this.checkSleepScholar(sleepRecords);
        
        // Perfect Week Achievement
        this.checkPerfectWeek(sleepRecords);
        
        // Environment Master Achievement
        this.checkEnvironmentMaster(environmentData);
        
        // Consistency King Achievement
        this.checkConsistencyKing(sleepRecords);
        
        // Return newly unlocked achievements
        Object.values(this.achievements).forEach(achievement => {
            if (achievement.unlocked && !achievement.notified) {
                unlocked.push(achievement);
                achievement.notified = true;
            }
        });
        
        return unlocked;
    }
    
    checkEarlyBird(sleepRecords) {
        const recentRecords = sleepRecords.slice(-3);
        if (recentRecords.length < 3) return;
        
        const allEarly = recentRecords.every(record => {
            const wakeHour = parseInt(record.wakeTime.split(':')[0]);
            return wakeHour < 6 || (wakeHour === 6 && parseInt(record.wakeTime.split(':')[1]) === 0);
        });
        
        if (allEarly) {
            this.unlockAchievement('earlyBird');
        }
    }
    
    checkSleepScholar(sleepRecords) {
        if (sleepRecords.length >= 7) {
            this.unlockAchievement('sleepScholar');
        }
    }
    
    checkPerfectWeek(sleepRecords) {
        const lastWeek = sleepRecords.slice(-7);
        if (lastWeek.length < 7) return;
        
        const allGoodSleep = lastWeek.every(record => parseFloat(record.duration) >= 7);
        
        if (allGoodSleep) {
            this.unlockAchievement('perfectWeek');
        }
    }
    
    checkEnvironmentMaster(environmentData) {
        // This would check environment data for optimal conditions
        // For now, we'll simulate based on sleep records count
        if (environmentData && environmentData.optimalNights >= 5) {
            this.unlockAchievement('environmentMaster');
        }
    }
    
    checkConsistencyKing(sleepRecords) {
        const userData = getUserData();
        if (!userData.preferredBedtime) return;
        
        const recentRecords = sleepRecords.slice(-5);
        if (recentRecords.length < 5) return;
        
        const consistentRecords = recentRecords.filter(record => {
            const bedtime = calculateMinutesFromMidnight(record.sleepTime);
            const preferred = calculateMinutesFromMidnight(userData.preferredBedtime);
            return Math.abs(bedtime - preferred) <= 30;
        });
        
        if (consistentRecords.length >= 5) {
            this.unlockAchievement('consistencyKing');
        }
    }
    
    unlockAchievement(achievementId) {
        if (this.achievements[achievementId] && !this.achievements[achievementId].unlocked) {
            this.achievements[achievementId].unlocked = true;
            this.showAchievementNotification(this.achievements[achievementId]);
            this.saveAchievements();
        }
    }
    
    showAchievementNotification(achievement) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon" style="color: ${achievement.color}">
                <i class="fas ${achievement.icon}"></i>
            </div>
            <div class="achievement-content">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 5000);
    }
    
    renderAchievementsPage() {
        return `
            <div class="achievements-page">
                <h2><i class="fas fa-trophy"></i> Achievements</h2>
                <div class="achievements-grid">
                    ${Object.values(this.achievements).map(achievement => `
                        <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                            <div class="achievement-icon" style="color: ${achievement.unlocked ? achievement.color : '#94a3b8'}">
                                <i class="fas ${achievement.icon}"></i>
                            </div>
                            <div class="achievement-info">
                                <h3>${achievement.name}</h3>
                                <p>${achievement.description}</p>
                                ${!achievement.unlocked ? `
                                    <div class="achievement-progress">
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${(achievement.progress / achievement.target) * 100}%"></div>
                                        </div>
                                        <span class="progress-text">${achievement.progress}/${achievement.target}</span>
                                    </div>
                                ` : `
                                    <div class="achievement-unlocked">
                                        <i class="fas fa-check"></i> Unlocked!
                                    </div>
                                `}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    saveAchievements() {
        const currentUser = localStorage.getItem("currentUser");
        if (currentUser) {
            localStorage.setItem(`${currentUser}_achievements`, JSON.stringify(this.achievements));
        }
    }
    
    loadAchievements() {
        const currentUser = localStorage.getItem("currentUser");
        if (currentUser) {
            const saved = localStorage.getItem(`${currentUser}_achievements`);
            if (saved) {
                this.achievements = JSON.parse(saved);
            }
        }
    }
}

// Initialize achievement system
const achievementSystem = new AchievementSystem();

// Add achievements page to dashboard
function showAchievementsPage() {
    const pageContent = document.getElementById('achievements-page-content');
    if (pageContent) {
        pageContent.innerHTML = achievementSystem.renderAchievementsPage();
    }
}

// Check achievements when new sleep record is added
function checkNewAchievements(sleepRecord) {
    const unlocked = achievementSystem.checkAchievements([sleepRecord], null);
    return unlocked;
}