import Foundation
import SwiftData
import Observation

/// Central data manager — provides computed stats for any date range
@Observable
final class HabitStore {
    var modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Goals

    func goals() -> [Goal] {
        let descriptor = FetchDescriptor<Goal>(sortBy: [SortDescriptor(\.type)])
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func goal(for type: GoalType) -> Goal? {
        let typeRaw = type.rawValue
        var descriptor = FetchDescriptor<Goal>(predicate: #Predicate { $0.type == typeRaw })
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    // MARK: - Calories for a day

    func meals(for date: Date) -> [MealEntry] {
        let start = DateHelper.startOfDay(date)
        let end = DateHelper.endOfDay(date)
        let descriptor = FetchDescriptor<MealEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func totalCalories(for date: Date) -> Int {
        meals(for: date).reduce(0) { $0 + $1.estimatedKcal }
    }

    func caloriesByMealType(for date: Date) -> [String: Int] {
        var result: [String: Int] = [:]
        for meal in meals(for: date) {
            result[meal.mealType, default: 0] += meal.estimatedKcal
        }
        return result
    }

    // MARK: - Snacks

    func snacks(for date: Date) -> [MealEntry] {
        meals(for: date).filter { $0.isSnack }
    }

    func hasSnacked(on date: Date) -> Bool {
        !snacks(for: date).isEmpty
    }

    /// Clean weekdays (no snacks) in the week containing `date`
    func cleanWeekdays(in date: Date) -> Int {
        let days = DateHelper.daysInWeek(date)
        return days.prefix(5).filter { !hasSnacked(on: $0) && DateHelper.startOfDay($0) <= DateHelper.startOfDay(.now) }.count
    }

    // MARK: - Workouts

    func workouts(for date: Date) -> [WorkoutEntry] {
        let start = DateHelper.startOfDay(date)
        let end = DateHelper.endOfDay(date)
        let descriptor = FetchDescriptor<WorkoutEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func workoutsInWeek(_ date: Date) -> [WorkoutEntry] {
        let start = DateHelper.startOfWeek(date)
        let end = DateHelper.endOfWeek(date)
        let descriptor = FetchDescriptor<WorkoutEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func workoutCountInWeek(_ date: Date) -> Int {
        workoutsInWeek(date).filter { $0.isWorkout }.count
    }

    func walkCountInWeek(_ date: Date) -> Int {
        workoutsInWeek(date).filter { $0.isWalk }.count
    }

    func activeDaysInWeek(_ date: Date) -> Int {
        let start = DateHelper.startOfWeek(date)
        let end = DateHelper.endOfWeek(date)
        let descriptor = FetchDescriptor<WorkoutEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end }
        )
        let entries = (try? modelContext.fetch(descriptor)) ?? []
        let uniqueDays = Set(entries.map { DateHelper.startOfDay($0.date) })
        return uniqueDays.count
    }

    // MARK: - Drinks

    func drinks(for date: Date) -> [DrinkEntry] {
        let start = DateHelper.startOfDay(date)
        let end = DateHelper.endOfDay(date)
        let descriptor = FetchDescriptor<DrinkEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func totalUnits(for date: Date) -> Double {
        drinks(for: date).reduce(0) { $0 + $1.units }
    }

    func drinksInWeek(_ date: Date) -> [DrinkEntry] {
        let start = DateHelper.startOfWeek(date)
        let end = DateHelper.endOfWeek(date)
        let descriptor = FetchDescriptor<DrinkEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func weeklyUnits(_ date: Date) -> Double {
        drinksInWeek(date).reduce(0) { $0 + $1.units }
    }

    func weeklyDrinkKcal(_ date: Date) -> Int {
        drinksInWeek(date).reduce(0) { $0 + $1.kcal }
    }

    // MARK: - Weight

    func latestWeight() -> WeightEntry? {
        var descriptor = FetchDescriptor<WeightEntry>(sortBy: [SortDescriptor(\.date, order: .reverse)])
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    func weight(for date: Date) -> WeightEntry? {
        let start = DateHelper.startOfDay(date)
        let end = DateHelper.endOfDay(date)
        var descriptor = FetchDescriptor<WeightEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    // MARK: - Weekly averages

    func avgCaloriesInWeek(_ date: Date) -> Int {
        let days = DateHelper.daysInWeek(date)
        let today = DateHelper.startOfDay(.now)
        let pastDays = days.filter { DateHelper.startOfDay($0) <= today }
        guard !pastDays.isEmpty else { return 0 }
        let total = pastDays.reduce(0) { $0 + totalCalories(for: $1) }
        return total / pastDays.count
    }

    // MARK: - Save helpers

    func addMeal(date: Date, mealType: MealType, description: String, kcal: Int, method: InputMethod = .manual, photo: Data? = nil) {
        let entry = MealEntry(date: date, mealType: mealType, description: description, estimatedKcal: kcal, inputMethod: method, photo: photo)
        modelContext.insert(entry)
        try? modelContext.save()
    }

    func addDrink(date: Date, type: DrinkType, quantity: Int) {
        let entry = DrinkEntry(date: date, drinkType: type, quantity: quantity)
        modelContext.insert(entry)
        try? modelContext.save()
    }

    func addWorkout(date: Date, type: String, duration: Int, kcal: Int? = nil, source: WorkoutSource = .manual) {
        let entry = WorkoutEntry(date: date, type: type, duration: duration, kcalBurned: kcal, source: source)
        modelContext.insert(entry)
        try? modelContext.save()
    }

    func addWeight(date: Date, weight: Double) {
        let entry = WeightEntry(date: date, weight: weight)
        modelContext.insert(entry)
        try? modelContext.save()
    }

    func updateGoal(_ goal: Goal) {
        try? modelContext.save()
    }
}
