import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ZenithEntry {
        ZenithEntry(
            date: Date(),
            data: WidgetData(
                habits: [
                    WidgetHabit(
                        id: "1",
                        title: "Deep work",
                        completed: false,
                        streak: 12,
                        progressValue: 1,
                        targetValue: 2,
                        progressRatio: 0.5,
                        isWeeklyTarget: true,
                        unitLabel: nil
                    ),
                    WidgetHabit(
                        id: "2",
                        title: "Read 20 pages",
                        completed: true,
                        streak: 6,
                        progressValue: 20,
                        targetValue: 20,
                        progressRatio: 1,
                        isWeeklyTarget: false,
                        unitLabel: "pages"
                    ),
                    WidgetHabit(
                        id: "3",
                        title: "Walk",
                        completed: false,
                        streak: 3,
                        progressValue: 0,
                        targetValue: 1,
                        progressRatio: 0,
                        isWeeklyTarget: false,
                        unitLabel: nil
                    )
                ],
                totalHabits: 3,
                completedHabits: 1,
                weeklyCompletion: [0.15, 0.42, 0.55, 0.33, 0.85, 1, 0.66],
                bestStreak: 12,
                snapshotDate: Date().timeIntervalSince1970 * 1000
            )
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (ZenithEntry) -> Void) {
        completion(ZenithEntry(date: Date(), data: getWidgetData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ZenithEntry>) -> Void) {
        let entry = ZenithEntry(date: Date(), data: getWidgetData())
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func getWidgetData() -> WidgetData {
        let sharedDefaults = UserDefaults(suiteName: "group.pedro.zenith.app")

        guard
            let jsonString = sharedDefaults?.string(forKey: "zenith_widget_data"),
            let jsonData = jsonString.data(using: .utf8)
        else {
            return WidgetData(
                habits: [],
                totalHabits: 0,
                completedHabits: 0,
                weeklyCompletion: [0, 0, 0, 0, 0, 0, 0],
                bestStreak: 0,
                snapshotDate: Date().timeIntervalSince1970 * 1000
            )
        }

        do {
            return try JSONDecoder().decode(WidgetData.self, from: jsonData)
        } catch {
            print("Failed to decode widget data: \(error)")
            return WidgetData(
                habits: [],
                totalHabits: 0,
                completedHabits: 0,
                weeklyCompletion: [0, 0, 0, 0, 0, 0, 0],
                bestStreak: 0,
                snapshotDate: Date().timeIntervalSince1970 * 1000
            )
        }
    }
}

struct ZenithEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

func zenithWidgetURL(_ route: String = "today") -> URL? {
    URL(string: "zenith://\(route)")
}

extension Color {
    static let zenithInk = Color(red: 248 / 255, green: 250 / 255, blue: 252 / 255)
    static let zenithMuted = Color(red: 148 / 255, green: 163 / 255, blue: 184 / 255)
    static let zenithLine = Color.white.opacity(0.08)
    static let zenithSurface = Color(red: 15 / 255, green: 23 / 255, blue: 42 / 255)
    static let zenithPanel = Color(red: 20 / 255, green: 28 / 255, blue: 48 / 255)
    static let zenithPanelSoft = Color(red: 28 / 255, green: 36 / 255, blue: 56 / 255)
    static let zenithAccent = Color(red: 45 / 255, green: 212 / 255, blue: 191 / 255)
    static let zenithAccentSoft = Color(red: 125 / 255, green: 211 / 255, blue: 252 / 255)
    static let zenithWarning = Color(red: 250 / 255, green: 204 / 255, blue: 21 / 255)
}

struct ZenithWidgetChrome: ViewModifier {
    func body(content: Content) -> some View {
        content.background(
            ZStack {
                LinearGradient(
                    colors: [
                        Color.zenithSurface,
                        Color(red: 8 / 255, green: 15 / 255, blue: 30 / 255)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                RadialGradient(
                    colors: [
                        Color.zenithAccent.opacity(0.18),
                        .clear
                    ],
                    center: .topTrailing,
                    startRadius: 0,
                    endRadius: 180
                )

                LinearGradient(
                    colors: [
                        .white.opacity(0.06),
                        .clear,
                        .black.opacity(0.18)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        )
    }
}

extension View {
    func zenithWidgetChrome() -> some View {
        modifier(ZenithWidgetChrome())
    }
}

struct StatusBadge: View {
    let text: String
    let accent: Color

    var body: some View {
        Text(text)
            .font(.system(size: 9, weight: .black, design: .rounded))
            .foregroundColor(accent)
            .lineLimit(1)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(accent.opacity(0.12))
            )
            .overlay(
                Capsule()
                    .stroke(accent.opacity(0.22), lineWidth: 1)
            )
    }
}

struct SectionLabel: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 9, weight: .black, design: .rounded))
            .tracking(1.2)
            .foregroundColor(.zenithMuted)
    }
}

struct MetricTile: View {
    let label: String
    let value: String
    let detail: String
    var accent: Color = .zenithAccent

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 8, weight: .black, design: .rounded))
                .tracking(1.1)
                .foregroundColor(.zenithMuted)

            Text(value)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundColor(.zenithInk)
                .lineLimit(1)

            Text(detail)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundColor(accent.opacity(0.92))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.white.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}

