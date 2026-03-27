import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../../store/useStore';

// Mock side effects
vi.mock('../../utils/widgetSync', () => ({
  syncWidgetData: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../utils/notifications', () => ({
  scheduleAllNotifications: vi.fn(() => Promise.resolve()),
  cancelAllNotifications: vi.fn(() => Promise.resolve()),
}));

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.getState().logout();
  });

  it('should initialize with default values', () => {
    const state = useStore.getState();
    expect(state.userName).toBe('Pedro');
    expect(state.habits).toEqual([]);
    expect(state.logs).toEqual([]);
  });

  it('should add a habit', () => {
    const { addHabit } = useStore.getState();
    addHabit('Read Book', [1, 2, 3, 4, 5], false);

    const { habits } = useStore.getState();
    expect(habits.length).toBe(1);
    expect(habits[0].title).toBe('Read Book');
    expect(habits[0].frequency).toEqual([1, 2, 3, 4, 5]);
  });

  it('should toggle a habit log', () => {
    const { addHabit, toggleHabitLog } = useStore.getState();
    addHabit('Exercise', [0, 1, 2, 3, 4, 5, 6], false);
    const habitId = useStore.getState().habits[0].id;

    toggleHabitLog(habitId);
    expect(useStore.getState().logs.length).toBe(1);
    expect(useStore.getState().logs[0].habitId).toBe(habitId);

    toggleHabitLog(habitId); // Toggle off
    expect(useStore.getState().logs.length).toBe(0);
  });

  it('should set user name', () => {
    const { setUserName } = useStore.getState();
    setUserName('John Doe');
    expect(useStore.getState().userName).toBe('John Doe');
  });

  it('should handle logout', () => {
    const { addHabit, logout } = useStore.getState();
    addHabit('Test Habit', [1], false);
    logout();

    const state = useStore.getState();
    expect(state.habits).toEqual([]);
    expect(state.userName).toBe('Pedro');
  });
});
