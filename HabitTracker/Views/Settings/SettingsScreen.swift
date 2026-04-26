import SwiftUI

struct SettingsScreen: View {
    @State private var morningReminder = true
    @State private var eveningReminder = true
    @State private var appearance = 0

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Settings")
                    .font(.screenTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 16)

            ScrollView(showsIndicators: false) {
                VStack(spacing: Layout.cardSpacing) {
                    // Strava
                    stravaCard

                    // Notifications
                    notificationsCard

                    // Appearance
                    appearanceCard

                    // Data
                    dataCard
                }
                .padding(.horizontal, Layout.screenPadding)
                .padding(.top, 16)
                .padding(.bottom, 100)
            }
        }
        .background(Color.theme.background)
    }

    // MARK: - Strava Card

    private var stravaCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "figure.run.circle.fill")
                    .foregroundStyle(.orange)
                    .font(.system(size: 20))
                Text("Strava")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
            }

            Button { } label: {
                Text("Connect Strava")
                    .font(.pillLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color(hex: "FC4C02")) // Strava orange
                    .clipShape(Capsule())
            }

            Text("Auto-sync your workouts from Strava")
                .font(.cardCaption)
                .foregroundStyle(Color.theme.textMuted)
        }
        .cardStyle()
    }

    // MARK: - Notifications Card

    private var notificationsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "bell.fill")
                    .foregroundStyle(Color.theme.primary)
                Text("Notifications")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            Toggle(isOn: $morningReminder) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Morning Reminder")
                        .font(.cardBody)
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("8:00 AM")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                }
            }
            .tint(Color.theme.primary)

            Divider()

            Toggle(isOn: $eveningReminder) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Evening Log Reminder")
                        .font(.cardBody)
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("9:00 PM")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                }
            }
            .tint(Color.theme.primary)
        }
        .cardStyle()
    }

    // MARK: - Appearance Card

    private var appearanceCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "paintbrush.fill")
                    .foregroundStyle(Color.theme.primary)
                Text("Appearance")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            SegmentedPill(segments: ["Light", "Dark", "System"], selected: $appearance)
        }
        .cardStyle()
    }

    // MARK: - Data Card

    private var dataCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "externaldrive.fill")
                    .foregroundStyle(Color.theme.primary)
                Text("Data")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            Button { } label: {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                    Text("Export Data (JSON)")
                }
                .font(.cardBody)
                .foregroundStyle(Color.theme.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.theme.tintPurple)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Button { } label: {
                HStack {
                    Image(systemName: "trash")
                    Text("Reset All Data")
                }
                .font(.cardBody)
                .foregroundStyle(Color.theme.danger)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.theme.danger.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .cardStyle()
    }
}

#Preview {
    SettingsScreen()
}
