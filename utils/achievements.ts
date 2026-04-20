import { Friend, Habit, LogEntry } from '../types';
import { calculateStreak, getBestStreak } from './streak';

export interface Trophy {
    id: string;
    title: string;
    description: string;
    icon: string; // Lucide icon name or emoji
    color: string;
    requirement: (habits: Habit[], logs: LogEntry[], friends: Friend[]) => boolean;
}

export const TROPHIES: Trophy[] = [
    {
        id: '7_day_focus',
        title: '7 Dias de Foco',
        description: 'Mantém um hábito por 7 dias seguidos.',
        icon: 'Flame',
        color: '#00C853',
        requirement: (habits, logs) => {
            return habits.some(h => calculateStreak(logs.filter(l => l.habitId === h.id), h.frequency) >= 7);
        }
    },
    {
        id: '30_day_focus',
        title: '30 Dias de Foco',
        description: 'Alcança uma sequência de 30 dias num hábito.',
        icon: 'Trophy',
        color: '#FFD700',
        requirement: (habits, logs) => {
            return habits.some(h => calculateStreak(logs.filter(l => l.habitId === h.id), h.frequency) >= 30);
        }
    },
    {
        id: 'checkin_master',
        title: 'Check-in Master',
        description: 'Completa 100 check-ins no total.',
        icon: 'Award',
        color: '#69F0AE',
        requirement: (_, logs) => logs.length >= 100
    },
    {
        id: 'zen_beginner',
        title: 'Iniciante Zen',
        description: 'Cria e completa o teu primeiro hábito.',
        icon: 'Sparkles',
        color: '#ffffff',
        requirement: (habits, logs) => habits.length > 0 && logs.length > 0
    },
    {
        id: 'socializer',
        title: 'Socializador',
        description: 'Adiciona 5 amigos à tua rede.',
        icon: 'Users',
        color: '#40C4FF',
        requirement: (_, __, friends) => friends.length >= 5
    },
    {
        id: 'habit_architect',
        title: 'Arquiteto de Hábitos',
        description: 'Tem pelo menos 5 hábitos ativos ao mesmo tempo.',
        icon: 'Layout',
        color: '#E040FB',
        requirement: (habits) => habits.filter(h => h.isActive).length >= 5
    }
];

export function getUnlockedTrophies(habits: Habit[], logs: LogEntry[], friends: Friend[]) {
    return TROPHIES.filter(t => t.requirement(habits, logs, friends));
}
