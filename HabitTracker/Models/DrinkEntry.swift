import SwiftUI
import SwiftData
import Foundation

// MARK: - Drink Entry

enum DrinkType: String, Codable, CaseIterable {
    case beer = "Beer"
    case wine = "Wine"
    case spirit = "Spirit"
    case cocktail = "Cocktail"
    case cider = "Cider"

    var icon: String {
        switch self {
        case .beer: return "🍺"
        case .wine: return "🍷"
        case .spirit: return "🥃"
        case .cocktail: return "🍹"
        case .cider: return "🍏"
        }
    }

    /// UK standard alcohol units per serving
    var defaultUnits: Double {
        switch self {
        case .beer: return 2.3
        case .wine: return 2.1
        case .spirit: return 1.0
        case .cocktail: return 2.0
        case .cider: return 2.6
        }
    }

    /// Approximate kcal per serving
    var defaultKcal: Int {
        switch self {
        case .beer: return 182
        case .wine: return 158
        case .spirit: return 61
        case .cocktail: return 180
        case .cider: return 210
        }
    }
}

@Model
final class DrinkEntry {
    var id: UUID
    var date: Date
    var drinkType: String     // "Beer", "Wine", etc.
    var quantity: Int
    var units: Double         // alcohol units (auto-calculated)
    var kcal: Int             // calories (auto-calculated)

    init(date: Date, drinkType: DrinkType, quantity: Int) {
        self.id = UUID()
        self.date = date
        self.drinkType = drinkType.rawValue
        self.quantity = quantity
        self.units = drinkType.defaultUnits * Double(quantity)
        self.kcal = drinkType.defaultKcal * quantity
    }

    var drink: DrinkType {
        DrinkType(rawValue: drinkType) ?? .beer
    }
}