struct ProgressRing: View {
    let progress: Double
    let value: String
    let caption: String

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.08), lineWidth: 10)

            Circle()
                .trim(from: 0, to: max(min(progress, 1), 0.04))
                .stroke(
                    AngularGradient(
                        colors: [.zenithAccentSoft, .zenithAccent, .zenithWarning],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: 10, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            VStack(spacing: 2) {
                Text(value)
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundColor(.zenithInk)
                    .minimumScaleFactor(0.7)

                Text(caption.uppercased())
                    .font(.system(size: 7, weight: .bold, design: .rounded))
                    .tracking(0.9)
                    .foregroundColor(.zenithMuted)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .padding(.horizontal, 8)
        }
    }
}

struct WeeklyTrendView: View {
    let values: [Double]
    let labels: [String]
    var compact: Bool = false

    private var barWidth: CGFloat { compact ? 10 : 12 }
    private var barHeight: CGFloat { compact ? 28 : 34 }

    var body: some View {
        HStack(alignment: .bottom, spacing: compact ? 6 : 8) {
            ForEach(Array(values.enumerated()), id: \.offset) { index, value in
                VStack(spacing: compact ? 4 : 6) {
                    ZStack(alignment: .bottom) {
                        Capsule()
                            .fill(Color.white.opacity(0.07))
                            .frame(width: barWidth, height: barHeight)

                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color.zenithAccent.opacity(0.8),
                                        Color.zenithAccentSoft
                                    ],
                                    startPoint: .bottom,
                                    endPoint: .top
                                )
                            )
                            .frame(
                                width: barWidth,
                                height: max(CGFloat(value) * barHeight, 4)
                            )
                    }

                    Text(labels.indices.contains(index) ? labels[index] : "")
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .foregroundColor(.zenithMuted)
                }
            }
        }
    }
}

struct HabitRow: View {
    let habit: WidgetHabit
    let copy: WidgetCopy
    var compact: Bool = false

    private var progressColor: Color {
        habit.completed ? .zenithAccent : .zenithAccentSoft
    }

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            ZStack {
                Circle()
                    .fill(habit.completed ? progressColor.opacity(0.18) : Color.white.opacity(0.04))
                    .frame(width: compact ? 24 : 28, height: compact ? 24 : 28)

                Circle()
                    .stroke(habit.completed ? progressColor : Color.white.opacity(0.18), lineWidth: 1.2)
                    .frame(width: compact ? 24 : 28, height: compact ? 24 : 28)

                if habit.completed {
                    Image(systemName: "checkmark")
                        .font(.system(size: compact ? 10 : 11, weight: .black))
                        .foregroundColor(progressColor)
                }
            }

            VStack(alignment: .leading, spacing: compact ? 5 : 6) {
                HStack(spacing: 6) {
                    Text(habit.title)
                        .font(.system(size: compact ? 12 : 13, weight: .bold, design: .rounded))
                        .foregroundColor(habit.completed ? .zenithInk.opacity(0.7) : .zenithInk)
                        .lineLimit(1)

                    Text(copy.kindLabel(for: habit))
                        .font(.system(size: 8, weight: .black, design: .rounded))
                        .foregroundColor(.zenithMuted)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(
                            Capsule()
                                .fill(Color.white.opacity(0.06))
                        )
                }

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.white.opacity(0.06))

