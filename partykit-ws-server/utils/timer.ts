export class TimerService {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Set a timer with a callback
   */
  setTimer(
    key: string, 
    duration: number, 
    callback: () => void
  ): void {
    this.clearTimer(key);
    
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(key);
    }, duration * 1000);
    
    this.timers.set(key, timer);
  }

  /**
   * Clear a specific timer
   */
  clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * Set an interval
   */
  setInterval(key: string, interval: number, callback: () => void): void {
    this.clearInterval(key);
    
    const int = setInterval(callback, interval * 1000);
    this.intervals.set(key, int);
  }

  /**
   * Clear a specific interval
   */
  clearInterval(key: string): void {
    const interval = this.intervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(key);
    }
  }

  /**
   * Clear all timers and intervals
   */
  clearAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
  }

  /**
   * Get remaining time for a timer
   */
  getRemainingTime(startTime: number, duration: number): number {
    const elapsed = (Date.now() - startTime) / 1000;
    return Math.max(0, Number((duration - elapsed).toFixed(1)));
  }

  /**
   * Create a countdown timer
   */
  createCountdown(
    key: string,
    duration: number,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ): void {
    const startTime = Date.now();
    
    const tick = () => {
      const remaining = this.getRemainingTime(startTime, duration);
      
      if (remaining <= 0) {
        onComplete();
        this.clearTimer(key);
        this.clearInterval(`${key}_tick`);
      } else {
        onTick(remaining);
      }
    };
    
    // Initial tick
    tick();
    
    // Set interval for subsequent ticks
    this.setInterval(`${key}_tick`, 1, tick);
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}