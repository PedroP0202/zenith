import Foundation

struct WidgetHabit: Codable, Identifiable {
    var id: String
    var title: String
    var completed: Bool
    var streak: Int?
    var progressValue: Int?
    var targetValue: Int?
    var progressRatio: Double?
    var isWeeklyTarget: Bool?
    var unitLabel: String?
}

struct WidgetData: Codable {
    var habits: [WidgetHabit]
    var totalHabits: Int?
    var completedHabits: Int?
    var weeklyCompletion: [Double]?
    var bestStreak: Int?
    var snapshotDate: Double?
}

extension WidgetHabit {
    var resolvedProgressValue: Int {
        max(progressValue ?? (completed ? resolvedTargetValue : 0), 0)
    }

    var resolvedTargetValue: Int {
        max(targetValue ?? 1, 1)
    }

    var resolvedProgressRatio: Double {
        if let progressRatio {
            return min(max(progressRatio, 0), 1)
        }

        return min(Double(resolvedProgressValue) / Double(resolvedTargetValue), 1)
    }

    var resolvedIsWeeklyTarget: Bool {
        isWeeklyTarget ?? false
    }
}

extension WidgetData {
    var totalCount: Int {
        max(totalHabits ?? habits.count, habits.count)
    }

    var completedCount: Int {
        min(max(completedHabits ?? habits.filter(\.completed).count, 0), totalCount)
    }

    var pendingCount: Int {
        max(totalCount - completedCount, 0)
    }

    var completionRatio: Double {
        guard totalCount > 0 else { return 0 }
        return Double(completedCount) / Double(totalCount)
    }

    var completionPercent: Int {
        Int((completionRatio * 100).rounded())
    }

    var weeklyValues: [Double] {
        let values = weeklyCompletion ?? Array(repeating: 0, count: 7)
        return values.map { min(max($0, 0), 1) }
    }

    var weeklyAveragePercent: Int {
        guard !weeklyValues.isEmpty else { return 0 }
        let average = weeklyValues.reduce(0, +) / Double(weeklyValues.count)
        return Int((average * 100).rounded())
    }

    var activeDaysThisWeek: Int {
        weeklyValues.filter { $0 > 0.05 }.count
    }

    var strongestStreak: Int {
        bestStreak ?? habits.compactMap(\.streak).max() ?? 0
    }

    var focusHabit: WidgetHabit? {
        habits.first(where: { !$0.completed }) ?? habits.sorted { ($0.streak ?? 0) > ($1.streak ?? 0) }.first
    }

    var referenceDate: Date {
        guard let snapshotDate else { return Date() }
        return Date(timeIntervalSince1970: snapshotDate / 1000)
    }
}

struct WidgetCopy {
    private let locale = Locale.current

    private var isPortuguese: Bool {
        locale.languageCode?.lowercased().hasPrefix("pt") ?? false
    }

    var today: String { isPortuguese ? "Hoje" : "Today" }
    var done: String { isPortuguese ? "Feitos" : "Done" }
    var pending: String { isPortuguese ? "Pendentes" : "Pending" }
    var bestStreak: String { isPortuguese ? "Melhor streak" : "Best streak" }
    var weeklyRhythm: String { isPortuguese ? "Ritmo semanal" : "Weekly rhythm" }
    var weeklyAverage: String { isPortuguese ? "Média semanal" : "Weekly average" }
    var activeDays: String { isPortuguese ? "Dias ativos" : "Active days" }
    var todaysList: String { isPortuguese ? "Lista de hoje" : "Today's list" }
    var nextFocus: String { isPortuguese ? "Próximo foco" : "Next focus" }
    var restDay: String { isPortuguese ? "Dia leve" : "Rest day" }
    var noHabitsToday: String { isPortuguese ? "Sem hábitos hoje" : "No habits today" }
    var completedState: String { isPortuguese ? "Dia fechado" : "Locked in" }
    var week: String { isPortuguese ? "Semana" : "Week" }

