/**
 * SpeedScrub
 * Turns a horizontal drag into a speed change that adapts to intent.
 *
 * A fixed WPM-per-pixel ratio is wrong at both ends: fine enough for a 5 WPM
 * nudge makes a big change take ten swipes, and fast enough for a big change
 * makes a nudge impossible. So the gain follows how fast the pointer moves,
 * like pointer acceleration: a slow drag is a fine adjustment, a flick a
 * sweep, and the gain between the two is smooth (exponential), so there is no
 * threshold to feel. The value is kept fractional because at the slow end one
 * event moves it far less than 1 WPM.
 *
 * Mirrors SpeedScrub in the iOS app's Defaults.swift.
 *
 * @license MIT
 */

class SpeedScrub {
    static SLOW_GAIN = 0.06;   // WPM per px at a crawl
    static FAST_GAIN = 2.2;    // WPM per px at a flick
    static SLOW_VELOCITY = 40;    // px / second mapped to the slow end
    static FAST_VELOCITY = 1200;  // px / second mapped to the fast end

    constructor(startingAt, x, time, min, max) {
        this.value = Math.max(min, Math.min(max, startingAt));
        this.min = min;
        this.max = max;
        this.lastX = x;
        this.lastTime = time;
        this.velocity = 0;
    }

    static gain(velocity) {
        const { SLOW_GAIN, FAST_GAIN, SLOW_VELOCITY, FAST_VELOCITY } = SpeedScrub;
        const t = Math.min(1, Math.max(0, (velocity - SLOW_VELOCITY) / (FAST_VELOCITY - SLOW_VELOCITY)));
        return SLOW_GAIN * Math.pow(FAST_GAIN / SLOW_GAIN, t);
    }

    /** Feeds the next pointer position (ms timestamp) and returns the new, fractional speed. */
    update(x, timeMs) {
        const dx = x - this.lastX;
        const dt = (timeMs - this.lastTime) / 1000;
        this.lastX = x;
        this.lastTime = timeMs;
        // A long gap means the finger rested; measure afresh.
        const instant = dt > 0.12 ? 0 : Math.abs(dx) / Math.max(dt, 1 / 240);
        this.velocity = this.velocity * 0.7 + instant * 0.3;
        this.value = Math.min(this.max, Math.max(this.min, this.value + dx * SpeedScrub.gain(this.velocity)));
        return this.value;
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = SpeedScrub;
if (typeof window !== 'undefined') window.SpeedScrub = SpeedScrub;
