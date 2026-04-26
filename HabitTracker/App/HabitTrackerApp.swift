import SwiftUI
import SwiftData

@main
struct HabitTrackerApp: App {
    var body: some Scene {
        WindowGroup {
            MainTabView()
        }
        .modelContainer(for: [
            Goal.self,
            WorkoutEntry.self,
            MealEntry.self,
            WeightEntry.self,
            DrinkEntry.self,
            Badge.self
        ])
    }
}
