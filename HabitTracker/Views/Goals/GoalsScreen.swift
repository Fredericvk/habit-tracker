import SwiftUI
import SwiftData

struct GoalsScreen: View {
    let store: HabitStore
    @State private var editingGoal: String? = nil

    private var allGoals: [Goal] { store.goals() }

    var body: some View {
        VStack(spacing: 0) {
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
                    ForEach(allGoals, id: \.id) { goal in
                        goalCardView(for: goal)
                    }
                }
                .padding(.horizontal, Layout.screenPadding)
                .padding(.top, 16)
                .padding(.bottom, 100)
            }
        }
        .background(Color.theme.background)
    }

    // MARK: - Goal Card Router

    @ViewBuilder
    private func goalCardView(for goal: Goal) -> some View {
        let totalWeeks = DateHelper.weekCount(from: goal.startDate, to: goal.endDate)
        let elapsedWeeks = DateHelper.weekCount(from: goal.startDate, to: min(.now, goal.endDate))
        let remainingWeeks = max(0, totalWeeks - elapsedWeeks)
        let successfulWeeks = computeSuccessfulWeeks(for: goal)

        goalCard(
            goal: goal,
            target: targetDescription(for: goal),
            weeksCompleted: successfulWeeks,
            totalWeeks: totalWeeks,
            weeksRemaining: remainingWeeks
        ) {
            editFields(for: goal)
        }
    }

    private func targetDescription(for goal: Goal) -> String {
        switch goal.type {
        case "calories": return "≤ \(Int(goal.targetValue)) kcal per day"
        case "exercise":
            let w = goal.workoutsPerWeek ?? 4
            let walks = goal.walksPerWeek ?? 3
            return "\(w) workouts + \(walks) walks = \(Int(goal.targetValue)) active days/week"
        case "snacking": return "≥ \(Int(goal.targetValue)) clean days per week"
        case "alcohol": return "≤ \(Int(goal.targetValue)) units per week"
        case "weight": return String(format: "Target: %.1f kg", goal.targetValue)
        default: return ""
        }
    }

    private func computeSuccessfulWeeks(for goal: Goal) -> Int {
        let weeks = DateHelper.weeksBetween(start: goal.startDate, end: min(.now, goal.endDate))
        var count = 0
        for weekStart in weeks {
            if weekStart >= DateHelper.startOfWeek(.now) { continue } // skip current week
            switch goal.type {
            case "calories":
                let avg = store.avgCaloriesInWeek(weekStart)
                if avg > 0 && avg <= Int(goal.targetValue) { count += 1 }
            case "exercise":
                let active = store.activeDaysInWeek(weekStart)
                if active >= Int(goal.targetValue) { count += 1 }
            case "snacking":
                let clean = store.cleanWeekdays(in: weekStart)
                if clean >= Int(goal.targetValue) { count += 1 }
            case "alcohol":
                let units = store.weeklyUnits(weekStart)
                if units <= goal.targetValue { count += 1 }
            case "weight":
                // Weight: check if latest weight for that week is at or below target
                break
            default: break
            }
        }
        return count
    }

    // MARK: - Goal Card Template

    private func goalCard(
        goal: Goal,
        target: String,
        weeksCompleted: Int,
        totalWeeks: Int,
        weeksRemaining: Int,
        @ViewBuilder editContent: @escaping () -> some View
    ) -> some View {
        ZStack {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: goal.icon)
                        .foregroundStyle(iconColor(for: goal.type))
                    Text(goal.title)
                        .font(.cardTitle)
                        .foregroundStyle(Color.theme.textPrimary)
                    Spacer()
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            editingGoal = goal.type
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

                Text(target)
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.textPrimary)

                Text("\(DateHelper.shortDate(goal.startDate)) – \(DateHelper.shortDate(goal.endDate))")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)

                weeklyTimeline(completed: weeksCompleted, total: totalWeeks, remaining: weeksRemaining)

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

            if editingGoal == goal.type {
                editOverlay(goal: goal) {
                    editContent()
                }
                .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
    }

    private func iconColor(for type: String) -> Color {
        switch type {
        case "calories": return Color.theme.warning
        case "exercise": return Color.theme.primary
        case "snacking": return Color.theme.success
        case "alcohol": return Color.theme.warning
        case "weight": return Color.theme.primary
        default: return Color.theme.textMuted
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
            return index < completed ? Color.theme.success : Color.theme.danger
        } else if index == passedWeeks {
            return Color.theme.primary.opacity(0.5)
        } else {
            return Color.theme.textMuted.opacity(0.2)
        }
    }

    // MARK: - Edit Overlay

    private func editOverlay(goal: Goal, @ViewBuilder content: @escaping () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Edit Goal")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Button {
                    withAnimation(.spring(response: 0.3)) { editingGoal = nil }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.theme.textMuted)
                        .font(.system(size: 20))
                }
            }

            content()

            HStack(spacing: 12) {
                Button {
                    withAnimation(.spring(response: 0.3)) { editingGoal = nil }
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
                    store.updateGoal(goal)
                    withAnimation(.spring(response: 0.3)) { editingGoal = nil }
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

    // MARK: - Edit Fields per Goal Type

    @ViewBuilder
    private func editFields(for goal: Goal) -> some View {
        switch goal.type {
        case "calories":
            stepperRow(label: "Daily limit", value: Binding(get: { Int(goal.targetValue) }, set: { goal.targetValue = Double($0) }), unit: "kcal", step: 100)
            dateRow(label: "Start", date: Binding(get: { goal.startDate }, set: { goal.startDate = $0 }))
            dateRow(label: "End", date: Binding(get: { goal.endDate }, set: { goal.endDate = $0 }))

        case "exercise":
            stepperRow(label: "Workouts/week", value: Binding(get: { goal.workoutsPerWeek ?? 4 }, set: { goal.workoutsPerWeek = $0; goal.targetValue = Double($0 + (goal.walksPerWeek ?? 3)) }), unit: "days", step: 1)
            stepperRow(label: "Walks/week", value: Binding(get: { goal.walksPerWeek ?? 3 }, set: { goal.walksPerWeek = $0; goal.targetValue = Double((goal.workoutsPerWeek ?? 4) + $0) }), unit: "days", step: 1)
            dateRow(label: "Start", date: Binding(get: { goal.startDate }, set: { goal.startDate = $0 }))
            dateRow(label: "End", date: Binding(get: { goal.endDate }, set: { goal.endDate = $0 }))

        case "snacking":
            stepperRow(label: "Clean days/week", value: Binding(get: { Int(goal.targetValue) }, set: { goal.targetValue = Double($0) }), unit: "days", step: 1)
            dateRow(label: "Start", date: Binding(get: { goal.startDate }, set: { goal.startDate = $0 }))
            dateRow(label: "End", date: Binding(get: { goal.endDate }, set: { goal.endDate = $0 }))

        case "alcohol":
            stepperRow(label: "Weekly limit", value: Binding(get: { Int(goal.targetValue) }, set: { goal.targetValue = Double($0) }), unit: "units", step: 1)
            dateRow(label: "Start", date: Binding(get: { goal.startDate }, set: { goal.startDate = $0 }))
            dateRow(label: "End", date: Binding(get: { goal.endDate }, set: { goal.endDate = $0 }))

        case "weight":
            stepperRowDouble(label: "Target weight", value: Binding(get: { goal.targetValue }, set: { goal.targetValue = $0 }), unit: "kg", step: 0.5)
            dateRow(label: "Start", date: Binding(get: { goal.startDate }, set: { goal.startDate = $0 }))
            dateRow(label: "End", date: Binding(get: { goal.endDate }, set: { goal.endDate = $0 }))

        default:
            EmptyView()
        }
    }

    // MARK: - Stepper Helpers

    private func stepperRow(label: String, value: Binding<Int>, unit: String, step: Int) -> some View {
        HStack {
            Text(label)
                .font(.cardBody)
                .foregroundStyle(Color.theme.textSecondary)
            Spacer()
            HStack(spacing: 12) {
                Button { value.wrappedValue = max(0, value.wrappedValue - step) } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.theme.textMuted)
                }
                Text("\(value.wrappedValue)")
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.textPrimary)
                    .frame(width: 44)
                Button { value.wrappedValue += step } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.theme.primary)
                }
                Text(unit)
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                    .frame(width: 44, alignment: .leading)
            }
        }
    }

    private func stepperRowDouble(label: String, value: Binding<Double>, unit: String, step: Double) -> some View {
        HStack {
            Text(label)
                .font(.cardBody)
                .foregroundStyle(Color.theme.textSecondary)
            Spacer()
            HStack(spacing: 12) {
                Button { value.wrappedValue = max(0, value.wrappedValue - step) } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.theme.textMuted)
                }
                Text(String(format: "%.1f", value.wrappedValue))
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.textPrimary)
                    .frame(width: 44)
                Button { value.wrappedValue += step } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.theme.primary)
                }
                Text(unit)
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                    .frame(width: 44, alignment: .leading)
            }
        }
    }

    private func dateRow(label: String, date: Binding<Date>) -> some View {
        DatePicker(label, selection: date, displayedComponents: .date)
            .font(.cardBody)
            .foregroundStyle(Color.theme.textSecondary)
            .tint(Color.theme.primary)
    }
}
