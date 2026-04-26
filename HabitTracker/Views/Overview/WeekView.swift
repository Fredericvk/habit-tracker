import SwiftUI

struct WeekView: View {
    let store: HabitStore
    @State private var selectedWeekDate = Date()

    // Fetched once per week change (3 batch fetches instead of ~40+)
    @State private var weekMeals: [MealEntry] = []
    @State private var weekWorkouts: [WorkoutEntry] = []
    @State private var weekDrinks: [DrinkEntry] = []
    @State private var exerciseGoalValue: Int = 7
    @State private var snackGoalValue: Int = 5
    @State private var calorieGoalValue: Int = 2300
    @State private var unitGoalValue: Double = 17
    @State private var weightGoalValue: Double = 93.0
    @State private var currentWeightValue: Double? = nil

    private var cal: Calendar { DateHelper.calendar }
    private var weekDays: [Date] { DateHelper.daysInWeek(selectedWeekDate) }
    private var weekStart: Date { DateHelper.startOfWeek(selectedWeekDate) }
    private var weekEnd: Date { cal.date(byAdding: .day, value: 6, to: weekStart)! }

    // Derived from pre-fetched data (no DB hits)
    private var activeDays: Int {
        Set(weekWorkouts.map { DateHelper.startOfDay($0.date) }).count
    }
    private var weekUnits: Double {
        weekDrinks.reduce(0) { $0 + $1.units }
    }
    private var cleanDays: Int {
        let today = DateHelper.startOfDay(.now)
        let snackDates = Set(weekMeals.filter(\.isSnack).map { DateHelper.startOfDay($0.date) })
        return weekDays.prefix(5).filter { day in
            let dayStart = DateHelper.startOfDay(day)
            return dayStart <= today && !snackDates.contains(dayStart)
        }.count
    }
    private var avgCalories: Int {
        let today = DateHelper.startOfDay(.now)
        let pastDays = weekDays.filter { DateHelper.startOfDay($0) <= today }
        guard !pastDays.isEmpty else { return 0 }
        let total = weekMeals.reduce(0) { $0 + $1.estimatedKcal }
        return total / pastDays.count
    }

