import "./globals.css";
import AppProviders from "@/providers";

export const metadata = {
  title: "Foodville Admin Panel",
  description: "Management dashboard for Foodville catalog, orders, customers, and blogs.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink antialiased">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
