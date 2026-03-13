import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ZenithEntry {
        ZenithEntry(date: Date(), data: WidgetData(habits: [
            WidgetHabit(id: "1", title: "Morning Run", completed: true, streak: 12),
            WidgetHabit(id: "2", title: "Learn Swift", completed: false, streak: 5),
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

// MARK: - Premium UI Components

struct ProgressRing: View {
    var progress: Double
    var color: Color = Color(red: 0.2, green: 0.9, blue: 0.5) // Zenith Active Green
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(lineWidth: 10)
                .opacity(0.1)
                .foregroundColor(.white)
            
            Circle()
                .trim(from: 0.0, to: CGFloat(min(progress, 1.0)))
                .stroke(style: StrokeStyle(lineWidth: 10, lineCap: .round, lineJoin: .round))
                .foregroundColor(color)
                .rotationEffect(Angle(degrees: 270.0))
                .animation(.linear, value: progress)
        }
    }
}

struct SmallSummaryView: View {
    var entry: Provider.Entry
    
    var body: some View {
        let total = entry.data.totalHabits ?? 0
        let completed = entry.data.completedHabits ?? 0
        let progress = total > 0 ? Double(completed) / Double(total) : 0.0
        
        VStack(spacing: 8) {
            ZStack {
                ProgressRing(progress: progress)
                    .frame(width: 80, height: 80)
                
                VStack(spacing: -2) {
                    Text("\(Int(progress * 100))%")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                    Text("\(completed)/\(total)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .opacity(0.6)
                }
            }
            
            Text(progress >= 1.0 ? "FORGED" : "TODAY")
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .tracking(2)
                .foregroundColor(progress >= 1.0 ? Color(red: 0.2, green: 0.9, blue: 0.5) : .white)
        }
    }
}

struct MediumChecklistView: View {
    var entry: Provider.Entry

    var body: some View {
        HStack(spacing: 20) {
            // Left: Status Circle
            VStack(alignment: .leading, spacing: 4) {
                let total = entry.data.totalHabits ?? 0
                let completed = entry.data.completedHabits ?? 0
                let progress = total > 0 ? Double(completed) / Double(total) : 0.0
                
                ProgressRing(progress: progress)
                    .frame(width: 50, height: 50)
                
                Spacer()
                
                Text("ZENITH")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .tracking(2)
                    .opacity(0.4)
            }
            .padding(.vertical, 8)
            
            // Right: Interactive List
            VStack(alignment: .leading, spacing: 8) {
                if entry.data.habits.isEmpty {
                    Text("No habits for today.")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundColor(.gray)
                } else {
                    ForEach(entry.data.habits.prefix(3)) { habit in
                        if #available(iOS 17.0, *) {
                            Button(intent: ToggleHabitIntent(habitId: habit.id)) {
                                HabitRow(habit: habit)
                            }
                            .buttonStyle(.plain)
                        } else {
                            HabitRow(habit: habit)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(16)
    }
}

struct HabitRow: View {
    let habit: WidgetHabit
    
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(habit.completed ? Color(red: 0.2, green: 0.9, blue: 0.5) : Color.white.opacity(0.2), lineWidth: 2)
                    .frame(width: 24, height: 24)
                
                if habit.completed {
                    Circle()
                        .fill(Color(red: 0.2, green: 0.9, blue: 0.5))
                        .frame(width: 14, height: 14)
                }
            }
            
            VStack(alignment: .leading, spacing: 0) {
                Text(habit.title)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(habit.completed ? .gray : .white)
                    .strikethrough(habit.completed)
                
                if let streak = habit.streak, streak > 0 {
                    HStack(spacing: 2) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 8))
                            .foregroundColor(.orange)
                        Text("\(streak) DAY STREAK")
                            .font(.system(size: 8, weight: .black, design: .rounded))
                            .foregroundColor(.orange)
                    }
                }
            }
            
            Spacer()
        }
        .padding(8)
        .background(Color.white.opacity(0.05))
        .cornerRadius(12)
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
                    .containerBackground(for: .widget) {
                        Color.black
                    }
            } else {
                ZenithWidgetEntryView(entry: entry)
                    .padding()
                    .background(Color.black)
            }
        }
        .configurationDisplayName("Zenith Forge")
        .description("Track and toggle your daily habits.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    ZenithWidget()
} timeline: {
    ZenithEntry(date: Date(), data: WidgetData(habits: [
        WidgetHabit(id: "1", title: "Read", completed: true, streak: 5)
    ], totalHabits: 3, completedHabits: 1))
}

#Preview(as: .systemMedium) {
    ZenithWidget()
} timeline: {
    ZenithEntry(date: Date(), data: WidgetData(habits: [
        WidgetHabit(id: "1", title: "Morning Run", completed: true, streak: 12),
        WidgetHabit(id: "2", title: "Code", completed: false, streak: 5),
        WidgetHabit(id: "3", title: "Meditate", completed: false, streak: 0)
    ], totalHabits: 3, completedHabits: 1))
}
