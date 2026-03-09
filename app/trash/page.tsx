'use client';
import { useStore } from '../../store/useStore';
import { useRouter } from 'next/navigation';
import { ChevronLeft, RotateCcw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useTranslation } from '../../hooks/useTranslation';
import { useState } from 'react';

export default function TrashPage() {
    const { habits, restoreHabit, permanentlyDeleteHabit } = useStore();
    const { t } = useTranslation();
    const router = useRouter();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [habitToDelete, setHabitToDelete] = useState<string | null>(null);

    const deletedHabits = habits.filter(h => !h.isActive).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-24 font-sans flex flex-col items-center">
            <div className="w-full max-w-md pt-8">
                <header className="flex justify-between items-center mb-10">
                    <button
                        onClick={() => router.back()}
                        className="h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors -ml-3"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-medium tracking-tight text-white/50">Recém Apagados</h1>
                    <div className="w-12"></div>
                </header>

                {deletedHabits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-32 text-center opacity-40">
                        <Trash2 size={40} className="mb-4" strokeWidth={1} />
                        <p className="text-lg">O lixo está vazio.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deletedHabits.map((habit) => (
                            <div key={habit.id} className="py-4 px-5 rounded-3xl bg-[#111111] flex items-center justify-between">
                                <div className="flex flex-col flex-1 min-w-0 pr-4">
                                    <span className="text-lg font-medium text-white/70 line-through truncate">
                                        {habit.title}
                                    </span>
                                    {habit.deletedAt && (
                                        <span className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                                            Apagado há {formatDistanceToNow(habit.deletedAt, { locale: pt })}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => restoreHabit(habit.id)}
                                        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        aria-label="Restaurar hábito"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setHabitToDelete(habit.id);
                                            setShowDeleteModal(true);
                                        }}
                                        className="h-10 w-10 flex items-center justify-center rounded-full text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        aria-label="Apagar permanentemente"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setHabitToDelete(null);
                }}
                onConfirm={() => {
                    if (habitToDelete) {
                        permanentlyDeleteHabit(habitToDelete);
                        setHabitToDelete(null);
                    }
                }}
                title={t.habit.permanentlyDelete}
                description={t.habit.deleteConfirm}
                confirmLabel={t.common.delete}
                cancelLabel={t.common.cancel}
            />
        </main>
    );
}
