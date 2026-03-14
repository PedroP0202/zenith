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
            
            // 1. Update the widget data structure
            let updatedHabit = WidgetHabit(
                id: widgetData.habits[index].id,
                title: widgetData.habits[index].title,
                completed: newStatus,
                streak: (widgetData.habits[index].streak ?? 0) + (newStatus ? 0 : 0) // We don't recalculate streak here, app will do it
            )
            
            widgetData.habits[index] = updatedHabit
            
            // 2. Adjust total completed count
            let currentTotalCompleted = widgetData.completedHabits ?? 0
            widgetData.completedHabits = newStatus ? currentTotalCompleted + 1 : max(0, currentTotalCompleted - 1)
            
            // 3. Save back to shared defaults so the App can see it later
            if let updatedData = try? JSONEncoder().encode(widgetData),
               let updatedString = String(data: updatedData, encoding: .utf8) {
                sharedDefaults?.set(updatedString, forKey: "zenith_widget_data")
                
                // 4. Record this specific toggle so the App can sync it
                // We store toggled IDs in a separate key "zenith_pending_widget_toggles"
                var pendingToggles = sharedDefaults?.dictionary(forKey: "zenith_pending_widget_toggles") as? [String: Bool] ?? [:]
                pendingToggles[habitId] = newStatus
                sharedDefaults?.set(pendingToggles, forKey: "zenith_pending_widget_toggles")
            }
        }
        
        // 5. Trigger maximum haptic feedback for the widget interaction
        DispatchQueue.main.async {
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.error)
            
            let impact = UIImpactFeedbackGenerator(style: .heavy)
            impact.prepare()
            impact.impactOccurred()
        }
        
        // This forces any widgets using this intent to reload their timeline
        return .result()
    }
}
