import WidgetKit
import SwiftUI

struct WidgetHabit: Decodable, Identifiable {
    let id: String
    let title: String
    let completed: Bool
    let streak: Int?
}

struct WidgetData: Decodable {
    let habits: [WidgetHabit]
    let totalHabits: Int?
    let completedHabits: Int?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ZenithEntry {
        ZenithEntry(date: Date(), data: WidgetData(habits: [
            WidgetHabit(id: "1", title: "Read 10 Pages", completed: true, streak: 12),
            WidgetHabit(id: "2", title: "Code 1 Hour", completed: false, streak: 5),
            WidgetHabit(id: "3", title: "Gym Session", completed: false, streak: 0)
        ], totalHabits: 3, completedHabits: 1))
    }

    func getSnapshot(in context: Context, completion: @escaping (ZenithEntry) -> ()) {
        let entry = ZenithEntry(date: Date(), data: getWidgetData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = ZenithEntry(date: Date(), data: getWidgetData())
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
    
    private func getWidgetData() -> WidgetData {
        let sharedDefaults = UserDefaults(suiteName: "group.pedro.zenith.app")
        if let jsonString = sharedDefaults?.string(forKey: "zenith_widget_data"),
           let jsonData = jsonString.data(using: .utf8) {
            do {
                let data = try JSONDecoder().decode(WidgetData.self, from: jsonData)
                return data
            } catch {
                print("Failed to decode widget data: \(error)")
            }
        }
        return WidgetData(habits: [], totalHabits: 0, completedHabits: 0)
    }
}

struct ZenithEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct SmallSummaryView: View {
    var entry: Provider.Entry
    
    var body: some View {
        let total = entry.data.totalHabits ?? 0
        let completed = entry.data.completedHabits ?? 0
        let isDone = total > 0 && completed == total
        
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 6) {
                if total == 0 {
                    Text("---")
                        .font(.system(size: 42, weight: .heavy, design: .rounded))
                        .foregroundColor(.gray)
                    
                    Text("NO HABITS")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(.gray)
                        .textCase(.uppercase)
                        .tracking(1.5)
                } else {
                    Text("\(completed)/\(total)")
                        .font(.system(size: 42, weight: .heavy, design: .rounded))
                        .foregroundColor(isDone ? .green : .white)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                    
                    Text(isDone ? "ALL DONE" : "COMPLETED")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(.gray)
                        .textCase(.uppercase)
                        .tracking(1.5)
                }
            }
            .padding()
        }
    }
}

struct MediumChecklistView: View {
    var entry: Provider.Entry

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    Text("Today")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .textCase(.uppercase)
                    Spacer()
                    Image(systemName: "circle.circle.fill")
                        .foregroundColor(.gray)
                        .font(.system(size: 14))
                }
                .padding(.bottom, 4)

                // List of Habits (Up to 4 to fit)
                if entry.data.habits.isEmpty {
                    VStack(alignment: .center) {
                        Spacer()
                        Text("No active habits")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundColor(.gray)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    ForEach(entry.data.habits.prefix(4)) { habit in
                        HStack(alignment: .center, spacing: 10) {
                            Image(systemName: habit.completed ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(habit.completed ? .green : .gray)
                                .font(.system(size: 14))
                            
                            Text(habit.title)
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(habit.completed ? .gray : .white)
                                .strikethrough(habit.completed)
                                .lineLimit(1)
                            
                            Spacer()
                            
                            if let streak = habit.streak, streak > 0 {
                                HStack(spacing: 4) {
                                    Image(systemName: "flame.fill")
                                        .foregroundColor(habit.completed ? .gray : .orange)
                                        .font(.system(size: 12))
                                    Text("\(streak)")
                                        .foregroundColor(habit.completed ? .gray : .white)
                                        .font(.system(size: 12, weight: .bold, design: .rounded))
                                }
                            }
                        }
                    }
                    Spacer(minLength: 0)
                }
            }
            .padding(16)
        }
    }
}

struct ZenithWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallSummaryView(entry: entry)
        case .systemMedium:
            MediumChecklistView(entry: entry)
        default:
            SmallSummaryView(entry: entry)
        }
    }
}

struct ZenithWidget: Widget {
    let kind: String = "ZenithWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                ZenithWidgetEntryView(entry: entry)
                    .containerBackground(Color.black, for: .widget)
            } else {
                ZenithWidgetEntryView(entry: entry)
                    .padding()
                    .background(Color.black)
            }
        }
        .configurationDisplayName("Zenith Checklist")
        .description("Your daily minimalist habits stats and list.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    ZenithWidget()
} timeline: {
    ZenithEntry(date: .now, data: WidgetData(habits: [
        WidgetHabit(id: "1", title: "Read", completed: true, streak: 5)
    ], totalHabits: 3, completedHabits: 1))
}

#Preview(as: .systemMedium) {
    ZenithWidget()
} timeline: {
    ZenithEntry(date: .now, data: WidgetData(habits: [
        WidgetHabit(id: "1", title: "Read", completed: true, streak: 12),
        WidgetHabit(id: "2", title: "Workout", completed: false, streak: 5),
        WidgetHabit(id: "3", title: "Meditate", completed: false, streak: 0)
    ], totalHabits: 3, completedHabits: 1))
}
