// PLACEHOLDER — Person 2 (Rithvik) owns the real layout/styling. Safe to overwrite.
export const metadata = {
  title: "Mycelium",
  description: "The collective intelligence layer for AI agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
