import Foundation
import SwiftData
import Observation

/// Central data manager — provides computed stats for any date range.
/// Views should use batch range methods + @State to avoid repeated fetches during body evaluation.
@Observable
final class HabitStore {
    var modelContext: ModelContext

    /// Incremented on every save so views can observe changes via .onChange(of: store.dataVersion)
    private(set) var dataVersion: Int = 0

    @ObservationIgnored private var _goalCache: [Goal]?

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Goals (cached)

    func cachedGoals() -> [Goal] {
        if let cached = _goalCache { return cached }
        let fetched = goals()
        _goalCache = fetched
        return fetched
    }

    func cachedGoal(for type: GoalType) -> Goal? {
        cachedGoals().first { $0.type == type.rawValue }
    }

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

    // MARK: - Batch range fetches (use these from views)

    func mealsInRange(from start: Date, to end: Date) -> [MealEntry] {
        let descriptor = FetchDescriptor<MealEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func workoutsInRange(from start: Date, to end: Date) -> [WorkoutEntry] {
        let descriptor = FetchDescriptor<WorkoutEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func drinksInRange(from start: Date, to end: Date) -> [DrinkEntry] {
        let descriptor = FetchDescriptor<DrinkEntry>(
            predicate: #Predicate { $0.date >= start && $0.date < end },
            sortBy: [SortDescriptor(\.date)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    // MARK: - Single-day convenience (for LogScreen)

    func meals(for date: Date) -> [MealEntry] {
        mealsInRange(from: DateHelper.startOfDay(date), to: DateHelper.endOfDay(date))
    }

    func totalCalories(for date: Date) -> Int {
        meals(for: date).reduce(0) { $0 + $1.estimatedKcal }
    }

    func weeklyUnits(_ date: Date) -> Double {
        drinksInRange(from: DateHelper.startOfWeek(date), to: DateHelper.endOfWeek(date))
            .reduce(0) { $0 + $1.units }
    }

    // MARK: - Weight

    func latestWeight() -> WeightEntry? {
        var descriptor = FetchDescriptor<WeightEntry>(sortBy: [SortDescriptor(\.date, order: .reverse)])
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    // MARK: - Save helpers

    func addMeal(date: Date, mealType: MealType, description: String, kcal: Int, method: InputMethod = .manual, photo: Data? = nil) {
        let entry = MealEntry(date: date, mealType: mealType, description: description, estimatedKcal: kcal, inputMethod: method, photo: photo)
        modelContext.insert(entry)
        save()
    }

    func addDrink(date: Date, type: DrinkType, quantity: Int) {
        let entry = DrinkEntry(date: date, drinkType: type, quantity: quantity)
        modelContext.insert(entry)
        save()
    }

    func addWorkout(date: Date, type: String, duration: Int, kcal: Int? = nil, source: WorkoutSource = .manual) {
        let entry = WorkoutEntry(date: date, type: type, duration: duration, kcalBurned: kcal, source: source)
        modelContext.insert(entry)
        save()
    }

    func addWeight(date: Date, weight: Double) {
        let entry = WeightEntry(date: date, weight: weight)
        modelContext.insert(entry)
        save()
    }

    func updateGoal(_ goal: Goal) {
        _goalCache = nil
        save()
    }

    func deleteMeal(_ entry: MealEntry) {
        modelContext.delete(entry)
        save()
    }

    private func save() {
        try? modelContext.save()
        _goalCache = nil
        dataVersion += 1
    }
}
