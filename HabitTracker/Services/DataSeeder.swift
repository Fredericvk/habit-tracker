import Foundation
import SwiftData

/// Seeds default goals on first launch
enum DataSeeder {
    static func seedDefaultGoals(context: ModelContext) {
        // Check if goals already exist
        let descriptor = FetchDescriptor<Goal>()
        let existingCount = (try? context.fetchCount(descriptor)) ?? 0
        guard existingCount == 0 else { return }

        let now = Date()
        let cal = DateHelper.calendar
        let startDate = DateHelper.startOfWeek(now)
        let endDate = cal.date(byAdding: .month, value: 2, to: startDate)!

        let goals: [Goal] = [
            Goal(
                type: GoalType.calories.rawValue,
                title: "Daily Calories",
                icon: GoalType.calories.defaultIcon,
                targetValue: 2300,
                unit: GoalType.calories.defaultUnit,
                startDate: startDate,
                endDate: endDate
            ),
            Goal(
                type: GoalType.exercise.rawValue,
                title: "Exercise",
                icon: GoalType.exercise.defaultIcon,
                targetValue: 7,
                unit: GoalType.exercise.defaultUnit,
                startDate: startDate,
                endDate: endDate,
                workoutsPerWeek: 4,
                walksPerWeek: 3
            ),
            Goal(
                type: GoalType.snacking.rawValue,
                title: "No Snacking",
                icon: GoalType.snacking.defaultIcon,
                targetValue: 5,
                unit: GoalType.snacking.defaultUnit,
                startDate: startDate,
                endDate: endDate
            ),
            Goal(
                type: GoalType.alcohol.rawValue,
                title: "Alcohol",
                icon: GoalType.alcohol.defaultIcon,
                targetValue: 17,
                unit: GoalType.alcohol.defaultUnit,
                startDate: startDate,
                endDate: endDate
            ),
            Goal(
                type: GoalType.weight.rawValue,
                title: "Weight",
                icon: GoalType.weight.defaultIcon,
                targetValue: 93.0,
                unit: GoalType.weight.defaultUnit,
                startDate: startDate,
                endDate: cal.date(byAdding: .month, value: 3, to: startDate)!
            ),
        ]

        for goal in goals {
            context.insert(goal)
        }

        try? context.save()
    }
}
