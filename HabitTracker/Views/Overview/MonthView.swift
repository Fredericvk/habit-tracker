import SwiftUI

struct MonthView: View {
    @State private var expandedWeek: Int? = nil

    private let weekdays = ["M", "T", "W", "T", "F", "S", "S"]
    private let weekNumbers = [14, 15, 16, 17]

    // Sample calendar data (April 2025)
    private let calendarWeeks: [[Int?]] = [
        [nil, 1, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12, 13],
        [14, 15, 16, 17, 18, 19, 20],
        [21, 22, 23, 24, 25, 26, 27],
    ]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: Layout.cardSpacing) {
                // Month header
                HStack {
                    Button { } label: {
                        Image(systemName: "chevron.left")
                            .foregroundStyle(Color.theme.primary)
                    }
                    Spacer()
                    Text("April 2025")
                        .font(.cardTitle)
                        .foregroundStyle(Color.theme.textPrimary)
                    Spacer()
                    Button { } label: {
                        Image(systemName: "chevron.right")
                            .foregroundStyle(Color.theme.primary)
                    }
                }
                .padding(.horizontal, 4)

                // Calendar card
                calendarCard

                // Month stats
                monthStatsCards
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
    }

    // MARK: - Calendar Card

    private var calendarCard: some View {
        ZStack {
            VStack(spacing: 6) {
                // Weekday headers (with empty space for week number column)
                HStack(spacing: 0) {
                    Text("Wk")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.theme.textMuted)
                        .frame(width: 28)

                    ForEach(weekdays, id: \.self) { day in
                        Text(day)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.theme.textMuted)
                            .frame(maxWidth: .infinity)
                    }
                }

                // Calendar rows
                ForEach(Array(calendarWeeks.enumerated()), id: \.offset) { weekIndex, week in
                    HStack(spacing: 0) {
                        // Week number button
                        Button {
                            withAnimation(.spring(response: 0.3)) {
                                if expandedWeek == weekIndex {
                                    expandedWeek = nil
                                } else {
                                    expandedWeek = weekIndex
                                }
                            }
                        } label: {
                            Text("\(weekNumbers[weekIndex])")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(expandedWeek == weekIndex ? .white : Color.theme.primary)
                                .frame(width: 22, height: 22)
                                .background(expandedWeek == weekIndex ? Color.theme.primary : Color.theme.tintPurple)
                                .clipShape(Circle())
                        }
                        .frame(width: 28)

                        // Day cells
                        ForEach(0..<7, id: \.self) { dayIndex in
                            if let day = week[dayIndex] {
                                dayCell(day: day, isToday: day == 25)
                            } else {
                                Color.clear
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 32)
                            }
                        }
                    }
                }
            }
            .cardStyle()

            // Week detail overlay
            if let weekIndex = expandedWeek {
                weekDetailOverlay(weekIndex: weekIndex)
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
    }

    // MARK: - Day Cell

    private func dayCell(day: Int, isToday: Bool) -> some View {
        ZStack {
            if isToday {
                Circle()
                    .fill(Color.theme.primary)
                    .frame(width: 28, height: 28)
            }

            Text("\(day)")
                .font(.system(size: 13, weight: isToday ? .bold : .regular))
                .foregroundStyle(isToday ? .white : Color.theme.textPrimary)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 32)
    }

    // MARK: - Week Detail Overlay

    private func weekDetailOverlay(weekIndex: Int) -> some View {
        VStack(spacing: 8) {
            HStack {
                Text("Week \(weekNumbers[weekIndex])")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        expandedWeek = nil
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.theme.textMuted)
                        .font(.system(size: 20))
                }
            }

            // Weekly grid rows
            weekGridRow(label: "Cal", values: ["✓", "✓", "✗", "✓", "✓", "✓", "✓"], color: Color.theme.success)
            weekGridRow(label: "Exercise", values: ["🏃", "—", "💪", "—", "🚶", "🏃", "—"], color: Color.theme.primary)
            weekGridRow(label: "Snacking", values: ["✓", "✓", "✓", "✗", "✓", "—", "—"], color: Color.theme.success)
            weekGridRow(label: "Alcohol", values: ["—", "2.3", "—", "—", "4.4", "4.6", "—"], color: Color.theme.warning)
        }
        .padding(Layout.cardPadding)
        .background(Color.theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: Layout.cardRadius))
        .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
    }

    private func weekGridRow(label: String, values: [String], color: Color) -> some View {
        HStack(spacing: 0) {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.theme.textSecondary)
                .frame(width: 60, alignment: .leading)

            ForEach(0..<7, id: \.self) { i in
                Text(values[i])
                    .font(.system(size: 11))
                    .foregroundStyle(values[i] == "✗" ? Color.theme.danger : Color.theme.textPrimary)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Month Stats

    private var monthStatsCards: some View {
        VStack(spacing: Layout.cardSpacing) {
            HStack(spacing: Layout.cardSpacing) {
                statCard(icon: "flame.fill", color: Color.theme.warning, label: "Avg Calories", value: "2,150", subtitle: "kcal/day")
                statCard(icon: "figure.run", color: Color.theme.primary, label: "Workouts", value: "14", subtitle: "this month")
            }
            HStack(spacing: Layout.cardSpacing) {
                statCard(icon: "leaf.fill", color: Color.theme.success, label: "Clean Weeks", value: "3/4", subtitle: "no snacking")
                statCard(icon: "drop.fill", color: Color.theme.warning, label: "Avg Alcohol", value: "12.5", subtitle: "units/week")
            }
        }
    }

    private func statCard(icon: String, color: Color, label: String, value: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .foregroundStyle(color)
                    .font(.system(size: 12))
                Text(label)
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
            }

            Text(value)
                .font(.statMedium)
                .foregroundStyle(Color.theme.textPrimary)

            Text(subtitle)
                .font(.system(size: 11))
                .foregroundStyle(Color.theme.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
}

#Preview {
    MonthView()
}
