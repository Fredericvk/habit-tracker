import SwiftUI

struct GoalsScreen: View {
    @State private var editingGoal: String? = nil

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Goals")
                    .font(.screenTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 16)

            ScrollView(showsIndicators: false) {
                VStack(spacing: Layout.cardSpacing) {
                    caloriesGoalCard
                    exerciseGoalCard
                    snackingGoalCard
                    alcoholGoalCard
                    weightGoalCard
                }
                .padding(.horizontal, Layout.screenPadding)
                .padding(.top, 16)
                .padding(.bottom, 100)
            }
        }
        .background(Color.theme.background)
    }

    // MARK: - Goal Card Template

    private func goalCard(
        id: String,
        icon: String,
        iconColor: Color,
        title: String,
        target: String,
        dateRange: String,
        weeksCompleted: Int,
        totalWeeks: Int,
        weeksRemaining: Int,
        @ViewBuilder editContent: @escaping () -> some View
    ) -> some View {
        ZStack {
            VStack(alignment: .leading, spacing: 10) {
                // Header row
                HStack {
                    Image(systemName: icon)
                        .foregroundStyle(iconColor)
                    Text(title)
                        .font(.cardTitle)
                        .foregroundStyle(Color.theme.textPrimary)
                    Spacer()
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            editingGoal = id
                        }
                    } label: {
                        Text("Edit")
                            .font(.cardCaption)
                            .foregroundStyle(Color.theme.primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.theme.tintPurple)
                            .clipShape(Capsule())
                    }
                }

                // Target
                Text(target)
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.textPrimary)

                // Date range
                Text(dateRange)
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)

                // Weekly timeline
                weeklyTimeline(completed: weeksCompleted, total: totalWeeks, remaining: weeksRemaining)

                // Meta
                HStack {
                    Text("\(weeksCompleted)/\(totalWeeks) weeks successful")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.success)
                    Spacer()
                    Text("\(weeksRemaining) weeks remaining")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                }
            }
            .cardStyle()

            // Edit overlay
            if editingGoal == id {
                editOverlay(id: id) {
                    editContent()
                }
                .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
    }

    // MARK: - Weekly Timeline

    private func weeklyTimeline(completed: Int, total: Int, remaining: Int) -> some View {
        HStack(spacing: 3) {
            ForEach(0..<total, id: \.self) { week in
                RoundedRectangle(cornerRadius: 3)
                    .fill(weekColor(index: week, completed: completed, total: total, remaining: remaining))
                    .frame(height: 8)
            }
        }
    }

    private func weekColor(index: Int, completed: Int, total: Int, remaining: Int) -> Color {
        let passedWeeks = total - remaining
        if index < passedWeeks {
            // Past weeks — green if successful (simplified: first `completed` are green)
            return index < completed ? Color.theme.success : Color.theme.danger
        } else if index == passedWeeks {
            // Current week — in progress
            return Color.theme.primary.opacity(0.5)
        } else {
            // Future weeks
            return Color.theme.textMuted.opacity(0.2)
        }
    }

    // MARK: - Edit Overlay

    private func editOverlay(id: String, @ViewBuilder content: @escaping () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Edit Goal")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        editingGoal = nil
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.theme.textMuted)
                        .font(.system(size: 20))
                }
            }

            content()

            HStack(spacing: 12) {
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        editingGoal = nil
                    }
                } label: {
                    Text("Cancel")
                        .font(.pillLabel)
                        .foregroundStyle(Color.theme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.theme.background)
                        .clipShape(Capsule())
                }

                Button {
                    withAnimation(.spring(response: 0.3)) {
                        editingGoal = nil
                    }
                } label: {
                    Text("Save")
                        .font(.pillLabel)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.theme.primary)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(Layout.cardPadding)
        .background(Color.theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: Layout.cardRadius))
        .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
    }

    // MARK: - Stepper Row Helper

    private func stepperRow(label: String, value: String, unit: String) -> some View {
        HStack {
            Text(label)
                .font(.cardBody)
                .foregroundStyle(Color.theme.textSecondary)
            Spacer()
            HStack(spacing: 12) {
                Button { } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.theme.textMuted)
                }
                Text(value)
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.textPrimary)
                    .frame(width: 44)
                Button { } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.theme.primary)
                }
                Text(unit)
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                    .frame(width: 50, alignment: .leading)
            }
        }
    }

    private func dateRow(label: String, date: String) -> some View {
        HStack {
            Text(label)
                .font(.cardBody)
                .foregroundStyle(Color.theme.textSecondary)
            Spacer()
            Text(date)
                .font(.cardBody)
                .foregroundStyle(Color.theme.primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.theme.tintPurple)
                .clipShape(Capsule())
        }
    }

    // MARK: - Individual Goal Cards

    private var caloriesGoalCard: some View {
        goalCard(
            id: "calories",
            icon: "flame.fill",
            iconColor: Color.theme.warning,
            title: "Daily Calories",
            target: "≤ 2,300 kcal per day",
            dateRange: "Apr 14 – Jun 1, 2025",
            weeksCompleted: 2,
            totalWeeks: 7,
            weeksRemaining: 5
        ) {
            stepperRow(label: "Daily limit", value: "2,300", unit: "kcal")
            dateRow(label: "Start", date: "Apr 14")
            dateRow(label: "End", date: "Jun 1")
        }
    }

    private var exerciseGoalCard: some View {
        goalCard(
            id: "exercise",
            icon: "figure.run",
            iconColor: Color.theme.primary,
            title: "Exercise",
            target: "4 workouts + 3 walks = 7 active days/week",
            dateRange: "Apr 14 – Jun 1, 2025",
            weeksCompleted: 2,
            totalWeeks: 7,
            weeksRemaining: 5
        ) {
            stepperRow(label: "Workouts/week", value: "4", unit: "days")
            stepperRow(label: "Walks/week", value: "3", unit: "days")
            stepperRow(label: "Active days", value: "7", unit: "days")
            dateRow(label: "Start", date: "Apr 14")
            dateRow(label: "End", date: "Jun 1")
        }
    }

    private var snackingGoalCard: some View {
        goalCard(
            id: "snacking",
            icon: "leaf.fill",
            iconColor: Color.theme.success,
            title: "No Snacking",
            target: "≥ 5 clean days per week",
            dateRange: "Apr 14 – Jun 1, 2025",
            weeksCompleted: 1,
            totalWeeks: 7,
            weeksRemaining: 5
        ) {
            stepperRow(label: "Clean days/week", value: "5", unit: "days")
            dateRow(label: "Start", date: "Apr 14")
            dateRow(label: "End", date: "Jun 1")
        }
    }

    private var alcoholGoalCard: some View {
        goalCard(
            id: "alcohol",
            icon: "drop.fill",
            iconColor: Color.theme.warning,
            title: "Alcohol",
            target: "≤ 17 units per week",
            dateRange: "Apr 14 – Jun 1, 2025",
            weeksCompleted: 2,
            totalWeeks: 7,
            weeksRemaining: 5
        ) {
            stepperRow(label: "Weekly limit", value: "17", unit: "units")
            dateRow(label: "Start", date: "Apr 14")
            dateRow(label: "End", date: "Jun 1")
        }
    }

    private var weightGoalCard: some View {
        goalCard(
            id: "weight",
            icon: "scalemass.fill",
            iconColor: Color.theme.primary,
            title: "Weight",
            target: "Target: 93.0 kg",
            dateRange: "Apr 14 – Jul 1, 2025",
            weeksCompleted: 2,
            totalWeeks: 11,
            weeksRemaining: 9
        ) {
            stepperRow(label: "Target weight", value: "93.0", unit: "kg")
            dateRow(label: "Start", date: "Apr 14")
            dateRow(label: "End", date: "Jul 1")
        }
    }
}

#Preview {
    GoalsScreen()
}
