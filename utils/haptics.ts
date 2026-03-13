import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Safe wrapper around Capacitor Haptics.
 * Only executes on native platforms (iOS/Android) to avoid browser errors.
 */
class HapticsController {
    private get isNative() {
        return Capacitor.isNativePlatform();
    }

    /**
     * Plays a short, pleasant success tone using Web Audio API.
     * Works on both Web and Native.
     */
    playSuccessSound() {
        if (typeof window === 'undefined') return;
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {
            console.error("Sound Error:", e);
        }
    }

    /**
     * Light impact.
     */
    async lightImpact() {
        if (!this.isNative) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) { }
    }

    /**
     * Medium impact - noticeably stronger.
     */
    async mediumImpact() {
        if (!this.isNative) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) { }
    }

    /**
     * Heavy impact.
     */
    async heavyImpact() {
        if (!this.isNative) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) { }
    }

    /**
     * Success notification pattern.
     */
    async success() {
        if (!this.isNative) return;
        try {
            await Haptics.notification({ type: NotificationType.Success });
        } catch (e) { }
    }

    /**
     * Error notification pattern, used when API calls fail or invalid forms.
     */
    async error() {
        if (!this.isNative) return;
        try {
            await Haptics.notification({ type: NotificationType.Error });
        } catch (e) {
            console.error("Haptics Error:", e);
        }
    }

    /**
     * Warning notification pattern.
     */
    async warning() {
        if (!this.isNative) return;
        try {
            await Haptics.notification({ type: NotificationType.Warning });
        } catch (e) {
            console.error("Haptics Error:", e);
        }
    }
}

export const deviceHaptics = new HapticsController();
