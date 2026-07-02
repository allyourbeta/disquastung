# Auto-Advance Testing Checklist

## Manual Testing Instructions

### Basic Auto-Advance Functionality

1. **Navigate to any game** (knight/bishop/color)
2. **Check toggle control:**
   - Should see toggle switch in top-right corner
   - Should show "Auto-advance: ON/OFF"
   - Should be enabled by default (golden color)
   - Click to toggle on/off (persists across page reloads)

3. **Test with correct answer:**
   - Answer a question correctly
   - If auto-advance is ON: Should show countdown overlay (2 seconds)
   - Should automatically redirect to next question after countdown
   - If auto-advance is OFF: Should stay on result page

### Toggle Control Testing

1. **Visual appearance:**
   - [ ] Toggle appears in top-right corner
   - [ ] Shows "Auto-advance:" text
   - [ ] Switch shows golden color when ON
   - [ ] Switch shows gray color when OFF
   - [ ] Thumb slides smoothly between positions

2. **Functionality:**
   - [ ] Click toggles the setting
   - [ ] Setting persists across page refreshes
   - [ ] Setting persists across different games
   - [ ] localStorage stores 'chess-auto-advance' key

### Countdown Display Testing

1. **Appearance (when auto-advance is ON):**
   - [ ] Small countdown appears in top-right corner (below toggle)
   - [ ] Shows "Next in" text with countdown number
   - [ ] Positioned at top: 70px, right: 20px (non-obtrusive)
   - [ ] Does NOT block the chessboard view
   - [ ] Styled with golden border and dark background
   - [ ] Turns red in final 2 seconds

2. **Functionality:**
   - [ ] Countdown starts at 5 seconds 
   - [ ] Number decreases every second (5s, 4s, 3s, 2s, 1s)
   - [ ] Click on countdown cancels it
   - [ ] Any keypress cancels countdown
   - [ ] Shows "Cancelled" feedback when cancelled
   - [ ] Hover effect (slight scale and background change)

### Auto-Advance Behavior Testing

1. **Correct answers:**
   - [ ] Knight game: Correct answer → countdown → next question
   - [ ] Bishop game: Correct answer → countdown → next question  
   - [ ] Color game: Correct answer → countdown → next question

2. **Incorrect answers:**
   - [ ] Should NOT auto-advance on wrong answers
   - [ ] Should stay on game page with error message
   - [ ] Toggle should still be visible and functional

3. **Edge cases:**
   - [ ] Works after multiple correct answers in a row
   - [ ] Toggle state persists between games
   - [ ] Countdown can be cancelled and still works on next question
   - [ ] Works with keyboard input (correct key press → countdown)

### Integration with Existing Features

1. **Keyboard input compatibility:**
   - [ ] Keyboard shortcuts work normally
   - [ ] Auto-advance works after keyboard answer
   - [ ] Keyboard can cancel countdown

2. **Visual compatibility:**
   - [ ] Toggle doesn't interfere with game UI
   - [ ] Countdown doesn't block important content
   - [ ] Works on mobile/tablet screens

3. **Result page detection:**
   - [ ] Detects success on knight path visualization
   - [ ] Detects success on bishop path visualization
   - [ ] Detects success on color result page
   - [ ] Does NOT trigger on error/incorrect pages

## Browser Compatibility Testing

Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## localStorage Testing

1. **Open browser dev tools → Application → Storage → Local Storage**
2. **Check for 'chess-auto-advance' key:**
   - [ ] Should be 'true' when toggle is ON
   - [ ] Should be 'false' when toggle is OFF
   - [ ] Should persist across browser sessions

## Performance Testing

- [ ] No console errors in browser dev tools
- [ ] Smooth animations and transitions
- [ ] No memory leaks with repeated use
- [ ] Toggle responsive to clicks

---

## Integration Tests Results ✅

- All 5 auto-advance integration tests pass
- All 19 basic functionality tests still pass
- JavaScript file served correctly
- Script tags added to all three game templates

## Manual Testing Results

**Auto-Advance Toggle:**
- [ ] Appears correctly in all games
- [ ] Toggles between ON/OFF states
- [ ] Persists setting in localStorage

**Countdown Functionality:**
- [ ] Shows countdown on correct answers when enabled
- [ ] Can be cancelled by user interaction
- [ ] Automatically advances after timeout

**Game Integration:**
- [ ] Works with knight game
- [ ] Works with bishop game  
- [ ] Works with color game
- [ ] Compatible with keyboard input

---
*Complete this checklist by testing in browser at http://127.0.0.1:5000*