import SwiftUI
import SwiftData
import Foundation

// MARK: - Workout Entry

enum WorkoutSource: String, Codable {
    case manual
    case strava
}

@Model
final class WorkoutEntry {
    var id: UUID
    var date: Date
    var type: String          // "Run", "Gym", "Gym Class", "Walk", or custom
    var duration: Int         // minutes
    var kcalBurned: Int?
    var source: String        // "manual" or "strava"
    var stravaId: String?

    init(date: Date, type: String, duration: Int, kcalBurned: Int? = nil, source: WorkoutSource = .manual, stravaId: String? = nil) {
        self.id = UUID()
        self.date = date
        self.type = type
        self.duration = duration
        self.kcalBurned = kcalBurned
        self.source = source.rawValue
        self.stravaId = stravaId
    }

    var workoutSource: WorkoutSource {
        WorkoutSource(rawValue: source) ?? .manual
    }

    var isWalk: Bool {
        type.lowercased() == "walk"
    }

    var isWorkout: Bool {
        !isWalk
    }
}
