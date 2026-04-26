import SwiftUI
import SwiftData

/// Shared preview container with sample data for all SwiftUI previews
@MainActor
enum PreviewContainer {
    static let container: ModelContainer = {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try! ModelContainer(
            for: Goal.self, WorkoutEntry.self, MealEntry.self,
                 WeightEntry.self, DrinkEntry.self, Badge.self,
            configurations: config
        )

        // Seed sample data
        let ctx = container.mainContext

        // Goals
        let cal = DateHelper.calendar
        let start = cal.date(byAdding: .weekOfYear, value: -2, to: .now)!
        let end = cal.date(byAdding: .weekOfYear, value: 5, to: .now)!

        let goals: [Goal] = [
            Goal(type: "calories", title: "Daily Calories", icon: "flame.fill", targetValue: 2300, unit: "kcal/day", startDate: start, endDate: end),
            Goal(type: "exercise", title: "Exercise", icon: "figure.run", targetValue: 7, unit: "active days/week", startDate: start, endDate: end, workoutsPerWeek: 4, walksPerWeek: 3),
            Goal(type: "snacking", title: "No Snacking", icon: "leaf.fill", targetValue: 5, unit: "clean days/week", startDate: start, endDate: end),
            Goal(type: "alcohol", title: "Alcohol", icon: "drop.fill", targetValue: 17, unit: "units/week", startDate: start, endDate: end),
            Goal(type: "weight", title: "Weight", icon: "scalemass.fill", targetValue: 93.0, unit: "kg", startDate: start, endDate: cal.date(byAdding: .month, value: 3, to: .now)!),
        ]
        goals.forEach { ctx.insert($0) }

        // Sample meals for today
        let today = Date.now
        ctx.insert(MealEntry(date: today, mealType: .breakfast, description: "Oatmeal with berries", estimatedKcal: 420))
        ctx.insert(MealEntry(date: today, mealType: .lunch, description: "Grilled chicken salad", estimatedKcal: 650))
        ctx.insert(MealEntry(date: today, mealType: .dinner, description: "Salmon with rice", estimatedKcal: 580))

        // Sample drinks
        ctx.insert(DrinkEntry(date: today, drinkType: .beer, quantity: 2))
        ctx.insert(DrinkEntry(date: cal.date(byAdding: .day, value: -1, to: today)!, drinkType: .wine, quantity: 1))

        // Sample workouts
        ctx.insert(WorkoutEntry(date: today, type: "Run", duration: 45, kcalBurned: 520))
        ctx.insert(WorkoutEntry(date: cal.date(byAdding: .day, value: -1, to: today)!, type: "Gym", duration: 60, kcalBurned: 380))
        ctx.insert(WorkoutEntry(date: cal.date(byAdding: .day, value: -2, to: today)!, type: "Walk", duration: 30, kcalBurned: 150))

        // Sample weight
        ctx.insert(WeightEntry(date: today, weight: 96.2))
        ctx.insert(WeightEntry(date: cal.date(byAdding: .day, value: -3, to: today)!, weight: 96.5))

        try? ctx.save()
        return container
    }()

    static let store: HabitStore = HabitStore(modelContext: container.mainContext)
}
