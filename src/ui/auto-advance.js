// Auto-advance functionality for Chess Training Games
class AutoAdvance {
    constructor() {
        this.isEnabled = this.getAutoAdvanceSetting();
        this.delay = 5000; // 5 seconds delay
        this.gameType = this.detectGameType();
        
        this.init();
    }
    
    detectGameType() {
        const path = window.location.pathname;
        if (path.includes('knight_game')) return 'knight';
        if (path.includes('bishop_game')) return 'bishop';
        if (path.includes('color_game')) return 'color';
        return null;
    }
    
    getAutoAdvanceSetting() {
        // Get from localStorage, default to true
        const setting = localStorage.getItem('chess-auto-advance');
        return setting === null ? true : setting === 'true';
    }
    
    setAutoAdvanceSetting(enabled) {
        localStorage.setItem('chess-auto-advance', enabled.toString());
        this.isEnabled = enabled;
        this.updateToggleUI();
    }
    
    init() {
        if (!this.gameType) return;
        
        this.addToggleControl();
        this.checkForAutoAdvance();
    }
    
    addToggleControl() {
        // Add auto-advance toggle to the page
        const container = document.querySelector('.game-content') || document.querySelector('.game-container');
        if (!container) return;
        
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'auto-advance-toggle';
        toggleContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 12px;
            font-family: 'Inter', sans-serif;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        
        toggleContainer.innerHTML = `
            <span>Auto-advance:</span>
            <div class="toggle-switch" style="
                width: 40px;
                height: 20px;
                background: ${this.isEnabled ? 'var(--accent-gold)' : '#666'};
                border-radius: 10px;
                position: relative;
                transition: background 0.3s ease;
            ">
                <div class="toggle-thumb" style="
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 2px;
                    left: ${this.isEnabled ? '22px' : '2px'};
                    transition: left 0.3s ease;
                "></div>
            </div>
        `;
        
        toggleContainer.addEventListener('click', () => {
            this.setAutoAdvanceSetting(!this.isEnabled);
        });
        
        document.body.appendChild(toggleContainer);
        this.toggleElement = toggleContainer;
    }
    
    updateToggleUI() {
        if (!this.toggleElement) return;
        
        const toggleSwitch = this.toggleElement.querySelector('.toggle-switch');
        const toggleThumb = this.toggleElement.querySelector('.toggle-thumb');
        
        toggleSwitch.style.background = this.isEnabled ? 'var(--accent-gold)' : '#666';
        toggleThumb.style.left = this.isEnabled ? '22px' : '2px';
    }
    
    checkForAutoAdvance() {
        if (!this.isEnabled) return;
        
        // Check if we're on a result page with a correct answer
        const isResultPage = this.isCorrectResultPage();
        if (isResultPage) {
            this.showCountdown();
            setTimeout(() => {
                this.advanceToNext();
            }, this.delay);
        }
    }
    
    isCorrectResultPage() {
        // Check for success indicators in the page
        const pageContent = document.body.textContent.toLowerCase();
        
        // Look for success messages
        const successIndicators = [
            'correct!',
            'well done',
            'excellent',
            'perfect',
            'great job',
            'movement path:'
        ];
        
        // Check if any success indicator is present
        const hasSuccessMessage = successIndicators.some(indicator => 
            pageContent.includes(indicator)
        );
        
        // Also check for chessboard visualization (indicates a completed answer)
        const hasChessboard = document.getElementById('chessboard-container') !== null;
        
        // Check for "Continue Training" link
        const hasContinueLink = document.querySelector('a[href*="game"], .training-button, .nav-link') !== null;
        
        return hasSuccessMessage && (hasChessboard || hasContinueLink);
    }
    
