import Foundation

struct WidgetHabit: Codable, Identifiable {
    let id: String
    let title: String
    let completed: Bool
    let streak: Int?
}

struct WidgetData: Codable {
    var habits: [WidgetHabit]
    var totalHabits: Int?
    var completedHabits: Int?
}
