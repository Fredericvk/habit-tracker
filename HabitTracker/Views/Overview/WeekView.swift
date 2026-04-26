import SwiftUI

struct WeekView: View {
    let store: HabitStore

    private var avgCalories: Int { store.avgCaloriesInWeek(.now) }
    private var activeDays: Int { store.activeDaysInWeek(.now) }
    private var exerciseGoal: Int { Int(store.goal(for: .exercise)?.targetValue ?? 7) }
    private var cleanDays: Int { store.cleanWeekdays(in: .now) }
    private var snackGoal: Int { Int(store.goal(for: .snacking)?.targetValue ?? 5) }
    private var weekUnits: Double { store.weeklyUnits(.now) }
    private var unitGoal: Double { store.goal(for: .alcohol)?.targetValue ?? 17 }
    private var calorieGoal: Int { Int(store.goal(for: .calories)?.targetValue ?? 2300) }
    private var currentWeight: Double? { store.latestWeight()?.weight }
    private var weightGoal: Double { store.goal(for: .weight)?.targetValue ?? 93.0 }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: Layout.cardSpacing) {
                // Week header
                HStack {
                    Text("Week of \(DateHelper.shortDate(DateHelper.startOfWeek()))")
                        .font(.cardTitle)
                        .foregroundStyle(Color.theme.textPrimary)
                    Spacer()
                    Text("Mon – Sun")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                }
                .padding(.horizontal, 4)

                // Donut ring cards
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: Layout.cardSpacing),
                    GridItem(.flexible(), spacing: Layout.cardSpacing)
                ], spacing: Layout.cardSpacing) {
                    donutCard(
                        title: "Calories",
                        icon: "flame.fill",
                        iconColor: Color.theme.warning,
                        value: avgCalories > 0 ? "\(avgCalories)" : "—",
                        subtitle: "avg kcal/day",
                        progress: calorieGoal > 0 ? min(Double(avgCalories) / Double(calorieGoal), 1.0) : 0,
                        ringColor: avgCalories <= calorieGoal ? Color.theme.success : Color.theme.danger
                    )

                    donutCard(
                        title: "Exercise",
                        icon: "figure.run",
                        iconColor: Color.theme.primary,
                        value: "\(activeDays)/\(exerciseGoal)",
                        subtitle: "active days",
                        progress: exerciseGoal > 0 ? min(Double(activeDays) / Double(exerciseGoal), 1.0) : 0,
                        ringColor: Color.theme.primary
                    )

                    donutCard(
                        title: "Snacking",
                        icon: "leaf.fill",
                        iconColor: Color.theme.success,
                        value: "\(cleanDays)/\(snackGoal)",
                        subtitle: "clean days",
                        progress: snackGoal > 0 ? min(Double(cleanDays) / Double(snackGoal), 1.0) : 0,
                        ringColor: Color.theme.success
                    )

                    donutCard(
                        title: "Alcohol",
                        icon: "drop.fill",
                        iconColor: Color.theme.warning,
                        value: String(format: "%.1f", weekUnits),
                        subtitle: "/ \(Int(unitGoal)) units",
                        progress: unitGoal > 0 ? min(weekUnits / unitGoal, 1.0) : 0,
                        ringColor: weekUnits <= unitGoal ? Color.theme.warning : Color.theme.danger
                    )
                }

                weightCard
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
    }

    // MARK: - Donut Ring Card

    private func donutCard(title: String, icon: String, iconColor: Color, value: String, subtitle: String, progress: Double, ringColor: Color) -> some View {
        VStack(spacing: 10) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .foregroundStyle(iconColor)
                    .font(.system(size: 12))
                Text(title)
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
            }

            ZStack {
                Circle()
                    .stroke(Color.theme.background, lineWidth: 6)
                    .frame(width: 64, height: 64)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(ringColor, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 64, height: 64)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeOut(duration: 0.6), value: progress)

                Text(value)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.theme.textPrimary)
            }

            Text(subtitle)
                .font(.system(size: 11))
                .foregroundStyle(Color.theme.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
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
                Text(String(format: "Goal: %.1f kg", weightGoal))
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
            }

            if let w = currentWeight {
                let diff = w - weightGoal
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

                // Progress toward goal
                let startWeight = 96.5 // initial
                let totalToLose = startWeight - weightGoal
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
