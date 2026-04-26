import SwiftUI

struct DayView: View {
    let store: HabitStore
    @Binding var navigateToDate: Date?
    @State private var selectedDate = Date()

    // Fetched once per date change
    @State private var meals: [MealEntry] = []
    @State private var workouts: [WorkoutEntry] = []
    @State private var drinks: [DrinkEntry] = []
    @State private var calorieGoalValue: Double = 2300
    @State private var latestWeightValue: Double? = nil

    // Derived from fetched data — no DB hits, populated in refreshDayData()
    @State private var mealBreakdown: [String: Int] = [:]
    private var totalCalories: Int { meals.reduce(0) { $0 + $1.estimatedKcal } }
    private var snacks: [MealEntry] { meals.filter(\.isSnack) }
    private var hasSnacked: Bool { !snacks.isEmpty }
    private var totalUnits: Double { drinks.reduce(0) { $0 + $1.units } }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: Layout.cardSpacing) {
                dateNavigation
                caloriesCard
                exerciseCard

                HStack(spacing: Layout.cardSpacing) {
                    snacksCard
                    alcoholCard
                }
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
        .onAppear { refreshAllData() }
        // Date navigation only needs to reload the day's entries, not global data.
        .onChange(of: selectedDate) { _, _ in refreshDayData() }
        // A data save may affect any category, so reload everything.
        .onChange(of: store.dataVersion) { _, _ in refreshAllData() }
        .onChange(of: navigateToDate) { _, newDate in
            if let newDate {
                selectedDate = newDate
                navigateToDate = nil
            }
        }
    }

    // Reloads entries for the selected day and rebuilds derived state.
    private func refreshDayData() {
        let dayStart = DateHelper.startOfDay(selectedDate)
        let dayEnd = DateHelper.endOfDay(selectedDate)
        meals = store.mealsInRange(from: dayStart, to: dayEnd)
        workouts = store.workoutsInRange(from: dayStart, to: dayEnd)
        drinks = store.drinksInRange(from: dayStart, to: dayEnd)

        // Rebuild meal breakdown dict so body never iterates meals itself.
        var breakdown: [String: Int] = [:]
        for meal in meals { breakdown[meal.mealType, default: 0] += meal.estimatedKcal }
        mealBreakdown = breakdown
    }

    // Reloads goals and the latest weight reading (not date-specific).
    private func refreshGlobalData() {
        calorieGoalValue = store.cachedGoal(for: .calories)?.targetValue ?? 2300
        latestWeightValue = store.latestWeight()?.weight
    }

    private func refreshAllData() {
        refreshDayData()
        refreshGlobalData()
    }

    // MARK: - Date Navigation

    private var dateNavigation: some View {
        HStack {
            Button { moveDate(by: -1) } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.theme.primary)
            }

            Spacer()

            VStack(spacing: 2) {
                Text(selectedDate.formatted(.dateTime.weekday(.wide)))
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                Text(selectedDate.formatted(.dateTime.day().month(.abbreviated)))
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            Spacer()

            Button { moveDate(by: 1) } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Calendar.current.isDateInToday(selectedDate) ? Color.theme.textMuted : Color.theme.primary)
            }
            .disabled(Calendar.current.isDateInToday(selectedDate))
        }
        .padding(.horizontal, 8)
    }

    // MARK: - Calories Card

    private var caloriesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundStyle(Color.theme.warning)
                Text("Calories & Weight")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                if let w = latestWeightValue {
                    Text(String(format: "%.1f kg", w))
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textSecondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.theme.tintAmber)
                        .clipShape(Capsule())
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                let remaining = Int(calorieGoalValue) - totalCalories
                HStack {
                    Text("\(totalCalories)")
                        .font(.statMedium)
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("/ \(Int(calorieGoalValue)) kcal")
                        .font(.cardBody)
                        .foregroundStyle(Color.theme.textMuted)
                    Spacer()
                    Text(remaining >= 0 ? "\(remaining) left" : "\(-remaining) over")
                        .font(.cardCaption)
                        .foregroundStyle(remaining >= 0 ? Color.theme.success : Color.theme.danger)
                }

                let progress = min(Double(totalCalories) / calorieGoalValue, 1.0)
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.theme.background)
                            .frame(height: 10)
                        RoundedRectangle(cornerRadius: 6)
                            .fill(progress > 1.0 ? Color.theme.danger : Color.theme.success)
                            .frame(width: geo.size.width * progress, height: 10)
                            .animation(.easeOut(duration: 0.5), value: progress)
                    }
                }
                .frame(height: 10)
            }

            // Meal breakdown
            HStack(spacing: 0) {
                mealChip(icon: "sunrise.fill", value: "\(mealBreakdown["Breakfast"] ?? 0)", color: Color.theme.tintBlue)
                Spacer()
                mealChip(icon: "sun.max.fill", value: "\(mealBreakdown["Lunch"] ?? 0)", color: Color.theme.tintGreen)
                Spacer()
                mealChip(icon: "moon.fill", value: "\(mealBreakdown["Dinner"] ?? 0)", color: Color.theme.tintPurple)
                Spacer()
                mealChip(icon: "leaf.fill", value: "\(mealBreakdown["Snack"] ?? 0)", color: Color.theme.tintAmber)
            }

            // Logged meals list
            if !meals.isEmpty {
                Divider()
                    .padding(.vertical, 4)

                VStack(alignment: .leading, spacing: 0) {
                    ForEach(meals, id: \.id) { meal in
                        mealRow(meal: meal)
                    }
                }
            }
        }
        .cardStyle()
    }

    private func mealChip(icon: String, value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(Color.theme.textMuted)
            Text(value)
                .font(.statSmall)
                .foregroundStyle(Color.theme.textPrimary)
        }
        .frame(width: 60)
        .padding(.vertical, 8)
        .background(color)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func mealColor(for type: MealType) -> Color {
        switch type {
        case .breakfast: return Color.theme.primary
        case .lunch: return Color.theme.success
        case .dinner: return Color.theme.primary
        case .snack: return Color.theme.warning
        }
    }

    private func mealRow(meal: MealEntry) -> some View {
        SwipeToDeleteRow {
            HStack(spacing: 10) {
                Image(systemName: meal.meal.icon)
                    .font(.system(size: 14))
                    .foregroundStyle(mealColor(for: meal.meal))
                    .frame(width: 20)
                VStack(alignment: .leading, spacing: 1) {
                    Text(meal.itemDescription)
                        .font(.cardBody)
                        .foregroundStyle(Color.theme.textPrimary)
                        .lineLimit(1)
                    Text(meal.mealType)
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                }
                Spacer()
                Text("\(meal.estimatedKcal) kcal")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
            }
            .padding(.vertical, 6)
        } onDelete: {
            store.deleteMeal(meal)
        }
    }

    // MARK: - Exercise Card

    private var exerciseCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "figure.run")
                    .foregroundStyle(Color.theme.primary)
                Text("Exercise")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
            }

            if workouts.isEmpty {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Rest Day")
                            .font(.statSmall)
                            .foregroundStyle(Color.theme.textSecondary)
                        Text("No activity logged")
                            .font(.cardCaption)
                            .foregroundStyle(Color.theme.textMuted)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("0 min")
                            .font(.statSmall)
                            .foregroundStyle(Color.theme.textPrimary)
                        Text("0 kcal")
                            .font(.cardCaption)
                            .foregroundStyle(Color.theme.textMuted)
                    }
                }
            } else {
                ForEach(workouts, id: \.id) { workout in
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(workout.type)
                                .font(.statSmall)
                                .foregroundStyle(Color.theme.textPrimary)
                            Text(workout.workoutSource == .strava ? "via Strava" : "Manual")
                                .font(.cardCaption)
                                .foregroundStyle(Color.theme.textMuted)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(workout.duration) min")
                                .font(.statSmall)
                                .foregroundStyle(Color.theme.textPrimary)
                            if let kcal = workout.kcalBurned {
                                Text("\(kcal) kcal")
                                    .font(.cardCaption)
                                    .foregroundStyle(Color.theme.textMuted)
                            }
                        }
                    }
                }
            }
        }
        .cardStyle()
    }

    // MARK: - Snacks Card

    private var snacksCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "leaf.fill")
                    .foregroundStyle(Color.theme.success)
                    .font(.system(size: 14))
                Text("Snacks")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            if hasSnacked {
                let snackCount = snacks.count
                Text("❌ \(snackCount) snack\(snackCount == 1 ? "" : "s")")
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.danger)
            } else {
                Text("✅ Clean")
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.success)
            }

            Text(hasSnacked ? "Snacked today" : "No snacks today")
                .font(.cardCaption)
                .foregroundStyle(Color.theme.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: - Alcohol Card

    private var alcoholCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "drop.fill")
                    .foregroundStyle(Color.theme.warning)
                    .font(.system(size: 14))
                Text("Alcohol")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            Text(String(format: "%.1f units", totalUnits))
                .font(.statSmall)
                .foregroundStyle(Color.theme.textPrimary)

            Text(drinks.isEmpty ? "No drinks today" : "\(drinks.count) drink\(drinks.count == 1 ? "" : "s")")
                .font(.cardCaption)
                .foregroundStyle(Color.theme.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: - Helpers

    private func moveDate(by days: Int) {
        withAnimation {
            selectedDate = Calendar.current.date(byAdding: .day, value: days, to: selectedDate) ?? selectedDate
        }
    }
}

#Preview {
    DayView(store: PreviewContainer.store, navigateToDate: .constant(nil))
        .modelContainer(PreviewContainer.container)
}
