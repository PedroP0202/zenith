import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Habit } from '../types';
import { getRandomNotificationPhrase } from './notificationPhrases';

export const MORNING_REMINDER_ID = 101;

/**
 * Ensures the app has user permission to send local notifications.
 * Prompts the user via native OS dialog if not already decided.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === 'prompt') {
        permStatus = await LocalNotifications.requestPermissions();
    }

    return permStatus.display === 'granted';
}

/**
 * Cancels all scheduled local notifications to avoid duplicates.
 */
export async function cancelAllNotifications() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
        }
    } catch (error) {
        console.error("Failed to cancel Zenith notifications:", error);
    }
}

/**
 * Helper to generate a stable numeric ID for a given string (UUID).
 * Capacitor Local Notifications requires integer IDs.
 */
function hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Reschedules all notifications (Global Morning Reminder + Specific Habit Reminders).
 * This reconstructs the entire schedule from scratch and should be called whenever state changes.
 */
export async function scheduleAllNotifications(
    habits: Habit[],
    isMorningReminderActive: boolean,
    morningReminderTimeStr: string = '09:00'
) {
    if (!Capacitor.isNativePlatform()) return;

    await cancelAllNotifications();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const notificationsToSchedule: any[] = [];

    // 1. Global Morning Reminder
    if (isMorningReminderActive) {
        const [hourStr, minuteStr] = morningReminderTimeStr.split(':');
        notificationsToSchedule.push({
            id: MORNING_REMINDER_ID,
            title: "O teu dia começou.",
            body: "Abre o Zenith para reveres as tuas streaks.",
            schedule: {
                allowWhileIdle: true,
                on: {
                    hour: parseInt(hourStr, 10) || 9,
                    minute: parseInt(minuteStr, 10) || 0
                }
            }
        });
    }

    // 2. Individual Habit Reminders
    const activeHabits = habits.filter(h => h.isActive && h.reminderTime);

    for (const habit of activeHabits) {
        if (!habit.reminderTime) continue;

        const [hStr, mStr] = habit.reminderTime.split(':');
        const hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);
        const baseHabitId = hashStringToInt(habit.id);

        const phrase = getRandomNotificationPhrase(habit.title);

        // Se o hábito tem dias específicos (frequency), precisamos de agendar 
        // notificações distintas por cada dia (Weekday) no Capacitor
        if (habit.frequency && habit.frequency.length > 0) {
            habit.frequency.forEach((dayIndex, i) => {
                // Capacitor: weekday is 1-7 (1=Sunday, 2=Monday... 7=Saturday)
                // Zenith frequency is 0-6 (0=Sunday, 1=Monday... 6=Saturday)
                const capacitorWeekday = dayIndex + 1;

                notificationsToSchedule.push({
                    id: baseHabitId + i, // unique ID per day
                    title: "Lembrete: " + habit.title,
                    body: phrase,
                    schedule: {
                        allowWhileIdle: true,
                        on: {
                            weekday: capacitorWeekday,
                            hour: isNaN(hour) ? 9 : hour,
                            minute: isNaN(minute) ? 0 : minute
                        }
                    }
                });
            });
        } else {
            // Todos os dias
            notificationsToSchedule.push({
                id: baseHabitId,
                title: "Lembrete: " + habit.title,
                body: phrase,
                schedule: {
                    allowWhileIdle: true,
                    on: {
                        hour: isNaN(hour) ? 9 : hour,
                        minute: isNaN(minute) ? 0 : minute
                    }
                }
            });
        }
    }

    if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
            notifications: notificationsToSchedule
        });
    }
}

/**
 * Sends a test notification 5 seconds from now to verify functionality.
 */
export async function sendTestNotification() {
    if (!Capacitor.isNativePlatform()) {
        alert("Local Notifications require the app to be running on an iOS Simulator or Device via Xcode.");
        return;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
        alert("Push Notification permissions were explicitly denied.");
        return;
    }

    try {
        await LocalNotifications.schedule({
            notifications: [
                {
                    id: 999,
                    title: "Zenith Test",
                    body: "Notifications are working perfectly!",
                    schedule: { at: new Date(Date.now() + 5000) }
                }
            ]
        });

        // Listen internally to see if it fires while we are on screen
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
            alert(`Notificação recebida na App: ${notification.title}`);
        });

        alert("Teste agendado via Native Bridge! Por favor, sai da aplicação agora (vai para o Home Screen do iPhone) e espera 5 segundos.");
    } catch (e: any) {
        alert(`Erro ao agendar notificação nativa: ${e?.message || e}`);
    }
}


