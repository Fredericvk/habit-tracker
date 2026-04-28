import SwiftUI
import SwiftData
import Foundation

// MARK: - Meal Entry

enum MealType: String, Codable, CaseIterable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case dinner = "Dinner"
    case snack = "Snack"

    var icon: String {
        switch self {
        case .breakfast: return "sunrise.fill"
        case .lunch: return "sun.max.fill"
        case .dinner: return "moon.fill"
        case .snack: return "leaf.fill"
        }
    }
}

enum InputMethod: String, Codable {
    case manual
    case photo
}

@Model
final class MealEntry {
    var id: UUID
    var date: Date
    var mealType: String      // "Breakfast", "Lunch", "Dinner", "Snack"
    var itemDescription: String
    @Attribute(.externalStorage) var photo: Data?
    var estimatedKcal: Int
    var inputMethod: String   // "manual" or "photo"

    init(date: Date, mealType: MealType, description: String, estimatedKcal: Int, inputMethod: InputMethod = .manual, photo: Data? = nil) {
        self.id = UUID()
        self.date = date
        self.mealType = mealType.rawValue
        self.itemDescription = description
        self.estimatedKcal = estimatedKcal
        self.inputMethod = inputMethod.rawValue
        self.photo = photo
    }

    var meal: MealType {
        MealType(rawValue: mealType) ?? .snack
    }

    var isSnack: Bool {
        meal == .snack
    }
}
