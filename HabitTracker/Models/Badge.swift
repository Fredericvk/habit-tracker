import SwiftUI
import SwiftData
import Foundation

// MARK: - Badge Model

enum BadgeTracker: String, Codable, CaseIterable {
    case exercise
    case eating
    case drinking
}

@Model
final class Badge {
    var id: UUID
    var tracker: String       // "exercise", "eating", "drinking"
    var name: String
    var badgeDescription: String
    var weeksRequired: Int
    var icon: String          // SF Symbol name
    var unlockedAt: Date?

    init(tracker: BadgeTracker, name: String, description: String, weeksRequired: Int, icon: String) {
        self.id = UUID()
        self.tracker = tracker.rawValue
        self.name = name
        self.badgeDescription = description
        self.weeksRequired = weeksRequired
        self.icon = icon
    }

    var isUnlocked: Bool {
        unlockedAt != nil
    }

    var badgeTracker: BadgeTracker {
        BadgeTracker(rawValue: tracker) ?? .exercise
    }

    // MARK: - Predefined Badge Sets

    static let allBadges: [(BadgeTracker, String, String, Int, String)] = [
        // Exercise
        (.exercise, "Getting Started 🌱", "2 week exercise streak", 2, "leaf.circle.fill"),
        (.exercise, "Consistent 💪", "4 week exercise streak", 4, "dumbbell.fill"),
        (.exercise, "Machine 🤖", "8 week exercise streak", 8, "gearshape.2.fill"),
        (.exercise, "Beast Mode 🔥", "12 week exercise streak", 12, "flame.fill"),
        (.exercise, "Half Year Hero 🦸", "26 week exercise streak", 26, "star.fill"),
        (.exercise, "Year of Iron 🏆", "52 week exercise streak", 52, "trophy.fill"),
        // Eating
        (.eating, "Clean Eater 🥬", "2 week no-snacking streak", 2, "leaf.fill"),
        (.eating, "Willpower 🧱", "4 week no-snacking streak", 4, "shield.fill"),
        (.eating, "Iron Stomach 🛡️", "8 week no-snacking streak", 8, "bolt.shield.fill"),
        (.eating, "Master of Cravings 👑", "12 week no-snacking streak", 12, "crown.fill"),
        (.eating, "Snack Slayer 🗡️", "26 week no-snacking streak", 26, "star.fill"),
        (.eating, "Year of Discipline 💎", "52 week no-snacking streak", 52, "diamond.fill"),
        // Drinking
        (.drinking, "Mindful Drinker 🧘", "2 week alcohol streak", 2, "brain.head.profile.fill"),
        (.drinking, "In Control 🎯", "4 week alcohol streak", 4, "scope"),
        (.drinking, "Clear Headed 🧠", "8 week alcohol streak", 8, "brain.fill"),
        (.drinking, "Quarter Year Clean 🏆", "12 week alcohol streak", 12, "trophy.fill"),
        (.drinking, "Half Year Hero 🦸", "26 week alcohol streak", 26, "star.fill"),
        (.drinking, "Year of Clarity 💎", "52 week alcohol streak", 52, "diamond.fill"),
    ]
}
