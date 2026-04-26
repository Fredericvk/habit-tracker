import SwiftUI

/// A row that reveals a delete button when swiped left (trailing swipe).
struct SwipeToDeleteRow<Content: View>: View {
    let content: () -> Content
    let onDelete: () -> Void

    @State private var offset: CGFloat = 0
    @State private var showDelete = false

    private let deleteWidth: CGFloat = 70

    init(@ViewBuilder content: @escaping () -> Content, onDelete: @escaping () -> Void) {
        self.content = content
        self.onDelete = onDelete
    }

    var body: some View {
        ZStack(alignment: .trailing) {
            // Delete background
            HStack {
                Spacer()
                Button {
                    withAnimation(.easeOut(duration: 0.25)) {
                        onDelete()
                    }
                } label: {
                    Image(systemName: "trash.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: deleteWidth, height: 44)
                        .background(Color.theme.danger)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }

            // Content
            content()
                .background(Color.theme.cardBackground)
                .offset(x: offset)
                .gesture(
                    DragGesture(minimumDistance: 20)
                        .onChanged { value in
                            let translation = value.translation.width
                            if translation < 0 {
                                offset = max(translation, -deleteWidth)
                            } else if showDelete {
                                offset = min(-deleteWidth + translation, 0)
                            }
                        }
                        .onEnded { value in
                            withAnimation(.spring(response: 0.3)) {
                                if value.translation.width < -deleteWidth / 2 {
                                    offset = -deleteWidth
                                    showDelete = true
                                } else {
                                    offset = 0
                                    showDelete = false
                                }
                            }
                        }
                )
        }
        .clipped()
    }
}
