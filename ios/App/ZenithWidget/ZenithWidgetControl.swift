import WidgetKit
import SwiftUI

@available(iOSApplicationExtension 16.0, *)
struct ZenithAccessoryWidget: Widget {
    let kind = "ZenithAccessoryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ZenithAccessoryEntryView(entry: entry)
                .widgetURL(zenithWidgetURL())
        }
        .configurationDisplayName("Zenith Pulse")
        .description("Compact lock screen view for today's routine.")
        .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular])
    }
}

@available(iOSApplicationExtension 16.0, *)
struct ZenithAccessoryEntryView: View {
    let entry: ZenithEntry
    private let copy = WidgetCopy()
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryInline:
            Text(copy.inlineStatus(for: entry.data))
        case .accessoryCircular:
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.18), lineWidth: 7)

                Circle()
                    .trim(from: 0, to: max(entry.data.completionRatio, 0.04))
                    .stroke(
                        AngularGradient(
                            colors: [.zenithAccentSoft, .zenithAccent, .zenithWarning],
                            center: .center
                        ),
                        style: StrokeStyle(lineWidth: 7, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))

                VStack(spacing: -1) {
                    Text("\(entry.data.completionPercent)")
                        .font(.system(size: 13, weight: .black, design: .rounded))
                        .foregroundColor(.white)

                    Text("%")
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .foregroundColor(.white.opacity(0.7))
                }
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 4) {
                Text(copy.today.uppercased())
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundColor(.white.opacity(0.7))

                Text(copy.inlineStatus(for: entry.data))
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)

                if let focusHabit = entry.data.focusHabit {
                    Text(focusHabit.title)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundColor(.white.opacity(0.78))
                        .lineLimit(1)
                } else {
                    Text(copy.summarySubtitle(for: entry.data))
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(1)
                }
            }
        default:
            Text(copy.inlineStatus(for: entry.data))
        }
    }
}