                        Capsule()
                            .fill(progressColor)
                            .frame(width: geometry.size.width * CGFloat(habit.resolvedProgressRatio))
                    }
                }
                .frame(height: compact ? 5 : 6)

                Text(copy.habitMeta(for: habit))
                    .font(.system(size: 9, weight: .semibold, design: .rounded))
                    .foregroundColor(.zenithMuted)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, compact ? 10 : 12)
        .padding(.vertical, compact ? 9 : 10)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.white.opacity(habit.completed ? 0.035 : 0.055))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}

struct FocusCard: View {
    let data: WidgetData
    let copy: WidgetCopy

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text((data.pendingCount == 0 ? copy.completedState : copy.nextFocus).uppercased())
                    .font(.system(size: 8, weight: .black, design: .rounded))
                    .tracking(1.1)
                    .foregroundColor(.zenithMuted)

                Spacer()

                Text("\(data.pendingCount)")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundColor(data.pendingCount == 0 ? .zenithAccent : .zenithWarning)
            }

            if let focusHabit = data.focusHabit {
                Text(focusHabit.title)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundColor(.zenithInk)
                    .lineLimit(2)

                Text(copy.habitMeta(for: focusHabit))
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundColor(.zenithMuted)
                    .lineLimit(2)
            } else {
                Text(copy.noHabitsToday)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundColor(.zenithInk)

                Text(copy.summarySubtitle(for: data))
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundColor(.zenithMuted)
                    .lineLimit(3)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.zenithAccent.opacity(0.12),
                            Color.white.opacity(0.03)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}

struct DateBlock: View {
    let date: Date
    let copy: WidgetCopy

    var body: some View {
        HStack(spacing: 12) {
            Text(copy.dayNumber(from: date))
                .font(.system(size: 40, weight: .black, design: .rounded))
                .foregroundColor(.zenithInk)

            VStack(alignment: .leading, spacing: 2) {
                Text(copy.today.uppercased())
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .tracking(1.1)
                    .foregroundColor(.zenithAccentSoft)

                Text(copy.monthLine(from: date))
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundColor(.zenithMuted)
                    .lineLimit(1)
            }
        }
    }
}

struct EmptyStateCard: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundColor(.zenithInk)

            Text(subtitle)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundColor(.zenithMuted)
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.white.opacity(0.04))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}

struct SmallSummaryView: View {
    let entry: ZenithEntry
    private let copy = WidgetCopy()

    var body: some View {
        let data = entry.data
        let referenceDate = data.referenceDate
        let labels = copy.shortWeekdaySymbols(from: referenceDate, count: data.weeklyValues.count)

        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(copy.today.uppercased())
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .tracking(1.2)
                        .foregroundColor(.zenithAccentSoft)

                    Text(copy.shortDate(from: referenceDate))
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(.zenithMuted)
                }

                Spacer()

                StatusBadge(
                    text: copy.badgeLabel(for: data),
                    accent: data.pendingCount == 0 ? .zenithAccent : .zenithWarning
                )
            }

            HStack(spacing: 14) {
                ProgressRing(
                    progress: data.completionRatio,
                    value: "\(data.completedCount)/\(max(data.totalCount, 1))",
                    caption: "\(data.completionPercent)% \(copy.done)"
                )
                .frame(width: 84, height: 84)

                VStack(alignment: .leading, spacing: 7) {
                    Text(copy.summaryTitle(for: data))
                        .font(.system(size: 16, weight: .black, design: .rounded))
                        .foregroundColor(.zenithInk)
                        .lineLimit(2)

                    Text(copy.summarySubtitle(for: data))
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundColor(.zenithMuted)
                        .lineLimit(3)
                }
            }

            WeeklyTrendView(values: data.weeklyValues, labels: labels, compact: true)
        }
        .padding(16)
        .zenithWidgetChrome()
        .widgetURL(zenithWidgetURL())
    }
}

struct MediumChecklistView: View {
    let entry: ZenithEntry
    private let copy = WidgetCopy()

