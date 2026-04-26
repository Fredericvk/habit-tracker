import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: Tab = .overview

    enum Tab: String {
        case log, overview, goals, settings
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Screen content
            Group {
                switch selectedTab {
                case .log:
                    LogScreen()
                case .overview:
                    OverviewScreen()
                case .goals:
                    GoalsScreen()
                case .settings:
                    SettingsScreen()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Custom Tab Bar
            tabBar
        }
        .background(Color.theme.background)
    }

    // MARK: - Custom Tab Bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            tabItem(icon: "square.and.pencil", label: "Log", tab: .log)

            Spacer()

            // Center FAB button for Overview
            Button {
                withAnimation(.spring(response: 0.3)) {
                    selectedTab = .overview
                }
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.theme.primary)
                        .frame(width: 56, height: 56)
                        .shadow(color: Color.theme.primary.opacity(0.3), radius: 8, y: 4)

                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .offset(y: -16)

            Spacer()

            tabItem(icon: "target", label: "Goals", tab: .goals)
        }
        .padding(.horizontal, 32)
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom)
                .shadow(color: .black.opacity(0.05), radius: 12, y: -4)
        )
    }

    private func tabItem(icon: String, label: String, tab: Tab) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .medium))
                Text(label)
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(selectedTab == tab ? Color.theme.primary : Color.theme.textMuted)
        }
    }
}

#Preview {
    MainTabView()
}
