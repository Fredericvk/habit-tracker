import SwiftUI
import SwiftData
import Foundation

// MARK: - Weight Entry

@Model
final class WeightEntry {
    var id: UUID
    var date: Date
    var weight: Double        // kg

    init(date: Date, weight: Double) {
        self.id = UUID()
        self.date = date
        self.weight = weight
    }
}