    var body: some View {
        let data = entry.data
        let labels = copy.shortWeekdaySymbols(from: data.referenceDate, count: data.weeklyValues.count)

        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(copy.today.uppercased())
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .tracking(1.2)
                            .foregroundColor(.zenithAccentSoft)

                        Text(copy.shortDate(from: data.referenceDate))
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundColor(.zenithMuted)
                    }

                    Spacer()

                    StatusBadge(
                        text: copy.badgeLabel(for: data),
                        accent: data.pendingCount == 0 ? .zenithAccent : .zenithWarning
                    )
                }

                ProgressRing(
                    progress: data.completionRatio,
                    value: "\(data.completedCount)/\(max(data.totalCount, 1))",
                    caption: "\(data.completionPercent)%"
                )
                .frame(width: 96, height: 96)

                HStack(spacing: 8) {
                    MetricTile(
                        label: copy.pending,
                        value: "\(data.pendingCount)",
                        detail: "\(data.strongestStreak)d"
                    )

                    MetricTile(
                        label: copy.weeklyAverage,
                        value: "\(data.weeklyAveragePercent)%",
                        detail: "\(data.activeDaysThisWeek)/7"
                    )
                }

                WeeklyTrendView(values: data.weeklyValues, labels: labels, compact: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: copy.todaysList)

                if data.habits.isEmpty {
                    EmptyStateCard(
                        title: copy.noHabitsToday,
                        subtitle: copy.summarySubtitle(for: data)
                    )
                } else {
                    ForEach(data.habits.prefix(3)) { habit in
                        if #available(iOSApplicationExtension 17.0, *) {
                            Button(intent: ToggleHabitIntent(habitId: habit.id)) {
                                HabitRow(habit: habit, copy: copy, compact: true)
                            }
                            .buttonStyle(.plain)
                        } else {
                            HabitRow(habit: habit, copy: copy, compact: true)
                        }
                    }
                }

                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .zenithWidgetChrome()
        .widgetURL(zenithWidgetURL())
    }
}

struct LargeWidgetView: View {
    let entry: ZenithEntry
    private let copy = WidgetCopy()

    var body: some View {
        let data = entry.data
        let labels = copy.shortWeekdaySymbols(from: data.referenceDate, count: data.weeklyValues.count)

        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                DateBlock(date: data.referenceDate, copy: copy)

                Spacer()

                StatusBadge(
                    text: copy.badgeLabel(for: data),
                    accent: data.pendingCount == 0 ? .zenithAccent : .zenithWarning
                )
            }

            HStack(spacing: 10) {
                MetricTile(
                    label: copy.done,
                    value: "\(data.completedCount)/\(max(data.totalCount, 1))",
                    detail: "\(data.completionPercent)%"
                )

                MetricTile(
                    label: copy.weeklyAverage,
                    value: "\(data.weeklyAveragePercent)%",
                    detail: "\(data.activeDaysThisWeek)/7 \(copy.activeDays.lowercased())"
                )

                MetricTile(
                    label: copy.bestStreak,
                    value: "\(data.strongestStreak)d",
                    detail: data.pendingCount == 0 ? copy.completedState : copy.nextFocus,
                    accent: data.strongestStreak >= 7 ? .zenithWarning : .zenithAccent
                )
            }

            HStack(alignment: .top, spacing: 12) {
                FocusCard(data: data, copy: copy)

                VStack(alignment: .leading, spacing: 8) {
                    SectionLabel(text: copy.weeklyRhythm)
                    WeeklyTrendView(values: data.weeklyValues, labels: labels)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.white.opacity(0.04))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
            }

            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: copy.todaysList)

                if data.habits.isEmpty {
                    EmptyStateCard(
                        title: copy.noHabitsToday,
                        subtitle: copy.summarySubtitle(for: data)
                    )
                } else {
                    ForEach(data.habits.prefix(4)) { habit in
                        if #available(iOSApplicationExtension 17.0, *) {
                            Button(intent: ToggleHabitIntent(habitId: habit.id)) {
                                HabitRow(habit: habit, copy: copy)
                            }
                            .buttonStyle(.plain)
                        } else {
                            HabitRow(habit: habit, copy: copy)
                        }
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(20)
        .zenithWidgetChrome()
        .widgetURL(zenithWidgetURL())
    }
}

