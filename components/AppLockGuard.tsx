'use client';

import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { useStore } from '@/store/useStore';
import { Shield } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function AppLockGuard({ children }: { children: React.ReactNode }) {
    const { isAppLockEnabled } = useStore();
    const [isLocked, setIsLocked] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const { t } = useTranslation();

    const authenticate = async () => {
        if (!isAppLockEnabled || isAuthenticating) return;

        setIsAuthenticating(true);
        try {
            const result = await NativeBiometric.isAvailable();
            if (result.isAvailable) {
                await NativeBiometric.verifyIdentity({
                    reason: "Desbloquear o Zenith", // Consider making this string localizable later if needed by the plugin
                    title: "Autenticação",
                    subtitle: "Protege os teus objetivos",
                    description: "Usa o FaceID ou TouchID para acederes à forja."
                });
                setIsLocked(false);
            } else {
                // If biometrics aren't available but lock is enabled, we could potentially
                // fall back to a custom PIN, but for now we'll just unlock if NativeBiometric fails
                // on devices without it (though the settings toggle should ideally prevent enabling it).
                setIsLocked(false);
            }
        } catch (error) {
            console.error("Biometric authentication failed:", error);
            // Stay locked if they cancel or it fails
            setIsLocked(true);
        } finally {
            setIsAuthenticating(false);
        }
    };

    useEffect(() => {
        // Initial check on mount
        if (isAppLockEnabled) {
            setIsLocked(true);
            authenticate();
        }

        // Listen for app state changes (background/foreground)
        const appStateListener = App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
            if (isActive && isAppLockEnabled) {
                setIsLocked(true);
                authenticate();
            } else if (!isActive && isAppLockEnabled) {
                // Lock proactively when going to background
                setIsLocked(true);
            }
        });

        return () => {
            appStateListener.then(listener => listener.remove()).catch(console.error);
        };
    }, [isAppLockEnabled]);

    if (!isAppLockEnabled) {
        return <>{children}</>;
    }

    return (
        <>
            {/* The actual app beneath */}
            {children}

            {/* The lock overlay */}
            {isLocked && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl text-white">
                    <Shield className="w-16 h-16 text-white/50 mb-6" />
                    <h2 className="text-2xl font-bold mb-2">Zenith Bloqueado</h2>
                    <p className="text-white/50 text-sm mb-12 text-center max-w-[250px]">
                        Autentica-te para acederes à tua forja e dominares o teu tempo.
                    </p>

                    {!isAuthenticating && (
                        <button
                            onClick={authenticate}
                            className="bg-white text-black font-bold py-4 px-8 rounded-2xl active:scale-95 transition-transform"
                        >
                            Desbloquear
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