    func badgeLabel(for data: WidgetData) -> String {
        if data.totalCount == 0 { return isPortuguese ? "PAUSA" : "REST" }
        if data.pendingCount == 0 { return isPortuguese ? "FECHADO" : "LOCKED" }
        if data.pendingCount == 1 { return isPortuguese ? "1 FALTA" : "1 LEFT" }
        return isPortuguese ? "\(data.pendingCount) FALTAM" : "\(data.pendingCount) LEFT"
    }

    func summaryTitle(for data: WidgetData) -> String {
        if data.totalCount == 0 { return restDay }
        if data.pendingCount == 0 { return completedState }
        if data.pendingCount == 1 { return isPortuguese ? "Só falta um" : "One move left" }
        return isPortuguese ? "Bom ritmo hoje" : "Good pace today"
    }

    func summarySubtitle(for data: WidgetData) -> String {
        if data.totalCount == 0 {
            return isPortuguese ? "Usa o espaço para recuperar ou planear a próxima sessão." : "Use the space to recover or plan the next session."
        }

        if data.pendingCount == 0 {
            return isPortuguese ? "Tudo o que estava previsto para hoje ficou concluído." : "Everything scheduled for today is complete."
        }

        if let focus = data.focusHabit {
            return isPortuguese
                ? "Fecha \(focus.title.lowercased()) para manter a consistência."
                : "Close \(focus.title.lowercased()) to keep momentum."
        }

        return isPortuguese ? "Há progresso em curso para hoje." : "There is progress in motion for today."
    }

    func inlineStatus(for data: WidgetData) -> String {
        if data.totalCount == 0 {
            return isPortuguese ? "Zenith • dia leve" : "Zenith • rest day"
        }

        return isPortuguese
            ? "Zenith • \(data.completedCount)/\(data.totalCount) feitos"
            : "Zenith • \(data.completedCount)/\(data.totalCount) done"
    }

    func progressLabel(for habit: WidgetHabit) -> String {
        let numeric = "\(habit.resolvedProgressValue)/\(habit.resolvedTargetValue)"

        if let unitLabel = habit.unitLabel?.trimmingCharacters(in: .whitespacesAndNewlines), !unitLabel.isEmpty {
            return "\(numeric) \(unitLabel)"
        }

        return numeric
    }

    func habitMeta(for habit: WidgetHabit) -> String {
        let streak = habit.streak ?? 0
        let streakText = streak > 0
            ? (isPortuguese ? "\(streak)d seq." : "\(streak)d streak")
            : nil

        if let streakText {
            return "\(progressLabel(for: habit)) • \(streakText)"
        }

        return progressLabel(for: habit)
    }

    func kindLabel(for habit: WidgetHabit) -> String {
        if habit.resolvedIsWeeklyTarget {
            return week
        }

        if let unitLabel = habit.unitLabel?.trimmingCharacters(in: .whitespacesAndNewlines), !unitLabel.isEmpty {
            return unitLabel.uppercased()
        }

        return today.uppercased()
    }

    func dayNumber(from date: Date) -> String {
        formatted(date, template: "d")
    }

    func monthLine(from date: Date) -> String {
        let weekday = formatted(date, template: "EEE").uppercased()
        let month = formatted(date, template: "MMM yyyy").uppercased()
        return "\(weekday) • \(month)"
    }

    func shortDate(from date: Date) -> String {
        formatted(date, template: "EEE d MMM").uppercased()
    }

    func shortWeekdaySymbols(from referenceDate: Date, count: Int) -> [String] {
        guard count > 0 else { return [] }

        return (0..<count).map { offset in
            let delta = offset - (count - 1)
            let date = Calendar.current.date(byAdding: .day, value: delta, to: referenceDate) ?? referenceDate
            return formatted(date, template: "EEEEE").uppercased()
        }
    }

    private func formatted(_ date: Date, template: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.setLocalizedDateFormatFromTemplate(template)
        return formatter.string(from: date)
    }
}
