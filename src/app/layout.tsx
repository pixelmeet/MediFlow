import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MediFlow — Smart Hospital Appointment & Patient Flow",
  description:
    "Reduce waiting-room congestion with intelligent appointment scheduling and real-time queue management. Book appointments, track live queues, and manage hospital operations seamlessly.",
  keywords: [
    "hospital appointment",
    "patient queue",
    "doctor booking",
    "healthcare",
    "MediFlow",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