struct ZenithWidgetEntryView: View {
    let entry: ZenithEntry
    @Environment(\.widgetFamily) private var family

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
    let kind = "ZenithWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOSApplicationExtension 17.0, *) {
                ZenithWidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) {
                        Color.zenithSurface
                    }
            } else {
                ZenithWidgetEntryView(entry: entry)
                    .background(Color.zenithSurface)
            }
        }
        .configurationDisplayName("Zenith Dashboard")
        .description("A focused view of today's progress, momentum and next move.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

#Preview(as: .systemSmall) {
    ZenithWidget()
} timeline: {
    ZenithEntry(
        date: Date(),
        data: WidgetData(
            habits: [
                WidgetHabit(
                    id: "1",
                    title: "Deep work",
                    completed: false,
                    streak: 12,
                    progressValue: 1,
                    targetValue: 2,
                    progressRatio: 0.5,
                    isWeeklyTarget: true,
                    unitLabel: nil
                ),
                WidgetHabit(
                    id: "2",
                    title: "Read 20 pages",
                    completed: true,
                    streak: 6,
                    progressValue: 20,
                    targetValue: 20,
                    progressRatio: 1,
                    isWeeklyTarget: false,
                    unitLabel: "pages"
                )
            ],
            totalHabits: 3,
            completedHabits: 1,
            weeklyCompletion: [0.15, 0.42, 0.55, 0.33, 0.85, 1, 0.66],
            bestStreak: 12,
            snapshotDate: Date().timeIntervalSince1970 * 1000
        )
    )
}

#Preview(as: .systemMedium) {
    ZenithWidget()
} timeline: {
    ZenithEntry(
        date: Date(),
        data: WidgetData(
            habits: [
                WidgetHabit(
                    id: "1",
                    title: "Deep work",
                    completed: false,
                    streak: 12,
                    progressValue: 1,
                    targetValue: 2,
                    progressRatio: 0.5,
                    isWeeklyTarget: true,
                    unitLabel: nil
                ),
                WidgetHabit(
                    id: "2",
                    title: "Read 20 pages",
                    completed: true,
                    streak: 6,
                    progressValue: 20,
                    targetValue: 20,
                    progressRatio: 1,
                    isWeeklyTarget: false,
                    unitLabel: "pages"
                ),
                WidgetHabit(
                    id: "3",
                    title: "Walk",
                    completed: false,
                    streak: 3,
                    progressValue: 0,
                    targetValue: 1,
                    progressRatio: 0,
                    isWeeklyTarget: false,
                    unitLabel: nil
                )
            ],
            totalHabits: 3,
            completedHabits: 1,
            weeklyCompletion: [0.15, 0.42, 0.55, 0.33, 0.85, 1, 0.66],
            bestStreak: 12,
            snapshotDate: Date().timeIntervalSince1970 * 1000
        )
    )
}

#Preview(as: .systemLarge) {
    ZenithWidget()
} timeline: {
    ZenithEntry(
        date: Date(),
        data: WidgetData(
            habits: [
                WidgetHabit(
                    id: "1",
                    title: "Deep work",
                    completed: false,
                    streak: 12,
                    progressValue: 1,
                    targetValue: 2,
                    progressRatio: 0.5,
                    isWeeklyTarget: true,
                    unitLabel: nil
                ),
                WidgetHabit(
                    id: "2",
                    title: "Read 20 pages",
                    completed: true,
                    streak: 6,
                    progressValue: 20,
                    targetValue: 20,
                    progressRatio: 1,
                    isWeeklyTarget: false,
                    unitLabel: "pages"
                ),
                WidgetHabit(
                    id: "3",
                    title: "Walk",
                    completed: false,
                    streak: 3,
                    progressValue: 0,
                    targetValue: 1,
                    progressRatio: 0,
                    isWeeklyTarget: false,
                    unitLabel: nil
                )
            ],
            totalHabits: 3,
            completedHabits: 1,
            weeklyCompletion: [0.15, 0.42, 0.55, 0.33, 0.85, 1, 0.66],
            bestStreak: 12,
            snapshotDate: Date().timeIntervalSince1970 * 1000
        )
    )
}
