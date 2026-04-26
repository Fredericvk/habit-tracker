import SwiftUI
import SwiftData

struct MonthView: View {
    let store: HabitStore
    var onSelectDate: ((Date) -> Void)? = nil
    @State private var expandedWeek: Int? = nil
    @State private var displayedMonth = Date()

    // Pre-fetched month data (3 batch fetches instead of 150+)
    @State private var monthMeals: [MealEntry] = []
    @State private var monthWorkouts: [WorkoutEntry] = []
    @State private var monthDrinks: [DrinkEntry] = []
    @State private var calorieGoalValue: Int = 2300

    // Day-keyed lookup dictionaries for O(1) per-cell access
    @State private var mealsByDay: [Date: [MealEntry]] = [:]
    @State private var workoutsByDay: [Date: [WorkoutEntry]] = [:]
    @State private var drinksByDay: [Date: [DrinkEntry]] = [:]

    // Cached calendar grid — rebuilt only when the displayed month changes
    @State private var calendarWeeks: [[(Int, Date?)]] = []

    private let cal: Calendar = DateHelper.calendar

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
        .onAppear { refreshData() }
        .onChange(of: displayedMonth) { _, _ in refreshData() }
        .onChange(of: store.dataVersion) { _, _ in refreshData() }
    }

    private func refreshData() {
        let start = DateHelper.startOfMonth(displayedMonth)
        let end = DateHelper.endOfMonth(displayedMonth)
        let meals = store.mealsInRange(from: start, to: end)
        let workouts = store.workoutsInRange(from: start, to: end)
        let drinks = store.drinksInRange(from: start, to: end)

        monthMeals = meals
        monthWorkouts = workouts
        monthDrinks = drinks

        // Build day-keyed dicts so per-cell lookups are O(1) instead of O(n).
        mealsByDay = Dictionary(grouping: meals) { DateHelper.startOfDay($0.date) }
        workoutsByDay = Dictionary(grouping: workouts) { DateHelper.startOfDay($0.date) }
        drinksByDay = Dictionary(grouping: drinks) { DateHelper.startOfDay($0.date) }

        calorieGoalValue = Int(store.cachedGoal(for: .calories)?.targetValue ?? 2300)

        // Cache the calendar grid — no need to recompute on every body pass.
        calendarWeeks = computeCalendarWeeks()
    }

    // Helper: O(1) lookups using pre-built day dictionaries
    private func mealsForDay(_ date: Date) -> [MealEntry] {
        mealsByDay[DateHelper.startOfDay(date)] ?? []
    }
    private func workoutsForDay(_ date: Date) -> [WorkoutEntry] {
        workoutsByDay[DateHelper.startOfDay(date)] ?? []
    }
    private func drinksForDay(_ date: Date) -> [DrinkEntry] {
        drinksByDay[DateHelper.startOfDay(date)] ?? []
    }

    // MARK: - Calendar Data

    private func computeCalendarWeeks() -> [[(Int, Date?)]] {
        let start = DateHelper.startOfMonth(displayedMonth)
        let range = cal.range(of: .day, in: .month, for: start)!
        let firstWeekday = cal.component(.weekday, from: start)
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
        // Hoist today so it is computed once for the whole card, not per cell.
        let today = DateHelper.startOfDay(.now)

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
                                Button {
                                    onSelectDate?(date)
                                } label: {
                                    dayCell(day: day, date: date, isToday: cal.isDateInToday(date), today: today)
                                }
                            } else {
                                Color.clear
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 40)
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

    private func dayCell(day: Int, date: Date, isToday: Bool, today: Date) -> some View {
        VStack(spacing: 2) {
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

            if DateHelper.startOfDay(date) <= today {
                Circle()
                    .fill(dayDotColor(for: date, today: today))
                    .frame(width: 6, height: 6)
            } else {
                Color.clear.frame(width: 6, height: 6)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 40)
    }

    private func dayDotColor(for date: Date, today: Date) -> Color {
        var failures = 0
        let dayMeals = mealsForDay(date)
        let cals = dayMeals.reduce(0) { $0 + $1.estimatedKcal }
        if cals > calorieGoalValue || cals == 0 { failures += 1 }
        if workoutsForDay(date).isEmpty { failures += 1 }
        if dayMeals.contains(where: \.isSnack) { failures += 1 }
        if drinksForDay(date).reduce(0, { $0 + $1.units }) > 0 { failures += 1 }

        if failures == 0 { return Color.theme.success }
        if failures <= 2 { return Color.theme.warning }
        return Color.theme.danger
    }

    // MARK: - Week Detail Overlay

    private func weekDetailOverlay(weekDate: Date) -> some View {
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

            weekGridRow(days: days, label: "Cal") { date in
                let cals = mealsForDay(date).reduce(0) { $0 + $1.estimatedKcal }
                if cals == 0 && date > .now { return "—" }
                return cals <= calorieGoalValue ? "✓" : "✗"
            }

            weekGridRow(days: days, label: "Exercise") { date in
                let dayWorkouts = workoutsForDay(date)
                if dayWorkouts.isEmpty { return date > .now ? "—" : "·" }
                return dayWorkouts.first?.isWalk == true ? "🚶" : "💪"
            }

            weekGridRow(days: days, label: "Snacking") { date in
                if date > .now { return "—" }
                if DateHelper.isWeekend(date) { return "—" }
                return mealsForDay(date).contains(where: \.isSnack) ? "✗" : "✓"
            }

            weekGridRow(days: days, label: "Alcohol") { date in
                let units = drinksForDay(date).reduce(0) { $0 + $1.units }
                if units == 0 { return date > .now ? "—" : "·" }
                return String(format: "%.1f", units)
            }
        }
        .padding(Layout.cardPadding)
        .background(Color.theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: Layout.cardRadius))
        .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
    }

    private func weekGridRow(days: [Date], label: String, valueFor: @escaping (Date) -> String) -> some View {
        HStack(spacing: 0) {
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
        let workoutCount = monthWorkouts.count
        let avgCal = computeAvgCalories()
        let cleanCount = computeCleanDays()
        let avgUnits = computeAvgWeeklyUnits()

        return VStack(spacing: Layout.cardSpacing) {
            HStack(spacing: Layout.cardSpacing) {
                statCard(icon: "flame.fill", color: Color.theme.warning, label: "Avg Calories", value: avgCal > 0 ? "\(avgCal)" : "—", subtitle: "kcal/day")
                statCard(icon: "figure.run", color: Color.theme.primary, label: "Workouts", value: "\(workoutCount)", subtitle: "this month")
            }
            HStack(spacing: Layout.cardSpacing) {
                statCard(icon: "leaf.fill", color: Color.theme.success, label: "Clean Days", value: "\(cleanCount)", subtitle: "no snacking")
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

    // MARK: - Month computations (from pre-fetched data)

    private func computeAvgCalories() -> Int {
        let start = DateHelper.startOfMonth(displayedMonth)
        let end = min(DateHelper.endOfMonth(displayedMonth), Date.now)
        let dayCount = max(1, DateHelper.calendar.dateComponents([.day], from: start, to: end).day ?? 1)
        let total = monthMeals.reduce(0) { $0 + $1.estimatedKcal }
        return total / dayCount
    }

    private func computeCleanDays() -> Int {
        let start = DateHelper.startOfMonth(displayedMonth)
        let end = min(DateHelper.endOfMonth(displayedMonth), Date.now)
        let snackDates = Set(monthMeals.filter(\.isSnack).map { DateHelper.startOfDay($0.date) })
        var count = 0
        var current = start
        while current < end {
            if DateHelper.isWeekday(current) && !snackDates.contains(DateHelper.startOfDay(current)) {
                count += 1
            }
            current = cal.date(byAdding: .day, value: 1, to: current)!
        }
        return count
    }

    private func computeAvgWeeklyUnits() -> Double {
        let weeks = DateHelper.weeksBetween(start: DateHelper.startOfMonth(displayedMonth), end: min(DateHelper.endOfMonth(displayedMonth), .now))
        guard !weeks.isEmpty else { return 0 }
        let totalUnits = monthDrinks.reduce(0.0) { $0 + $1.units }
        return totalUnits / Double(weeks.count)
    }

    private func changeMonth(by value: Int) {
        withAnimation {
            displayedMonth = cal.date(byAdding: .month, value: value, to: displayedMonth) ?? displayedMonth
            expandedWeek = nil
        }
    }
}

#Preview {
    MonthView(store: PreviewContainer.store)
        .modelContainer(PreviewContainer.container)
}
