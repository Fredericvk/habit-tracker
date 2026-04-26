import SwiftUI
import SwiftData

@main
struct HabitTrackerApp: App {
    let container: ModelContainer

    init() {
        do {
            let config = ModelConfiguration(for:
                Goal.self, WorkoutEntry.self, MealEntry.self,
                WeightEntry.self, DrinkEntry.self, Badge.self
            )
            container = try ModelContainer(for:
                Goal.self,
                WorkoutEntry.self,
                MealEntry.self,
                WeightEntry.self,
                DrinkEntry.self,
                Badge.self,
                configurations: config
            )
            // Seed goals synchronously before first frame (fast: single fetchCount check)
            DataSeeder.seedDefaultGoals(context: container.mainContext)
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
        }
        .modelContainer(container)
    }
}
