import SwiftUI
import SwiftData

@main
struct HabitTrackerApp: App {
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(for:
                Goal.self,
                WorkoutEntry.self,
                MealEntry.self,
                WeightEntry.self,
                DrinkEntry.self,
                Badge.self
            )
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .onAppear {
                    DataSeeder.seedDefaultGoals(context: container.mainContext)
                }
        }
        .modelContainer(container)
    }
}
