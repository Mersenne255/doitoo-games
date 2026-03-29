import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private fallbackMode = false;

  /** Check if Web Speech API is available */
  isAvailable(): boolean {
    return !this.fallbackMode && 'speechSynthesis' in window;
  }

  /** Speak a single letter. Cancels any in-progress utterance first. */
  speak(letter: string): void {
    if (!this.isAvailable()) return;

    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(letter);
      utterance.rate = 1.2;
      utterance.pitch = 1;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    } catch {
      // Switch to visual fallback for remainder of session
      this.fallbackMode = true;
    }
  }

  /** Reset fallback mode (call at start of new session) */
  resetFallback(): void {
    this.fallbackMode = false;
  }
}