    showCountdown() {
        // Show small countdown below the toggle control
        const countdown = document.createElement('div');
        countdown.className = 'auto-advance-countdown';
        countdown.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: rgba(0, 0, 0, 0.85);
            color: var(--accent-gold);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            font-family: 'Inter', sans-serif;
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            backdrop-filter: blur(10px);
            border: 1px solid var(--accent-gold);
            min-width: 80px;
            transition: all 0.3s ease;
        `;
        
        let timeLeft = Math.floor(this.delay / 1000);
        countdown.innerHTML = `
            <span style="font-size: 11px; opacity: 0.8;">Next in</span>
            <span style="font-weight: 600; font-size: 14px;" class="countdown-number">${timeLeft}s</span>
        `;
        
        // Add hover effect
        countdown.addEventListener('mouseenter', () => {
            countdown.style.background = 'rgba(0, 0, 0, 0.95)';
            countdown.style.transform = 'scale(1.05)';
        });
        
        countdown.addEventListener('mouseleave', () => {
            countdown.style.background = 'rgba(0, 0, 0, 0.85)';
            countdown.style.transform = 'scale(1)';
        });
        
        // Update countdown every second
        const countdownTimer = setInterval(() => {
            timeLeft--;
            const numberElement = countdown.querySelector('.countdown-number');
            if (numberElement) {
                numberElement.textContent = `${timeLeft}s`;
                
                // Add urgency styling for last 2 seconds
                if (timeLeft <= 2) {
                    countdown.style.background = 'rgba(244, 67, 54, 0.9)';
                    countdown.style.borderColor = '#f44336';
                    countdown.style.color = 'white';
                }
            }
            
            if (timeLeft <= 0) {
                clearInterval(countdownTimer);
                countdown.remove();
            }
        }, 1000);
        
        // Allow user to cancel by clicking
        countdown.addEventListener('click', () => {
            clearInterval(countdownTimer);
            countdown.remove();
            // Show brief feedback
            this.showCancelFeedback();
        });
        
        // Also cancel on any key press
        const cancelHandler = (e) => {
            clearInterval(countdownTimer);
            countdown.remove();
            document.removeEventListener('keydown', cancelHandler);
            this.showCancelFeedback();
        };
        document.addEventListener('keydown', cancelHandler);
        
        document.body.appendChild(countdown);
        
        // Store references for cleanup
        this.countdownElement = countdown;
        this.countdownTimer = countdownTimer;
    }
    
    showCancelFeedback() {
        // Show brief "Cancelled" message
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            font-family: 'Inter', sans-serif;
            z-index: 1001;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        feedback.textContent = 'Cancelled';
        document.body.appendChild(feedback);
        
        // Animate in
        setTimeout(() => feedback.style.opacity = '1', 100);
        
        // Remove after 1.5 seconds
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => feedback.remove(), 300);
        }, 1500);
    }
    
    advanceToNext() {
        // Find the continue link and click it
        const continueLink = this.findContinueLink();
        
        if (continueLink) {
            // Add visual feedback before advancing
            continueLink.style.transform = 'scale(1.05)';
            continueLink.style.background = 'var(--accent-gold)';
            continueLink.style.color = 'var(--primary-dark)';
            
            setTimeout(() => {
                continueLink.click();
            }, 200);
        } else {
            // Fallback: reload current game page
            window.location.href = `/${this.gameType}_game`;
        }
    }
    
    findContinueLink() {
        // Look for various types of continue links
        const selectors = [
            'a[href*="game"]',
            '.training-button',
            '.game-button', 
            '.nav-link',
            'a:contains("Continue")',
            'a:contains("Training")',
            'a:contains("Next")'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.href && element.href.includes('game')) {
                return element;
            }
        }
        
        // Look for any link that goes back to a game
        const allLinks = document.querySelectorAll('a');
        for (const link of allLinks) {
            if (link.href && (
                link.href.includes('knight_game') ||
                link.href.includes('bishop_game') ||
                link.href.includes('color_game')
            )) {
                return link;
            }
        }
        
        return null;
    }
}

// Initialize auto-advance when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('_game')) {
        window.autoAdvance = new AutoAdvance();
    }
});