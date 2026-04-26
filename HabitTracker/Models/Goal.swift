import SwiftUI
import SwiftData
import Foundation

// MARK: - Goal Model

@Model
final class Goal {
    var id: UUID
    var type: String          // "calories", "exercise", "snacking", "alcohol", "weight"
    var title: String
    var icon: String          // SF Symbol name
    var targetValue: Double   // e.g. 2300 kcal, 4 workouts, 5 clean days, 17 units, 93 kg
    var unit: String          // "kcal/day", "workouts/week", "days/week", "units/week", "kg"
    var startDate: Date
    var endDate: Date
    var isActive: Bool

    // Exercise-specific sub-targets
    var workoutsPerWeek: Int?
    var walksPerWeek: Int?

    init(
        type: String,
        title: String,
        icon: String,
        targetValue: Double,
        unit: String,
        startDate: Date,
        endDate: Date,
        isActive: Bool = true,
        workoutsPerWeek: Int? = nil,
        walksPerWeek: Int? = nil
    ) {
        self.id = UUID()
        self.type = type
        self.title = title
        self.icon = icon
        self.targetValue = targetValue
        self.unit = unit
        self.startDate = startDate
        self.endDate = endDate
        self.isActive = isActive
        self.workoutsPerWeek = workoutsPerWeek
        self.walksPerWeek = walksPerWeek
    }
}

// MARK: - Goal Type Enum (for convenience, not stored)

enum GoalType: String, CaseIterable {
    case calories = "calories"
    case exercise = "exercise"
    case snacking = "snacking"
    case alcohol = "alcohol"
    case weight = "weight"

    var defaultTitle: String {
        switch self {
        case .calories: return "Daily Calories"
        case .exercise: return "Exercise"
        case .snacking: return "No Snacking"
        case .alcohol: return "Alcohol"
        case .weight: return "Weight"
        }
    }

    var defaultIcon: String {
        switch self {
        case .calories: return "flame.fill"
        case .exercise: return "figure.run"
        case .snacking: return "leaf.fill"
        case .alcohol: return "drop.fill"
        case .weight: return "scalemass.fill"
        }
    }

    var defaultUnit: String {
        switch self {
        case .calories: return "kcal/day"
        case .exercise: return "active days/week"
        case .snacking: return "clean days/week"
        case .alcohol: return "units/week"
        case .weight: return "kg"
        }
    }
}
