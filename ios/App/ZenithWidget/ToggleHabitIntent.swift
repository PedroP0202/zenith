import AppIntents
import UIKit
import WidgetKit
import Foundation

struct ToggleHabitIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Habit Completion"
    static var description = IntentDescription("Marks a habit as completed or uncompleted.")

    @Parameter(title: "Habit ID")
    var habitId: String

    init() {}

    init(habitId: String) {
        self.habitId = habitId
    }

    func perform() async throws -> some IntentResult {
        let sharedDefaults = UserDefaults(suiteName: "group.pedro.zenith.app")
        
        guard let jsonString = sharedDefaults?.string(forKey: "zenith_widget_data"),
              let jsonData = jsonString.data(using: .utf8) else {
            return .result()
        }
        
        var widgetData: WidgetData
        do {
            widgetData = try JSONDecoder().decode(WidgetData.self, from: jsonData)
        } catch {
            return .result()
        }
        
        // Find the habit and toggle completion
        if let index = widgetData.habits.firstIndex(where: { $0.id == habitId }) {
            let wasCompleted = widgetData.habits[index].completed
            let newStatus = !wasCompleted
            let targetValue = widgetData.habits[index].targetValue ?? 1
            
            widgetData.habits[index].completed = newStatus
            widgetData.habits[index].progressValue = newStatus ? targetValue : 0
            widgetData.habits[index].progressRatio = newStatus ? 1 : 0

            let currentTotalCompleted = widgetData.completedHabits ?? 0
            let newTotalCompleted = newStatus ? currentTotalCompleted + 1 : max(0, currentTotalCompleted - 1)
            widgetData.completedHabits = newTotalCompleted
            widgetData.snapshotDate = Date().timeIntervalSince1970 * 1000

            if var weekly = widgetData.weeklyCompletion, !weekly.isEmpty {
                let total = Double(widgetData.totalHabits ?? 1)
                weekly[weekly.count - 1] = Double(newTotalCompleted) / max(total, 1.0)
                widgetData.weeklyCompletion = weekly
            }

            if let updatedData = try? JSONEncoder().encode(widgetData),
               let updatedString = String(data: updatedData, encoding: .utf8) {
                sharedDefaults?.set(updatedString, forKey: "zenith_widget_data")

                var pendingToggles = sharedDefaults?.dictionary(forKey: "zenith_pending_widget_toggles") as? [String: Bool] ?? [:]
                pendingToggles[habitId] = newStatus
                sharedDefaults?.set(pendingToggles, forKey: "zenith_pending_widget_toggles")
            }
        }

        WidgetCenter.shared.reloadAllTimelines()

        DispatchQueue.main.async {
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.success)
            
            let impact = UIImpactFeedbackGenerator(style: .medium)
            impact.prepare()
            impact.impactOccurred()
        }

        return .result()
    }
}
