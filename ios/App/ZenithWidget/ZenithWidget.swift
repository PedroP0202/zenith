import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ZenithEntry {
        ZenithEntry(date: Date(), data: WidgetData(
            habits: [
                WidgetHabit(id: "1", title: "Read", completed: true, streak: 12),
                WidgetHabit(id: "2", title: "Code", completed: false, streak: 5)
            ],
            totalHabits: 2,
            completedHabits: 1,
            weeklyCompletion: [0.2, 0.5, 0.8, 0.3, 0.9, 1.0, 0.5],
            dayName: "THURSDAY",
            dayNumber: "19",
            monthName: "MARCH 2026"
        ))
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
        return WidgetData(habits: [], totalHabits: 0, completedHabits: 0, weeklyCompletion: [0,0,0,0,0,0,0])
    }
}

struct ZenithEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

// MARK: - Premium Theme & Components

extension Color {
    static let zenithActive = Color(red: 16/255, green: 185/255, blue: 129/255) // Emerald #10B981
    static let zenithBg = Color.black
    static let zenithSurface = Color(white: 0.1)
}

struct PremiumBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    Color.zenithBg
                    LinearGradient(
                        colors: [.white.opacity(0.05), .clear],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
            )
    }
}

struct WeeklyChart: View {
    let progress: [Double] // 0.0 to 1.0
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 6) {
            ForEach(0..<progress.count, id: \.self) { index in
                let val = progress[index]
                VStack(spacing: 4) {
                    ZStack(alignment: .bottom) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.1))
                            .frame(width: 8, height: 40)
                        
                        RoundedRectangle(cornerRadius: 3)
                            .fill(LinearGradient(colors: [.zenithActive, .zenithActive.opacity(0.6)], startPoint: .top, endPoint: .bottom))
                            .frame(width: 8, height: CGFloat(max(40 * val, 4)))
                            .shadow(color: .zenithActive.opacity(0.3), radius: 2, x: 0, y: 0)
                    }
                }
            }
        }
    }
}

struct DateHeader: View {
    let dayNumber: String
    let dayName: String
    let monthName: String
    
    var body: some View {
        HStack(spacing: 12) {
            Text(dayNumber)
                .font(.system(size: 44, weight: .black, design: .rounded))
                .foregroundColor(.white)
            
            VStack(alignment: .leading, spacing: -2) {
                Text(dayName)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(.zenithActive)
                Text(monthName)
                    .font(.system(size: 10, weight: .heavy, design: .rounded))
                    .foregroundColor(.white.opacity(0.4))
            }
        }
    }
}

// MARK: - Widget Views

struct SmallSummaryView: View {
    var entry: Provider.Entry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            DateHeader(
                dayNumber: entry.data.dayNumber ?? "0",
                dayName: String((entry.data.dayName ?? "DAY").prefix(3)),
                monthName: entry.data.monthName ?? ""
            )
            
            Spacer()
            
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(entry.data.completedHabits ?? 0)/\(entry.data.totalHabits ?? 0)")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                    Text("COMPLETED")
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .opacity(0.4)
                }
                
                Spacer()
                
                WeeklyChart(progress: entry.data.weeklyCompletion ?? [0,0,0,0,0,0,0])
                    .scaleEffect(0.7)
                    .frame(width: 50, height: 30)
            }
        }
        .padding(16)
        .modifier(PremiumBackground())
    }
}

struct MediumChecklistView: View {
    var entry: Provider.Entry

