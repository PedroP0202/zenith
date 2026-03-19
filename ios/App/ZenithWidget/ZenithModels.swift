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
    var weeklyCompletion: [Double]? // Last 7 days completion %
    var dayName: String? // e.g. "SUNDAY"
    var dayNumber: String? // e.g. "10"
    var monthName: String? // e.g. "NOVEMBER 2024"
}