    private let dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: Layout.cardSpacing) {
                weekNavigation
                exerciseWeekCard
                snackingWeekCard
                caloriesWeekCard
                alcoholWeekCard
                weightCard
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
        .onAppear { refreshData() }
        .onChange(of: selectedWeekDate) { _, _ in refreshData() }
        .onChange(of: store.dataVersion) { _, _ in refreshData() }
    }

    private func refreshData() {
        let start = DateHelper.startOfWeek(selectedWeekDate)
        let end = DateHelper.endOfWeek(selectedWeekDate)
        weekMeals = store.mealsInRange(from: start, to: end)
        weekWorkouts = store.workoutsInRange(from: start, to: end)
        weekDrinks = store.drinksInRange(from: start, to: end)

        let goals = store.cachedGoals()
        exerciseGoalValue = Int(goals.first { $0.type == "exercise" }?.targetValue ?? 7)
        snackGoalValue = Int(goals.first { $0.type == "snacking" }?.targetValue ?? 5)
        calorieGoalValue = Int(goals.first { $0.type == "calories" }?.targetValue ?? 2300)
        unitGoalValue = goals.first { $0.type == "alcohol" }?.targetValue ?? 17
        weightGoalValue = goals.first { $0.type == "weight" }?.targetValue ?? 93.0
        currentWeightValue = store.latestWeight()?.weight
    }

    // Helper: get entries for a specific day from pre-fetched arrays
    private func mealsForDay(_ date: Date) -> [MealEntry] {
        let dayStart = DateHelper.startOfDay(date)
        let dayEnd = DateHelper.endOfDay(date)
        return weekMeals.filter { $0.date >= dayStart && $0.date < dayEnd }
    }
    private func workoutsForDay(_ date: Date) -> [WorkoutEntry] {
        let dayStart = DateHelper.startOfDay(date)
        let dayEnd = DateHelper.endOfDay(date)
        return weekWorkouts.filter { $0.date >= dayStart && $0.date < dayEnd }
    }
    private func drinksForDay(_ date: Date) -> [DrinkEntry] {
        let dayStart = DateHelper.startOfDay(date)
        let dayEnd = DateHelper.endOfDay(date)
        return weekDrinks.filter { $0.date >= dayStart && $0.date < dayEnd }
    }

    // MARK: - Week Navigation

    private var weekNavigation: some View {
        HStack {
            Button { moveWeek(by: -1) } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.theme.primary)
            }
            Spacer()
            VStack(spacing: 2) {
                Text("Week \(DateHelper.weekNumber(selectedWeekDate))")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                Text("\(DateHelper.shortDate(weekStart)) – \(DateHelper.shortDate(weekEnd))")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }
            Spacer()
            Button { moveWeek(by: 1) } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(isCurrentWeek ? Color.theme.textMuted : Color.theme.primary)
            }
            .disabled(isCurrentWeek)
        }
        .padding(.horizontal, 8)
    }

    private var isCurrentWeek: Bool {
        DateHelper.startOfWeek(selectedWeekDate) == DateHelper.startOfWeek(.now)
    }

    private func moveWeek(by value: Int) {
        withAnimation {
            selectedWeekDate = cal.date(byAdding: .weekOfYear, value: value, to: selectedWeekDate) ?? selectedWeekDate
        }
    }

    // MARK: - Exercise Week Card

    private var exerciseWeekCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "figure.run")
                    .foregroundStyle(Color.theme.primary)
                Text("Exercise")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Text("\(activeDays)/\(exerciseGoalValue) days")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.theme.tintPurple)
                    .clipShape(Capsule())
            }

            HStack(spacing: 4) {
                ForEach(0..<7, id: \.self) { i in
                    let date = weekDays[i]
                    let dayWorkouts = workoutsForDay(date)
                    let isPast = DateHelper.startOfDay(date) <= DateHelper.startOfDay(.now)

                    VStack(spacing: 4) {
                        Text(dayLabels[i])
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.theme.textMuted)

                        if !dayWorkouts.isEmpty {
                            VStack(spacing: 2) {
                                ForEach(dayWorkouts, id: \.id) { w in
                                    Text(workoutEmoji(w))
                                        .font(.system(size: 14))
                                }
                                let totalKcal = dayWorkouts.compactMap(\.kcalBurned).reduce(0, +)
                                if totalKcal > 0 {
                                    Text("\(totalKcal)")
                                        .font(.system(size: 9))
                                        .foregroundStyle(Color.theme.textMuted)
                                }
                            }
                        } else {
                            Text(isPast ? "·" : "—")
                                .font(.system(size: 14))
                                .foregroundStyle(Color.theme.textMuted)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .cardStyle()
    }

    private func workoutEmoji(_ w: WorkoutEntry) -> String {
        switch w.type.lowercased() {
        case "walk": return "🚶"
        case "run": return "🏃"
        case "gym": return "💪"
        case "gym class": return "🏋️"
        default: return "🏃"
        }
    }

    // MARK: - Snacking Week Card

    private var snackingWeekCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "leaf.fill")
                    .foregroundStyle(Color.theme.success)
                Text("Snacking")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Text("\(cleanDays)/\(snackGoalValue) clean")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.theme.tintGreen)
                    .clipShape(Capsule())
            }

            HStack(spacing: 4) {
                ForEach(0..<7, id: \.self) { i in
                    let date = weekDays[i]
                    let isPast = DateHelper.startOfDay(date) <= DateHelper.startOfDay(.now)
                    let snacked = !mealsForDay(date).filter(\.isSnack).isEmpty
                    let isWeekend = DateHelper.isWeekend(date)

                    VStack(spacing: 4) {
                        Text(dayLabels[i])
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.theme.textMuted)

                        if !isPast || isWeekend {
                            Text("—")
                                .font(.system(size: 14))
                                .foregroundStyle(Color.theme.textMuted)
                        } else {
                            Text(snacked ? "❌" : "✅")
                                .font(.system(size: 14))
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .cardStyle()
    }

    // MARK: - Calories Week Card

    private var caloriesWeekCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundStyle(Color.theme.warning)
                Text("Calories")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Text("avg \(avgCalories) kcal")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.theme.tintAmber)
                    .clipShape(Capsule())
            }

            HStack(spacing: 4) {
                ForEach(0..<7, id: \.self) { i in
                    let date = weekDays[i]
                    let cals = mealsForDay(date).reduce(0) { $0 + $1.estimatedKcal }
                    let isPast = DateHelper.startOfDay(date) <= DateHelper.startOfDay(.now)

                    VStack(spacing: 4) {
                        Text(dayLabels[i])
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.theme.textMuted)

                        if isPast && cals > 0 {
                            Text("\(cals)")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(cals <= calorieGoalValue ? Color.theme.success : Color.theme.danger)
                        } else {
                            Text(isPast ? "0" : "—")
                                .font(.system(size: 10))
                                .foregroundStyle(Color.theme.textMuted)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .cardStyle()
    }

    // MARK: - Alcohol Week Card

    private var alcoholWeekCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "drop.fill")
                    .foregroundStyle(Color.theme.warning)
                Text("Alcohol")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Text(String(format: "%.1f / %.0f units", weekUnits, unitGoalValue))
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.theme.tintAmber)
                    .clipShape(Capsule())
            }

            HStack(spacing: 4) {
                ForEach(0..<7, id: \.self) { i in
                    let date = weekDays[i]
                    let units = drinksForDay(date).reduce(0) { $0 + $1.units }
                    let isPast = DateHelper.startOfDay(date) <= DateHelper.startOfDay(.now)

                    VStack(spacing: 4) {
                        Text(dayLabels[i])
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.theme.textMuted)

                        if isPast && units > 0 {
                            Text(String(format: "%.1f", units))
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(Color.theme.warning)
                        } else {
                            Text(isPast ? "·" : "—")
                                .font(.system(size: 10))
                                .foregroundStyle(Color.theme.textMuted)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .cardStyle()
    }

    // MARK: - Weight Card

    private var weightCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "scalemass.fill")
                    .foregroundStyle(Color.theme.primary)
                Text("Weight")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Text(String(format: "Goal: %.1f kg", weightGoalValue))
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
            }

            if let w = currentWeightValue {
                let diff = w - weightGoalValue
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(String(format: "%.1f", w))
                        .font(.statLarge)
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("kg")
                        .font(.cardBody)
                        .foregroundStyle(Color.theme.textMuted)
                    Spacer()
                    Text(String(format: "%.1f kg to go", abs(diff)))
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.primary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.theme.tintPurple)
                        .clipShape(Capsule())
                }

                let startWeight = 96.5
                let totalToLose = startWeight - weightGoalValue
                let lost = startWeight - w
                let progress = totalToLose > 0 ? min(max(lost / totalToLose, 0), 1.0) : 0

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.theme.background)
                            .frame(height: 8)
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.theme.primary)
                            .frame(width: geo.size.width * progress, height: 8)
                            .animation(.easeOut(duration: 0.5), value: progress)
                    }
                }
                .frame(height: 8)
            } else {
                Text("No weight logged yet")
                    .font(.cardBody)
                    .foregroundStyle(Color.theme.textMuted)
            }
        }
        .cardStyle()
    }
}

#Preview {
    WeekView(store: PreviewContainer.store)
        .modelContainer(PreviewContainer.container)
}