    var body: some View {
        HStack(spacing: 16) {
            // Left: Stats & Date
            VStack(alignment: .leading, spacing: 12) {
                DateHeader(
                    dayNumber: entry.data.dayNumber ?? "0",
                    dayName: entry.data.dayName ?? "DAY",
                    monthName: entry.data.monthName ?? ""
                )
                
                Spacer()
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("ACTIVITY")
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .opacity(0.4)
                    WeeklyChart(progress: entry.data.weeklyCompletion ?? [0,0,0,0,0,0,0])
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Right: Interactive List
            VStack(alignment: .leading, spacing: 6) {
                if entry.data.habits.isEmpty {
                    Text("REST DAY")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .opacity(0.2)
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
            .frame(width: 140)
        }
        .padding(16)
        .modifier(PremiumBackground())
    }
}

struct LargeWidgetView: View {
    var entry: Provider.Entry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                DateHeader(
                    dayNumber: entry.data.dayNumber ?? "0",
                    dayName: entry.data.dayName ?? "DAY",
                    monthName: entry.data.monthName ?? ""
                )
                Spacer()
                VStack(alignment: .trailing) {
                    Text("\(entry.data.completedHabits ?? 0)/\(entry.data.totalHabits ?? 0)")
                        .font(.system(size: 24, weight: .black, design: .rounded))
                    Text("FOCUS")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                        .foregroundColor(.zenithActive)
                }
            }
            
            Divider().background(Color.white.opacity(0.1))
            
            VStack(alignment: .leading, spacing: 8) {
                Text("WEEKLY CONSISTENCY")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .opacity(0.4)
                
                HStack(alignment: .bottom, spacing: 12) {
                    WeeklyChart(progress: entry.data.weeklyCompletion ?? [0,0,0,0,0,0,0])
                        .scaleEffect(1.2, anchor: .bottomLeading)
                    
                    Spacer()
                    
                    if let streak = entry.data.habits.map({ $0.streak ?? 0 }).max(), streak > 0 {
                        VStack(alignment: .trailing, spacing: 0) {
                            Text("\(streak)")
                                .font(.system(size: 32, weight: .black, design: .rounded))
                                .foregroundColor(.orange)
                            Text("BEST STREAK")
                                .font(.system(size: 8, weight: .black, design: .rounded))
                                .opacity(0.4)
                        }
                    }
                }
                .padding(.bottom, 10)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("HABITS")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .opacity(0.4)
                
                ForEach(entry.data.habits.prefix(5)) { habit in
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
            
            Spacer()
        }
        .padding(24)
        .modifier(PremiumBackground())
    }
}

struct HabitRow: View {
    let habit: WidgetHabit
    
    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .stroke(habit.completed ? Color.zenithActive : Color.white.opacity(0.15), lineWidth: 1.5)
                    .frame(width: 20, height: 20)
                
                if habit.completed {
                    Circle()
                        .fill(Color.zenithActive)
                        .frame(width: 12, height: 12)
                }
            }
            
            Text(habit.title)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundColor(habit.completed ? .white.opacity(0.3) : .white)
                .lineLimit(1)
            
            Spacer()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.white.opacity(habit.completed ? 0.02 : 0.05))
        .cornerRadius(10)
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
        case .systemLarge:
            LargeWidgetView(entry: entry)
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
                    .background(Color.black)
            }
        }
        .configurationDisplayName("Zenith Forge")
        .description("Track your evolution.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    ZenithWidget()
} timeline: {
    ZenithEntry(date: Date(), data: WidgetData(
        habits: [WidgetHabit(id: "1", title: "Read", completed: true, streak: 5)],
        totalHabits: 3,
        completedHabits: 1,
        weeklyCompletion: [0.1, 0.4, 0.7, 0.2, 0.8, 0.3, 0.5],
        dayName: "THURSDAY",
        dayNumber: "19",
        monthName: "MARCH 2026"
    ))
}

#Preview(as: .systemMedium) {
    ZenithWidget()
} timeline: {
    ZenithEntry(date: Date(), data: WidgetData(
        habits: [
            WidgetHabit(id: "1", title: "Gym Session", completed: true, streak: 12),
            WidgetHabit(id: "2", title: "Code Swift", completed: false, streak: 5),
            WidgetHabit(id: "3", title: "Meditate", completed: false, streak: 0)
        ],
        totalHabits: 3,
        completedHabits: 1,
        weeklyCompletion: [0.2, 0.5, 0.8, 0.3, 0.9, 0.4, 0.6],
        dayName: "THURSDAY",
        dayNumber: "19",
        monthName: "MARCH 2026"
    ))
}
