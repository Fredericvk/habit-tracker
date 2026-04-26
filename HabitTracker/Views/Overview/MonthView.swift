import SwiftUI
import SwiftData

struct MonthView: View {
    let store: HabitStore
    @State private var expandedWeek: Int? = nil
    @State private var displayedMonth = Date()

    private var cal: Calendar { DateHelper.calendar }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: Layout.cardSpacing) {
                // Month header
                HStack {
                    Button { changeMonth(by: -1) } label: {
                        Image(systemName: "chevron.left")
                            .foregroundStyle(Color.theme.primary)
                    }
                    Spacer()
                    Text(DateHelper.monthYear(displayedMonth))
                        .font(.cardTitle)
                        .foregroundStyle(Color.theme.textPrimary)
                    Spacer()
                    Button { changeMonth(by: 1) } label: {
                        Image(systemName: "chevron.right")
                            .foregroundStyle(Color.theme.primary)
                    }
                }
                .padding(.horizontal, 4)

                calendarCard
                monthStatsCards
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
    }

    // MARK: - Calendar Data

    private var calendarWeeks: [[(Int, Date?)]] {
        let start = DateHelper.startOfMonth(displayedMonth)
        let range = cal.range(of: .day, in: .month, for: start)!
        let firstWeekday = cal.component(.weekday, from: start)
        // Convert to Monday=0 offset
        let offset = (firstWeekday + 5) % 7

        var weeks: [[(Int, Date?)]] = []
        var currentWeek: [(Int, Date?)] = Array(repeating: (0, nil), count: offset)

        for day in range {
            let date = cal.date(byAdding: .day, value: day - 1, to: start)!
            currentWeek.append((day, date))
            if currentWeek.count == 7 {
                weeks.append(currentWeek)
                currentWeek = []
            }
        }
        if !currentWeek.isEmpty {
            while currentWeek.count < 7 {
                currentWeek.append((0, nil))
            }
            weeks.append(currentWeek)
        }
        return weeks
    }

    // MARK: - Calendar Card

    private var calendarCard: some View {
        let weekdays = ["M", "T", "W", "T", "F", "S", "S"]

        return ZStack {
            VStack(spacing: 6) {
                HStack(spacing: 0) {
                    Text("Wk")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.theme.textMuted)
                        .frame(width: 28)

                    ForEach(weekdays.indices, id: \.self) { i in
                        Text(weekdays[i])
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.theme.textMuted)
                            .frame(maxWidth: .infinity)
                    }
                }

                ForEach(Array(calendarWeeks.enumerated()), id: \.offset) { weekIndex, week in
                    let firstDate = week.first(where: { $0.1 != nil })?.1 ?? displayedMonth
                    let weekNum = DateHelper.weekNumber(firstDate)

                    HStack(spacing: 0) {
                        Button {
                            withAnimation(.spring(response: 0.3)) {
                                expandedWeek = expandedWeek == weekIndex ? nil : weekIndex
                            }
                        } label: {
                            Text("\(weekNum)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(expandedWeek == weekIndex ? .white : Color.theme.primary)
                                .frame(width: 22, height: 22)
                                .background(expandedWeek == weekIndex ? Color.theme.primary : Color.theme.tintPurple)
                                .clipShape(Circle())
                        }
                        .frame(width: 28)

                        ForEach(0..<7, id: \.self) { dayIndex in
                            let (day, date) = week[dayIndex]
                            if day > 0, let date {
                                dayCell(day: day, isToday: cal.isDateInToday(date))
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

            if let weekIndex = expandedWeek, weekIndex < calendarWeeks.count {
                let week = calendarWeeks[weekIndex]
                let firstDate = week.first(where: { $0.1 != nil })?.1 ?? displayedMonth
                weekDetailOverlay(weekDate: firstDate)
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
    }

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

    private func weekDetailOverlay(weekDate: Date) -> some View {
        let weekStart = DateHelper.startOfWeek(weekDate)
        let weekNum = DateHelper.weekNumber(weekDate)
        let days = DateHelper.daysInWeek(weekDate)

        return VStack(spacing: 8) {
            HStack {
                Text("Week \(weekNum)")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Button {
                    withAnimation(.spring(response: 0.3)) { expandedWeek = nil }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.theme.textMuted)
                        .font(.system(size: 20))
                }
            }

            // Calories row
            weekGridRow(label: "Cal") { date in
                let cals = store.totalCalories(for: date)
                let goal = Int(store.goal(for: .calories)?.targetValue ?? 2300)
                if cals == 0 && date > .now { return "—" }
                return cals <= goal ? "✓" : "✗"
            }

            // Exercise row
            weekGridRow(label: "Exercise") { date in
                let workouts = store.workouts(for: date)
                if workouts.isEmpty { return date > .now ? "—" : "·" }
                return workouts.first?.isWalk == true ? "🚶" : "💪"
            }

            // Snacking row
            weekGridRow(label: "Snacking") { date in
                if date > .now { return "—" }
                if DateHelper.isWeekend(date) { return "—" }
                return store.hasSnacked(on: date) ? "✗" : "✓"
            }

            // Alcohol row
            weekGridRow(label: "Alcohol") { date in
                let units = store.totalUnits(for: date)
                if units == 0 { return date > .now ? "—" : "·" }
                return String(format: "%.1f", units)
            }
        }
        .padding(Layout.cardPadding)
        .background(Color.theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: Layout.cardRadius))
        .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
    }

    private func weekGridRow(label: String, valueFor: @escaping (Date) -> String) -> some View {
        let days = DateHelper.daysInWeek(expandedWeek != nil ? (calendarWeeks[expandedWeek!].first(where: { $0.1 != nil })?.1 ?? displayedMonth) : displayedMonth)

        return HStack(spacing: 0) {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.theme.textSecondary)
                .frame(width: 60, alignment: .leading)

            ForEach(0..<7, id: \.self) { i in
                let val = i < days.count ? valueFor(days[i]) : "—"
                Text(val)
                    .font(.system(size: 11))
                    .foregroundStyle(val == "✗" ? Color.theme.danger : Color.theme.textPrimary)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Month Stats

    private var monthStatsCards: some View {
        let workoutsThisMonth = countWorkoutsInMonth()
        let avgCal = avgCaloriesInMonth()
        let avgUnits = avgWeeklyUnitsInMonth()

        return VStack(spacing: Layout.cardSpacing) {
            HStack(spacing: Layout.cardSpacing) {
                statCard(icon: "flame.fill", color: Color.theme.warning, label: "Avg Calories", value: avgCal > 0 ? "\(avgCal)" : "—", subtitle: "kcal/day")
                statCard(icon: "figure.run", color: Color.theme.primary, label: "Workouts", value: "\(workoutsThisMonth)", subtitle: "this month")
            }
            HStack(spacing: Layout.cardSpacing) {
                statCard(icon: "leaf.fill", color: Color.theme.success, label: "Clean Days", value: "\(cleanDaysInMonth())", subtitle: "no snacking")
                statCard(icon: "drop.fill", color: Color.theme.warning, label: "Avg Alcohol", value: String(format: "%.1f", avgUnits), subtitle: "units/week")
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

    // MARK: - Month computations

    private func countWorkoutsInMonth() -> Int {
        let start = DateHelper.startOfMonth(displayedMonth)
        let end = DateHelper.endOfMonth(displayedMonth)
        let descriptor = FetchDescriptor<WorkoutEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end }
        )
        return (try? store.modelContext.fetchCount(descriptor)) ?? 0
    }

    private func avgCaloriesInMonth() -> Int {
        let start = DateHelper.startOfMonth(displayedMonth)
        let end = min(DateHelper.endOfMonth(displayedMonth), Date.now)
        let dayCount = max(1, DateHelper.calendar.dateComponents([.day], from: start, to: end).day ?? 1)
        var total = 0
        var current = start
        while current < end {
            total += store.totalCalories(for: current)
            current = cal.date(byAdding: .day, value: 1, to: current)!
        }
        return total / dayCount
    }

    private func cleanDaysInMonth() -> Int {
        let start = DateHelper.startOfMonth(displayedMonth)
        let end = min(DateHelper.endOfMonth(displayedMonth), Date.now)
        var count = 0
        var current = start
        while current < end {
            if DateHelper.isWeekday(current) && !store.hasSnacked(on: current) {
                count += 1
            }
            current = cal.date(byAdding: .day, value: 1, to: current)!
        }
        return count
    }

    private func avgWeeklyUnitsInMonth() -> Double {
        let weeks = DateHelper.weeksBetween(start: DateHelper.startOfMonth(displayedMonth), end: min(DateHelper.endOfMonth(displayedMonth), .now))
        guard !weeks.isEmpty else { return 0 }
        let totalUnits = weeks.reduce(0.0) { $0 + store.weeklyUnits($1) }
        return totalUnits / Double(weeks.count)
    }

    private func changeMonth(by value: Int) {
        withAnimation {
            displayedMonth = cal.date(byAdding: .month, value: value, to: displayedMonth) ?? displayedMonth
            expandedWeek = nil
        }
    }
}
