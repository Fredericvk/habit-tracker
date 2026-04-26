import Foundation

/// Calendar utilities — week always runs Monday → Sunday
enum DateHelper {
    static let calendar: Calendar = {
        var cal = Calendar(identifier: .iso8601)
        cal.firstWeekday = 2 // Monday
        cal.locale = Locale.current
        return cal
    }()

    // MARK: - Day boundaries

    static func startOfDay(_ date: Date = .now) -> Date {
        calendar.startOfDay(for: date)
    }

    static func endOfDay(_ date: Date = .now) -> Date {
        calendar.date(byAdding: .day, value: 1, to: startOfDay(date))!
    }

    // MARK: - Week boundaries (Mon–Sun)

    static func startOfWeek(_ date: Date = .now) -> Date {
        let comps = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return calendar.date(from: comps)!
    }

    static func endOfWeek(_ date: Date = .now) -> Date {
        calendar.date(byAdding: .day, value: 7, to: startOfWeek(date))!
    }

    // MARK: - Month boundaries

    static func startOfMonth(_ date: Date = .now) -> Date {
        let comps = calendar.dateComponents([.year, .month], from: date)
        return calendar.date(from: comps)!
    }

    static func endOfMonth(_ date: Date = .now) -> Date {
        calendar.date(byAdding: .month, value: 1, to: startOfMonth(date))!
    }

    // MARK: - Week number

    static func weekNumber(_ date: Date = .now) -> Int {
        calendar.component(.weekOfYear, from: date)
    }

    // MARK: - Weekday checks

    static func isWeekday(_ date: Date) -> Bool {
        let weekday = calendar.component(.weekday, from: date)
        return weekday >= 2 && weekday <= 6 // Mon=2 ... Fri=6
    }

    static func isWeekend(_ date: Date) -> Bool {
        !isWeekday(date)
    }

    // MARK: - Iteration

    /// All days in the week containing `date`
    static func daysInWeek(_ date: Date = .now) -> [Date] {
        let start = startOfWeek(date)
        return (0..<7).map { calendar.date(byAdding: .day, value: $0, to: start)! }
    }

    /// All weeks (as start dates) between two dates
    static func weeksBetween(start: Date, end: Date) -> [Date] {
        var weeks: [Date] = []
        var current = startOfWeek(start)
        let limit = startOfDay(end)
        while current < limit {
            weeks.append(current)
            current = calendar.date(byAdding: .weekOfYear, value: 1, to: current)!
        }
        return weeks
    }

    /// Number of full weeks between two dates
    static func weekCount(from start: Date, to end: Date) -> Int {
        let comps = calendar.dateComponents([.weekOfYear], from: startOfWeek(start), to: startOfWeek(end))
        return max(1, (comps.weekOfYear ?? 0) + 1)
    }

    // MARK: - Formatting

    static func shortDate(_ date: Date) -> String {
        date.formatted(.dateTime.month(.abbreviated).day())
    }

    static func weekdayName(_ date: Date) -> String {
        date.formatted(.dateTime.weekday(.abbreviated))
    }

    static func monthYear(_ date: Date) -> String {
        date.formatted(.dateTime.month(.wide).year())
    }
}
