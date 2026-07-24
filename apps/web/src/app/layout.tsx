import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "All-Sport Intelligence — Foundation",
  description:
    "Multi-sport (MLB / ATP / WTA) analytics platform — infrastructure foundation.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
