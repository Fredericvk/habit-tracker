import SwiftUI

struct DayView: View {
    let store: HabitStore
    @State private var selectedDate = Date()

    private var calorieGoal: Double {
        store.goal(for: .calories)?.targetValue ?? 2300
    }

    private var todayCalories: Int {
        store.totalCalories(for: selectedDate)
    }

    private var mealBreakdown: [String: Int] {
        store.caloriesByMealType(for: selectedDate)
    }

    private var todayWorkouts: [WorkoutEntry] {
        store.workouts(for: selectedDate)
    }

    private var todayDrinks: [DrinkEntry] {
        store.drinks(for: selectedDate)
    }

    private var todayUnits: Double {
        store.totalUnits(for: selectedDate)
    }

    private var hasSnackedToday: Bool {
        store.hasSnacked(on: selectedDate)
    }

    private var latestWeight: Double? {
        store.latestWeight()?.weight
    }

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
                if let w = latestWeight {
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
                let remaining = Int(calorieGoal) - todayCalories
                HStack {
                    Text("\(todayCalories)")
                        .font(.statMedium)
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("/ \(Int(calorieGoal)) kcal")
                        .font(.cardBody)
                        .foregroundStyle(Color.theme.textMuted)
                    Spacer()
                    Text(remaining >= 0 ? "\(remaining) left" : "\(-remaining) over")
                        .font(.cardCaption)
                        .foregroundStyle(remaining >= 0 ? Color.theme.success : Color.theme.danger)
                }

                let progress = min(Double(todayCalories) / calorieGoal, 1.0)
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
                mealChip(label: "B", value: "\(mealBreakdown["Breakfast"] ?? 0)", color: Color.theme.tintBlue)
                Spacer()
                mealChip(label: "L", value: "\(mealBreakdown["Lunch"] ?? 0)", color: Color.theme.tintGreen)
                Spacer()
                mealChip(label: "D", value: "\(mealBreakdown["Dinner"] ?? 0)", color: Color.theme.tintPurple)
                Spacer()
                mealChip(label: "S", value: "\(mealBreakdown["Snack"] ?? 0)", color: Color.theme.tintAmber)
            }
        }
        .cardStyle()
    }

    private func mealChip(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.cardCaption)
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

            if todayWorkouts.isEmpty {
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
                ForEach(todayWorkouts, id: \.id) { workout in
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

            if hasSnackedToday {
                let snackCount = store.snacks(for: selectedDate).count
                Text("❌ \(snackCount) snack\(snackCount == 1 ? "" : "s")")
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.danger)
            } else {
                Text("✅ Clean")
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.success)
            }

            Text(hasSnackedToday ? "Snacked today" : "No snacks today")
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

            Text(String(format: "%.1f units", todayUnits))
                .font(.statSmall)
                .foregroundStyle(Color.theme.textPrimary)

            Text(todayDrinks.isEmpty ? "No drinks today" : "\(todayDrinks.count) drink\(todayDrinks.count == 1 ? "" : "s")")
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
